/**
 * Honest inputs for the operator-console pulse row. `runsPerDay` / `inboundPerDay`
 * turn real timestamped history (agent_runs, comms feed) into per-day series for
 * the sparklines; `stateOfWorld` distills live facts into one attention-first
 * status sentence. Pure + tested so the page stays a thin renderer  -  and so the
 * pulse row never shows a fabricated trend again.
 */

const DAY_MS = 86_400_000;

/** UTC date keys (YYYY-MM-DD) for the last `days` days, oldest first. */
function dayKeys(days: number, nowMs: number): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    keys.push(new Date(nowMs - i * DAY_MS).toISOString().slice(0, 10));
  }
  return keys;
}

/** Count ISO timestamps into the last `days` UTC-day buckets (oldest first). */
function countPerDay(timestamps: (string | undefined)[], days: number, nowMs: number): number[] {
  const keys = dayKeys(days, nowMs);
  const index = new Map(keys.map((k, i) => [k, i]));
  const counts = new Array<number>(days).fill(0);
  for (const ts of timestamps) {
    if (!ts) continue;
    const t = Date.parse(ts);
    if (!Number.isFinite(t)) continue;
    const i = index.get(new Date(t).toISOString().slice(0, 10));
    if (i !== undefined) counts[i] += 1;
  }
  return counts;
}

export function runsPerDay(runs: { startedAt?: string }[], days = 7, nowMs = Date.now()): number[] {
  return countPerDay(
    runs.map((r) => r.startedAt),
    days,
    nowMs,
  );
}

export function inboundPerDay(items: { ts?: string }[], days = 7, nowMs = Date.now()): number[] {
  return countPerDay(
    items.map((i) => i.ts),
    days,
    nowMs,
  );
}

export type Tone = 'ok' | 'warn' | 'err' | 'accent' | 'dim';
export type StateSegment = { text: string; tone: Tone };

export type PulseFacts = {
  activeAgents: number;
  totalAgents: number;
  connectorsDown: number; // connectors in an ERROR state; not_configured is NOT "down"
  inbound: number;
  health: number | null;
  brainConnected: boolean;
  failedRuns: number;
};


/**
 * One honest sentence about what needs the operator, worst-first: failed runs,
 * an unhealthy brain, downed connectors, then inbound to reply to  -  always
 * anchored by the live agent count. Leads with "All nominal" only when nothing
 * is actually wrong.
 */
export function stateOfWorld(f: PulseFacts): StateSegment[] {
  const segs: StateSegment[] = [];

  if (f.failedRuns > 0) segs.push({ text: `실행 ${f.failedRuns}건 실패`, tone: 'err' });
  if (!f.brainConnected) segs.push({ text: 'G-Brain 오프라인', tone: 'err' });
  else if (f.health != null && f.health < 70) segs.push({ text: `G-Brain 성능 저하 ${f.health}/100`, tone: 'warn' });
  if (f.connectorsDown > 0) segs.push({ text: `커넥터 ${f.connectorsDown}개 다운`, tone: 'warn' });
  if (f.inbound > 0) segs.push({ text: `답장 필요한 수신 ${f.inbound}건`, tone: 'accent' });

  const hadAttention = segs.length > 0;

  // Mock 3a runs the roster as "3 agents live · 6 idle". Idle is not a
  // problem, so it never counts toward hadAttention, but leaving it out made
  // "19/32" a fraction the reader has to do arithmetic on to learn the only
  // thing it is actually saying: thirteen seats are sitting still.
  const idle = Math.max(0, f.totalAgents - f.activeAgents);
  segs.push({ text: `에이전트 ${f.activeAgents}개 가동 중`, tone: f.activeAgents > 0 ? 'ok' : 'dim' });
  segs.push({ text: `${idle}개 대기`, tone: 'dim' });

  // The artboard states the brain score at every health ("brain 78/100"),
  // not only when it has gone bad. A number that appears only on failure
  // teaches the reader to read its absence as "fine", which is exactly the
  // habit that let /api/metrics report a null page count for two weeks.
  if (f.brainConnected && f.health != null && f.health >= 70) {
    segs.push({ text: `브레인 ${f.health}/100`, tone: 'ok' });
  }

  if (!hadAttention) segs.unshift({ text: '모두 정상', tone: 'ok' });

  return segs;
}

// ── Operating volume (Home's Deal Volume card, 2026-09-24) ──────────────────

export type VolumeMeterRow = { label: string; frac: number; display: string; hue: string };
export type OperatingVolume = {
  runsToday: number;
  failedToday: number;
  agentsToday: number;
  meters: VolumeMeterRow[];
};

