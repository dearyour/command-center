'use client';

import { SlabCard, BigStat, MeterStack, InsightCard } from '@/components/slab';
import { StepLine, DotMatrix } from '@/components/slab-charts';
import { useBoardSnapshot } from '@/components/board-live-store';
import { agentsVolume } from '@/lib/agents-volume';
import type { BoardLivePayload } from '@/lib/board-live';

const WINDOW_DAYS = 14;

/**
 * The /agents slab hero (Alex, 2026-09-24: Brand Deals look OS-wide). Two
 * rows over the cockpit: run activity + the Agent Volume card, then runs by
 * seat, the open task lanes and the one "Needs you" card. It reads the same
 * snapshot BoardLive polls (via the board-live store), so the numbers here and
 * the board below never disagree. Every figure comes from lib/agents-volume;
 * "now" is the snapshot's own clock, so server and client render the same.
 */
export function AgentsVolumePanel({ initial }: { initial: BoardLivePayload }) {
  const data = useBoardSnapshot(initial);
  const v = agentsVolume(data, new Date(data.checkedAt), WINDOW_DAYS);
  const busiest = v.bySeat[0];

  return (
    <>
      {/* Hero row, Brand Deals' shape: the run line + the volume card */}
      <div className="grid grid-cols-[2fr_1fr] gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={1} title="실행 활동" sub={v.window === `${WINDOW_DAYS}일` ? `최근 ${WINDOW_DAYS}일` : v.window} className="pb-2">
          <div className="px-6 pb-2 pt-3">
            <BigStat
              size={30}
              value={v.runsInWindow}
              chips={v.failedInWindow > 0 ? [{ tone: 'err', text: `실패 ${v.failedInWindow}` }] : []}
              caption="실시간 보드의 하트비트 실행 (최근 120개)"
            />
          </div>
          <StepLine
            series={v.series}
            hue="var(--send-activity)"
            unit="회"
            empty={data.connected ? `최근 ${WINDOW_DAYS}일간 하트비트 실행이 없습니다.` : '보드에 연결할 수 없어 그릴 실행이 없습니다.'}
          />
        </SlabCard>

        <SlabCard i={2} title="에이전트 규모" className="flex flex-col">
          <div className="flex flex-1 flex-col px-6 pb-6 pt-3">
            <BigStat value={v.headline} chips={v.chips} caption={v.caption} />
            <MeterStack meters={v.meters} foot={v.foot} empty="보드 연결 불가, 측정할 것이 없습니다" />
          </div>
        </SlabCard>
      </div>

      {/* Second row: runs by seat, the open lanes, THE gradient card */}
      <div className="mt-6 grid grid-cols-3 gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={3} title="자리별 실행" sub={v.window === `${WINDOW_DAYS}일` ? `${WINDOW_DAYS}일` : v.window}>
          <div className="flex flex-col gap-5 px-6 pb-6 pt-3">
            <BigStat
              size={30}
              display={busiest ? busiest.label : '없음'}
              caption={busiest ? `가장 바쁜 자리 · ${busiest.count}회` : `${WINDOW_DAYS}일간 실행 없음`}
            />
            <DotMatrix cols={v.bySeat} hue="var(--ramp-1)" />
          </div>
        </SlabCard>

        <SlabCard i={4} title="작업 레인" sub="열린 단계">
          <div className="flex flex-col gap-5 px-6 pb-6 pt-3">
            <BigStat size={30} value={v.openTasks} caption="보드의 열린 작업" />
            <DotMatrix cols={v.lanes} hue="var(--accent)" />
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
    </>
  );
}
