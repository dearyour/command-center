import type { Meter, Tone } from '@/components/slab';
import type { SeriesPoint } from '@/components/slab-charts';

/**
 * /social in the Brand Deals look (Alex, 2026-09-24). One pure pass over
 * the page's own real rows (channel follower counts, audience growth, the
 * Instagram DM threads, the publish queue, Zernio's posting history) gives
 * the Audience Volume card, the posting step line, the platform mix and the
 * single "Needs reply" insight. Nothing here invents a number: a channel
 * with no reading is an empty meter labelled offline.
 */
export type SocialVolume = {
  headline: number;
  chips: Array<{ tone?: Tone; text: string }>;
  caption: string;
  meters: Meter[];
  foot: string;
  series: SeriesPoint[];
  postsInWindow: number;
  mix: SeriesPoint[];
  insight: { value: number; headline: string; body: string; frac: number };
};

const HUES = ['var(--ramp-1)', 'var(--ramp-2)', 'var(--ramp-3)', 'var(--ramp-4)'];
const MIX: Array<[string, string]> = [
  ['instagram', 'IG'],
  ['tiktok', 'TT'],
  ['twitter', 'X'],
  ['youtube', 'YT'],
  ['linkedin', 'LI'],
];
const METERS = 4;

const growthText = (n: number) => `${n >= 0 ? '+' : ''}${Math.abs(n) < 10 ? n.toFixed(2) : n.toFixed(1)}% (7일)`;
const utcLabel = (d: Date) => d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function socialVolume(x: {
  channels: Array<{ key: string; label: string; value: number | null }>;
  total: number;
  growth7: number | null;
  leader: string | null;
  dmThreads: Array<{ name: string; unreplied: boolean }>;
  queued: number;
  postDays: Array<{ date: string; platforms: string[] }>;
  /** YYYY-MM-DD, computed by the page so the axis cannot drift */
  today: string;
  days?: number;
}): SocialVolume {
  const days = x.days ?? 30;
  const live = x.channels.filter((c) => c.value != null);
  const owed = x.dmThreads.filter((t) => t.unreplied);

  const chips: SocialVolume['chips'] = [];
  if (x.growth7 != null && Number.isFinite(x.growth7)) chips.push({ tone: x.growth7 >= 0 ? 'ok' : 'err', text: growthText(x.growth7) });
  if (owed.length) chips.push({ tone: 'warn', text: `답장 필요 ${owed.length}` });
  if (x.queued) chips.push({ tone: 'accent', text: `대기 ${x.queued}` });

  const caption = live.length
    ? `활성 채널 ${live.length}개 합계${x.leader ? ` · 7일 성장 1위 ${x.leader}` : ''}`
    : '아직 보고 중인 채널이 없습니다';

  // Biggest channels first; the ones with no reading sink to the bottom.
  const ranked = [...x.channels].sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
  const shown = ranked.slice(0, METERS);
  const meters: Meter[] = shown.map((c, i) => {
    const f = c.value != null && x.total > 0 ? Math.max(0, Math.min(1, c.value / x.total)) : 0;
    return {
      label: c.label,
      frac: f,
      display: c.value == null ? '오프라인' : `${c.value.toLocaleString('en-US')} · ${Math.round(f * 100)}%`,
      hue: HUES[i],
    };
  });
  const rest = x.channels.length - shown.length;
  const foot = `전체 도달 대비 비중${rest > 0 ? ` · 작은 채널 ${rest}개 더 있음` : ''}`;

  // Posts per UTC day (Zernio stamps are ISO dates), oldest first, ending today.
  const end = new Date(`${x.today}T00:00:00Z`);
  const keys: string[] = [];
  const series: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86_400_000);
    keys.push(d.toISOString().slice(0, 10));
    series.push({ label: utcLabel(d), count: 0 });
  }
  const index = new Map(keys.map((k, i) => [k, i]));
  const mixCounts = new Map<string, number>(MIX.map(([k]) => [k, 0]));
  let postsInWindow = 0;
  for (const p of x.postDays) {
    const i = index.get(p.date);
    if (i === undefined) continue;
    series[i].count += 1;
    postsInWindow += 1;
    for (const platform of new Set(p.platforms)) {
      if (mixCounts.has(platform)) mixCounts.set(platform, (mixCounts.get(platform) ?? 0) + 1);
    }
  }
  const mix = MIX.map(([k, label]) => ({ label, count: mixCounts.get(k) ?? 0 }));

  const threads = x.dmThreads.length;
  const insight = {
    value: owed.length,
    headline: owed.length ? `Instagram 스레드 ${threads}개 중 ${owed.length}개에 답장이 필요합니다.` : '받은편지함이 비었습니다.',
    body: owed.length
      ? owed
          .slice(0, 3)
          .map((t) => t.name)
          .join(' · ')
      : threads
        ? `스레드 ${threads}개 모두 답장 완료.`
        : '아직 Instagram 스레드가 없습니다.',
    frac: threads ? owed.length / threads : 0,
  };

  return { headline: x.total, chips, caption, meters, foot, series, postsInWindow, mix, insight };
}

/**
 * /social/[platform] in the same look (2026-09-24): one platform's snapshots
 * and growth windows become the Follower Volume card, a followers-gained-per-
 * day step line and the "30-day change" card. A day's change is the delta
 * from the snapshot before it, so a gap in the history is booked on the day
 * the next reading lands. Dips sit at zero on the line (it counts gains) and
 * are named by the "Days dipped" meter and the net figure instead.
 */
