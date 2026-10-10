import { describe, expect, test } from 'vitest';
import { moneyVolume, chargeSizes, spendSeries } from '@/lib/finances-volume';
import type { IncomeAccount } from '@/lib/finances';
import type { SpendRow } from '@/lib/spend-report';

/**
 * /finances in the Brand Deals look (Alex, 2026-09-24: "the current metrics
 * displayed on each page should be displayed very similarly to how they are in
 * the Brand Deals tab"). The page's own numbers, shaped like Deal Volume: a
 * count-up headline, dot chips, a stack of meters that are honest fractions of
 * a real whole, and the one insight card. Nothing here invents money.
 */

const acct = (over: Partial<IncomeAccount>): IncomeAccount => ({
  id: 'stripe',
  processor: 'Stripe',
  label: 'Stripe · Launchpad Cohort',
  configured: true,
  live: true,
  income: 0,
  incomeUpper: null,
  unsplittableCustomers: 0,
  ...over,
});

const row = (date: string, dollars: number, over: Partial<SpendRow> = {}): SpendRow => ({
  date,
  description: 'x',
  amountCents: Math.round(dollars * 100),
  direction: 'out',
  category: 'Software',
  card: 'platinum',
  ...over,
});

describe('moneyVolume', () => {
  const accounts = [
    acct({ id: 'stripe', income: 6000 }),
    acct({ id: 'stripe-vantage', label: 'Stripe · Vantage', income: 2000 }),
    acct({ id: 'paykit-lc', processor: 'PayKit', label: 'PayKit · Launchpad Cohort', live: false, configured: true, income: null }),
  ];
  const v = moneyVolume({ accounts, expenses: 2000, expensesLive: true, monthLabel: 'Aug 2026', statementIsThisMonth: true });

  test('the headline is month-to-date income, with money out and net as dot chips', () => {
    expect(v.headline).toBe(8000);
    expect(v.upper).toBeNull();
    expect(v.chips).toEqual([
      { tone: 'err', text: '지출 $2,000' },
      { tone: 'ok', text: '순액 +$6,000' },
    ]);
    expect(v.caption).toBe('이번 달 수입 · 결제 수단 2/3 연동');
  });

  test('one meter per processor, each its real share of income, then spend as a share of income', () => {
    expect(v.meters.map((m) => m.label)).toEqual([
      'Stripe · Launchpad Cohort',
      'Stripe · Vantage',
      'PayKit · Launchpad Cohort',
      '수입 대비 지출 · Aug 2026',
    ]);
    expect(v.meters[0].frac).toBeCloseTo(0.75);
    expect(v.meters[1].frac).toBeCloseTo(0.25);
    expect(v.meters[0].display).toBe('$6,000');
    // a keyed account that is not pulling reads pending, never $0
    expect(v.meters[2]).toMatchObject({ frac: 0, display: '수집 대기' });
    expect(v.meters[3]).toMatchObject({ display: '25%', hue: 'var(--warn)' });
    expect(v.meters[3].frac).toBeCloseTo(0.25);
    expect(v.foot).toBe('업로드한 Aug 2026 명세서 기준 지출');
  });

  test('the insight card is what was kept, as a fraction of what came in', () => {
    expect(v.insight.display).toBe('+$6,000');
    expect(v.insight.frac).toBeCloseTo(0.75);
    expect(v.insight.headline).toBe('이번 달 수입 $8,000 중 남은 돈.');
  });

  test('a bounded month shows its floor as the headline and carries the ceiling', () => {
    const b = moneyVolume({
      accounts: [acct({ id: 'paykit-lc', income: 1000, incomeUpper: 1500, unsplittableCustomers: 2 })],
      expenses: 0,
      expensesLive: false,
      monthLabel: null,
    });
    expect(b.headline).toBe(1000);
    expect(b.upper).toBe(1500);
    expect(b.meters[0].display).toBe('$1,000 - $1,500');
  });

  test('spending more than came in turns the spend meter red and the net chip red, capped at a full bar', () => {
    const r = moneyVolume({ accounts: [acct({ income: 1000 })], expenses: 1500, expensesLive: false, monthLabel: null });
    expect(r.meters.at(-1)).toMatchObject({ frac: 1, display: '150%', hue: 'var(--err)', label: '수입 대비 고정 비용' });
    expect(r.chips[1]).toEqual({ tone: 'err', text: '순액 −$500' });
    expect(r.insight.frac).toBe(0);
    expect(r.insight.headline).toBe('이번 달은 들어온 돈보다 나간 돈이 많습니다.');
    expect(r.foot).toBe('지출은 신고한 고정 비용입니다 · 실제 월별 지출은 카드 명세서를 올리세요');
  });

  test('no income at all: empty meters and honest copy, not fabricated fills', () => {
    const e = moneyVolume({
      accounts: [acct({ live: false, configured: false, income: null })],
      expenses: 1200,
      expensesLive: false,
      monthLabel: null,
    });
    expect(e.headline).toBe(0);
    expect(e.meters.every((m) => m.frac === 0)).toBe(true);
    expect(e.meters[0].display).toBe('키 대기');
    expect(e.meters.at(-1)!.display).toBe('아직 수입 없음');
    expect(e.insight.frac).toBe(0);
  });
});

