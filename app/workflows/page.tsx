import type { ReactNode } from 'react';
import Link from 'next/link';
import { getDb } from '@/lib/data';
import { Slab, SlabTitle, SlabCard, BigStat, Chip, MeterStack, InsightCard, PILL } from '@/components/slab';
import { StepLine, DotMatrix } from '@/components/slab-charts';
import { WorkflowTree, type AgentPresence } from '@/components/WorkflowTree';
import { ScheduledTasks } from '@/components/ScheduledTasks';
import { scheduledJobRows } from '@/lib/scheduled-jobs';
import { BrandLogo } from '@/lib/brand-logos';
import { toolBrand } from '@/lib/workflow-tool-brands';
import { agentAvatars } from '@/lib/agent-avatars';
import type { AgentRun } from '@/lib/schemas';
import { workflowsVolume } from '@/lib/workflows-volume';

export const dynamic = 'force-dynamic';

const RUNS_PER_OWNER = 4;
const WINDOW_DAYS = 14;

/**
 * Two halves. The clock half (scheduled tasks, real crons, real run history)
 * is Alex's and stays first. The process-map half is the GladOS tree
 * (imported 2026-09-17): collapsed cards that expand into a vertical tree
 * with real forks, a step-detail drawer, and a builder that writes the same
 * workflows table.
 *
 * 2026-09-24: both halves now sit in the Brand Deals slab (components/slab).
 * Every number in the hero and second row comes from lib/workflows-volume,
 * fed with the same rows the panels below render.
 */
