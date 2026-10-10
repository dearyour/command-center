import type { Meter, Tone } from '@/components/slab';
import type { SeriesPoint } from '@/components/slab-charts';
import { newsletterSummary, type Newsletter } from '@/lib/newsletters';

/**
 * /social/beehiiv in the Brand Deals look (Alex, 2026-09-24). One pure
 * pass over the page's own rows (the Beehiiv subscriber count and the past
 * issues) gives the Newsletter Volume card, the sends step line, the
 * open-rate dot matrix and the one "Best open" card. The funnel meters are
 * ratios of SUMMED send stats, so a big send weighs more than a small one;
 * averaging per-issue percentages would not be a fraction of a real whole.
 * Seeded issues (id `seed-*`) are labelled as a preview, never passed off.
 */
export type NewsletterVolume = {
  headline: number | null;
  chips: Array<{ tone?: Tone; text: string }>;
  caption: string;
  meters: Meter[];
  foot: string;
  sends: SeriesPoint[];
  openRates: SeriesPoint[];
  /** mean of per-issue open rates (Beehiiv's own figure), null before the first send */
  avgOpenRate: number | null;
  totalRecipients: number;
  totalClicks: number;
  unsubscribes: number;
  spamReports: number;
  insight: { display: string; headline: string; body: string; frac: number };
};

const MATRIX_COLS = 6;
const clamp = (f: number) => (Number.isFinite(f) ? Math.max(0, Math.min(1, f)) : 0);
const pct = (f: number, digits = 1) => `${(f * 100).toFixed(digits)}%`;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const sum = (list: Newsletter[], k: keyof Pick<Newsletter, 'recipients' | 'delivered' | 'opens' | 'clicks' | 'unsubscribes' | 'spamReports'>) =>
  list.reduce((n, x) => n + x[k], 0);

export function newsletterVolume(x: { newsletters: Newsletter[]; subscribers: number | null }): NewsletterVolume {
  const list = x.newsletters;
  const count = list.length;
  const summary = newsletterSummary(list);
  const oldestFirst = [...list].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  const seeded = count > 0 && list.every((n) => n.id.startsWith('seed-'));

  const recipients = sum(list, 'recipients');
  const delivered = sum(list, 'delivered');
  const opens = sum(list, 'opens');
  const clicks = sum(list, 'clicks');
  const unsubscribes = sum(list, 'unsubscribes');
  const spamReports = sum(list, 'spamReports');

  const chips: NewsletterVolume['chips'] = [];
  if (count) {
    chips.push({ tone: 'accent', text: `${count}호` });
    chips.push({ tone: 'ok', text: `평균 오픈율 ${summary.avgOpenRate.toFixed(1)}%` });
  }

  const meters: Meter[] = [];
  if (recipients > 0) meters.push({ label: '전달됨', frac: clamp(delivered / recipients), display: `발송 대비 ${pct(delivered / recipients)}`, hue: 'var(--ok)' });
  if (delivered > 0) meters.push({ label: '열람', frac: clamp(opens / delivered), display: `전달 대비 ${pct(opens / delivered)}`, hue: 'var(--ramp-1)' });
  if (opens > 0) meters.push({ label: '클릭', frac: clamp(clicks / opens), display: `열람 대비 ${pct(clicks / opens)}`, hue: 'var(--ramp-3)' });
  if (delivered > 0) meters.push({ label: '구독 해지', frac: clamp(unsubscribes / delivered), display: `전달 대비 ${pct(unsubscribes / delivered, 2)}`, hue: 'var(--warn)' });

  const foot = count
    ? `${count}호 · ${recipients.toLocaleString('en-US')}건 발송${seeded ? ' · 샘플 미리보기' : ''}`
    : '아직 발송한 호가 없습니다';

  const best = list.reduce<Newsletter | null>((b, n) => (b && b.openRate >= n.openRate ? b : n), null);
  const insight: NewsletterVolume['insight'] = best
    ? {
        display: `${best.openRate.toFixed(1)}%`,
        headline: `최고 오픈율: ${best.title}.`,
        body: `${count}호 평균 ${summary.avgOpenRate.toFixed(1)}% · ${shortDate(best.publishedAt)}`,
        frac: clamp(best.openRate / 100),
      }
    : { display: '없음', headline: '아직 발송한 호가 없습니다.', body: '첫 발송 후 여기에 오픈율이 표시됩니다.', frac: 0 };

  return {
    headline: x.subscribers,
    chips,
    caption: x.subscribers != null ? '구독자 수, Beehiiv 실시간 연동' : '실시간 구독자 수 없음 · BEEHIIV_API_KEY 추가 필요',
    meters,
    foot,
    sends: oldestFirst.map((n) => ({ label: shortDate(n.publishedAt), count: n.recipients })),
    openRates: oldestFirst.slice(-MATRIX_COLS).map((n) => ({ label: shortDate(n.publishedAt), count: n.openRate })),
    avgOpenRate: count ? summary.avgOpenRate : null,
    totalRecipients: recipients,
    totalClicks: clicks,
    unsubscribes,
    spamReports,
    insight,
  };
}
