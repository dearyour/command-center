import { describe, expect, test } from 'vitest';
import { integrationsVolume } from '@/lib/integrations-volume';
import type { CatalogEntry } from '@/lib/integrations-catalog';
import type { ConnectorStatus } from '@/lib/connectors/types';

/**
 * /integrations in the Brand Deals look (Alex, 2026-09-24). The Connection
 * Volume card, the by-category and health dot matrices and the one "Needs
 * you" card come from this pure view-model, fed with the page's own rows: the
 * live connector checks and the catalog merged onto them. A saved key is never
 * counted as connected.
 */
const status = (id: string, state: ConnectorStatus['state']): ConnectorStatus => ({
  id,
  name: id[0].toUpperCase() + id.slice(1),
  kind: 'local',
  state,
  detail: '',
});

const tile = (slug: string, category: CatalogEntry['category'], over: Partial<CatalogEntry> = {}): CatalogEntry => ({
  slug,
  name: slug,
  tagline: '',
  category,
  connected: false,
  keySaved: false,
  ...over,
});

const STATUSES: ConnectorStatus[] = [
  status('slack', 'connected'),
  status('email', 'connected'),
  status('stripe', 'connected'),
  status('notion', 'not_configured'),
  status('typeform', 'not_configured'),
  status('zernio', 'error'),
];

const CATALOG: CatalogEntry[] = [
  tile('slack', 'Communication', { connected: true, keySaved: true, popular: true }),
  tile('gmail', 'Communication', { connected: true, envKeys: [], popular: true }),
  tile('zoom', 'Communication', { popular: true }),
  tile('stripe', 'Finance', { connected: true, keySaved: true }),
  tile('notion', 'Knowledge', { keySaved: true }),
  tile('airtable', 'Productivity', { popular: true }),
];

describe('integrationsVolume: the Connection Volume card', () => {
  const v = integrationsVolume({ statuses: STATUSES, catalog: CATALOG });

  test('the headline is the live connector count, chips split every check', () => {
    expect(v.headline).toBe(3);
    expect(v.counts).toEqual({ connected: 3, notConfigured: 2, error: 1, total: 6 });
    expect(v.chips).toEqual([
      { tone: 'ok', text: '연결됨 3' },
      { text: '미설정 2' },
      { tone: 'err', text: '오류 1' },
    ]);
    expect(v.caption).toContain('커넥터 확인 6건 중');
  });

  test('four meters, honest fractions of real wholes', () => {
    expect(v.meters.map((m) => m.label)).toEqual([
      '연결된 커넥터 (3/6)',
      '연결된 카탈로그 도구 (3/6)',
      '저장된 키 (3/5)',
      '연결된 인기 도구 (2/4)',
    ]);
    expect(v.meters.map((m) => m.frac)).toEqual([0.5, 0.5, 0.6, 0.5]);
    for (const m of v.meters) expect(m.hue).toMatch(/^var\(--/);
  });

  test('the foot counts the catalog', () => {
    expect(v.foot).toBe('도구 6개 · 카테고리 4개 · 미연결 저장 키 1개');
  });

  test('by category: connected tools per category, busiest first, short labels', () => {
    expect(v.byCategory).toEqual([
      { label: '소통', count: 2 },
      { label: '재무', count: 1 },
      { label: '생산성', count: 0 },
      { label: '지식', count: 0 },
    ]);
    expect(v.topCategory).toEqual({ name: 'Communication', count: 2 });
  });

  test('health: live, unset and erroring checks as columns', () => {
    expect(v.health).toEqual([
      { label: '연결됨', count: 3 },
      { label: '미설정', count: 2 },
      { label: '오류', count: 1 },
    ]);
  });

  test('the one insight names what is erroring', () => {
    expect(v.insight.value).toBe(1);
    expect(v.insight.headline).toMatch(/커넥터 1개 오류/);
    expect(v.insight.body).toContain('Zernio');
    expect(v.insight.frac).toBeCloseTo(1 / 6);
  });
});

describe('integrationsVolume: honest when there is nothing', () => {
  test('no checks and an empty catalog: no meters, no invented numbers', () => {
    const v = integrationsVolume({ statuses: [], catalog: [] });
    expect(v.headline).toBe(0);
    expect(v.meters).toEqual([]);
    expect(v.chips).toEqual([]);
    expect(v.byCategory).toEqual([]);
    expect(v.topCategory).toBeNull();
    expect(v.insight.frac).toBe(0);
  });

  test('nothing erroring: the insight says so and falls back to saved-not-live keys', () => {
    const v = integrationsVolume({ statuses: STATUSES.slice(0, 5), catalog: CATALOG });
    expect(v.insight.value).toBe(0);
    expect(v.insight.headline).toMatch(/오류 난 커넥터가 없습니다/);
    expect(v.insight.body).toContain('저장된 키 1개가 아직 연결되지 않았습니다');
  });
});