export type PlatformVolume = {
  headline: number | null;
  chips: Array<{ tone?: Tone; text: string }>;
  caption: string;
  meters: Meter[];
  foot: string;
  series: SeriesPoint[];
  intervals: number;
  gainedDays: number;
  dippedDays: number;
  trackedDays: number;
  net: number | null;
  insight: { value: number; display: string; headline: string; body: string; frac: number };
};

const DAY_MS = 86_400_000;
const windowText = (n: number, w: string) => `${n >= 0 ? '+' : ''}${Math.abs(n) < 10 ? n.toFixed(2) : n.toFixed(1)}% ${w}`;
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${Math.abs(n).toLocaleString('en-US')}`;
const isoLabel = (iso: string) => utcLabel(new Date(`${iso}T00:00:00Z`));

export function platformVolume(x: {
  label: string;
  followers: number | null;
  growth: { d7: number | null; d30: number | null; d60: number | null; allTime: number | null };
  snapshots: Array<{ capturedAt: string; followers: number; source: string }>;
  /** YYYY-MM-DD (UTC), computed by the page so the axis cannot drift */
  today: string;
  days?: number;
}): PlatformVolume {
  const days = x.days ?? 30;
  const snaps = [...x.snapshots].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  const end = new Date(`${x.today}T00:00:00Z`);
  const startKey = new Date(end.getTime() - (days - 1) * DAY_MS).toISOString().slice(0, 10);

  const keys: string[] = [];
  const series: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * DAY_MS);
    keys.push(d.toISOString().slice(0, 10));
    series.push({ label: utcLabel(d), count: 0 });
  }
  const index = new Map(keys.map((k, i) => [k, i]));

  let intervals = 0;
  let gainedDays = 0;
  let dippedDays = 0;
  let net = 0;
  let best: { label: string; gain: number } | null = null;
  snaps.forEach((s, i) => {
    if (i === 0) return;
    const at = index.get(s.capturedAt);
    if (at === undefined) return;
    const delta = s.followers - snaps[i - 1].followers;
    intervals += 1;
    net += delta;
    if (delta > 0) {
      gainedDays += 1;
      series[at].count += delta;
      if (!best || delta > best.gain) best = { label: series[at].label, gain: delta };
    } else if (delta < 0) dippedDays += 1;
  });
  const trackedDays = new Set(snaps.map((s) => s.capturedAt).filter((d) => d >= startKey && d <= x.today)).size;
  const peak = snaps.length ? Math.max(...snaps.map((s) => s.followers)) : null;

  const chips: PlatformVolume['chips'] = [];
  for (const [value, w] of [
    [x.growth.d7, '(7일)'],
    [x.growth.d30, '(30일)'],
  ] as const) {
    if (value != null && Number.isFinite(value)) chips.push({ tone: value >= 0 ? 'ok' : 'err', text: windowText(value, w) });
  }

  const n = snaps.length;
  const caption =
    x.followers == null ? '아직 팔로워 수 기록이 없습니다' : `${x.label} 팔로워 · 스냅샷 ${n}개${n ? ` · ${isoLabel(snaps[0].capturedAt)}부터` : ''}`;

  const meters: Meter[] = [];
  if (intervals > 0) {
    meters.push({ label: `증가한 날 (${gainedDays}/${intervals})`, frac: gainedDays / intervals, display: `${intervals}일 중 ${gainedDays}일`, hue: 'var(--ok)' });
    meters.push({ label: `감소한 날 (${dippedDays}/${intervals})`, frac: dippedDays / intervals, display: `${intervals}일 중 ${dippedDays}일`, hue: 'var(--err)' });
  }
  if (trackedDays > 0) {
    const f = Math.min(1, trackedDays / days);
    meters.push({ label: `추적한 날 (${trackedDays}/${days})`, frac: f, display: `${Math.round(f * 100)}%`, hue: 'var(--ramp-1)' });
  }
  if (x.followers != null && peak != null && peak > 0) {
    meters.push({
      label: '역대 최고치 대비',
      frac: Math.max(0, Math.min(1, x.followers / peak)),
      display: `${peak.toLocaleString('en-US')} 중 ${x.followers.toLocaleString('en-US')}`,
      hue: 'var(--accent)',
    });
  }

  const latest = snaps.at(-1);
  const foot = latest ? `스냅샷 ${n}개 · 최신 ${isoLabel(latest.capturedAt)} · ${latest.source}` : '아직 스냅샷이 없습니다';

  const bestDay = best as { label: string; gain: number } | null;
  const insight: PlatformVolume['insight'] =
    intervals === 0
      ? { value: 0, display: '없음', headline: '아직 추세를 볼 만큼 기록이 없습니다.', body: '스냅샷이 2개 있어야 선이 그려집니다. 다음 동기화 때 하나가 추가됩니다.', frac: 0 }
      : {
          value: net,
          display: signed(net),
          headline:
            net > 0
              ? `최근 ${days}일간 팔로워 ${net.toLocaleString('en-US')}명 증가.`
              : net < 0
                ? `최근 ${days}일간 팔로워 ${Math.abs(net).toLocaleString('en-US')}명 감소.`
                : `최근 ${days}일간 변동 없음.`,
          body: `추적한 ${intervals}일 중 ${gainedDays}일 증가${bestDay ? ` · 최고의 날 ${bestDay.label} (+${bestDay.gain.toLocaleString('en-US')})` : ''}`,
          frac: gainedDays / intervals,
        };

  return {
    headline: x.followers,
    chips,
    caption,
    meters,
    foot,
    series,
    intervals,
    gainedDays,
    dippedDays,
    trackedDays,
    net: intervals > 0 ? net : null,
    insight,
  };
}
