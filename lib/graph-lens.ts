/**
 * Lenses over the operating knowledge graph: slice the
 * same 114 nodes three ways — by ENTITY TYPE, by BUSINESS FUNCTION (core vs
 * enabling, plus the two venture teams), and by ACTION (what a thing is
 * actually used for). Picking a lens lights the matching nodes and dims the
 * rest. Pure data + matchers; the component supplies the node list and a
 * department resolver.
 */

export type LensGroup = 'entity' | 'function' | 'action';

export type Lens = { id: string; group: LensGroup; label: string };

export type LensNode = { id: string; kind: string };

export type LensContext = {
  nodes: LensNode[];
  /** resolves any node to its pillar's team node id (`team:dept-…`), or null */
  teamOf: (nodeId: string) => string | null;
};

export const ENTITY_LENSES: Lens[] = [
  { id: 'ent-people', group: 'entity', label: '모든 사람' },
  { id: 'ent-subagents', group: 'entity', label: '하위 에이전트' },
  { id: 'ent-tools', group: 'entity', label: '도구' },
  { id: 'ent-workflows', group: 'entity', label: '워크플로' },
  { id: 'ent-sops', group: 'entity', label: 'SOP' },
  { id: 'ent-projects', group: 'entity', label: '프로젝트' },
  { id: 'ent-teams', group: 'entity', label: '팀' },
  { id: 'ent-departments', group: 'entity', label: '부서' },
];

export const FUNCTION_LENSES: Lens[] = [
  { id: 'fn-core', group: 'function', label: '핵심' },
  { id: 'fn-enabling', group: 'function', label: '지원' },
  { id: 'fn-vantage', group: 'function', label: 'Vantage 팀' },
  { id: 'fn-launchpad-cohort', group: 'function', label: 'Launchpad Cohort 팀' },
];

export const ACTION_LENSES: Lens[] = [
  { id: 'act-ad-creation', group: 'action', label: '광고 제작' },
  { id: 'act-lead-generation', group: 'action', label: '리드 발굴' },
  { id: 'act-content-repurposing', group: 'action', label: '콘텐츠 재가공' },
  { id: 'act-content-ideation', group: 'action', label: '콘텐츠 아이디어' },
  { id: 'act-content-scripts', group: 'action', label: '콘텐츠 대본 작성' },
  { id: 'act-social-sentiment', group: 'action', label: '소셜 미디어 반응 분석' },
  { id: 'act-social-scheduler', group: 'action', label: '소셜 게시 & 예약' },
  { id: 'act-ai-visuals', group: 'action', label: 'AI 생성 시각 자료' },
  { id: 'act-competitor-intel', group: 'action', label: '경쟁사 광고 분석' },
  { id: 'act-icp-simulation', group: 'action', label: 'ICP 식별 & 시뮬레이션' },
  { id: 'act-channel-budget', group: 'action', label: '채널 & 예산 배분' },
];

export const ALL_LENSES: Lens[] = [...ENTITY_LENSES, ...FUNCTION_LENSES, ...ACTION_LENSES];

/** Revenue-driving pillars vs the ones that keep the machine running. */
const CORE_DEPTS = new Set(['team:dept-sales', 'team:dept-marketing-growth', 'team:dept-clients']);
const ENABLING_DEPTS = new Set(['team:dept-tech', 'team:dept-finance', 'team:dept-comms']);

/** Venture team rosters — seeded agent ids (graph nodes are `emp:<id>`). */
const VENTURE_TEAMS: Record<string, string[]> = {
  'fn-vantage': ['vantage-sales', 'vantage-paykit', 'paykit-sales'],
  'fn-launchpad-cohort': ['launchpad-cohort-sales'],
};

/** What each action actually runs on — seeded agent ids, honest best-fit. */
const ACTION_AGENTS: Record<string, string[]> = {
  'act-ad-creation': ['adsmith-creative', 'renderly-creative', 'reelkit-editor'],
  'act-lead-generation': ['sales-agent', 'launchpad-cohort-sales', 'dmflow-mcp', 'vantage-sales'],
  'act-content-repurposing': ['reelkit-editor', 'postly-publisher'],
  'act-content-ideation': ['social-agent', 'data-agent'],
  'act-content-scripts': ['social-agent', 'adsmith-creative'],
  'act-social-sentiment': ['social-agent', 'data-agent'],
  'act-social-scheduler': ['postly-publisher', 'social-agent', 'dmflow-mcp'],
  'act-ai-visuals': ['renderly-creative', 'adsmith-creative'],
  'act-competitor-intel': ['data-agent', 'adsmith-creative'],
  'act-icp-simulation': ['data-agent', 'sales-calls-data', 'crm-pulse'],
  'act-channel-budget': ['data-agent', 'payments-pulse'],
};

const idSet = (ids: string[]) => new Set(ids.map((id) => `emp:${id}`));

/**
 * The node ids a lens lights. Unknown lens → empty set. Workflows and
 * projects are not modeled as graph entities yet — their lenses honestly
 * return empty until those tables exist (demo-first, real-ready).
 */
export function lensNodeSet(lensId: string, ctx: LensContext): Set<string> {
  const out = new Set<string>();
  const byKind = (kind: string) => {
    for (const n of ctx.nodes) if (n.kind === kind) out.add(n.id);
  };
  switch (lensId) {
    case 'ent-people':
      byKind('person');
      break;
    case 'ent-subagents':
      byKind('employee');
      break;
    case 'ent-tools':
      byKind('tool');
      break;
    case 'ent-sops':
      byKind('task');
      break;
    case 'ent-departments':
      byKind('team');
      break;
    case 'ent-teams': {
      const members = idSet([...VENTURE_TEAMS['fn-vantage'], ...VENTURE_TEAMS['fn-launchpad-cohort']]);
      for (const n of ctx.nodes) if (members.has(n.id)) out.add(n.id);
      break;
    }
    case 'ent-workflows':
    case 'ent-projects':
      break; // not modeled yet — honest empty
    case 'fn-core':
    case 'fn-enabling': {
      const depts = lensId === 'fn-core' ? CORE_DEPTS : ENABLING_DEPTS;
      for (const n of ctx.nodes) {
        const team = n.kind === 'team' ? n.id : ctx.teamOf(n.id);
        if (team && depts.has(team)) out.add(n.id);
      }
      break;
    }
    case 'fn-vantage':
    case 'fn-launchpad-cohort': {
      const members = idSet(VENTURE_TEAMS[lensId]);
      for (const n of ctx.nodes) if (members.has(n.id)) out.add(n.id);
      break;
    }
    default: {
      const agents = ACTION_AGENTS[lensId];
      if (!agents) break;
      const members = idSet(agents);
      for (const n of ctx.nodes) if (members.has(n.id)) out.add(n.id);
    }
  }
  return out;
}
