import { allConnectorStatuses } from '@/lib/connectors';
import { readEnvLocal } from '@/lib/creds';
import { oauthReadiness } from '@/lib/oauth/store';
import { connectionCatalog, integrationsByCategory, type CatalogEntry } from '@/lib/integrations-catalog';
import { integrationsVolume } from '@/lib/integrations-volume';
import { Slab, SlabTitle, SlabCard, BigStat, Chip, MeterStack, InsightCard, PILL } from '@/components/slab';
import { DotMatrix } from '@/components/slab-charts';
import { ApiKeys } from '@/components/ApiKeys';
import { ConnectionCard } from '@/components/ConnectionCard';
import { IntegrationBrowser } from '@/components/IntegrationBrowser';
import { categoryKo } from '@/lib/status-labels';

export const dynamic = 'force-dynamic';

const GRID = 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';

/**
 * The Connections board. 2026-09-24: it wears the Brand Deals slab
 * (components/slab). Every number in the hero and second row comes from
 * lib/integrations-volume, fed with the same live connector checks and
 * catalog the tiles below render; the tiles, connect flows, category
 * accordion and key editor are unchanged.
 */
export default async function ConnectionsPage() {
  const statuses = await allConnectorStatuses();
  const env = readEnvLocal();
  const catalog = connectionCatalog(statuses, env);
  // Null for every tile whose provider has no usable authorization-code flow.
  const oauthFor = (slug: string) => oauthReadiness(slug, env);
  const detailByConnector = new Map(statuses.map((s) => [s.id, s.detail]));
  const guidanceFor = (entry: CatalogEntry) =>
    entry.connectorId ? detailByConnector.get(entry.connectorId) : undefined;

  const byId = new Map(catalog.map((c) => [c.slug, c]));
  const connected = catalog.filter((c) => c.connected);
  const popular = catalog.filter((c) => c.popular);
  const categories = [...integrationsByCategory().entries()];
  const v = integrationsVolume({ statuses, catalog });

  const card = (entry: CatalogEntry) => (
    <ConnectionCard key={entry.slug} entry={entry} guidance={guidanceFor(entry)} oauth={oauthFor(entry.slug)} />
  );

  return (
    <Slab>
      <SlabTitle
        eyebrow="connections"
        title="연결"
        meta={`도구 ${catalog.length}개 · 커넥터 확인 ${v.counts.total}건 · 저장된 키만이 아니라 실제 상태`}
        right={
          <>
            <Chip tone={v.counts.error ? 'err' : 'ok'}>
              연결됨 {v.counts.connected}{v.counts.error ? ` · 오류 ${v.counts.error}` : ''}
            </Chip>
            <a href="#api-keys" className={PILL}>
              API 키
            </a>
          </>
        }
      />

      {/* Hero row, Brand Deals' shape: what is live + the volume card */}
      <div className="grid grid-cols-[2fr_1fr] gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={1} title="연결된 도구" sub={`${catalog.length}개 중 ${connected.length}개`}>
          <div className="px-6 pb-6 pt-3">
            <BigStat size={30} value={connected.length} caption="이번 로드에서 커넥터가 응답한 카탈로그 도구" />
            <div className="mt-5 border-t border-os-border pt-5">
              {connected.length > 0 ? (
                <div className={GRID}>{connected.map(card)}</div>
              ) : (
                <div className="text-[12.5px] text-os-dim">아직 연결된 것이 없습니다. 아래에서 도구를 골라 연결하세요.</div>
              )}
            </div>
          </div>
        </SlabCard>

        <SlabCard i={2} title="연결 규모" className="flex flex-col">
          <div className="flex flex-1 flex-col px-6 pb-6 pt-3">
            <BigStat value={v.headline} chips={v.chips} caption={v.caption} />
            <MeterStack meters={v.meters} foot={v.foot} empty="실행된 커넥터 확인이 없습니다" />
          </div>
        </SlabCard>
      </div>

      {/* Second row: by category, connector health, THE gradient card */}
      <div className="mt-6 grid grid-cols-3 gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={3} title="카테고리별" sub="연결된 도구">
          <div className="flex flex-col gap-5 px-6 pb-6 pt-3">
            <BigStat
              size={30}
              display={v.topCategory ? categoryKo(v.topCategory.name) : '없음'}
              caption={v.topCategory ? `가장 많이 연결 · ${v.topCategory.count}개` : '연결된 도구가 있는 카테고리가 없습니다'}
            />
            <DotMatrix cols={v.byCategory} hue="var(--ramp-1)" />
          </div>
        </SlabCard>

        <SlabCard i={4} title="커넥터 상태" sub="이번 로드">
          <div className="flex flex-col gap-5 px-6 pb-6 pt-3">
            <BigStat size={30} value={v.counts.total} caption="커넥터 확인: 연결됨 · 미설정 · 오류" />
            <DotMatrix cols={v.health} hue="var(--ok)" />
          </div>
        </SlabCard>

        <InsightCard
          i={5}
          badge="확인 필요"
          value={v.insight.value}
          headline={v.insight.headline}
          body={v.insight.body}
          frac={v.insight.frac}
        />
      </div>

      {/* Popular */}
      <SlabCard i={6} title="인기" sub={`${popular.length}`} className="mt-6">
        <div className="px-6 pb-6 pt-4">
          <div className={GRID}>{popular.map(card)}</div>
        </div>
      </SlabCard>

      {/* Browse by category: filter pills over the collapsible categories */}
      <SlabCard i={7} title="카테고리별 둘러보기" sub={`${categories.length}`} className="mt-6">
        <div className="px-6 pb-6 pt-4">
          <IntegrationBrowser
            categories={categories.map(([category, tools]) => ({
              label: categoryKo(category),
              count: tools.length,
              connected: tools.filter((t) => byId.get(t.slug)?.connected).length,
              grid: <div className={GRID}>{tools.map((tool) => card(byId.get(tool.slug) as CatalogEntry))}</div>,
            }))}
          />
        </div>
      </SlabCard>

      <SlabCard i={8} className="mt-6">
        <div id="api-keys" className="scroll-mt-24 px-6 pb-6 pt-5">
          <ApiKeys />
        </div>
      </SlabCard>
    </Slab>
  );
}