const pct = (n: number, d: number) => (d > 0 ? n / d : 0);

/** Home's own numbers shaped like Brand Deals' Deal Volume: a headline for
    today plus four meters, each a real fraction of its own whole. Runs count
    toward "today" by local midnight, the day Alex lived. */
export function operatingVolume(x: {
  connected: number;
  totalConnections: number;
  activeAgents: number;
  totalAgents: number;
  health: number | null;
  runs: { agentId: string; ok: boolean; finishedAt: string }[];
  now?: Date;
}): OperatingVolume {
  const now = x.now ?? new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const today = x.runs.filter((r) => {
    const t = Date.parse(r.finishedAt);
    return Number.isFinite(t) && t >= start.getTime() && t <= now.getTime();
  });
  const ok = today.filter((r) => r.ok).length;
  return {
    runsToday: today.length,
    failedToday: today.length - ok,
    agentsToday: new Set(today.map((r) => r.agentId)).size,
    meters: [
      { label: `연결된 시스템 (${x.connected}/${x.totalConnections})`, frac: pct(x.connected, x.totalConnections), display: `${Math.round(pct(x.connected, x.totalConnections) * 100)}%`, hue: 'var(--accent)' },
      { label: `가동 중인 에이전트 (${x.activeAgents}/${x.totalAgents})`, frac: pct(x.activeAgents, x.totalAgents), display: `${Math.round(pct(x.activeAgents, x.totalAgents) * 100)}%`, hue: 'var(--ramp-1)' },
      { label: `오늘 성공한 실행 (${ok}/${today.length})`, frac: pct(ok, today.length), display: today.length ? `성공 ${ok} · 실패 ${today.length - ok}` : '아직 실행 없음', hue: today.length - ok > 0 ? 'var(--warn)' : 'var(--ok)' },
      { label: 'G-Brain 상태', frac: x.health === null ? 0 : Math.max(0, Math.min(1, x.health / 100)), display: x.health === null ? '오프라인' : `${x.health} / 100`, hue: 'var(--ramp-4)' },
    ],
  };
}

// ── Home's second row (the Brand Deals activity line, dots and insight) ─────

/** The last `days` LOCAL days, oldest first, each labelled "9월 3일" and counted
    from real timestamps. Quiet days stay in as zeros so the line is honest. */
export function dailySeries(timestamps: (string | undefined)[], days = 14, now: Date = new Date()): { label: string; count: number }[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const out = Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() - (days - 1 - i));
    return { key: d.getTime(), label: `${d.getMonth() + 1}월 ${d.getDate()}일`, count: 0 };
  });
  for (const ts of timestamps) {
    if (!ts) continue;
    const t = new Date(ts);
    if (!Number.isFinite(t.getTime()) || t.getTime() > now.getTime()) continue;
    t.setHours(0, 0, 0, 0);
    const slot = out.find((o) => o.key === t.getTime());
    if (slot) slot.count += 1;
  }
  return out.map(({ label, count }) => ({ label, count }));
}

const SOURCES = ['email', 'whatsapp', 'slack'] as const;
const SOURCE_LABEL: Record<(typeof SOURCES)[number], string> = { email: '이메일', whatsapp: 'WhatsApp', slack: 'Slack' };

/** Inbound per source, in a fixed order, zeros kept (the DotMatrix columns). */
export function sourceMix(items: { source: string }[]): { label: string; count: number }[] {
  return SOURCES.map((s) => ({ label: SOURCE_LABEL[s], count: items.filter((i) => i.source === s).length }));
}

/** Home's one gradient card: everything waiting on Alex right now, and
    how much of today's work that is (waiting / (waiting + done today)). */
export function homeAttention(x: { inbound: number; failedToday: number; connectorsDown: number; doneToday: number }): { count: number; headline: string; frac: number } {
  const count = x.inbound + x.failedToday + x.connectorsDown;
  const parts = [
    x.inbound > 0 ? `수신 ${x.inbound}건` : null,
    x.failedToday > 0 ? `실패한 실행 ${x.failedToday}건` : null,
    x.connectorsDown > 0 ? `커넥터 ${x.connectorsDown}개 다운` : null,
  ].filter(Boolean);
  return {
    count,
    headline: count === 0 ? '기다리고 있는 일이 없습니다.' : parts.join(' · '),
    frac: count === 0 ? 0 : count / (count + Math.max(0, x.doneToday)),
  };
}
