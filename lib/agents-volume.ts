import type { Meter, Tone } from '@/components/slab';
import type { SeriesPoint } from '@/components/slab-charts';
import type { BoardLivePayload } from '@/lib/board-live';
import { boardStats, RUN_OK } from '@/lib/board-live';
import { dailySeries } from '@/lib/pulse-history';
import { shortLabels } from '@/lib/short-labels';

/**
 * /agents in the Brand Deals look (Alex, 2026-09-24). One pure pass over
 * the live Paperclip payload BoardLive already polls produces every number the
 * slab shows: the Agent Volume headline, chips and meters, the run-activity
 * step line, runs by seat, the open task lanes and the single "Needs you"
 * insight. An unreachable board yields empty meters and says so.
 */
export type AgentsVolume = {
  headline: number;
  counts: { running: number; idle: number; paused: number; error: number };
  chips: Array<{ tone?: Tone; text: string }>;
  caption: string;
  meters: Meter[];
  foot: string;
  openTasks: number;
  series: SeriesPoint[];
  /** What the run numbers cover: '14d', or 'since Sep 22' when the board's
      capped page of runs starts inside the window. */
  window: string;
  runsInWindow: number;
  failedInWindow: number;
  bySeat: SeriesPoint[];
  lanes: SeriesPoint[];
  insight: { value: number; headline: string; body: string; frac: number };
};

const PENDING = new Set(['running', 'queued', 'pending']);
const frac = (n: number, d: number) => (d > 0 ? Math.max(0, Math.min(1, n / d)) : 0);
const pct = (f: number) => `${Math.round(f * 100)}%`;

/** Open stages in board order; the board spells review two ways. */
const LANES: Array<[string, string[]]> = [
  ['진행 중', ['in_progress']],
  ['검토', ['in_review', 'review']],
  ['할 일', ['todo']],
  ['막힘', ['blocked']],
  ['백로그', ['backlog']],
];

/** The board hands back its latest runs only (app/agents + /api/board/live
    fetch 120); a full page may not reach back across the whole window. */
export const RUNS_FETCHED = 120;

