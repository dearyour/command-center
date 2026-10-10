import { describe, expect, test } from 'vitest';
import { socialVolume } from '@/lib/social-volume';

/**
 * /social in the Brand Deals look (Alex, 2026-09-24). The Audience Volume
 * card, the posting step line, the platform mix and the one "Needs reply"
 * card, all shaped from the page's own real rows: the channel follower
 * counts, the audience growth, the Instagram DM threads, the publish queue
 * and Zernio's posting history. No numbers are invented here.
 */
const CHANNELS = [
  { key: 'instagram', label: 'Instagram', value: 6000 },
  { key: 'tiktok', label: 'TikTok', value: 2000 },
  { key: 'twitter', label: 'X', value: 500 },
  { key: 'youtube', label: 'YouTube', value: 1000 },
  { key: 'linkedin', label: 'LinkedIn', value: null },
  { key: 'email', label: 'Email list', value: 500 },
];

describe('socialVolume', () => {
  const v = socialVolume({
    channels: CHANNELS,
    total: 10_000,
    growth7: 1.234,
    leader: 'TikTok',
    dmThreads: [
      { name: 'Ava', unreplied: true },
      { name: 'Ben', unreplied: false },
      { name: 'Cy', unreplied: true },
      { name: 'Dee', unreplied: false },
    ],
    queued: 2,
    postDays: [
      { date: '2026-09-24', platforms: ['instagram', 'tiktok'] },
      { date: '2026-09-24', platforms: ['instagram'] },
      { date: '2026-09-20', platforms: ['twitter', 'mastodon'] },
      { date: '2026-07-01', platforms: ['youtube'] }, // outside 30 days
    ],
    today: '2026-09-24',
  });

  test('headline is the whole audience, chips carry growth, replies owed and the queue', () => {
    expect(v.headline).toBe(10_000);
    expect(v.chips).toEqual([
      { tone: 'ok', text: '+1.23% (7일)' },
      { tone: 'warn', text: '답장 필요 2' },
      { tone: 'accent', text: '대기 2' },
    ]);
    expect(v.caption).toBe('활성 채널 5개 합계 · 7일 성장 1위 TikTok');
  });

  test('meters are the four biggest channels as shares of total reach', () => {
    expect(v.meters.map((m) => m.label)).toEqual(['Instagram', 'TikTok', 'YouTube', 'X']);
    expect(v.meters[0]).toMatchObject({ frac: 0.6, display: '6,000 · 60%', hue: 'var(--ramp-1)' });
    expect(v.meters[3]).toMatchObject({ frac: 0.05, display: '500 · 5%', hue: 'var(--ramp-4)' });
    expect(v.foot).toBe('전체 도달 대비 비중 · 작은 채널 2개 더 있음');
  });

  test('posting series: one point per day for 30 days, ending today', () => {
    expect(v.series).toHaveLength(30);
    expect(v.series.at(-1)).toEqual({ label: '9월 24일', count: 2 });
    expect(v.series.find((s) => s.label === '9월 20일')?.count).toBe(1);
    expect(v.series[0].label).toBe('8월 26일');
    expect(v.postsInWindow).toBe(3);
  });

  test('platform mix counts cross-posts per platform, unknown platforms ignored', () => {
    expect(v.mix).toEqual([
      { label: 'IG', count: 2 },
      { label: 'TT', count: 1 },
      { label: 'X', count: 1 },
      { label: 'YT', count: 0 },
      { label: 'LI', count: 0 },
    ]);
  });

  test('the one insight card is the DMs waiting on Alex', () => {
    expect(v.insight.value).toBe(2);
    expect(v.insight.headline).toBe('Instagram 스레드 4개 중 2개에 답장이 필요합니다.');
    expect(v.insight.body).toBe('Ava · Cy');
    expect(v.insight.frac).toBeCloseTo(0.5);
  });

  test('negative growth is an err chip', () => {
    const d = socialVolume({ channels: CHANNELS, total: 10_000, growth7: -12.5, leader: null, dmThreads: [], queued: 0, postDays: [], today: '2026-09-24' });
    expect(d.chips).toEqual([{ tone: 'err', text: '-12.5% (7일)' }]);
    expect(d.caption).toBe('활성 채널 5개 합계');
  });
});

describe('socialVolume with nothing to show', () => {
  const e = socialVolume({ channels: [], total: 0, growth7: null, leader: null, dmThreads: [], queued: 0, postDays: [], today: '2026-09-24' });

  test('empty meters and honest copy', () => {
    expect(e.headline).toBe(0);
    expect(e.chips).toEqual([]);
    expect(e.meters).toEqual([]);
    expect(e.caption).toBe('아직 보고 중인 채널이 없습니다');
    expect(e.series.every((s) => s.count === 0)).toBe(true);
    expect(e.insight).toMatchObject({ value: 0, frac: 0, headline: '받은편지함이 비었습니다.', body: '아직 Instagram 스레드가 없습니다.' });
  });

  test('a channel with no reading is an empty meter, not a zero pretending to be data', () => {
    const o = socialVolume({
      channels: [{ key: 'linkedin', label: 'LinkedIn', value: null }],
      total: 0,
      growth7: null,
      leader: null,
      dmThreads: [],
      queued: 0,
      postDays: [],
      today: '2026-09-24',
    });
    expect(o.meters).toEqual([{ label: 'LinkedIn', frac: 0, display: '오프라인', hue: 'var(--ramp-1)' }]);
  });
});