describe('moneyVolume never divides one month by another (review 2026-09-24)', () => {
  // $500 in so far this month against a big August statement read "1600%"
  // and "−$7,500 kept this month": two different months in one ratio.
  const stale = moneyVolume({ accounts: [acct({ income: 500 })], expenses: 8000, expensesLive: true, monthLabel: 'Aug 2026', statementIsThisMonth: false });

  test('the spend meter is empty and says the statement is for another month', () => {
    const m = stale.meters.at(-1)!;
    expect(m.frac).toBe(0);
    expect(m.display).toBe('이번 달 명세서 없음');
    expect(m.label).toBe('수입 대비 지출 · Aug 2026');
  });

  test('no net chip and no kept-this-month number across months', () => {
    expect(stale.chips).toEqual([{ tone: 'err', text: '지출 $8,000 · Aug 2026' }]);
    expect(stale.insight.display).toBe(' - ');
    expect(stale.insight.frac).toBe(0);
    expect(stale.insight.headline).toMatch(/이번 달 명세서/);
  });

  test('set fees are monthly, so they still compare with this month', () => {
    const fees = moneyVolume({ accounts: [acct({ income: 500 })], expenses: 1200, expensesLive: false, monthLabel: null, statementIsThisMonth: false });
    expect(fees.chips.map((c) => c.text)).toEqual(['지출 $1,200', '순액 −$700']);
  });
});

describe('spendSeries', () => {
  test('spend per ledger month, oldest first, in whole dollars; income rows ignored', () => {
    const s = spendSeries([
      row('2026-07-03', 100.4),
      row('2026-07-20', 50),
      row('2026-08-02', 900),
      row('2026-08-05', 5000, { direction: 'in' }),
    ]);
    expect(s).toEqual([
      { label: '2026년 7월', count: 150 },
      { label: '2026년 8월', count: 900 },
    ]);
  });
  test('an empty ledger is an empty series', () => {
    expect(spendSeries([])).toEqual([]);
  });
});

describe('chargeSizes', () => {
  test('recent charges bucketed by size, every bucket present', () => {
    const cols = chargeSizes([{ amount: 5_000 }, { amount: 20_000 }, { amount: 30_000 }, { amount: 150_000 }, { amount: 500_000 }]);
    expect(cols).toEqual([
      { label: '<$100', count: 1 },
      { label: '$100-500', count: 2 },
      { label: '$500-2k', count: 1 },
      { label: '$2k+', count: 1 },
    ]);
  });
  test('no charges keeps the columns, all empty', () => {
    expect(chargeSizes([]).every((c) => c.count === 0)).toBe(true);
    expect(chargeSizes([])).toHaveLength(4);
  });
});
