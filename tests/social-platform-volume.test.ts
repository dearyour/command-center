import { describe, expect, test } from 'vitest';
import { platformVolume } from '@/lib/social-volume';

/**
 * /social/[platform] in the Brand Deals look (Alex, 2026-09-24). The page
 * you land on from a /social account tile keeps the slab: a Follower Volume
 * card, a daily-gains step line and the one "30-day change" card, all shaped
 * from that platform's own snapshots and growth windows. No invented numbers:
 * one snapshot is not a trend, and no snapshots is an empty card.
 */
const SNAPS = [
  { capturedAt: '2026-06-01', followers: 1500, source: 'zernio-config' }, // the all-time peak
  { capturedAt: '2026-08-20', followers: 900, source: 'zernio-config' }, // before the window
  { capturedAt: '2026-08-26', followers: 1000, source: 'zernio-config' }, // +100, first day in window
  { capturedAt: '2026-09-10', followers: 1100, source: 'zernio-config' }, // +100
  { capturedAt: '2026-09-20', followers: 1050, source: 'zernio-config' }, // -50
  { capturedAt: '2026-09-23', followers: 1050, source: 'zernio-config' }, // flat
  { capturedAt: '2026-09-24', followers: 1250, source: 'zernio-live' }, // +200
];

const GROWTH = { d7: 1.234, d30: -2.5, d60: 4, allTime: -16.7 };

describe('platformVolume: the Follower Volume card', () => {
  const v = platformVolume({ label: 'Instagram', followers: 1250, growth: GROWTH, snapshots: SNAPS, today: '2026-09-24' });

  test('headline is the current follower count, chips carry the 7d and 30d growth', () => {
    expect(v.headline).toBe(1250);
    expect(v.chips).toEqual([
      { tone: 'ok', text: '+1.23% (7일)' },
      { tone: 'err', text: '-2.50% (30일)' },
    ]);
    expect(v.caption).toBe('Instagram 팔로워 · 스냅샷 7개 · 6월 1일부터');
  });

  test('meters are honest fractions: days up, days down, days tracked, share of the peak', () => {
    expect(v.meters).toEqual([
      { label: '증가한 날 (3/5)', frac: 0.6, display: '5일 중 3일', hue: 'var(--ok)' },
      { label: '감소한 날 (1/5)', frac: 0.2, display: '5일 중 1일', hue: 'var(--err)' },
      { label: '추적한 날 (5/30)', frac: 5 / 30, display: '17%', hue: 'var(--ramp-1)' },
      { label: '역대 최고치 대비', frac: 1250 / 1500, display: '1,500 중 1,250', hue: 'var(--accent)' },
    ]);
    expect(v.foot).toBe('스냅샷 7개 · 최신 9월 24일 · zernio-live');
  });

  test('the step line is followers gained per day over 30 days, dips sit at zero', () => {
    expect(v.series).toHaveLength(30);
    expect(v.series[0]).toEqual({ label: '8월 26일', count: 100 });
    expect(v.series.at(-1)).toEqual({ label: '9월 24일', count: 200 });
    expect(v.series.find((s) => s.label === '9월 20일')?.count).toBe(0);
    expect(v.gainedDays).toBe(3);
    expect(v.intervals).toBe(5);
    expect(v.net).toBe(350);
  });

  test('the one insight card is the net change over the window', () => {
    expect(v.insight).toEqual({
      value: 350,
      display: '+350',
      headline: '최근 30일간 팔로워 350명 증가.',
      body: '추적한 5일 중 3일 증가 · 최고의 날 9월 24일 (+200)',
      frac: 0.6,
    });
  });

  test('a net loss says so', () => {
    const d = platformVolume({
      label: 'X',
      followers: 950,
      growth: { d7: null, d30: null, d60: null, allTime: null },
      snapshots: [
        { capturedAt: '2026-09-22', followers: 1000, source: 's' },
        { capturedAt: '2026-09-24', followers: 950, source: 's' },
      ],
      today: '2026-09-24',
    });
    expect(d.chips).toEqual([]);
    expect(d.insight).toMatchObject({ value: -50, display: '-50', headline: '최근 30일간 팔로워 50명 감소.', frac: 0 });
    expect(d.insight.body).toBe('추적한 1일 중 0일 증가');
  });
});

describe('platformVolume with little or nothing to show', () => {
  test('no snapshots: empty meters, empty line, honest copy', () => {
    const e = platformVolume({ label: 'LinkedIn', followers: null, growth: { d7: null, d30: null, d60: null, allTime: null }, snapshots: [], today: '2026-09-24' });
    expect(e.headline).toBeNull();
    expect(e.chips).toEqual([]);
    expect(e.caption).toBe('아직 팔로워 수 기록이 없습니다');
    expect(e.meters).toEqual([]);
    expect(e.foot).toBe('아직 스냅샷이 없습니다');
    expect(e.series).toHaveLength(30);
    expect(e.series.every((s) => s.count === 0)).toBe(true);
    expect(e.net).toBeNull();
    expect(e.insight).toMatchObject({ value: 0, display: '없음', frac: 0, headline: '아직 추세를 볼 만큼 기록이 없습니다.' });
  });

  test('one snapshot is a reading, not a trend: no gained/dipped meters', () => {
    const one = platformVolume({
      label: 'TikTok',
      followers: 400,
      growth: { d7: null, d30: null, d60: null, allTime: null },
      snapshots: [{ capturedAt: '2026-09-24', followers: 400, source: 's' }],
      today: '2026-09-24',
    });
    expect(one.meters.map((m) => m.label)).toEqual(['추적한 날 (1/30)', '역대 최고치 대비']);
    expect(one.intervals).toBe(0);
    expect(one.insight.display).toBe('없음');
  });
});
