import Link from 'next/link';
import { ArrowLeft, ExternalLink, Mail } from 'lucide-react';
import { getNewsletters } from '@/lib/newsletters';
import { newsletterVolume } from '@/lib/newsletter-volume';
import { beehiivSubscribers } from '@/lib/connectors/beehiiv';
import { NewsletterList } from '@/components/NewsletterList';
import { Slab, SlabTitle, SlabCard, BigStat, Chip, MeterStack, InsightCard, PILL, PILL_ACCENT } from '@/components/slab';
import { StepLine, DotMatrix } from '@/components/slab-charts';

export const dynamic = 'force-dynamic';

/**
 * The Beehiiv newsletter, in the Brand Deals slab (2026-09-24): what you land
 * on from the /social email tile. Every number in the hero and the second
 * row comes from lib/newsletter-volume, fed with the page's own rows (the
 * live subscriber count and the past issues, seeded until a key resolves).
 */
export default async function BeehiivDashboardPage() {
  const [newsletters, subscribers] = await Promise.all([getNewsletters(), beehiivSubscribers()]);
  const live = subscribers != null; // a real key resolved a subscriber count
  const v = newsletterVolume({ newsletters, subscribers });
  const issues = newsletters.length;

  return (
    <Slab>
      <SlabTitle
        eyebrow="beehiiv · 이메일 리스트"
        title="뉴스레터"
        meta={live ? 'Beehiiv API로 실시간 연동' : '샘플 미리보기 · 실시간 연동하려면 BEEHIIV_API_KEY 추가'}
        right={
          <>
            <Chip tone={live ? 'ok' : 'warn'}>{live ? 'beehiiv 실시간' : '샘플'}</Chip>
            <Link href="/social" className={PILL}>
              <ArrowLeft className="h-3.5 w-3.5" /> 모든 플랫폼
            </Link>
            <a href="https://app.beehiiv.com" target="_blank" rel="noreferrer" data-lens="c" className={PILL_ACCENT}>
              Beehiiv 열기 <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </>
        }
      />

      {/* Hero row, Brand Deals' shape: the sends line + the volume card */}
      <div className="grid grid-cols-[2fr_1fr] gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={1} title="발송" sub={`${issues}호`} className="pb-2">
          <div className="px-6 pb-2 pt-3">
            <BigStat size={30} value={v.totalRecipients} kind="followers" caption="모든 호의 수신자 수, 오래된 순" />
          </div>
          <StepLine series={v.sends} hue="var(--send-activity)" unit=" 발송" empty="아직 발송한 호가 없습니다." />
        </SlabCard>

        <SlabCard i={2} title="뉴스레터 규모" className="flex flex-col">
          <div className="flex flex-1 flex-col px-6 pb-6 pt-3">
            <BigStat
              value={v.headline ?? undefined}
              display={v.headline == null ? ' - ' : undefined}
              kind="followers"
              chips={v.chips}
              caption={v.caption}
            />
            <MeterStack meters={v.meters} foot={v.foot} empty="아직 측정할 발송이 없습니다" />
          </div>
        </SlabCard>
      </div>

      {/* Second row: open rate per issue, engagement, THE gradient card */}
      <div className="mt-6 grid grid-cols-3 gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={3} title="오픈율" sub="최근 6호">
          {/* stacked: dated columns are too wide to share a row with the caption */}
          <div className="flex flex-col gap-5 px-6 pb-6 pt-3">
            <BigStat
              size={30}
              display={v.avgOpenRate == null ? ' - ' : `${v.avgOpenRate.toFixed(1)}%`}
              caption={issues > 0 ? `${issues}호 평균 오픈율` : '아직 발송한 호가 없습니다'}
            />
            {v.openRates.length > 0 && <DotMatrix cols={v.openRates} hue="var(--ramp-1)" />}
          </div>
        </SlabCard>

        <SlabCard i={4} title="참여" sub="모든 호 합계">
          <div className="px-6 pb-6 pt-3">
            <BigStat size={30} value={v.totalClicks} unit="클릭" caption={issues > 0 ? '모든 호의 링크 클릭 수' : '아직 기록된 클릭이 없습니다'} />
            <div className="mt-4 flex flex-wrap gap-2">
              <Chip tone={v.unsubscribes > 0 ? 'warn' : 'ok'}>구독 해지 {v.unsubscribes.toLocaleString('en-US')}명</Chip>
              <Chip tone={v.spamReports > 0 ? 'err' : 'ok'}>스팸 신고 {v.spamReports.toLocaleString('en-US')}건</Chip>
            </div>
          </div>
        </SlabCard>

        <InsightCard
          i={5}
          badge="최고 오픈율"
          icon={<Mail size={13} strokeWidth={1.7} />}
          display={v.insight.display}
          headline={v.insight.headline}
          body={v.insight.body}
          frac={v.insight.frac}
        />
      </div>

      <SlabCard i={6} title="지난 뉴스레터" sub="호를 클릭하면 분석을 펼쳐 볼 수 있습니다" className="mt-6">
        <div className="px-6 pb-6 pt-4">
          <NewsletterList newsletters={newsletters} />
        </div>
      </SlabCard>
    </Slab>
  );
}
