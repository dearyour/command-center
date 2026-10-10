import Link from 'next/link';
import { getDb } from '@/lib/data';
import { SkillsGrid, type SkillCard } from '@/components/SkillsGrid';
import { readPluginSkills, readUserSkills } from '@/lib/skills-catalog';
import { skillsVolume } from '@/lib/skills-volume';
import { Slab, SlabTitle, SlabCard, BigStat, Chip, MeterStack, InsightCard, PILL } from '@/components/slab';
import { DotMatrix } from '@/components/slab-charts';

export const dynamic = 'force-dynamic';

const truncate = (t: string, n = 110) => (t.length > n ? `${t.slice(0, n).replace(/\s+\S*$/, '')}…` : t);

/**
 * 2026-09-24: the Brand Deals slab. Skills carry no dates, so the hero shows
 * the catalog's shape (skills per source group) rather than a timeline it
 * would have to invent. Every number comes from lib/skills-volume over the
 * same rows the card wall renders; the wall keeps its filter, reader and
 * download and takes the stagger at i={6}.
 */
export default function SkillsPage() {
  // All three catalogs on one wall: the real Claude Code skills read live
  // from disk (user-scope ~/.claude/skills plus every installed plugin's
  // skills; SKILL.md loads on demand via /api/skills/[slug]) alongside the
  // operator skill cards that have always lived in this section.
  const real = [...readUserSkills(), ...readPluginSkills()];
  const realCards: SkillCard[] = real.map((s) => ({
    id: s.slug,
    name: s.name,
    group: s.group,
    kind: 'claude' as const,
    description: truncate(s.description),
    meta: s.path,
    filePath: s.path,
  }));

  const db = getDb();
  const agentNames = Object.fromEntries(db.agents.all().map((a) => [a.id, a.name]));
  const operator = db.skills.all();
  const operatorCards: SkillCard[] = operator.map((s) => ({
    id: s.id,
    name: s.name,
    group: `운영자 · ${s.category}`,
    kind: 'operator' as const,
    description: truncate(s.description),
    meta: s.ownerAgentId ? (agentNames[s.ownerAgentId] ?? s.ownerAgentId) : '담당 없음',
    filePath: `skills/${s.id}/SKILL.md`,
    status: s.status,
    markdown: s.markdown,
  }));

  const cards = [...realCards, ...operatorCards];
  const sourceNote =
    real.length > 0
      ? `~/.claude(사용자 + 플러그인)에서 불러온 스킬 ${real.length}개 + 운영자 스킬 ${operatorCards.length}개 · 카드를 열면 SKILL.md를 읽거나 다운로드할 수 있습니다.`
      : `운영자 스킬 ${operatorCards.length}개 (이 컴퓨터에는 ~/.claude/skills가 없음) · 카드를 열면 SKILL.md를 읽거나 다운로드할 수 있습니다.`;

  const v = skillsVolume({ claude: real, operator, agentNames });
  const topCategory = v.categories[0];

  return (
    <Slab>
      <SlabTitle
        eyebrow="능력 라이브러리"
        title="스킬"
        meta={`디스크의 Claude Code 스킬 ${v.counts.claude}개 · 운영자 스킬 ${v.counts.operator}개 · 그룹 ${v.groupCount}개`}
        right={
          <>
            <Chip tone={v.insight.value > 0 ? 'warn' : 'ok'}>
              운영 중 {v.counts.live} · 초안 {v.insight.value}
            </Chip>
            <Link href="/agents" className={PILL}>
              에이전트
            </Link>
          </>
        }
      />

      {/* Hero row, Brand Deals' shape: the catalog's shape + the volume card */}
      <div className="grid grid-cols-[2fr_1fr] gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={1} title="스킬 라이브러리" sub="출처 그룹별 스킬">
          {/* stacked: group names are long column labels */}
          <div className="flex flex-col gap-6 px-6 pb-6 pt-3">
            <BigStat
              size={30}
              value={v.groupCount}
              unit="groups"
              chips={[{ tone: 'accent', text: `플러그인 ${v.counts.plugin}` }, { text: `사용자 ${v.counts.user}` }]}
              caption={v.groups.length > 0 ? `가장 큼 · ${v.groups[0].label} ${v.groups[0].count}개` : '이 컴퓨터에는 아직 스킬이 없습니다'}
            />
            {v.groups.length > 0 && <DotMatrix cols={v.groups} hue="var(--send-activity)" />}
          </div>
        </SlabCard>

        <SlabCard i={2} title="스킬 규모" className="flex flex-col">
          <div className="flex flex-1 flex-col px-6 pb-6 pt-3">
            <BigStat value={v.headline} chips={v.chips} caption={v.caption} />
            <MeterStack meters={v.meters} foot={v.foot} empty="아직 스킬이 없습니다" />
          </div>
        </SlabCard>
      </div>

      {/* Second row: operator categories, owners, THE gradient card */}
      <div className="mt-6 grid grid-cols-3 gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={3} title="카테고리" sub="운영자 스킬">
          <div className="flex flex-col gap-5 px-6 pb-6 pt-3">
            <BigStat
              size={30}
              value={v.categories.length}
              caption={topCategory ? `가장 많음 ${topCategory.label} · ${topCategory.count}` : '아직 운영자 스킬이 없습니다'}
            />
            {v.categories.length > 0 && <DotMatrix cols={v.categories} hue="var(--ramp-1)" />}
          </div>
        </SlabCard>

        <SlabCard i={4} title="담당자" sub="스킬을 쓰는 에이전트">
          <div className="flex flex-col gap-5 px-6 pb-6 pt-3">
            <BigStat
              size={30}
              value={v.owners.length}
              chips={v.unassigned > 0 ? [{ tone: 'warn', text: `담당 없음 ${v.unassigned}` }] : []}
              caption={v.owners.length > 0 ? `가장 많이 보유 ${v.owners[0].label} · ${v.owners[0].count}` : '아직 담당자가 있는 운영자 스킬이 없습니다'}
            />
            {v.owners.length > 0 && <DotMatrix cols={v.owners} hue="var(--ramp-4)" />}
          </div>
        </SlabCard>

        <InsightCard i={5} badge="초안" value={v.insight.value} headline={v.insight.headline} body={v.insight.body} frac={v.insight.frac} />
      </div>

      <SkillsGrid i={6} cards={cards} sourceNote={sourceNote} />
    </Slab>
  );
}
