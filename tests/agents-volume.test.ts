import { describe, expect, test } from 'vitest';
import { agentsVolume } from '@/lib/agents-volume';
import type { PaperclipAgent, PaperclipIssue, PaperclipRun } from '@/lib/connectors/paperclip';

/**
 * /agents in the Brand Deals look (Alex, 2026-09-24: "rebuild the entire OS
 * in that light"). The Agent Volume card, the run-activity step line, the
 * runs-by-seat and task-lane dot matrices and the one "Needs you" card all
 * come from this pure view-model, fed with the live Paperclip board payload
 * BoardLive already polls. An unreachable board shows nothing, never zeros
 * dressed as health.
 */
const NOW = new Date('2026-09-24T18:00:00');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

const seat = (name: string, over: Partial<PaperclipAgent> = {}): PaperclipAgent => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  status: 'idle',
  adapterType: 'claude_local',
  model: 'claude-opus',
  lastHeartbeatAt: null,
  ...over,
});

const issue = (status: string, n: number): PaperclipIssue => ({
  id: `i-${status}-${n}`,
  identifier: `BEN-${n}`,
  title: `task ${n}`,
  status,
  assigneeName: null,
  updatedAt: null,
});

let runSeq = 0;
const run = (agentId: string, status: string, startedAt: string | null): PaperclipRun => ({
  id: `r${runSeq++}`,
  agentId,
  agentName: null,
  status,
  startedAt,
  finishedAt: null,
});

const AGENTS: PaperclipAgent[] = [
  seat('Conductor', { status: 'running', lastHeartbeatAt: hoursAgo(1) }),
  seat('Tech Lead', { status: 'idle', lastHeartbeatAt: hoursAgo(2), model: 'gpt-5' }),
  seat('Marketing Head', { status: 'paused', lastHeartbeatAt: hoursAgo(30) }),
  seat('Finance Head', { status: 'error', model: null }),
];

const ISSUES: PaperclipIssue[] = [
  issue('in_progress', 1),
  issue('in_review', 2),
  issue('blocked', 3),
  issue('todo', 4),
  issue('todo', 5),
  issue('done', 6),
  issue('done', 7),
  issue('done', 8),
  issue('cancelled', 9),
];

const RUNS: PaperclipRun[] = [
  run('conductor', 'running', hoursAgo(0.1)),
  run('conductor', 'succeeded', hoursAgo(3)),
  run('conductor', 'succeeded', hoursAgo(5)),
  run('tech-lead', 'failed', hoursAgo(6)),
  run('tech-lead', 'completed', hoursAgo(50)),
  run('finance-head', 'timed_out', hoursAgo(100)),
  run('conductor', 'succeeded', hoursAgo(24 * 20)), // outside the 14-day window
  run('conductor', 'succeeded', null), // never stamped
];

const live = { connected: true, agents: AGENTS, issues: ISSUES, runs: RUNS };

