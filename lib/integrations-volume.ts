import type { Meter, Tone } from '@/components/slab';
import type { SeriesPoint } from '@/components/slab-charts';
import type { ConnectorStatus } from '@/lib/connectors/types';
import { connectKeysFor, type CatalogEntry } from '@/lib/integrations-catalog';
import { INTEGRATION_CATEGORIES } from '@/lib/schemas';

/**
 * /integrations in the Brand Deals look (Alex, 2026-09-24). One pure pass
 * over the page's own rows (the live connector checks and the catalog merged
 * onto them) produces every number the slab shows: the Connection Volume
 * headline, chips and meters, connected tools by category, the connector
 * health columns and the single "Needs you" insight. A stored key is never
 * counted as connected; only a connector that answered is.
 */
export type IntegrationsVolume = {
  headline: number;
  counts: { connected: number; notConfigured: number; error: number; total: number };
  chips: Array<{ tone?: Tone; text: string }>;
  caption: string;
  meters: Meter[];
  foot: string;
  byCategory: SeriesPoint[];
  topCategory: { name: string; count: number } | null;
  health: SeriesPoint[];
  insight: { value: number; headline: string; body: string; frac: number };
};

const frac = (n: number, d: number) => (d > 0 ? Math.max(0, Math.min(1, n / d)) : 0);
const pct = (f: number) => `${Math.round(f * 100)}%`;

/** Dot-matrix column labels: short enough that five sit beside a 30px stat. */
const SHORT: Record<string, string> = {
  Productivity: '생산성',
  Communication: '소통',
  'CRM & Sales': 'CRM',
  Developer: '개발',
  Scheduling: '일정',
  Finance: '재무',
  Marketing: '마케팅',
  Storage: '저장',
  Knowledge: '지식',
  'AI & Automation': 'AI',
  Creative: '창작',
};

export function integrationsVolume(x: {
  statuses: Pick<ConnectorStatus, 'id' | 'name' | 'state'>[];
  catalog: CatalogEntry[];
}): IntegrationsVolume {
  const total = x.statuses.length;
  const live = x.statuses.filter((s) => s.state === 'connected');
  const erroring = x.statuses.filter((s) => s.state === 'error');
  const counts = { connected: live.length, notConfigured: total - live.length - erroring.length, error: erroring.length, total };

  const chips: IntegrationsVolume['chips'] = [];
  if (counts.connected) chips.push({ tone: 'ok', text: `연결됨 ${counts.connected}` });
  if (counts.notConfigured) chips.push({ text: `미설정 ${counts.notConfigured}` });
  if (counts.error) chips.push({ tone: 'err', text: `오류 ${counts.error}` });

  const tools = x.catalog.length;
  const connectedTools = x.catalog.filter((c) => c.connected).length;
  const keyed = x.catalog.filter((c) => connectKeysFor(c).length > 0);
  const saved = keyed.filter((c) => c.keySaved).length;
  const popular = x.catalog.filter((c) => c.popular);
  const popularLive = popular.filter((c) => c.connected).length;
  const savedNotLive = x.catalog.filter((c) => c.keySaved && !c.connected).length;

  const meters: Meter[] = [];
  if (total > 0) {
    const f = frac(counts.connected, total);
    meters.push({ label: `연결된 커넥터 (${counts.connected}/${total})`, frac: f, display: pct(f), hue: 'var(--ok)' });
  }
  if (tools > 0) {
    const f = frac(connectedTools, tools);
    meters.push({ label: `연결된 카탈로그 도구 (${connectedTools}/${tools})`, frac: f, display: pct(f), hue: 'var(--accent)' });
  }
  if (keyed.length > 0) {
    const f = frac(saved, keyed.length);
    meters.push({ label: `저장된 키 (${saved}/${keyed.length})`, frac: f, display: pct(f), hue: 'var(--ramp-1)' });
  }
  if (popular.length > 0) {
    const f = frac(popularLive, popular.length);
    meters.push({ label: `연결된 인기 도구 (${popularLive}/${popular.length})`, frac: f, display: pct(f), hue: 'var(--ramp-4)' });
  }

  // Connected tools per category, busiest first; ties keep catalog order.
  const cats = INTEGRATION_CATEGORIES.filter((cat) => x.catalog.some((c) => c.category === cat)).map((cat, order) => ({
    name: cat as string,
    order,
    count: x.catalog.filter((c) => c.category === cat && c.connected).length,
  }));
  const ranked = [...cats].sort((a, b) => b.count - a.count || a.order - b.order);
  const byCategory = ranked.slice(0, 5).map((c) => ({ label: SHORT[c.name] ?? c.name, count: c.count }));
  const topCategory = ranked[0] && ranked[0].count > 0 ? { name: ranked[0].name, count: ranked[0].count } : null;

  const insight = {
    value: counts.error,
    headline: counts.error ? `커넥터 ${counts.error}개 오류.` : '오류 난 커넥터가 없습니다.',
    body: counts.error
      ? erroring
          .slice(0, 3)
          .map((s) => s.name)
          .join(' · ')
      : savedNotLive
        ? `저장된 키 ${savedNotLive}개가 아직 연결되지 않았습니다.`
        : total
          ? '설정된 모든 커넥터가 응답합니다.'
          : '실행된 커넥터 확인이 없습니다.',
    frac: frac(counts.error, total),
  };

  return {
    headline: counts.connected,
    counts,
    chips,
    caption: `커넥터 확인 ${total}건 중 · 저장된 키만이 아니라 실제 상태`,
    meters,
    foot: `도구 ${tools}개 · 카테고리 ${cats.length}개${savedNotLive ? ` · 미연결 저장 키 ${savedNotLive}개` : ''}`,
    byCategory,
    topCategory,
    health: [
      { label: '연결됨', count: counts.connected },
      { label: '미설정', count: counts.notConfigured },
      { label: '오류', count: counts.error },
    ],
    insight,
  };
}
