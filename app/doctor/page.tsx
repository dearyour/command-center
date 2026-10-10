import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { createGBrainProvider } from '@/lib/connectors/gbrain';
import { foldersToClusters } from '@/lib/brain-viz';
import { getDb } from '@/lib/data';
import { BrainCore } from '@/components/BrainCore';
import { PillarRadar } from '@/components/PillarRadar';
import { pillarRadarAxes } from '@/lib/pillar-radar';
import { Dot } from '@/components/terminal';
import { DoctorRerun } from '@/components/DoctorRerun';
import { DoctorRunProvider } from '@/components/DoctorRun';
import { DoctorChecks } from '@/components/DoctorChecks';
import { Slab, SlabTitle, SlabCard, BigStat, Chip, MeterStack, InsightCard, PILL } from '@/components/slab';
import { StepLine, DotMatrix } from '@/components/slab-charts';
import { doctorVolume, doctorLayers, type StorageLayer } from '@/lib/doctor-volume';

export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 14;

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return iso;
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

/** The Brand Deals status pill, in the layer's honest status color. */
function pillStyle(state: StorageLayer['state']): CSSProperties {
  const hue = state === 'connected' ? 'var(--ok)' : state === 'error' ? 'var(--err)' : 'var(--warn)';
  return { background: `color-mix(in oklab, ${hue} 16%, transparent)`, color: hue };
}

function Stage({
  step,
  title,
  caption,
  children,
}: {
  step: string;
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <section className="flex-1 rounded-panel border border-os-border bg-os-surface2 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-ctl bg-os-accent font-mono text-xs font-bold text-os-ink">
          {step}
        </span>
        <div>
          <h3 className="text-[14px] font-semibold">{title}</h3>
          <div className="font-mono text-[10.5px] text-os-dim">{caption}</div>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex shrink-0 items-center justify-center self-stretch px-1 py-2 xl:flex-col">
      <div className="flex items-center gap-1 xl:flex-col">
        <span className="hidden h-px w-6 bg-os-border-strong xl:block xl:h-6 xl:w-px" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-os-dim xl:[writing-mode:vertical-rl]">
          {label}
        </span>
        <span className="text-os-muted xl:rotate-90">→</span>
      </div>
    </div>
  );
}

function FlowStep({ title, detail, dashed = false }: { title: string; detail: string; dashed?: boolean }) {
  return (
    <div
      className={`flex-1 rounded-panel border px-3 py-2.5 ${
        dashed ? 'border-dashed border-os-border' : 'border-os-border bg-os-surface2'
      }`}
    >
      <div className="text-xs font-semibold">{title}</div>
      <div className="mt-0.5 text-[11px] leading-relaxed text-os-dim">{detail}</div>
    </div>
  );
}

