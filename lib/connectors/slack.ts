import { GATED, connected as gatedConnected } from '@/lib/connectors/demo-status';
import { WebClient } from '@slack/web-api';
import type { ConnectorStatus } from '@/lib/connectors/types';

export type SlackMessage = { channel: string; user: string; text: string; ts: string };

function client(env: Record<string, string | undefined>): WebClient | null {
  return env.SLACK_BOT_TOKEN ? new WebClient(env.SLACK_BOT_TOKEN) : null;
}

export async function slackStatus(env: Record<string, string | undefined> = process.env): Promise<ConnectorStatus> {
  if (GATED) return gatedConnected('slack', 'Slack', 'slack', 'workspace · connected');
  const slack = client(env);
  if (!slack) {
    return {
      id: 'slack',
      name: 'Slack',
      kind: 'slack',
      state: 'not_configured',
      detail: '.env.local에 SLACK_BOT_TOKEN(xoxb-…)을 설정하세요. channels:read, channels:history, users:read 권한이 필요합니다.',
    };
  }
  try {
    const auth = await slack.auth.test();
    return {
      id: 'slack',
      name: 'Slack',
      kind: 'slack',
      state: 'connected',
      detail: `${auth.team}에 ${auth.user}(으)로 연결됨`,
      meta: { team: String(auth.team ?? ''), user: String(auth.user ?? '') },
    };
  } catch (err) {
    return {
      id: 'slack',
      name: 'Slack',
      kind: 'slack',
      state: 'error',
      detail: `토큰은 설정됐지만 인증 실패: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export type SlackSendResult = { ok: boolean; detail: string };

/** Post a reply into a channel by name. Fails honestly without a token. */
export async function sendSlackMessage(
  channelName: string,
  text: string,
  env: Record<string, string | undefined> = process.env,
): Promise<SlackSendResult> {
  const slack = client(env);
  if (!slack) return { ok: false, detail: 'SLACK_BOT_TOKEN이 설정되지 않았습니다 — 연결 → API 키에서 추가하세요' };
  try {
    const list = await slack.conversations.list({ types: 'public_channel,private_channel', limit: 200 });
    const channel = list.channels?.find((c) => c.name === channelName.replace(/^#/, ''));
    if (!channel?.id) return { ok: false, detail: `#${channelName} 채널을 찾을 수 없거나 봇이 초대되지 않았습니다` };
    await slack.chat.postMessage({ channel: channel.id, text });
    return { ok: true, detail: `#${channelName}에 보냄` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * History is one API call per channel. Widening this to 25 SEQUENTIAL calls
 * took /comms from 9.5s to ~28s on the host, because the Slack client backs off
 * on the ~50/min tier and each wait stacked. Fixed three ways: fewer channels,
 * fetched concurrently rather than one at a time, and the whole result cached
 * so a page view does not re-scan the workspace.
 */
const MAX_HISTORY_CHANNELS = 12;
const HISTORY_CONCURRENCY = 6;
export const SLACK_CACHE_TTL_MS = 20 * 60_000;
let messageCache: { at: number; limit: number; items: SlackMessage[] } | null = null;

/** Drops the cache so a send or a test sees fresh state immediately. */
export function invalidateSlackCache(): void {
  messageCache = null;
}

export async function recentMessages(
  limit = 10,
  env: Record<string, string | undefined> = process.env,
): Promise<SlackMessage[]> {
  const now = Date.now();
  // Same superset rule as email: a scan cached at 30 answers a request for 15.
  // The list is flat and sorted newest-first, so it slices exactly.
  if (messageCache && messageCache.limit >= limit && now - messageCache.at < SLACK_CACHE_TTL_MS) {
    return messageCache.items.slice(0, limit);
  }
  const slack = client(env);
  if (!slack) throw new Error('SLACK_BOT_TOKEN is not set');
  // Was limit:10, public only — so the feed showed an arbitrary ten channels in
  // Slack's own order and silently omitted every private one. Listing is a
  // single call, so there is no reason to look at less than the workspace.
  const channels = await slack.conversations.list({
    limit: 200,
    exclude_archived: true,
    types: 'public_channel,private_channel',
  });
  // The bot can only read channels it has joined; no scope changes that.
  const joined = (channels.channels ?? []).filter((c) => c.id && c.is_member);
  // Prefer channels that have actually been spoken in recently, so a busy
  // workspace does not push live conversation out on alphabetical luck.
  const ranked = joined
    .slice()
    .sort((a, b) => Number(b.updated ?? 0) - Number(a.updated ?? 0))
    .slice(0, MAX_HISTORY_CHANNELS);

  const messages: SlackMessage[] = [];
  // Concurrent, in small waves: sequential awaits were the whole problem, but
  // firing all of them at once just trades latency for rate-limit backoff.
  for (let i = 0; i < ranked.length; i += HISTORY_CONCURRENCY) {
    const wave = ranked.slice(i, i + HISTORY_CONCURRENCY);
    const results = await Promise.all(
      wave.map(async (channel) => {
        try {
          const history = await slack.conversations.history({ channel: channel.id!, limit: 10 });
          return (history.messages ?? []).map((msg) => ({
            channel: channel.name ?? channel.id!,
            user: msg.user ?? 'unknown',
            text: msg.text ?? '',
            ts: msg.ts ?? '',
          }));
        } catch {
          // One unreadable channel must not blank the whole feed.
          return [] as SlackMessage[];
        }
      }),
    );
    for (const r of results) messages.push(...r);
  }
  const sorted = messages.sort((a, b) => Number(b.ts) - Number(a.ts)).slice(0, limit);
  if (sorted.length > 0) messageCache = { at: Date.now(), limit, items: sorted };
  return sorted;
}

export type SlackChannel = {
  id: string;
  name: string;
  isMember: boolean;
  isPrivate: boolean;
  members: number;
  topic: string;
};

type RawChannel = {
  id?: string;
  name?: string;
  is_archived?: boolean;
  is_member?: boolean;
  is_private?: boolean;
  num_members?: number;
  topic?: { value?: string };
};

/** Pure half of listChannels: raw conversations.list entries → a clean board. */
export function shapeChannels(raw: RawChannel[]): SlackChannel[] {
  return raw
    .filter((c) => c.id && c.name && !c.is_archived)
    .map((c) => ({
      id: c.id!,
      name: c.name!,
      isMember: Boolean(c.is_member),
      isPrivate: Boolean(c.is_private),
      members: c.num_members ?? 0,
      topic: c.topic?.value ?? '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Every current (non-archived) channel in the workspace. Empty without a token — honest. */
export async function listChannels(env: Record<string, string | undefined> = process.env): Promise<SlackChannel[]> {
  const slack = client(env);
  if (!slack) return [];
  try {
    const channels: RawChannel[] = [];
    let cursor: string | undefined;
    do {
      const page = await slack.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 200,
        cursor,
      });
      channels.push(...((page.channels ?? []) as RawChannel[]));
      cursor = page.response_metadata?.next_cursor || undefined;
    } while (cursor);
    return shapeChannels(channels);
  } catch {
    return []; // status card carries the error detail; the board just goes empty
  }
}