export function agentsVolume(
  p: Pick<BoardLivePayload, 'connected' | 'agents' | 'issues' | 'runs'>,
  now: Date = new Date(),
  days = 14,
): AgentsVolume {
  const stats = boardStats(p, now.getTime());
  const byStatus = (s: string) => p.agents.filter((a) => a.status === s).length;
  const counts = { running: byStatus('running'), idle: byStatus('idle'), paused: byStatus('paused'), error: byStatus('error') };

  // Runs inside the window, by local day. The board returns its latest runs
  // only, so the line is the fetched history, never an extrapolation.
  const series = dailySeries(p.runs.map((r) => r.startedAt ?? undefined), days, now);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const inWindow = p.runs.filter((r) => {
    const t = r.startedAt ? new Date(r.startedAt).getTime() : NaN;
    return Number.isFinite(t) && t >= start.getTime() && t <= now.getTime();
  });
  const oldest = Math.min(...p.runs.map((r) => (r.startedAt ? new Date(r.startedAt).getTime() : Infinity)));
  const truncated = p.runs.length >= RUNS_FETCHED && Number.isFinite(oldest) && oldest > start.getTime();
  const window = truncated
    ? `${new Date(oldest).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}부터`
    : `${days}일`;
  const failed = (s: string) => !RUN_OK.has(s) && !PENDING.has(s);
  const finished = inWindow.filter((r) => !PENDING.has(r.status));
  const okRuns = finished.filter((r) => RUN_OK.has(r.status)).length;
  const failedInWindow = finished.filter((r) => failed(r.status)).length;
  const dayAgo = now.getTime() - 86_400_000;
  const failed24h = inWindow.filter((r) => failed(r.status) && new Date(r.startedAt as string).getTime() > dayAgo).length;

  // Runs by seat: busiest first, the seat's first word as the column label.
  const nameById = new Map(p.agents.map((a) => [a.id, a.name]));
  const perSeat = new Map<string, number>();
  for (const r of inWindow) {
    const name = r.agentName ?? nameById.get(r.agentId) ?? r.agentId.slice(0, 8);
    perSeat.set(name, (perSeat.get(name) ?? 0) + 1);
  }
  const topSeats = [...perSeat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const seatLabels = shortLabels(topSeats.map(([name]) => name));
  const bySeat = topSeats.map(([, count], i) => ({ label: seatLabels[i], count }));

  const live = p.issues.filter((i) => i.status !== 'cancelled');
  const done = live.filter((i) => i.status === 'done').length;
  const lanes = LANES.map(([label, statuses]) => ({ label, count: live.filter((i) => statuses.includes(i.status)).length }));
  const models = new Set(p.agents.map((a) => a.model).filter(Boolean)).size;

  if (!p.connected) {
    return {
      headline: 0,
      counts,
      chips: [{ tone: 'err', text: '보드 연결 불가' }],
      caption: 'Paperclip이 응답하지 않아 셀 것이 없습니다',
      meters: [],
      foot: '실시간 보드 없음',
      openTasks: 0,
      series,
      window,
      runsInWindow: 0,
      failedInWindow: 0,
      bySeat: [],
      lanes,
      insight: { value: 0, headline: '보드에 연결할 수 없습니다.', body: 'tailnet에서 Paperclip이 응답하기 전까지는 숫자가 없습니다.', frac: 0 },
    };
  }

  const chips: AgentsVolume['chips'] = [];
  if (counts.running) chips.push({ tone: 'ok', text: `실행 중 ${counts.running}` });
  if (counts.idle) chips.push({ text: `대기 ${counts.idle}` });
  if (counts.paused) chips.push({ tone: 'warn', text: `일시정지 ${counts.paused}` });
  if (counts.error) chips.push({ tone: 'err', text: `오류 ${counts.error}` });

  const seats = stats.seats;
  const runF = frac(counts.running, seats);
  const beatF = frac(stats.heartbeats24h, seats);
  const okF = frac(okRuns, finished.length);
  const doneF = frac(done, live.length);
  const meters: Meter[] = [
    { label: `실행 중인 자리 (${counts.running}/${seats})`, frac: runF, display: counts.running ? pct(runF) : '실행 중 없음', hue: 'var(--ok)' },
    { label: `24시간 내 하트비트 (${stats.heartbeats24h}/${seats})`, frac: beatF, display: seats ? pct(beatF) : '자리 없음', hue: 'var(--accent)' },
    {
      label: `성공한 실행 · ${window} (${okRuns}/${finished.length})`,
      frac: okF,
      display: finished.length ? `성공 ${okRuns} · 실패 ${failedInWindow}` : '끝난 실행 없음',
      hue: 'var(--ramp-1)',
    },
    { label: `완료한 작업 (${done}/${live.length})`, frac: doneF, display: live.length ? pct(doneF) : '작업 없음', hue: 'var(--ramp-4)' },
  ];

  const waiting = lanes[1].count + lanes[3].count;
  const insight = {
    value: waiting,
    headline: waiting ? `검토 또는 차단 해제를 기다리는 작업 ${waiting}개.` : '보드에서 당신을 기다리는 것이 없습니다.',
    body: `오류 자리 ${counts.error}개 · 24시간 내 실패한 실행 ${failed24h}회`,
    frac: frac(waiting, stats.openTasks),
  };

  return {
    headline: seats,
    counts,
    chips,
    caption: `Paperclip 보드의 자리 · 모델 ${models}개`,
    meters,
    foot: `열린 작업 ${stats.openTasks}개 · 24시간 내 실행 ${stats.runs24h}회`,
    openTasks: stats.openTasks,
    series,
    window,
    runsInWindow: inWindow.length,
    failedInWindow,
    bySeat,
    lanes,
    insight,
  };
}