// The Doctor: everything that reports on G-Brain's health, split off
// the knowledge-graph tab so that view can stay a single, uncluttered screen.
//
// 2026-09-24: the whole view sits in the Brand Deals slab (components/slab).
// Every number in the hero and second row comes from lib/doctor-volume, fed
// with the same doctor, store, radar and run rows the panels below render.
export default async function DoctorPage() {
  const overview = await createGBrainProvider().overview();
  const { store, doctor } = overview;
  const db = getDb();
  const maxFiles = Math.max(1, ...store.folders.map((f) => f.files));
  const clusters = foldersToClusters(store.folders);
  const storeShort = store.path.replace(process.env.HOME ?? '', '~');

  const brainRuns = db.agentRuns.byAgent('data-agent');
  const lastBrainRun = brainRuns[0];
  // latest run per agent (oldest first so the LAST write per id is the newest)
  const runsByAgent = Object.fromEntries(
    db.agentRuns
      .recent(300)
      .reverse()
      .map((r) => [r.agentId, r]),
  );
  const axes = pillarRadarAxes(db.departments.all(), db.agents.all(), db.sopTasks.all(), runsByAgent);
  const { layers, fallbackActive } = doctorLayers({ doctor, store, storeShort });
  const v = doctorVolume({ doctor, store, axes, runs: brainRuns, days: WINDOW_DAYS });
  const warnings = v.counts.total - v.counts.ok;
  const layersLive = layers.filter((l) => l.state === 'connected').length;
  const statusTone = doctor.connected ? (warnings > 0 ? 'warn' : 'ok') : 'err';

  return (
    <DoctorRunProvider>
      <Slab>
        <SlabTitle
          eyebrow="엔진 상태"
          title="진단"
          meta={`${storeShort} · ${store.totalFiles} 페이지 · ${lastBrainRun ? `마지막 실행 ${relativeTime(lastBrainRun.finishedAt)} · data-agent` : '아직 에이전트 실행 없음'}`}
          right={
            <>
              <Chip tone={statusTone}>
                {doctor.connected ? (warnings > 0 ? `경고 ${warnings}개` : '모두 정상') : '연결 불가'}
              </Chip>
              <Link href="/brain" className={PILL}>
                G-Brain
              </Link>
              <DoctorRerun />
            </>
          }
        />

        {/* Hero row, Brand Deals' shape: the pillar radar + the volume card */}
        <div className="grid grid-cols-[2fr_1fr] gap-6 max-[1200px]:grid-cols-1">
          <SlabCard i={1} title="축별 상태" sub="실시간 명단 + 실행 + SOP 커버리지" className="flex flex-col overflow-hidden">
            <div data-lens="r" aria-label="축별 상태 레이더" className="flex min-h-[440px] flex-1 flex-col">
              <PillarRadar axes={axes} health={doctor.healthScore} warnings={warnings} />
            </div>
          </SlabCard>

          <SlabCard i={2} title="상태 규모" sub="100점 만점" className="flex flex-col">
            <div className="flex flex-1 flex-col px-6 pb-6 pt-3">
              <BigStat
                value={v.headline ?? undefined}
                display={v.headline == null ? ' - ' : undefined}
                unit="/100"
                chips={v.chips}
                caption={v.caption}
              />
              <MeterStack meters={v.meters} foot={v.foot} />
            </div>
          </SlabCard>
        </div>

        {/* Second row: brain runs, the store's shape, THE gradient card */}
        <div className="mt-6 grid grid-cols-3 gap-6 max-[1200px]:grid-cols-1">
          <SlabCard i={3} title="브레인 실행" sub={`data-agent · 최근 ${WINDOW_DAYS}일`} className="pb-2">
            <div className="px-6 pb-2 pt-3">
              <BigStat
                size={30}
                value={v.runsInWindow}
                chips={v.failedInWindow > 0 ? [{ tone: 'err', text: `실패 ${v.failedInWindow}` }] : []}
                caption={lastBrainRun ? `마지막 실행 ${relativeTime(lastBrainRun.finishedAt)}` : '아직 에이전트 실행 없음'}
              />
            </div>
            <StepLine series={v.series} hue="var(--send-activity)" unit="회" empty={`최근 ${WINDOW_DAYS}일간 data-agent 실행이 없습니다.`} />
          </SlabCard>

          <SlabCard i={4} title="브레인 저장소" sub={`폴더 ${store.folders.length}개`}>
            {/* folder names run long, so the number sits above the matrix */}
            <div className="flex flex-col gap-5 px-6 pb-6 pt-3">
              <BigStat
                size={30}
                value={v.store.total}
                unit="페이지"
                caption={v.store.top ? `가장 큼 · ${v.store.top.name} · ${v.store.top.files} 페이지` : '아직 디스크에 마크다운이 없습니다'}
              />
              <DotMatrix cols={v.store.cols} hue="var(--brain-2)" />
            </div>
          </SlabCard>

          <InsightCard
            i={5}
            badge="확인 필요"
            value={v.insight.value ?? undefined}
            display={v.insight.value == null ? ' - ' : undefined}
            headline={v.insight.headline}
            body={v.insight.body}
            frac={v.insight.frac}
          />
        </div>

        {/* Third row: the doctor core beside the storage layers */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SlabCard i={6} title="진단 코어" sub={doctor.connected ? (warnings > 0 ? '경고' : '정상') : '연결 불가'} className="flex flex-col overflow-hidden">
            <div data-lens="r" className="brain-stage relative mt-4 flex min-h-[440px] flex-1 flex-col">
              <div className="flex items-start justify-between px-6 pt-3.5 font-mono text-[10px] leading-normal text-os-dim">
                <span>{lastBrainRun ? `마지막 실행 ${relativeTime(lastBrainRun.finishedAt)} · data-agent` : '아직 에이전트 실행 없음'}</span>
                <div className="flex flex-col gap-1 text-right">
                  <span>
                    <b className="font-medium text-os-muted">하이브리드 검색</b> {doctor.connected ? '확인됨' : '성능 저하'}
                  </span>
                  <span>{fallbackActive ? '로컬 대체 검색 사용 중' : 'supabase 연결 가능'}</span>
                </div>
              </div>
              <div className="grid flex-1 place-items-center">
                <div className="w-full max-w-[540px]">
                  <BrainCore clusters={clusters} health={doctor.healthScore} doctor={doctor} fallbackActive={fallbackActive} />
                </div>
              </div>
            </div>
          </SlabCard>

          {/* Core status: storage layers + doctor-health footer */}
          <SlabCard i={7} title="저장 계층" sub={`${layersLive}/${layers.length} 가동 중`} className="flex flex-col">
            <div className="mt-4 flex flex-1 flex-col border-t border-os-border">
              {layers.map((layer) => (
                <div
                  key={layer.name}
                  data-lens="r"
                  className="pressable is-row flex flex-1 items-center gap-4 border-b border-os-border px-6 py-4 last:border-0"
                >
                  <Dot state={layer.state} pulse={layer.state === 'connected'} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium">{layer.name}</div>
                    <div className="truncate font-mono text-[11px] text-os-dim">{layer.sub}</div>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em]"
                    style={pillStyle(layer.state)}
                  >
                    {layer.val}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-os-border px-6 py-3.5 font-mono text-[11px]">
              <span className="text-os-dim">
                <b className="font-medium text-os-muted">진단</b> · 상태 {doctor.healthScore ?? ' - '}/100
              </span>
              <span className={warnings > 0 ? 'text-os-warn' : doctor.connected ? 'text-os-ok' : 'text-os-err'}>
                {doctor.connected ? (warnings > 0 ? `경고 ${warnings}개` : '모두 정상') : '오프라인'}
              </span>
            </div>
          </SlabCard>
        </div>

        {/* The pipeline: where knowledge lives and how it becomes searchable */}
        <SlabCard i={8} title="파이프라인" sub={`디스크의 페이지 ${store.totalFiles}개`} className="mt-6">
          <div className="flex flex-col gap-2 px-6 pb-6 pt-4 xl:flex-row xl:items-stretch">
            <Stage step="1" title="마크다운 브레인 저장소" caption={storeShort}>
              <div className="text-xs text-os-muted">
                디스크에 있는 페이지 {store.totalFiles}개, 평범한 <span className="font-semibold text-os-text">.md</span> 파일이
                원본입니다. <code className="font-mono text-[11px]">gbrain sync</code> 가 git 저장소를 훑어서
                바뀐 페이지를 올립니다.
              </div>
              <ul className="mt-3 space-y-1.5">
                {store.folders.map((folder) => (
                  <li key={folder.name} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 truncate font-mono text-[11px] text-os-muted">{folder.name}</span>
                    <span
                      className="h-2 rounded-full bg-os-accent"
                      style={{
                        width: `${Math.max(6, (folder.files / maxFiles) * 100)}%`,
                        opacity: 0.25 + 0.55 * (folder.files / maxFiles),
                      }}
                    />
                    <span className="font-mono text-[11px] text-os-dim">{folder.files}</span>
                  </li>
                ))}
              </ul>
            </Stage>

            <Arrow label="동기화 · 가져오기" />

            <Stage step="2" title="gbrain CLI" caption="청크 분할 · 임베딩 · 라우팅, 디스크와 데이터베이스 사이의 엔진">
              <DoctorChecks
                checks={doctor.checks}
                healthScore={doctor.healthScore}
                connected={doctor.connected}
                detail={doctor.detail}
              />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {['put', 'get', 'query', 'search', 'sync', 'import', 'export', 'doctor'].map((cmd) => (
                  <span key={cmd} data-lens="c" className="rounded-full border border-os-border px-2.5 py-0.5 font-mono text-[10.5px] text-os-muted">
                    {cmd}
                  </span>
                ))}
              </div>
            </Stage>

            <Arrow label="임베딩 · 저장" />

            <Stage step="3" title="Supabase Postgres + pgvector" caption='"세컨드 브레인" · Ollama bge-m3 임베딩'>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-panel border border-os-border bg-os-surface px-3 py-2.5">
                  <div className="text-[30px] font-semibold leading-none tracking-[-0.03em] tabular-nums">918</div>
                  <div className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-os-dim">페이지 · 마지막 확인</div>
                </div>
                <div className="rounded-panel border border-os-border bg-os-surface px-3 py-2.5">
                  <div className="text-[30px] font-semibold leading-none tracking-[-0.03em] tabular-nums">11k</div>
                  <div className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-os-dim">청크 · 마지막 확인</div>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 text-[11px] leading-relaxed text-os-muted">
                <p>
                  각 페이지는 청크로 나뉘고, 청크마다 로컬 bge-m3 임베딩이{' '}
                  <code className="font-mono">vector</code> 컬럼에 저장됩니다. Postgres가 텍스트(tsvector)와
                  벡터를 모두 가지고 있어서 하나의 데이터베이스로 키워드 검색과 의미 검색을 모두 처리합니다.
                </p>
                <p className="text-os-dim">
                  무료 플랜은 사용하지 않으면 일시정지됩니다  -  하이브리드 검색이 실패하면 Supabase 대시보드에서 다시 켜세요.
                  디스크의 브레인 저장소는 그와 상관없이 계속 동작합니다.
                </p>
              </div>
            </Stage>
          </div>
        </SlabCard>

        {/* How a query actually resolves */}
        <SlabCard i={9} title="검색 경로" sub="하이브리드 검색, 정직한 대체 경로" className="mt-6">
          <div className="px-6 pb-6 pt-3">
            <p className="mb-4 text-[13px] text-os-dim">
              에이전트가 <code className="font-mono">gbrain query</code> 를 호출하면 일어나는 일: 하이브리드 검색과
              정직한 대체 경로.
            </p>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
              <FlowStep title="질문" detail="당신이나 에이전트 실행이 던지는 자연어 질문." />
              <Arrow label="확장" />
              <FlowStep title="질문 확장" detail="CLI가 질문을 여러 검색 변형으로 바꿔 씁니다 (--no-expand 로 생략 가능)." />
              <Arrow label="분산" />
              <div className="flex flex-1 flex-col gap-2">
                <FlowStep title="키워드 검색" detail="청크 텍스트에 대한 Postgres tsvector 전문 검색." />
                <FlowStep title="벡터 검색" detail="Ollama bge-m3 임베딩(1024차원)에 대한 pgvector 최근접 이웃 검색." />
              </div>
              <Arrow label="병합" />
              <FlowStep title="RRF 융합" detail="상호 순위 융합(RRF)으로 두 결과 목록을 하나의 순위로 합칩니다." />
              <Arrow label="답변" />
              <FlowStep title="순위별 발췌" detail="상위 페이지와 발췌문을 에이전트에게 돌려줍니다." />
            </div>
            <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-stretch">
              <FlowStep
                dashed
                title="대체 경로: 로컬 grep"
                detail="Supabase가 일시정지되거나 연결할 수 없으면 커맨드 센터가 마크다운 브레인 저장소를 직접 grep 합니다  -  덜 똑똑하지만 멈추지 않습니다."
              />
            </div>
          </div>
        </SlabCard>
      </Slab>
    </DoctorRunProvider>
  );
}
