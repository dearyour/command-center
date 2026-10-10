import Link from 'next/link';
import { ArrowLeft, Megaphone } from 'lucide-react';
import { getDb } from '@/lib/data';
import { filterLeadMagnets, leadMagnetFilter, leadMagnetVolume, LEAD_MAGNET_FILTERS } from '@/lib/lead-magnet-volume';
import { LeadMagnets } from '@/components/LeadMagnets';
import { NewLeadMagnet } from '@/components/NewLeadMagnet';
import { Slab, SlabTitle, SlabCard, BigStat, Chip, MeterStack, InsightCard, PILL, chipClass } from '@/components/slab';
import { StepLine, DotMatrix } from '@/components/slab-charts';
import { statusKo } from '@/lib/status-labels';

export const dynamic = 'force-dynamic';

const WINDOW_WEEKS = 12;

/**
 * Lead magnets, full page, in the Brand Deals slab (2026-09-24). Every landing
 * page we ship, as a Notion-style database with the real link on every row
 * so Alex can open or copy one straight to whoever asked for it. Every
 * number above the table comes from lib/lead-magnet-volume over ALL rows; the
 * status pills (?status=live) only narrow the table.
 */
// Props stay required in the signature (Next's PageProps check rejects an
// optional parameter); the smoke test may still call it bare, hence `props?.`.
export default function LeadMagnetsPage(props: { searchParams?: Record<string, string | string[] | undefined> }) {
  const searchParams = props?.searchParams;
  const all = getDb().leadMagnets.all();
  const active = leadMagnetFilter(searchParams?.status);
  const rows = filterLeadMagnets(all, active);
  const v = leadMagnetVolume({ rows: all, today: new Date().toISOString().slice(0, 10), weeks: WINDOW_WEEKS });
  const topDest = v.destinations[0];
  const topCapture = v.captures.reduce((best, c) => (c.count > best.count ? c : best), v.captures[0]);
  const countFor = (f: (typeof LEAD_MAGNET_FILTERS)[number]) => (f === 'all' ? v.total : v.counts[f]);

  return (
    <Slab>
      <SlabTitle
        eyebrow="콘텐츠 엔진"
        title="리드 마그넷"
        meta={`페이지 ${v.total}개 · 운영 중 ${v.counts.live}개 · ${v.foot}`}
        right={
          <>
            <Chip tone="ok">운영 중 {v.counts.live}</Chip>
            <Link href="/content" className={PILL}>
              <ArrowLeft className="h-3.5 w-3.5" /> 콘텐츠
            </Link>
          </>
        }
      />

      {/* Hero row, Brand Deals' shape: pages shipped + the volume card */}
      <div className="grid grid-cols-[2fr_1fr] gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={1} title="출시한 페이지" sub={`최근 ${WINDOW_WEEKS}주`} className="pb-2">
          <div className="px-6 pb-2 pt-3">
            <BigStat
              size={30}
              value={v.total}
              chips={v.shippedInWindow > 0 ? [{ tone: 'accent', text: `${WINDOW_WEEKS}주간 신규 ${v.shippedInWindow}` }] : []}
              caption="주별로 기록된 랜딩 페이지"
            />
          </div>
          <StepLine series={v.series} hue="var(--send-activity)" unit="개" empty="아직 기록된 랜딩 페이지가 없습니다." />
        </SlabCard>

        <SlabCard i={2} title="마그넷 규모" className="flex flex-col">
          <div className="flex flex-1 flex-col px-6 pb-6 pt-3">
            <BigStat value={v.headline} unit="live" chips={v.chips} caption={v.caption} />
            <MeterStack meters={v.meters} foot={v.foot} empty="아직 측정할 랜딩 페이지가 없습니다" />
          </div>
        </SlabCard>
      </div>

      {/* Second row: what they capture, where the leads land, THE gradient card */}
      <div className="mt-6 grid grid-cols-3 gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={3} title="수집 항목" sub="각 페이지가 요청하는 정보">
          <div className="flex items-end justify-between gap-4 px-6 pb-6 pt-3">
            <BigStat
              size={30}
              display={topCapture.count > 0 ? topCapture.label : 'none'}
              caption={topCapture.count > 0 ? `가장 많음 · ${v.total}개 중 ${topCapture.count}개` : '아직 페이지 없음'}
            />
            <DotMatrix cols={v.captures} hue="var(--ramp-1)" />
          </div>
        </SlabCard>

        <SlabCard i={4} title="리드 도착지" sub={`도착지 ${v.destinations.length}곳`}>
          {/* stacked: destination names are too wide to share a row with the caption */}
          <div className="flex flex-col gap-5 px-6 pb-6 pt-3">
            <BigStat
              size={30}
              display={topDest ? topDest.label : 'none'}
              caption={topDest ? `1위 도착지 · 페이지 ${topDest.count}개` : '아직 도착지 없음'}
            />
            {v.destinations.length > 0 && <DotMatrix cols={v.destinations} hue="var(--ramp-3)" />}
          </div>
        </SlabCard>

        <InsightCard
          i={5}
          badge="마지막 출시 이후"
          icon={<Megaphone size={13} strokeWidth={1.7} />}
          value={v.insight.value}
          display={v.insight.display}
          headline={v.insight.headline}
          body={v.insight.body}
          frac={v.insight.frac}
        />
      </div>

      {/* The register: filter pills, the new-page form, the database table */}
      <SlabCard
        i={6}
        title="전체 페이지"
        sub={`${v.total}개 중 ${rows.length}개`}
        className="mt-6"
        action={LEAD_MAGNET_FILTERS.map((f) => (
          <Link
            key={f}
            href={f === 'all' ? '/content/lead-magnets' : `/content/lead-magnets?status=${f}`}
            className={chipClass(active === f)}
            aria-current={active === f ? 'page' : undefined}
          >
            {f === 'all' ? '전체' : statusKo(f)} {countFor(f)}
          </Link>
        ))}
      >
        <p className="px-6 pt-2 text-[12.5px] leading-relaxed text-os-dim">
          출시한 모든 랜딩 페이지와 각 행의 실시간 링크입니다. 열어 보거나 요청한 사람에게 바로 복사해 주세요.
        </p>
        <div className="px-6 pt-4">
          <NewLeadMagnet />
        </div>
        <div className="mt-2">
          {rows.length === 0 && v.total > 0 ? (
            <div className="border-t border-os-border px-6 py-8 text-center text-[12.5px] text-os-dim">해당 필터와 일치하는 항목이 없습니다.</div>
          ) : (
            <LeadMagnets rows={rows} showCopy manage />
          )}
        </div>
      </SlabCard>
    </Slab>
  );
}
