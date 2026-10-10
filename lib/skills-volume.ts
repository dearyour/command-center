import type { Meter, Tone } from '@/components/slab';
import type { SeriesPoint } from '@/components/slab-charts';
import type { CatalogSkill } from '@/lib/skills-catalog';
import type { Skill } from '@/lib/schemas';
import { shortLabels } from '@/lib/short-labels';

/**
 * /skills in the Brand Deals look (Alex, 2026-09-24). Skills carry no
 * dates, so nothing here draws a timeline it would have to invent: the slab
 * shows the catalog's shape instead. One pure pass over the page's own rows
 * (the ~/.claude user + plugin skills and the operator skills table) gives the
 * Skill Volume headline and meters, skills per source group, operator skills
 * per category and per owner, and the single "Drafts" card.
 */
export type SkillsVolumeInput = {
  claude: Array<Pick<CatalogSkill, 'slug' | 'group'>>;
  operator: Array<Pick<Skill, 'name' | 'category' | 'status' | 'ownerAgentId' | 'tools'>>;
  agentNames: Record<string, string>;
};

export type SkillsVolume = {
  headline: number;
  counts: { claude: number; user: number; plugin: number; operator: number; live: number; learning: number; planned: number };
  chips: Array<{ tone?: Tone; text: string }>;
  caption: string;
  meters: Meter[];
  foot: string;
  groups: SeriesPoint[];
  groupCount: number;
  categories: SeriesPoint[];
  owners: SeriesPoint[];
  unassigned: number;
  insight: { value: number; headline: string; body: string; frac: number };
};

const GROUP_COLS = 8;
const OWNER_COLS = 6;
const frac = (n: number, d: number) => (d > 0 ? Math.max(0, Math.min(1, n / d)) : 0);
const pct = (f: number) => `${Math.round(f * 100)}%`;

/** A plugin skill's slug is `plugin:skill`, the same test the card wall uses. */
const isPlugin = (s: { slug: string }) => s.slug.includes(':');

/** Count by key, keeping first-seen order so ties stay stable after the sort. */
function tally(keys: string[]): Array<[string, number]> {
  const m = new Map<string, number>();
  for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}


const toSeries = (ranked: Array<[string, number]>, split: RegExp): SeriesPoint[] => {
  const labels = shortLabels(
    ranked.map(([k]) => k),
    split,
    12,
  );
  return ranked.map(([, count], i) => ({ label: labels[i], count }));
};

export function skillsVolume(x: SkillsVolumeInput): SkillsVolume {
  const plugin = x.claude.filter(isPlugin).length;
  const claude = x.claude.length;
  const operator = x.operator.length;
  const learning = x.operator.filter((s) => s.status === 'learning').length;
  const planned = x.operator.filter((s) => s.status === 'planned').length;
  // Claude Code skills on disk are live by definition (the card wall reads
  // them that way); operator skills carry their own status.
  const live = claude + x.operator.filter((s) => s.status === 'live').length;
  const total = claude + operator;
  const counts = { claude, user: claude - plugin, plugin, operator, live, learning, planned };

  const chips: SkillsVolume['chips'] = [];
  if (live) chips.push({ tone: 'ok', text: `운영 중 ${live}` });
  if (learning) chips.push({ tone: 'warn', text: `학습 중 ${learning}` });
  if (planned) chips.push({ text: `계획됨 ${planned}` });

  const owned = x.operator.filter((s) => s.ownerAgentId != null).length;
  const withTools = x.operator.filter((s) => s.tools.length > 0).length;
  const liveF = frac(live, total);
  const claudeF = frac(claude, total);
  const ownedF = frac(owned, operator);
  const toolsF = frac(withTools, operator);
  const meters: Meter[] = [
    { label: `운영 중 (${live}/${total})`, frac: liveF, display: total ? pct(liveF) : '아직 스킬 없음', hue: 'var(--ok)' },
    { label: `디스크의 Claude Code (${claude}/${total})`, frac: claudeF, display: claude ? pct(claudeF) : '디스크에 없음', hue: 'var(--ramp-1)' },
    { label: `담당자가 있는 운영자 스킬 (${owned}/${operator})`, frac: ownedF, display: operator ? pct(ownedF) : '운영자 스킬 없음', hue: 'var(--accent)' },
    { label: `도구가 연결된 운영자 스킬 (${withTools}/${operator})`, frac: toolsF, display: operator ? pct(toolsF) : '운영자 스킬 없음', hue: 'var(--ramp-4)' },
  ];

  // Source groups: each plugin is its own group; operator skills are one.
  const groupKeys = [...x.claude.map((s) => s.group.replace(/^Plugin · /, '')), ...x.operator.map(() => '운영자')];
  const rankedGroups = tally(groupKeys);
  const groups = toSeries(rankedGroups.slice(0, GROUP_COLS), /\s*·\s*|\s+/);
  const pluginNames = new Set(x.claude.filter(isPlugin).map((s) => s.slug.split(':')[0]));
  const tools = new Set(x.operator.flatMap((s) => s.tools)).size;

  const categories = toSeries(
    tally(x.operator.map((s) => s.category)),
    /\s*·\s*|\s+&\s+|\s+/,
  );
  const rankedOwners = tally(x.operator.filter((s) => s.ownerAgentId != null).map((s) => x.agentNames[s.ownerAgentId!] ?? s.ownerAgentId!)).slice(0, OWNER_COLS);
  const owners = toSeries(rankedOwners, /\s+/);

  // The one gradient card: the operator drafts still to finish.
  const drafts = x.operator.filter((s) => s.status !== 'live');
  const parts: string[] = [];
  if (learning) parts.push(`학습 중 ${learning}`);
  if (planned) parts.push(`계획됨 ${planned}`);
  const insight = {
    value: drafts.length,
    headline: parts.length ? `${parts.join(' · ')}.` : '모든 운영자 스킬이 운영 중입니다.',
    body: drafts.length
      ? drafts
          .slice(0, 3)
          .map((s) => s.name)
          .join(' · ')
      : operator
        ? `운영자 스킬 ${operator}개, 모두 운영 중.`
        : '아직 운영자 스킬이 없습니다.',
    frac: frac(drafts.length, operator),
  };

  return {
    headline: total,
    counts,
    chips,
    caption: `사용자 ${counts.user} · 플러그인 ${plugin} · 운영자 ${operator}`,
    meters,
    foot: `그룹 ${rankedGroups.length}개 · 플러그인 ${pluginNames.size}개 · 연결된 도구 ${tools}개`,
    groups,
    groupCount: rankedGroups.length,
    categories,
    owners,
    unassigned: operator - owned,
    insight,
  };
}
