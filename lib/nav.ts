/**
 * Single source of truth for the app's primary navigation. The Sidebar renders
 * these groups in order; the CommandPalette derives its digit (1–9) shortcuts
 * from the same visible order, so the two can never drift apart again.
 */
import {
  Home,
  MessageSquare,
  Share2,
  Clapperboard,
  Handshake,
  Users,
  ListChecks,
  Sparkles,
  Network,
  Brain,
  Wallet,
  Filter,
  Workflow,
  Map,
  Plug,
  BarChart3,
  LayoutGrid,
  Layers,
  Stethoscope,
  CandlestickChart,
  MessagesSquare,
  Gauge,
  Crosshair,
  Waypoints,
} from 'lucide-react';

export type NavItem = { href: string; label: string; icon: typeof Home };

export const NAV_OPERATE: NavItem[] = [
  { href: '/', label: '홈', icon: Home },
  { href: '/comms', label: '커뮤니케이션', icon: MessageSquare },
  { href: '/funnel', label: '퍼널', icon: Filter },
  { href: '/workflows', label: '워크플로', icon: Workflow },
  { href: '/social', label: '소셜', icon: Share2 },
  { href: '/content', label: '콘텐츠', icon: Clapperboard },
  { href: '/brand-deals', label: '브랜드 협찬', icon: Handshake },
  { href: '/finances', label: '재무', icon: Wallet },
  { href: '/trading', label: '트레이딩', icon: CandlestickChart },
  // Slab import: last in Operate on purpose, outside the nine digit shortcuts.
  { href: '/adpilot', label: '광고 파일럿', icon: Crosshair },
];

// The agent workforce: the roster and the org chart that maps how they report.
export const NAV_AGENTS: NavItem[] = [
  { href: '/agents', label: '에이전트', icon: Users },
  { href: '/chats', label: '채팅', icon: MessagesSquare },
  { href: '/tasks', label: '작업', icon: ListChecks },
  { href: '/skills', label: '스킬', icon: Sparkles },
  { href: '/org', label: '조직도', icon: Network },
  // Slab import: the system drawn from its own registries.
  { href: '/blueprint', label: '설계도', icon: Waypoints },
];

// The knowledge layer the agents draw on. G-Brain is the pure knowledge
// graph; Doctor holds the engine's health readouts (pillar health, doctor,
// storage layers, pipeline, query path) so the graph tab stays a single view.
export const NAV_INTELLIGENCE: NavItem[] = [
  { href: '/brain', label: 'G-Brain', icon: Brain },
  { href: '/doctor', label: '진단', icon: Stethoscope },
];

export const NAV_SYSTEM: NavItem[] = [
  { href: '/integrations', label: '연결', icon: Plug },
  { href: '/usage', label: '사용량', icon: Gauge },
  { href: '/roadmap', label: '로드맵', icon: Map },
  { href: '/analytics', label: '분석', icon: BarChart3 },
  { href: '/reference', label: '참조 모델', icon: LayoutGrid },
];

// At the very bottom: persona templates that can run variants of this platform.
export const NAV_LIBRARY: NavItem[] = [{ href: '/personas', label: '페르소나', icon: Layers }];

/** Visible top-to-bottom order across all groups. */
export const NAV_ORDER: string[] = [
  ...NAV_OPERATE,
  ...NAV_AGENTS,
  ...NAV_INTELLIGENCE,
  ...NAV_SYSTEM,
  ...NAV_LIBRARY,
].map((n) => n.href);

/** Digit keys 1–9 jump to the first nine views in visible order. */
export const DIGIT_VIEWS: string[] = NAV_ORDER.slice(0, 9);
