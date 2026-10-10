import { NAV_OPERATE, NAV_AGENTS, NAV_INTELLIGENCE, NAV_SYSTEM, NAV_LIBRARY } from '@/lib/nav';

export type PaletteKind = 'go' | 'run' | 'ask';
export type PaletteScope = 'all' | PaletteKind;

/** The slice of an agent row the palette needs — serializable across the
    server → client boundary (the layout builds it from the DB). */
export type PaletteAgent = { id: string; name: string; role: string };

export type PaletteCommand = {
  id: string;
  kind: PaletteKind;
  title: string;
  sub: string;
  glyph: string;
  /** go: internal route or http(s) external link. ask: optional page jump. */
  href?: string;
  aliases?: string[];
  /** run: target for POST /api/agents/:id/run */
  agentId?: string;
  /** ask: the message POSTed to /api/conductor/chat */
  prompt?: string;
};

// Search vocabulary the nav labels alone don't cover — what the operator actually
// types when he means each view.
const NAV_ALIASES: Record<string, string[]> = {
  // English view names stay searchable now that the nav labels are Korean.
  '/': ['home', 'console', 'dashboard', 'overview'],
  '/comms': ['comms', 'inbox', 'email', 'messages', 'slack', 'whatsapp', 'unread'],
  '/funnel': ['funnel', 'clients', 'journey', 'pipeline', 'vantage'],
  '/workflows': ['workflows', 'automations', 'crons'],
  '/social': ['social', 'instagram', 'tiktok', 'youtube', 'followers', 'zernio'],
  '/content': ['content', 'videos', 'posts', 'carousel'],
  '/brand-deals': ['brand', 'deals', 'sponsors', 'partnerships'],
  '/finances': ['finances', 'money', 'stripe', 'revenue', 'expenses'],
  '/trading': ['trading', 'robinhood', 'phantom', 'markets', 'portfolio'],
  '/adpilot': ['adpilot', 'ads'],
  '/agents': ['agents', 'roster', 'workforce'],
  '/chats': ['chats', 'conversations', 'threads'],
  '/tasks': ['tasks', 'todo', 'board', 'kanban'],
  '/skills': ['skills', 'sops', 'playbooks'],
  '/org': ['org', 'hierarchy', 'chart', 'structure', 'pillars'],
  '/blueprint': ['blueprint'],
  '/brain': ['gbrain', 'knowledge', 'memory', 'graph', 'recall'],
  '/doctor': ['doctor', 'health', 'diagnostics', 'checks'],
  '/integrations': ['connections', 'tools', 'creds', 'status'],
  '/usage': ['usage', 'tokens', 'burn', 'quota', 'seats'],
  '/roadmap': ['roadmap', 'phases', 'quarters', 'plan'],
  '/analytics': ['analytics', 'metrics', 'numbers'],
  '/reference': ['reference', 'brm', 'domains', 'model'],
  '/personas': ['personas', 'templates', 'variants'],
};

const NAV_GROUPS: [string, { href: string; label: string }[]][] = [
  ['운영', NAV_OPERATE],
  ['에이전트', NAV_AGENTS],
  ['인텔리전스', NAV_INTELLIGENCE],
  ['시스템', NAV_SYSTEM],
  ['라이브러리', NAV_LIBRARY],
];

// Off-OS jumps that used to live in the flat command list. Entries for
// retired connectors don't carry over.
const EXTERNAL: PaletteCommand[] = [
  { id: 'ext-command-center', kind: 'go', title: '커맨드 센터', sub: 'localhost:4000', glyph: '↗', href: 'http://localhost:4000', aliases: ['command-center', 'kanban', 'missions'] },
  { id: 'ext-remotion', kind: 'go', title: 'Remotion Studio', sub: 'localhost:3789', glyph: '↗', href: 'http://localhost:3789', aliases: ['video', 'render'] },
  { id: 'ext-skool', kind: 'go', title: 'Skool 커뮤니티', sub: 'skool.com', glyph: '↗', href: 'https://www.skool.com', aliases: ['community', 'launchpad cohorts'] },
  { id: 'ext-fathom', kind: 'go', title: 'Fathom 통화 기록', sub: 'fathom.video', glyph: '↗', href: 'https://fathom.video', aliases: ['meetings', 'recordings'] },
  { id: 'ext-plaud', kind: 'go', title: 'Plaud 녹음', sub: 'web.plaud.ai', glyph: '↗', href: 'https://web.plaud.ai', aliases: ['voice', 'recorder', 'memos'] },
];

const ASK: PaletteCommand[] = [
  {
    id: 'ask-attention', kind: 'ask', glyph: '?',
    title: '지금 내가 신경 써야 할 일은?', sub: '컨덕터 · 메시지와 보드 분류',
    prompt: '지금 내가 신경 써야 할 일이 뭐야? 커뮤니케이션과 보드를 분류해서 가장 중요한 항목들을 한국어로 알려줘.',
  },
  {
    id: 'ask-status', kind: 'ask', glyph: '?',
    title: '에이전트 상태 보고', sub: '컨덕터 · 모든 에이전트의 마지막 실행',
    prompt: '상태 보고를 해줘: 모든 에이전트의 마지막 실행 결과와 실패한 항목을 한국어로 알려줘.',
  },
  {
    id: 'ask-day', kind: 'ask', glyph: '?',
    title: '오늘 하루 계획 세우기', sub: '컨덕터 · 캘린더 + 진행 중인 작업',
    prompt: '캘린더와 보드에 남아 있는 작업을 바탕으로 오늘 하루 계획을 한국어로 세워줘.',
  },
  {
    id: 'ask-brain', kind: 'ask', glyph: '◎',
    title: 'G-Brain 검색', sub: '지식 코어 검색 카드 열기',
    href: '/brain', aliases: ['gbrain', 'knowledge', 'query', 'recall'],
  },
];

/** One box, three groups: Go to (nav + external), Run (agent roster), Ask
    (Conductor prompts + G-Brain). Pure and serializable-in, so the layout can
    feed it DB rows and the client palette can build the list itself. */
export function buildPaletteCommands(agents: PaletteAgent[]): PaletteCommand[] {
  const go: PaletteCommand[] = NAV_GROUPS.flatMap(([group, items]) =>
    items.map(({ href, label }) => ({
      id: `go-${href}`,
      kind: 'go' as const,
      title: label,
      sub: group,
      glyph: '›',
      href,
      aliases: NAV_ALIASES[href],
    })),
  );
  const runs: PaletteCommand[] = agents.map((a) => ({
    id: `run-${a.id}`,
    kind: 'run',
    title: a.name,
    sub: a.role,
    glyph: '▸',
    agentId: a.id,
    aliases: [a.name.split(/\s+/)[0].toLowerCase()],
  }));
  return [...go, ...EXTERNAL, ...runs, ...ASK];
}

/** Scope narrows to one kind; then every query word must match somewhere in
    title / sub / aliases / kind — so "run inbox" finds the Inbox agent and
    "jump comms" finds the view. */
export function filterPalette(commands: PaletteCommand[], query: string, scope: PaletteScope): PaletteCommand[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return commands.filter((c) => {
    if (scope !== 'all' && c.kind !== scope) return false;
    if (words.length === 0) return true;
    const hay = `${c.title} ${c.sub} ${c.aliases?.join(' ') ?? ''} ${c.kind === 'go' ? 'go open jump 이동 열기' : c.kind === 'run' ? 'run 실행' : 'ask 질문'}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