export default function WorkflowsPage() {
  const db = getDb();
  const workflows = db.workflows.all();
  const agents = db.agents.all();

  // The clock half: what the OS runs on a schedule, and whether it actually
  // ran. Names resolve from the agent roster so a row reads as "Stack Monitor"
  // rather than a slug, and an unresolvable one is flagged instead of quietly
  // rendered blank.
  const crons = db.agentCrons.all();
  const jobs = scheduledJobRows({
    crons,
    stats: db.cronRuns.statsByCron(),
    agentNames: Object.fromEntries(agents.map((a) => [a.id, a.name])),
    // Real run history per cron, straight off cron_runs, for the 12-run strip
    // and the inline failure summary.
    recentRuns: Object.fromEntries(
      crons.map((c) => [c.id, db.cronRuns.byCron(c.id, 12).map((r) => ({ ok: r.ok, summary: r.summary }))]),
    ),
  });
  const v = workflowsVolume({ jobs, workflows, runs: db.cronRuns.since(new Date(Date.now() - (WINDOW_DAYS + 1) * 86_400_000).toISOString()), days: WINDOW_DAYS });
  const healthy = v.counts.healthy;
  const busiest = v.rhythm.reduce((best, d) => (d.count > best.count ? d : best), v.rhythm[0]);
  const wholeHours = Number.isInteger(v.load.manualHours);

  // Render the company logos here, server-side: BrandLogo pulls simple-icons,
  // which must never enter the client bundle. The tree receives ready nodes.
  const toolIds = new Set(workflows.flatMap((w) => w.steps.flatMap((s) => s.tools)));
  const toolLogos: Record<string, ReactNode> = {};
  for (const id of toolIds) {
    const b = toolBrand(id);
    toolLogos[id] = <BrandLogo slug={b.slug} name={b.name} size={12} />;
  }

  // Roster reality check: a step only claims "agent live" when its owner is
  // actually active on the real roster.
  const agentPresence: Record<string, AgentPresence> = {};
  for (const a of agents) agentPresence[a.name] = a.status === 'active' ? 'active' : 'inactive';

  // Step detail needs an honest owner identity: a photo when one exists, and
  // that owner's real recent run history, both keyed by the step's owner NAME
  // (the schema stores a display name, not an agent id), resolved against the
  // real roster rather than fabricated.
  const avatars = agentAvatars();
  const agentByName = new Map(agents.map((a) => [a.name, a]));
  const ownerNames = new Set(workflows.flatMap((w) => w.steps.map((s) => s.owner)));
  const avatarByOwner: Record<string, string | null> = {};
  const runsByOwner: Record<string, AgentRun[]> = {};
  for (const name of ownerNames) {
    const agent = agentByName.get(name);
    avatarByOwner[name] = agent ? (avatars.get(agent.id) ?? null) : null;
    runsByOwner[name] = agent ? db.agentRuns.byAgent(agent.id).slice(0, RUNS_PER_OWNER) : [];
  }

  return (
    <Slab>
      <SlabTitle
        eyebrow="예약 작업 + 프로세스 맵"
        title="워크플로"
        meta={`워크플로 ${workflows.length}개 · ${WINDOW_DAYS}일간 크론 실행 ${v.runsInWindow}회 · 실패 ${v.failedInWindow}회`}
        right={
          <>
            <Chip tone={healthy === jobs.length ? 'ok' : 'warn'}>
              크론 {jobs.length}개 · 정상 {healthy}개
            </Chip>
            <Link href="/tasks" className={PILL}>
              작업
            </Link>
            <Link href="/agents" className={PILL}>
              에이전트
            </Link>
          </>
        }
      />

      {/* Hero row, Brand Deals' shape: the run line + the volume card */}
      <div className="grid grid-cols-[2fr_1fr] gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={1} title="실행 활동" sub={`최근 ${WINDOW_DAYS}일`} className="pb-2">
          <div className="px-6 pb-2 pt-3">
            <BigStat
              size={30}
              value={v.runsInWindow}
              chips={v.failedInWindow > 0 ? [{ tone: 'err', text: `실패 ${v.failedInWindow}` }] : []}
              caption="cron_runs에서 바로 가져온 실제 크론 실행 기록"
            />
          </div>
          <StepLine series={v.series} hue="var(--send-activity)" unit="회" empty={`최근 ${WINDOW_DAYS}일간 크론 실행 기록이 없습니다.`} />
        </SlabCard>

        <SlabCard i={2} title="크론 규모" className="flex flex-col">
          <div className="flex flex-1 flex-col px-6 pb-6 pt-3">
            <BigStat value={v.headline} chips={v.chips} caption={v.caption} />
            <MeterStack meters={v.meters} foot={v.foot} />
          </div>
        </SlabCard>
      </div>

      {/* Second row: weekday rhythm, process load, THE gradient card */}
      <div className="mt-6 grid grid-cols-3 gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={3} title="실행 리듬" sub="요일별">
          <div className="flex items-end justify-between gap-4 px-6 pb-6 pt-3">
            <BigStat
              size={30}
              display={busiest.count > 0 ? busiest.label : '없음'}
              caption={busiest.count > 0 ? `가장 바쁜 요일 · ${busiest.count}회` : `${WINDOW_DAYS}일간 실행 없음`}
            />
            <DotMatrix cols={v.rhythm} hue="var(--send-activity)" />
          </div>
        </SlabCard>

        <SlabCard i={4} title="프로세스 부하" sub="주당 시간">
          <div className="flex items-end justify-between gap-4 px-6 pb-6 pt-3">
            <BigStat
              size={30}
              value={wholeHours ? v.load.manualHours : undefined}
              display={wholeHours ? undefined : String(v.load.manualHours)}
              unit="시간"
              caption={`직접 처리 · 에이전트가 ${v.load.agentHours}시간 담당`}
            />
            <DotMatrix cols={v.load.perWorkflow} hue="var(--ramp-1)" />
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

      {/* The clock half: add, run, pause and delete crons in place */}
      <SlabCard i={6} className="mt-6 px-6 pb-1 pt-5">
        <ScheduledTasks jobs={jobs} agents={agents.map((a) => ({ id: a.id, name: a.name }))} />
      </SlabCard>

      {/* The process-map half: the tree, its step drawer and the builder */}
      <SlabCard i={7} title="프로세스 맵" sub={`워크플로 ${workflows.length}개`} className="mt-6">
        <div className="px-6 pb-6 pt-4">
          <WorkflowTree
            workflows={workflows}
            toolLogos={toolLogos}
            agentPresence={agentPresence}
            agents={agents.map((a) => ({ id: a.id, name: a.name }))}
            avatarByOwner={avatarByOwner}
            runsByOwner={runsByOwner}
          />
        </div>
      </SlabCard>
    </Slab>
  );
}
