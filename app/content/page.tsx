import Link from 'next/link';
import { ArrowUpRight, BarChart3, Brain, Clapperboard, ExternalLink, Megaphone, Play } from 'lucide-react';
import { getDb } from '@/lib/data';
import { contentAgents } from '@/lib/content';
import { contentVolume } from '@/lib/content-volume';
import { zernioRecentPosts, zernioPostDaysKnown } from '@/lib/connectors/zernio';
import { Dot } from '@/components/terminal';
import { ContentAgentCard } from '@/components/ContentAgentCard';
import { Slab, SlabTitle, SlabCard, BigStat, Chip, MeterStack, InsightCard, PILL } from '@/components/slab';
import { StepLine, DotMatrix } from '@/components/slab-charts';

export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 30;

/** Rounded status pill for a Zernio post, Brand Deals style: color means status only. */
function postPillStyle(status: string) {
  const hue = status === 'published' ? 'var(--ok)' : status === 'failed' ? 'var(--err)' : status === 'scheduled' ? 'var(--warn)' : 'var(--muted)';
  return { background: `color-mix(in oklab, ${hue} 16%, transparent)`, color: hue };
}

// The Vantage content-intelligence system this view backlinks out to.
const INTEL_URL = 'https://intel.example.com';
const INTEL_ANALYTICS_URL = 'https://intel.example.com/my-analytics';

function agoFrom(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}분`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}시간`;
  return `${Math.round(hrs / 24)}일`;
}

