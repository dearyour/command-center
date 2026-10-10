import { describe, expect, test } from 'vitest';
import { newsletterVolume } from '@/lib/newsletter-volume';
import type { Newsletter } from '@/lib/newsletters';

/**
 * /social/beehiiv in the Brand Deals look (Alex, 2026-09-24). The
 * Newsletter Volume card, the sends step line, the open-rate dot matrix and
 * the one "Best open" card, all from the page's own rows: the Beehiiv
 * subscriber count and the past issues. The funnel meters are real ratios of
 * summed send stats (delivered of sent, opened of delivered, clicked of
 * opens, unsubscribed of delivered), never averaged percentages.
 */
const issue = (over: Partial<Newsletter>): Newsletter => ({
  id: 'p',
  title: 't',
  publishedAt: '2026-07-01T15:00:00.000Z',
  webUrl: null,
  recipients: 0,
  delivered: 0,
  deliveryRate: 0,
  opens: 0,
  openRate: 0,
  clicks: 0,
  clickRate: 0,
  unsubscribes: 0,
  unsubscribeRate: 0,
  spamReports: 0,
  webViews: 0,
  ...over,
});

// newest first, the way getNewsletters returns them
const ISSUES = [
  issue({ id: 'p2', title: 'Second', publishedAt: '2026-07-14T15:00:00.000Z', recipients: 1100, delivered: 1020, opens: 206, openRate: 20.2, clicks: 20, unsubscribes: 5 }),
  issue({ id: 'p1', title: 'First', publishedAt: '2026-07-07T15:00:00.000Z', recipients: 1000, delivered: 980, opens: 294, openRate: 30, clicks: 30, unsubscribes: 5, spamReports: 1 }),
];

describe('newsletterVolume: the Newsletter Volume card', () => {
  const v = newsletterVolume({ newsletters: ISSUES, subscribers: 5400 });

  test('headline is the live subscriber count, chips carry issues and the average open', () => {
    expect(v.headline).toBe(5400);
    expect(v.chips).toEqual([
      { tone: 'accent', text: '2호' },
      { tone: 'ok', text: '평균 오픈율 25.1%' },
    ]);
    expect(v.caption).toBe('구독자 수, Beehiiv 실시간 연동');
  });

  test('meters are the send funnel as ratios of summed stats', () => {
    expect(v.meters.map((m) => m.label)).toEqual(['전달됨', '열람', '클릭', '구독 해지']);
    expect(v.meters[0]).toMatchObject({ frac: 2000 / 2100, display: '발송 대비 95.2%', hue: 'var(--ok)' });
    expect(v.meters[1]).toMatchObject({ frac: 0.25, display: '전달 대비 25.0%', hue: 'var(--ramp-1)' });
    expect(v.meters[2]).toMatchObject({ frac: 0.1, display: '열람 대비 10.0%', hue: 'var(--ramp-3)' });
    expect(v.meters[3]).toMatchObject({ frac: 0.005, display: '전달 대비 0.50%', hue: 'var(--warn)' });
    expect(v.foot).toBe('2호 · 2,100건 발송');
  });

  test('sends and open rates run oldest first', () => {
    expect(v.sends).toEqual([
      { label: '7월 7일', count: 1000 },
      { label: '7월 14일', count: 1100 },
    ]);
    expect(v.openRates).toEqual([
      { label: '7월 7일', count: 30 },
      { label: '7월 14일', count: 20.2 },
    ]);
    expect(v).toMatchObject({ totalRecipients: 2100, totalClicks: 50, unsubscribes: 10, spamReports: 1, avgOpenRate: 25.1 });
  });

  test('the one insight card is the best-opened issue', () => {
    expect(v.insight).toEqual({
      display: '30.0%',
      headline: '최고 오픈율: First.',
      body: '2호 평균 25.1% · 7월 7일',
      frac: 0.3,
    });
  });

  test('the open-rate matrix keeps the six most recent issues', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      issue({ id: `x${i}`, publishedAt: `2026-08-${String(10 + i).padStart(2, '0')}T15:00:00.000Z`, openRate: 20 + i }),
    ).reverse();
    const m = newsletterVolume({ newsletters: many, subscribers: null });
    expect(m.openRates).toHaveLength(6);
    expect(m.openRates.at(-1)).toEqual({ label: '8월 17일', count: 27 });
    expect(m.sends).toHaveLength(8);
  });

  test('seeded issues are labelled as a preview, a missing count is not a zero', () => {
    const s = newsletterVolume({ newsletters: [issue({ id: 'seed-1', recipients: 10, delivered: 10 })], subscribers: null });
    expect(s.headline).toBeNull();
    expect(s.caption).toBe('실시간 구독자 수 없음 · BEEHIIV_API_KEY 추가 필요');
    expect(s.foot).toBe('1호 · 10건 발송 · 샘플 미리보기');
  });
});

describe('newsletterVolume with nothing sent', () => {
  const e = newsletterVolume({ newsletters: [], subscribers: null });

  test('empty meters, empty series, honest copy', () => {
    expect(e.chips).toEqual([]);
    expect(e.avgOpenRate).toBeNull();
    expect(e.meters).toEqual([]);
    expect(e.sends).toEqual([]);
    expect(e.openRates).toEqual([]);
    expect(e.foot).toBe('아직 발송한 호가 없습니다');
    expect(e.insight).toMatchObject({ display: '없음', headline: '아직 발송한 호가 없습니다.', frac: 0 });
  });
});
