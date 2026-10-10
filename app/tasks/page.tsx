import Link from 'next/link';
import { getDb } from '@/lib/data';
import { paperclipIssues } from '@/lib/connectors/paperclip';
import { scheduledJobRows } from '@/lib/scheduled-jobs';
import { tasksVolume } from '@/lib/tasks-volume';
import { Slab, SlabTitle, SlabCard, BigStat, Chip, MeterStack, InsightCard, PILL } from '@/components/slab';
import { StepLine, DotMatrix } from '@/components/slab-charts';
import { BoardTasks } from '@/components/BoardTasks';
import { TaskBoard } from '@/components/TaskBoard';
import { TaskCronStrip } from '@/components/TaskCronStrip';

export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 14;

/**
 * Agent work in the Brand Deals slab (2026-09-24). Every number in the hero
 * and second row comes from lib/tasks-volume over the same rows the three
 * sections below render: the cron strip, the live Paperclip board queue and
 * the local kanban. Those sections keep every action and take the stagger
 * from i={6}.
 */
export default async function TasksPage() {
  const db = getDb();
  const tasks = db.agentTasks.all();
  const agentNames = Object.fromEntries(db.agents.all().map((a) => [a.id, a.name]));
  // The REAL org's queue rides on top: live board issues + a composer that
  // hands the company actual work. Local kanban below stays the OS's own.
  const issues = await paperclipIssues(30);
  // Scheduled work is agent work: the same page that shows the queue shows
  // what fires on a timer, with its real run history.
  const crons = db.agentCrons.all();
  const cronStats = db.cronRuns.statsByCron();
  const boardUrl = process.env.PAPERCLIP_API_URL ?? null;
  const v = tasksVolume({
    tasks,
    issues,
    jobs: scheduledJobRows({ crons, stats: cronStats, agentNames }),
    runs: db.cronRuns.since(new Date(Date.now() - (WINDOW_DAYS + 1) * 86_400_000).toISOString()),
    agentNames,
    days: WINDOW_DAYS,
  });
  const busiestDay = v.cron.rhythm.reduce((best, d) => (d.count > best.count ? d : best), v.cron.rhythm[0]);

  return (
    <Slab>
      <SlabTitle
        eyebrow="에이전트 작업"
        title="작업"
        meta={`${WINDOW_DAYS}일간 움직인 항목 ${v.touchesInWindow}개 · 크론 실행 ${v.cron.runsInWindow}회 · 막힘 ${v.board.blocked}개`}
        right={
          <>
            <Chip tone={boardUrl ? 'ok' : undefined}>{boardUrl ? '보드 실시간 · paperclip' : '보드 오프라인 · paperclip'}</Chip>
            <Link href="/workflows" className={PILL}>
              워크플로
            </Link>
            <Link href="/agents" className={PILL}>
              에이전트
            </Link>
          </>
        }
      />

      {/* Hero row, Brand Deals' shape: the work line + the volume card */}
      <div className="grid grid-cols-[2fr_1fr] gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={1} title="작업 활동" sub={`최근 ${WINDOW_DAYS}일`} className="pb-2">
          <div className="px-6 pb-2 pt-3">
            <BigStat
              size={30}
              value={v.touchesInWindow}
              chips={v.board.blocked > 0 ? [{ tone: 'err', text: `막힘 ${v.board.blocked}` }] : []}
              caption="칸반 작업과 보드 이슈, 각각 마지막으로 움직인 날 기준"
            />
          </div>
          <StepLine series={v.series} hue="var(--send-activity)" unit="개" empty={`최근 ${WINDOW_DAYS}일간 움직인 것이 없습니다.`} />
        </SlabCard>

        <SlabCard i={2} title="작업 규모" className="flex flex-col">
          <div className="flex flex-1 flex-col px-6 pb-6 pt-3">
            <BigStat value={v.headline} chips={v.chips} caption={v.caption} />
            <MeterStack meters={v.meters} foot={v.foot} empty="아직 작업이 없습니다. 아래에서 회사에 일을 맡기세요" />
          </div>
        </SlabCard>
      </div>

      {/* Second row: cron rhythm, who holds the work, THE gradient card */}
      <div className="mt-6 grid grid-cols-3 gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={3} title="크론 실행" sub="요일별">
          <div className="flex items-end justify-between gap-4 px-6 pb-6 pt-3">
            <BigStat
              size={30}
              value={v.cron.runsInWindow}
              chips={v.cron.failedInWindow > 0 ? [{ tone: 'err', text: `실패 ${v.cron.failedInWindow}` }] : []}
              caption={busiestDay.count > 0 ? `가장 바쁜 요일 ${busiestDay.label} · ${busiestDay.count}회` : `${WINDOW_DAYS}일간 실행 없음`}
            />
            <DotMatrix cols={v.cron.rhythm} hue="var(--send-activity)" />
          </div>
        </SlabCard>

        <SlabCard i={4} title="담당자" sub="끝나지 않은 칸반 작업">
          {/* stacked: agent names are long column labels */}
          <div className="flex flex-col gap-5 px-6 pb-6 pt-3">
            <BigStat
              size={30}
              value={v.busiestOwner?.count ?? 0}
              caption={v.busiestOwner ? `가장 많이 맡은 담당: ${v.busiestOwner.name}` : '칸반에 열린 작업 없음'}
            />
            {v.owners.length > 0 && <DotMatrix cols={v.owners} hue="var(--ramp-1)" />}
          </div>
        </SlabCard>

        <InsightCard i={5} badge="확인 필요" value={v.insight.value} headline={v.insight.headline} body={v.insight.body} frac={v.insight.frac} />
      </div>

      {/* The three queues: what fires on a timer, the live board, the local kanban */}
      <TaskCronStrip i={6} crons={crons} stats={cronStats} agentNames={agentNames} />
      <BoardTasks i={7} initialIssues={issues} boardUrl={boardUrl} />
      <TaskBoard i={8} initialTasks={tasks} agentNames={agentNames} />
    </Slab>
  );
}