describe('agentsVolume: the Agent Volume card', () => {
  const v = agentsVolume(live, NOW);

  test('the headline is the seat count and the chips split it by live state', () => {
    expect(v.headline).toBe(4);
    expect(v.counts).toEqual({ running: 1, idle: 1, paused: 1, error: 1 });
    expect(v.chips).toEqual([
      { tone: 'ok', text: '실행 중 1' },
      { text: '대기 1' },
      { tone: 'warn', text: '일시정지 1' },
      { tone: 'err', text: '오류 1' },
    ]);
    const total = v.chips.reduce((n, c) => n + Number(c.text.split(' ').at(-1)), 0);
    expect(total).toBe(v.headline);
  });

  test('the caption names how many distinct models hold seats', () => {
    expect(v.caption).toContain('모델 2개');
  });

  test('four meters, each an honest fraction of a real whole', () => {
    expect(v.meters.map((m) => m.label)).toEqual([
      '실행 중인 자리 (1/4)',
      '24시간 내 하트비트 (2/4)',
      '성공한 실행 · 14일 (3/5)',
      '완료한 작업 (3/8)',
    ]);
    expect(v.meters.map((m) => m.frac)).toEqual([0.25, 0.5, 0.6, 3 / 8]);
    expect(v.meters[2].display).toBe('성공 3 · 실패 2');
    for (const m of v.meters) {
      expect(m.frac).toBeGreaterThanOrEqual(0);
      expect(m.frac).toBeLessThanOrEqual(1);
      expect(m.hue).toMatch(/^var\(--/);
    }
  });

  test('the foot counts the open queue and the day of runs', () => {
    expect(v.openTasks).toBe(5);
    expect(v.foot).toBe('열린 작업 5개 · 24시간 내 실행 4회');
  });
});

describe('agentsVolume: run activity and the second row', () => {
  const v = agentsVolume(live, NOW);

  test('the step line buckets stamped runs by local day over 14 days', () => {
    expect(v.series).toHaveLength(14);
    expect(v.series.at(-1)?.label).toBe('9월 24일');
    expect(v.series.reduce((n, s) => n + s.count, 0)).toBe(6);
    expect(v.runsInWindow).toBe(6);
    expect(v.failedInWindow).toBe(2);
  });

  test('runs by seat: busiest first, first word of the seat name', () => {
    expect(v.bySeat).toEqual([
      { label: 'Conductor', count: 3 },
      { label: 'Tech', count: 2 },
      { label: 'Finance', count: 1 },
    ]);
  });

  test('task lanes: the open stages, always all five, review folded together', () => {
    expect(v.lanes).toEqual([
      { label: '진행 중', count: 1 },
      { label: '검토', count: 1 },
      { label: '할 일', count: 2 },
      { label: '막힘', count: 1 },
      { label: '백로그', count: 0 },
    ]);
  });

  test('the one insight: tasks waiting on review or unblocking', () => {
    expect(v.insight.value).toBe(2);
    expect(v.insight.headline).toMatch(/작업 2개/);
    expect(v.insight.body).toContain('오류 자리 1개');
    expect(v.insight.body).toContain('24시간 내 실패한 실행 1회');
    expect(v.insight.frac).toBeCloseTo(2 / 5);
  });
});

describe('agentsVolume: honest when there is nothing', () => {
  test('an unreachable board shows no meters, no series, and says so', () => {
    const v = agentsVolume({ connected: false, agents: [], issues: [], runs: [] }, NOW);
    expect(v.headline).toBe(0);
    expect(v.meters).toEqual([]);
    expect(v.chips).toEqual([{ tone: 'err', text: '보드 연결 불가' }]);
    expect(v.series.every((s) => s.count === 0)).toBe(true);
    expect(v.bySeat).toEqual([]);
    expect(v.insight.value).toBe(0);
    expect(v.insight.frac).toBe(0);
    expect(v.insight.headline).toMatch(/연결할 수 없습니다/);
  });

  test('a quiet board never divides by zero or lights a meter it cannot back', () => {
    const v = agentsVolume({ connected: true, agents: [seat('Conductor')], issues: [], runs: [] }, NOW);
    expect(v.meters.map((m) => m.frac)).toEqual([0, 0, 0, 0]);
    expect(v.meters[2].display).toBe('끝난 실행 없음');
    expect(v.meters[3].display).toBe('작업 없음');
    expect(v.insight.headline).toMatch(/기다리는 것이 없습니다/);
  });
});

describe('runs by seat never repeats a column label (review 2026-09-24)', () => {
  test('seats sharing a first word are numbered', async () => {
    const { shortLabels } = await import('@/lib/short-labels');
    expect(shortLabels(['Sales Agent', 'Sales Calls Data'])).toEqual(['Sales', 'Sales 2']);
    const src = (await import('node:fs')).readFileSync('lib/agents-volume.ts', 'utf8');
    expect(src).toContain('shortLabels(topSeats');
  });
});

describe('the window says what the fetched runs actually cover (review 2026-09-24)', () => {
  const board = (runs: PaperclipRun[]) => ({ connected: true, agents: [seat('Sales Agent')], issues: [], runs });
  test('a full page of runs that starts inside the window relabels it "since <day>"', () => {
    const runs = Array.from({ length: 120 }, (_, i) => run('sales-agent', 'succeeded', hoursAgo(i * 0.5)));
    const v = agentsVolume(board(runs), NOW, 14);
    expect(v.window).toBe('9월 22일부터');
    expect(v.meters.find((m) => m.label.startsWith('성공한 실행'))!.label).toMatch(/^성공한 실행 · 9월 22일부터/);
  });
  test('fewer runs than the fetch cap cover the whole window', () => {
    const v = agentsVolume(board([run('sales-agent', 'succeeded', hoursAgo(2))]), NOW, 14);
    expect(v.window).toBe('14일');
  });
});