function platformLabel(p: string): string {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function BacklinkCard({
  href, icon: Icon, mark, title, sub, internal = false, meta,
}: {
  href: string;
  icon?: typeof Brain;
  /** real brand mark (public/*.png) instead of a lucide glyph */
  mark?: string;
  title: string;
  sub: string;
  internal?: boolean;
  meta?: string;
}) {
  const inner = (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-ctl border border-os-border bg-os-surface2 text-os-accent">
        {mark ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mark} alt="" className="h-5 w-5 object-contain" />
        ) : Icon ? (
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[13.5px] font-semibold">
          {title}
          {internal ? (
            <ArrowUpRight className="h-3.5 w-3.5 lens-child text-os-dim group-hover:text-os-accent" />
          ) : (
            <ExternalLink className="h-3.5 w-3.5 lens-child text-os-dim group-hover:text-os-accent" />
          )}
        </span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-os-dim [text-wrap:pretty]">{sub}</span>
        <span className="mt-1.5 block truncate font-mono text-[10px] text-os-muted">
          {meta ?? href.replace('https://', '')}
        </span>
      </span>
    </>
  );
  const cls =
    'pressable is-row group flex h-full items-start gap-3 rounded-panel border border-os-border bg-os-bg p-4';
  return internal ? (
    <Link href={href} data-lens="r" className={cls}>{inner}</Link>
  ) : (
    <a href={href} data-lens="r" target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
  );
}

export default async function ContentPage() {
  const db = getDb();
  const crew = contentAgents(db.agents.all());
  const leadMagnets = db.leadMagnets.all();
  const lead = crew[0] ?? null;
  const workers = lead ? crew.slice(1) : crew;

  const posts = await zernioRecentPosts(8).catch(() => []);
  // null = Zernio gave no answer: the history is unknown, never "nothing posted".
  const known = await zernioPostDaysKnown().catch(() => null);
  const postsKnown = known !== null;
  const days = known ?? [];
  // zernioPostDays() is one entry per POST; a day with three posts is one active day.
  const activeDays = new Set(days.filter((d) => d.platforms.length > 0).map((d) => d.date)).size;

  // 2026-09-24: the Brand Deals slab. Every number in the hero and the second
  // row comes from lib/content-volume, fed with the same rows the panels
  // below render (the crew, their real runs, the magnets, Zernio's history).
  const v = contentVolume({
    crew,
    runs: db.agentRuns.since(new Date(Date.now() - (WINDOW_DAYS + 1) * 86_400_000).toISOString(), crew.map((a) => a.id)),
    leadMagnets,
    recent: posts,
    postDays: days,
    postsKnown,
    today: new Date().toISOString().slice(0, 10),
    days: WINDOW_DAYS,
  });
  const busiest = v.crewRuns.reduce((best, c) => (c.count > best.count ? c : best), { label: '없음', count: 0 });

  return (
    <Slab>
      <SlabTitle
        eyebrow="콘텐츠 엔진"
        title="콘텐츠 제작"
        meta={`에이전트 ${crew.length}개 · 리드 마그넷 ${leadMagnets.length}개 · ${WINDOW_DAYS}일 중 ${v.activeDays}일 활동`}
        right={
          <>
            <Chip tone="accent">에이전트 {crew.length}개</Chip>
            <Link href="/content/lead-magnets" className={PILL}>
              리드 마그넷
            </Link>
            <Link href="/social" className={PILL}>
              소셜
            </Link>
          </>
        }
      />

      {/* Hero row, Brand Deals' shape: the posting line + the volume card */}
      <div className="grid grid-cols-[2fr_1fr] gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={1} title="게시 활동" sub={`최근 ${WINDOW_DAYS}일`} className="pb-2">
          <div className="px-6 pb-2 pt-3">
            <BigStat
              size={30}
              value={v.postsInWindow}
              display={postsKnown ? undefined : ' - '}
              chips={v.activeDays > 0 ? [{ tone: 'accent', text: `활동 ${v.activeDays}일` }] : []}
              caption={postsKnown ? 'Zernio로 발행한 게시물, 교차 게시 1건당 1개' : 'Zernio 응답 없음 · 게시 기록 알 수 없음'}
            />
          </div>
          <StepLine
            series={v.series}
            hue="var(--send-activity)"
            unit="개"
            empty={postsKnown ? `최근 ${WINDOW_DAYS}일간 기록된 게시물이 없습니다.` : '지금은 게시 기록을 불러올 수 없습니다.'}
          />
        </SlabCard>

        <SlabCard i={2} title="콘텐츠 규모" className="flex flex-col">
          <div className="flex flex-1 flex-col px-6 pb-6 pt-3">
            <BigStat value={v.headline} chips={v.chips} caption={v.caption} />
            <MeterStack meters={v.meters} foot={v.foot} empty="아직 측정할 게시물, 마그넷, 팀 실행이 없습니다" />
          </div>
        </SlabCard>
      </div>

      {/* Second row: crew runs, the lead magnets, THE gradient card */}
      <div className="mt-6 grid grid-cols-3 gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={3} title="팀 실행" sub={`최근 ${WINDOW_DAYS}일`}>
          {/* stacked: seven agent names are too wide to share a row with the caption */}
          <div className="flex flex-col gap-5 px-6 pb-6 pt-3">
            <BigStat
              size={30}
              value={v.runsInWindow}
              caption={busiest.count > 0 ? `가장 바쁨 · ${busiest.label} ${busiest.count}회` : '이 기간에는 팀 실행이 없습니다'}
            />
            <DotMatrix cols={v.crewRuns} hue="var(--ramp-1)" />
          </div>
        </SlabCard>

        <SlabCard
          i={4}
          title="리드 마그넷"
          sub={`페이지 ${v.magnets.total}개`}
          action={
            <Link href="/content/lead-magnets" className={PILL}>
              열기 <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="px-6 pb-6 pt-3">
            <BigStat
              size={30}
              value={v.magnets.live}
              unit="운영 중"
              caption={v.magnets.total > 0 ? `출시한 랜딩 페이지 ${v.magnets.total}개 중` : '아직 기록된 랜딩 페이지가 없습니다'}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {v.magnets.draft > 0 && <Chip tone="warn">초안 {v.magnets.draft}</Chip>}
              {v.magnets.paused > 0 && <Chip tone="err">일시정지 {v.magnets.paused}</Chip>}
              {v.magnets.archived > 0 && <Chip>보관 {v.magnets.archived}</Chip>}
            </div>
          </div>
        </SlabCard>

        <InsightCard
          i={5}
          badge="마지막 게시 이후"
          value={v.insight.value}
          display={v.insight.display}
          headline={v.insight.headline}
          body={v.insight.body}
          frac={v.insight.frac}
        />
      </div>

      {/* Three equal sections (Alex, 2026-08-13): the lead magnet index and
          both Vantage intelligence surfaces, side by side. */}
      <SlabCard i={6} title="콘텐츠 인텔리전스" sub="3개 화면" className="mt-6">
        <div className="grid gap-3 px-6 pb-6 pt-4 md:grid-cols-3">
          <BacklinkCard
            href="/content/lead-magnets"
            internal
            icon={Megaphone}
            title="리드 마그넷"
            sub="출시한 모든 랜딩 페이지와 각 행의 실시간 링크."
            meta={`페이지 ${leadMagnets.length}개 · 운영 중 ${leadMagnets.filter((m) => m.status === 'live').length}개`}
          />
          <BacklinkCard
            href={INTEL_URL}
            mark="/vantage-mark.png"
            title="Vantage Intel"
            sub="콘텐츠 인텔리전스 시스템  -  리서치, 훅, 잘 되는 것들을 콘텐츠 에이전트에게 공급합니다."
          />
          <BacklinkCard
            href={INTEL_ANALYTICS_URL}
            icon={BarChart3}
            title="내 분석"
            sub="인텔리전스 시스템의 콘텐츠별 성과 및 오디언스 분석."
          />
        </div>
      </SlabCard>

      {/* The content agent + crew (real seed roster) */}
      <SlabCard
        i={7}
        title="콘텐츠 에이전트"
        sub={`${crew.length}`}
        className="mt-6"
        action={
          <Link href="/agents" className={PILL}>
            에이전트 <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <div className="px-6 pb-6 pt-3">
          <p className="mb-4 flex items-center gap-1.5 text-[12.5px] text-os-dim">
            <Clapperboard className="h-3.5 w-3.5" /> 소셜 미디어와 연결되어 있습니다. 여기서 또는 에이전트 화면에서 실행하세요.
          </p>
          {lead && <ContentAgentCard agent={lead} lead />}
          {workers.length > 0 && (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {workers.map((a) => (
                <ContentAgentCard key={a.id} agent={a} />
              ))}
            </div>
          )}
        </div>
      </SlabCard>

      {/* Zernio content pipeline  -  recent published content + cadence */}
      <SlabCard
        i={8}
        title="Zernio 콘텐츠 파이프라인"
        sub={posts.length > 0 ? `최근 ${posts.length}개` : '실시간 수집 없음'}
        className="mt-6"
        action={
          <Link href="/social" className={PILL}>
            소셜 <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <p className="px-6 pt-2 font-mono text-[11px] text-os-dim">
          Zernio로 6개 플랫폼에 발행 · 활동일 {activeDays}일 추적됨
        </p>
        {posts.length > 0 ? (
          <ul className="mt-4 border-t border-os-border">
            {posts.map((p, i) => (
              <li
                key={`${p.url}-${i}`}
                data-lens="r"
                className="pressable is-row flex items-center gap-4 border-b border-os-border px-6 py-3.5 last:border-0"
              >
                <Play className="h-3.5 w-3.5 shrink-0 text-os-dim" />
                <Dot state={p.status === 'published' ? 'ok' : 'available'} />
                <span className="w-24 shrink-0 font-mono text-[11px] uppercase tracking-wide text-os-muted">{platformLabel(p.platform)}</span>
                <span className="min-w-0 flex-1 truncate text-[13.5px]">{p.caption || '제목 없는 게시물'}</span>
                <span
                  className="hidden shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] sm:inline"
                  style={postPillStyle(p.status)}
                >
                  {({ published: '게시됨', scheduled: '예약됨', failed: '실패', draft: '초안' } as Record<string, string>)[p.status] ?? p.status}
                </span>
                {p.url ? (
                  <a href={p.url} data-lens="c" target="_blank" rel="noopener noreferrer" className="pressable shrink-0 rounded-full px-1 text-os-dim">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
                <span className="w-10 shrink-0 text-right font-mono text-[11px] text-os-dim">{agoFrom(p.publishedAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mx-6 mb-6 mt-4 rounded-[12px] border border-dashed border-os-border px-4 py-5 text-center font-mono text-[11.5px] text-os-dim">
            지금은 Zernio 실시간 수집이 없습니다  -  API가 응답하면 최근 콘텐츠가 여기에 표시됩니다 (키는 ~/.social-media/.env).
          </p>
        )}
      </SlabCard>
    </Slab>
  );
}
