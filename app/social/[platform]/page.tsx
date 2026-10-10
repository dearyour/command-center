import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { getDb } from '@/lib/data';
import { PLATFORM_LABELS, platformDetail, syncFromZernioConfig } from '@/lib/social';
import { platformVolume } from '@/lib/social-volume';
import type { SocialPlatform } from '@/lib/schemas';
import { formatFollowers, formatPct, GrowthBadge } from '@/components/SocialStats';
import { FollowerBarChart } from '@/components/FollowerBarChart';
import { Slab, SlabTitle, SlabCard, BigStat, MeterStack, InsightCard, PILL, PILL_ACCENT } from '@/components/slab';
import { StepLine } from '@/components/slab-charts';

export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 30;

/**
 * One platform, in the Brand Deals slab (2026-09-24): what you land on from
 * a /social account tile. Every number in the hero and the second row comes
 * from lib/social-volume's platformVolume, fed with this platform's own
 * snapshots and growth windows.
 */
export default function SocialPlatformPage({ params }: { params: { platform: string } }) {
  const db = getDb();
  syncFromZernioConfig(db);
  const detail = platformDetail(db, params.platform as SocialPlatform);
  if (!detail) notFound();

  const { account, followers, growth, snapshots } = detail;
  const label = PLATFORM_LABELS[account.platform];
  const v = platformVolume({ label, followers, growth, snapshots, today: new Date().toISOString().slice(0, 10), days: WINDOW_DAYS });
  const newestFirst = [...snapshots].reverse();

  return (
    <Slab>
      <SlabTitle
        eyebrow={`오디언스 · ${account.handle}`}
        title={label}
        meta={`팔로워 ${formatFollowers(followers)} · 7일 ${formatPct(growth.d7)} · 스냅샷 ${snapshots.length}개`}
        right={
          <>
            <Link href="/social" className={PILL}>
              <ArrowLeft className="h-3.5 w-3.5" /> 모든 플랫폼
            </Link>
            {account.url && (
              <a href={account.url} target="_blank" rel="noreferrer" data-lens="c" className={PILL_ACCENT}>
                프로필 열기 <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </>
        }
      />

      {/* Hero row, Brand Deals' shape: the follower history + the volume card */}
      <div className="grid grid-cols-[2fr_1fr] gap-6 max-[1200px]:grid-cols-1">
        <SlabCard
          i={1}
          title="팔로워 기록"
          sub={`스냅샷 ${snapshots.length}개`}
          action={
            <>
              <GrowthBadge label="7일" value={growth.d7} />
              <GrowthBadge label="30일" value={growth.d30} />
              <GrowthBadge label="60일" value={growth.d60} />
              <GrowthBadge label="전체" value={growth.allTime} />
            </>
          }
        >
          <div className="px-6 pb-5 pt-2">
            {/* the diagram: one bar per snapshot  -  hover for exact count + change */}
            <FollowerBarChart series={snapshots.map((s) => ({ date: s.capturedAt, followers: s.followers }))} />
            {newestFirst.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10.5px] text-os-dim">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-[3px] w-3 rounded-full bg-os-ok" /> 이전 대비 증가
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-[3px] w-3 rounded-full bg-os-err" /> 감소
                </span>
                <span className="ml-auto">
                  최신 {newestFirst[0].capturedAt} · {newestFirst[0].source}
                </span>
              </div>
            )}
          </div>
        </SlabCard>

        <SlabCard i={2} title="팔로워 규모" className="flex flex-col">
          <div className="flex flex-1 flex-col px-6 pb-6 pt-3">
            <BigStat
              value={v.headline ?? undefined}
              display={v.headline == null ? formatFollowers(null) : undefined}
              kind="followers"
              chips={v.chips}
              caption={v.caption}
            />
            <MeterStack meters={v.meters} foot={v.foot} empty="이 플랫폼에는 아직 기록된 스냅샷이 없습니다" />
          </div>
        </SlabCard>
      </div>

      {/* Second row: the growth windows, daily gains, THE gradient card */}
      <div className="mt-6 grid grid-cols-3 gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={3} title="기간별 성장" sub="해당 기간 전 스냅샷 대비">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 px-6 pb-6 pt-4">
            {(
              [
                ['7일', growth.d7],
                ['30일', growth.d30],
                ['60일', growth.d60],
                ['전체 기간', growth.allTime],
              ] as const
            ).map(([windowLabel, value]) => (
              <BigStat
                key={windowLabel}
                size={30}
                display={formatPct(value)}
                chips={value == null ? [] : value === 0 ? [{ text: '변동 없음' }] : [{ tone: value > 0 ? 'ok' : 'err', text: value > 0 ? '상승' : '하락' }]}
                caption={value == null ? `${windowLabel} · 기록 부족` : windowLabel}
              />
            ))}
          </div>
        </SlabCard>

        <SlabCard i={4} title="일별 증가" sub={`최근 ${WINDOW_DAYS}일`}>
          <div className="px-6 pt-3">
            <BigStat
              size={30}
              value={v.gainedDays}
              caption={v.intervals > 0 ? `추적한 ${v.intervals}일 중 증가한 날` : '아직 일별 비교 기록이 없습니다'}
            />
          </div>
          <StepLine series={v.series} hue="var(--ok)" unit=" 증가" empty={`최근 ${WINDOW_DAYS}일간 팔로워 증가가 없습니다.`} />
        </SlabCard>

        <InsightCard
          i={5}
          badge={`${WINDOW_DAYS}일 변화`}
          value={v.insight.value}
          display={v.insight.display}
          headline={v.insight.headline}
          body={v.insight.body}
          frac={v.insight.frac}
        />
      </div>
    </Slab>
  );
}
