import { describe, expect, test } from 'vitest';
import { filterLeadMagnets, leadMagnetVolume, LEAD_MAGNET_FILTERS, type LeadMagnetVolumeRow } from '@/lib/lead-magnet-volume';

/**
 * /content/lead-magnets in the Brand Deals look (Alex, 2026-09-24). The
 * Magnet Volume card, the pages-shipped step line, the capture and
 * destination dot matrices and the one "Since last launch" card, all from
 * the lead_magnets rows the table below renders. Nothing invented: no pages
 * means empty meters and honest copy.
 */
const TODAY = '2026-09-24';
const ROWS: LeadMagnetVolumeRow[] = [
  { name: 'Agent Stack', status: 'live', captures: 'email', destination: 'Beehiiv · newsletter + Cohort 2', source: 'IG reel', launchedAt: '2026-08-12' },
  { name: 'Call Kit', status: 'live', captures: 'booking', destination: 'Calendar · discovery', source: 'TikTok', launchedAt: '2026-09-20' },
  { name: 'Offer Doc', status: 'draft', captures: 'none', destination: 'Beehiiv', source: 'IG reel', launchedAt: '2026-09-01' },
  { name: 'Old Page', status: 'archived', captures: 'email', destination: 'Beehiiv · list', source: 'X thread', launchedAt: '2026-03-01' },
];

describe('leadMagnetVolume: the Magnet Volume card', () => {
  const v = leadMagnetVolume({ rows: ROWS, today: TODAY });

  test('headline is pages live, chips name what is not', () => {
    expect(v.headline).toBe(2);
    expect(v.total).toBe(4);
    expect(v.counts).toEqual({ live: 2, draft: 1, paused: 0, archived: 1 });
    expect(v.chips).toEqual([{ tone: 'warn', text: '초안 1' }, { text: '보관 1' }]);
    expect(v.caption).toBe('출시한 랜딩 페이지 4개 중');
  });

  test('meters: the live share and what each page captures, all of the same whole', () => {
    expect(v.meters).toEqual([
      { label: '운영 중 (2/4)', frac: 0.5, display: '4개 중 2개', hue: 'var(--ok)' },
      { label: '이메일 수집 (2/4)', frac: 0.5, display: '4개 중 2개', hue: 'var(--ramp-1)' },
      { label: '예약 수집 (1/4)', frac: 0.25, display: '4개 중 1개', hue: 'var(--ramp-3)' },
      { label: '아직 수집 없음 (1/4)', frac: 0.25, display: '4개 중 1개', hue: 'var(--warn)' },
    ]);
    expect(v.foot).toBe('도착지 2곳 · 캠페인 3개');
  });

  test('pages shipped: a cumulative weekly line over 12 weeks, ending today', () => {
    expect(v.series).toHaveLength(12);
    expect(v.series.at(-1)).toEqual({ label: '9월 24일', count: 4 });
    expect(v.series.at(-2)).toEqual({ label: '9월 17일', count: 3 });
    expect(v.series[0]).toEqual({ label: '7월 9일', count: 1 });
    expect(v.shippedInWindow).toBe(3);
  });

  test('captures and destinations as dot-matrix columns, destinations by short name', () => {
    expect(v.captures).toEqual([
      { label: '이메일', count: 2 },
      { label: '예약', count: 1 },
      { label: '없음', count: 1 },
    ]);
    expect(v.destinations).toEqual([
      { label: 'Beehiiv', count: 3 },
      { label: 'Calendar', count: 1 },
    ]);
  });

  test('the one insight card is how long since the newest page shipped', () => {
    expect(v.insight).toEqual({
      value: 4,
      headline: 'Call Kit 출시 이후 4일 지났습니다.',
      body: '4개 중 2개 운영 중 · 운영 비율만큼 눈금이 켜집니다.',
      frac: 0.5,
    });
  });

  test('a page launched today reads as today, a future date is not the newest', () => {
    const t = leadMagnetVolume({
      rows: [
        { ...ROWS[0], launchedAt: TODAY },
        { ...ROWS[1], name: 'Soon', launchedAt: '2026-10-01' },
      ],
      today: TODAY,
    });
    expect(t.insight.value).toBe(0);
    expect(t.insight.headline).toBe('Agent Stack이(가) 오늘 출시됐습니다.');
  });
});

describe('leadMagnetVolume with nothing shipped', () => {
  const e = leadMagnetVolume({ rows: [], today: TODAY });

  test('empty meters, flat line, honest copy', () => {
    expect(e.headline).toBe(0);
    expect(e.chips).toEqual([]);
    expect(e.meters).toEqual([]);
    expect(e.caption).toBe('아직 기록된 랜딩 페이지가 없습니다');
    expect(e.destinations).toEqual([]);
    expect(e.series.every((s) => s.count === 0)).toBe(true);
    expect(e.insight).toMatchObject({ display: '없음', headline: '아직 출시한 것이 없습니다.', frac: 0 });
  });
});

describe('filterLeadMagnets: the status pills over the table', () => {
  test('filters by a known status, anything else is all', () => {
    expect(LEAD_MAGNET_FILTERS).toEqual(['all', 'live', 'draft', 'paused', 'archived']);
    expect(filterLeadMagnets(ROWS, 'live').map((r) => r.name)).toEqual(['Agent Stack', 'Call Kit']);
    expect(filterLeadMagnets(ROWS, 'draft')).toHaveLength(1);
    expect(filterLeadMagnets(ROWS, undefined)).toHaveLength(4);
    expect(filterLeadMagnets(ROWS, 'bogus')).toHaveLength(4);
    expect(filterLeadMagnets(ROWS, ['live', 'draft'])).toHaveLength(2);
  });
});
