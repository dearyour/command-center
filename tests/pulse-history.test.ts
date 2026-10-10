import { describe, it, expect } from 'vitest';
import { runsPerDay, inboundPerDay, stateOfWorld } from '@/lib/pulse-history';

const NOW = Date.parse('2026-07-13T12:00:00Z'); // days 07-07 … 07-13

describe('runsPerDay — real agent-run counts bucketed by day', () => {
  it('counts runs into the last 7 UTC days, oldest first', () => {
    const runs = [
      { startedAt: '2026-07-13T09:00:00Z' },
      { startedAt: '2026-07-13T01:00:00Z' },
      { startedAt: '2026-07-12T23:00:00Z' },
      { startedAt: '2026-07-08T10:00:00Z' },
      { startedAt: '2026-07-01T10:00:00Z' }, // outside the window
    ];
    expect(runsPerDay(runs, 7, NOW)).toEqual([0, 1, 0, 0, 0, 1, 2]);
  });

  it('returns an all-zero series of the right length when there are no runs', () => {
    expect(runsPerDay([], 7, NOW)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('ignores unparseable timestamps', () => {
    expect(runsPerDay([{ startedAt: 'nope' }, { startedAt: '2026-07-13T00:00:00Z' }], 7, NOW)).toEqual([
      0, 0, 0, 0, 0, 0, 1,
    ]);
  });
});

describe('inboundPerDay — real inbound counts bucketed by day', () => {
  it('counts feed items by their ts into the last N days', () => {
    const items = [
      { ts: '2026-07-13T08:00:00Z' },
      { ts: '2026-07-11T08:00:00Z' },
      { ts: '2026-07-11T09:00:00Z' },
    ];
    expect(inboundPerDay(items, 7, NOW)).toEqual([0, 0, 0, 0, 2, 0, 1]);
  });
});

describe('stateOfWorld — honest attention-first status line', () => {
  const base = {
    activeAgents: 5,
    totalAgents: 8,
    connectorsDown: 0,
    inbound: 0,
    health: 92,
    brainConnected: true,
    failedRuns: 0,
  };

  it('leads with "All nominal" when nothing needs attention', () => {
    const segs = stateOfWorld(base);
    expect(segs[0]).toEqual({ text: '모두 정상', tone: 'ok' });
    // mock 3a states the roster as "N live · N idle" and the brain score at
    // every health, so the tail is three facts, not one fraction
    expect(segs).toContainEqual({ text: '에이전트 5개 가동 중', tone: 'ok' });
    expect(segs).toContainEqual({ text: '3개 대기', tone: 'dim' });
    expect(segs).toContainEqual({ text: '브레인 92/100', tone: 'ok' });
  });

  it('surfaces failed runs first, in error tone', () => {
    const segs = stateOfWorld({ ...base, failedRuns: 2 });
    expect(segs[0]).toEqual({ text: '실행 2건 실패', tone: 'err' });
    expect(segs.some((s) => s.text === '모두 정상')).toBe(false);
  });

  it('reports a degraded brain and down connectors', () => {
    const segs = stateOfWorld({ ...base, health: 55, connectorsDown: 2 });
    expect(segs).toContainEqual({ text: 'G-Brain 성능 저하 55/100', tone: 'warn' });
    expect(segs).toContainEqual({ text: '커넥터 2개 다운', tone: 'warn' });
  });

  it('reports an offline brain as an error', () => {
    const segs = stateOfWorld({ ...base, brainConnected: false, health: null });
    expect(segs).toContainEqual({ text: 'G-Brain 오프라인', tone: 'err' });
  });

  it('flags inbound needing reply', () => {
    const segs = stateOfWorld({ ...base, inbound: 7 });
    expect(segs).toContainEqual({ text: '답장 필요한 수신 7건', tone: 'accent' });
  });

  it('counts one failed run and one connector down', () => {
    const segs = stateOfWorld({ ...base, failedRuns: 1, connectorsDown: 1 });
    expect(segs).toContainEqual({ text: '실행 1건 실패', tone: 'err' });
    expect(segs).toContainEqual({ text: '커넥터 1개 다운', tone: 'warn' });
  });
});
