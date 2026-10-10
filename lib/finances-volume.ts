import type { IncomeAccount } from '@/lib/finances';
import { totalIncome, totalIncomeUpper } from '@/lib/finances';
import { monthlyTotals, type SpendRow } from '@/lib/spend-report';

/**
 * /finances in the Brand Deals look (Alex, 2026-09-24). The page's own
 * numbers shaped like Deal Volume: a month-to-date income headline, money out
 * and net as dot chips, one meter per processor (its real share of income),
 * spend as a share of income, and the one insight card (what was kept).
 *
 * Pure: the page gathers the money, this decides how it reads, and
 * tests/finances-volume.test.ts pins it. An account with no pull reads
 * pending, never $0; no income means empty meters, never a fabricated fill.
 */

export type MoneyMeter = { label: string; frac: number; display: string; hue: string };
export type MoneyChip = { tone: 'ok' | 'warn' | 'err' | 'accent'; text: string };
export type SizePoint = { label: string; count: number };

export type MoneyVolume = {
  /** Month-to-date income, the PROVEN floor. */
  headline: number;
  /** The ceiling when a source could only bound its month; null when exact. */
  upper: number | null;
  chips: MoneyChip[];
  caption: string;
  meters: MoneyMeter[];
  foot: string;
  insight: { display: string; headline: string; body: string; frac: number };
};

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const signed = (n: number) => `${n < 0 ? '−' : '+'}${usd(Math.abs(n))}`;
const clamp01 = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);

// One hue per income source, all on the colorway ramp.
const SOURCE_HUES = ['var(--ramp-1)', 'var(--ramp-2)', 'var(--ramp-3)', 'var(--ramp-4)'];

export function moneyVolume(x: {
  accounts: IncomeAccount[];
  /** USD for the month the expense figure covers. */
  expenses: number;
  /** true when expenses come from an uploaded statement, false for set fees. */
  expensesLive: boolean;
  /** "Aug 2026" for the uploaded month, null when the figure is set fees. */
  monthLabel: string | null;
  /** The uploaded statement covers the current month. Income is month to
      date, so a statement from any other month cannot be divided into it.
      Unset means not proven, so no cross-month ratio is drawn. */
  statementIsThisMonth?: boolean;
}): MoneyVolume {
  const income = totalIncome(x.accounts);
  const ceiling = totalIncomeUpper(x.accounts);
  const net = income - x.expenses;
  // Set fees are a monthly figure, so they compare with this month's income;
  // a statement only does when it IS this month's.
  const comparable = !x.expensesLive || x.statementIsThisMonth === true;
  const live = x.accounts.filter((a) => a.live).length;

  const sources: MoneyMeter[] = x.accounts.map((a, i) => ({
    label: a.label,
    frac: income > 0 ? clamp01((a.income ?? 0) / income) : 0,
    display:
      a.income == null
        ? a.configured
          ? '수집 대기'
          : '키 대기'
        : a.incomeUpper != null
          ? `${usd(a.income)} - ${usd(a.incomeUpper)}`
          : usd(a.income),
    hue: SOURCE_HUES[i % SOURCE_HUES.length],
  }));

  const spentRatio = income > 0 ? x.expenses / income : 0;
  const spend: MoneyMeter = {
    label: x.expensesLive ? `수입 대비 지출${x.monthLabel ? ` · ${x.monthLabel}` : ''}` : '수입 대비 고정 비용',
    frac: comparable ? clamp01(spentRatio) : 0,
    display: !comparable ? '이번 달 명세서 없음' : income > 0 ? `${Math.round(spentRatio * 100)}%` : '아직 수입 없음',
    hue: comparable && x.expenses > income ? 'var(--err)' : 'var(--warn)',
  };

  return {
    headline: income,
    upper: ceiling > income ? ceiling : null,
    chips: comparable
      ? [
          { tone: 'err', text: `지출 ${usd(x.expenses)}` },
          { tone: net >= 0 ? 'ok' : 'err', text: `순액 ${signed(net)}` },
        ]
      : [{ tone: 'err', text: `지출 ${usd(x.expenses)} · ${x.monthLabel ?? '최근 명세서'}` }],
    caption: `이번 달 수입 · 결제 수단 ${live}/${x.accounts.length} 연동`,
    meters: [...sources, spend],
    foot: x.expensesLive
      ? `업로드한 ${x.monthLabel ?? '최근'} 명세서 기준 지출`
      : '지출은 신고한 고정 비용입니다 · 실제 월별 지출은 카드 명세서를 올리세요',
    insight: !comparable
      ? {
          display: ' - ',
          headline: '이번 달 명세서를 올리면 남은 돈을 볼 수 있습니다.',
          body: `이번 달 지금까지 수입 ${usd(income)}, 최근 명세서는 ${x.monthLabel ?? '다른 달'} 것입니다.`,
          frac: 0,
        }
      : {
      display: signed(net),
      headline: net >= 0 ? `이번 달 수입 ${usd(income)} 중 남은 돈.` : '이번 달은 들어온 돈보다 나간 돈이 많습니다.',
      body: `수입 ${usd(income)} − 지출 ${usd(x.expenses)}${x.expensesLive ? `, 지출은 ${x.monthLabel ?? '최근'} 명세서 기준` : ', 지출은 신고한 고정 비용'}.`,
      frac: income > 0 ? clamp01(net / income) : 0,
    },
  };
}

const monthName = (month: string): string =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString('ko-KR', { month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Spend per ledger month, oldest first, in whole dollars, for the step line. */
export function spendSeries(rows: SpendRow[]): SizePoint[] {
  return monthlyTotals(rows).map((m) => ({ label: monthName(m.month), count: Math.round(m.totalCents / 100) }));
}

const SIZE_BUCKETS: Array<{ label: string; maxCents: number }> = [
  { label: '<$100', maxCents: 10_000 },
  { label: '$100-500', maxCents: 50_000 },
  { label: '$500-2k', maxCents: 200_000 },
  { label: '$2k+', maxCents: Infinity },
];

/** Recent charges by size (Stripe cents), every bucket present so the dot
    matrix keeps its columns on a quiet month. */
export function chargeSizes(charges: Array<{ amount: number }>): SizePoint[] {
  return SIZE_BUCKETS.map((b, i) => {
    const min = i === 0 ? -Infinity : SIZE_BUCKETS[i - 1].maxCents;
    return { label: b.label, count: charges.filter((c) => c.amount >= min && c.amount < b.maxCents).length };
  });
}
