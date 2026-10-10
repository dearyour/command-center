import { attentionQueue, funnelSummary, journeyMeta, FUNNEL_STAGES } from '@/lib/funnel';
import type { FunnelJourney } from '@/lib/schemas';

/**
 * /funnel below the graph in the Brand Deals look (2026-09-24). The same
 * journeys the graph draws, shaped like Deal Volume: closed revenue as the
 * headline, one meter per stage hand-off (each a real fraction of the stage
 * before), a per-day touch series for the step line, and the "needs you"
 * count for the one insight card. Pure; the page hands it the active journeys.
 */

export type FunnelMeter = { label: string; frac: number; display: string; hue: string };
export type FunnelChip = { tone?: 'ok' | 'warn' | 'err' | 'accent'; text: string };

export type FunnelVolume = {
  revenueUsd: number;
  chips: FunnelChip[];
  caption: string;
  meters: FunnelMeter[];
  foot: string;
  series: { label: string; count: number }[];
  touchesInWindow: number;
  insight: { value: number; headline: string; body: string; frac: number };
};

// Short labels for the hand-off meters; the stage ids stay FUNNEL_STAGES'.
const HANDOFF = FUNNEL_STAGES.slice(1).map((stage, i) => `${FUNNEL_STAGES[i].label} → ${stage.label}`);
const HUES = ['var(--ramp-1)', 'var(--ramp-2)', 'var(--ramp-3)', 'var(--accent)'];

const dayLabel = (iso: string) => `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일`;

export function funnelVolume({ journeys, archived, now, days = 30 }: { journeys: FunnelJourney[]; archived: number; now: Date; days?: number }): FunnelVolume {
  const summary = funnelSummary(journeys);
  const totals = summary.stages.map((s) => s.total);
  const first = summary.stages[0];

  const meters: FunnelMeter[] = FUNNEL_STAGES.slice(1).map((_, k) => {
    const prev = totals[k] ?? 0;
    const next = totals[k + 1] ?? 0;
    const frac = prev > 0 ? next / prev : 0;
    return {
      label: `${HANDOFF[k]} (${next}/${prev})`,
      frac,
      display: prev > 0 ? `${Math.round(frac * 100)}%` : '리드 없음',
      hue: HUES[k],
    };
  });

  const stalled = journeys.filter((j) => journeyMeta(j, now).state === 'stalled').length;
  const chips: FunnelChip[] = [{ tone: 'ok', text: `성사 ${summary.converted}` }];
  if (stalled > 0) chips.push({ tone: 'err', text: `정체 ${stalled}` });
  if (archived > 0) chips.push({ text: `보관 ${archived}` });

  // Touches per UTC day over the trailing window ending today.
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const keys = Array.from({ length: days }, (_, i) => new Date(end.getTime() - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10));
  const counts = new Map(keys.map((k) => [k, 0]));
  for (const j of journeys) for (const t of j.touches) if (counts.has(t.at)) counts.set(t.at, (counts.get(t.at) ?? 0) + 1);
  const series = keys.map((k) => ({ label: dayLabel(k), count: counts.get(k) ?? 0 }));

  const { pushNow, saveNow } = attentionQueue(journeys, now);
  const value = pushNow.length + saveNow.length;
  const endToEnd = first && first.total > 0 ? Math.round((summary.converted / first.total) * 100) : null;

  return {
    revenueUsd: summary.revenueUsd,
    chips,
    caption: `활성 고객 ${journeys.length}명의 성사 매출 · 유입: 자연 ${first?.organic ?? 0} / 광고 ${first?.ads ?? 0}`,
    meters,
    foot: `각 막대는 이전 단계 대비 다음 단계 비율 · ${endToEnd === null ? '아직 리드 없음' : `전체 전환율 ${endToEnd}%`}`,
    series,
    touchesInWindow: series.reduce((n, s) => n + s.count, 0),
    insight: {
      value,
      headline: value === 0 ? '기다리는 일이 없습니다' : `밀어붙일 리드 ${pushNow.length} · 살릴 리드 ${saveNow.length}`,
      body:
        [...pushNow, ...saveNow]
          .slice(0, 3)
          .map((j) => j.person ?? j.name)
          .join(' · ') || '모든 리드가 활발하거나 이미 성사되었습니다.',
      frac: journeys.length > 0 ? value / journeys.length : 0,
    },
  };
}
