import type { FounderDb } from '@/lib/db';
import { PERSONAS } from '@/lib/personas-seed';
import { runCostUsd } from '@/lib/agent-costs';
import type {
  AgentCron,
  Agent,
  AgentRun,
  AgentTask,
  Department,
  Domain,
  EmailListSnapshot,
  FunnelContact,
  FunnelTouch,
  Metric,
  Person,
  Phase,
  RoadmapItem,
  SopTask,
  Workflow,
  Skill,
  SocialAccount,
  SocialDm,
  SocialDmSnapshot,
  SocialDmMessage,
  SocialPost,
  SocialSnapshot,
  Tool,
  LeadMagnet,
  TradingAccountSnapshot,
  TradingPosition,
  TradeActivity,
  Proposal,
} from '@/lib/schemas';

// Monochrome palette — the UI is strict black & white; "color" fields carry
// grayscale steps used only for subtle hierarchy.
const GRAY = {
  white: '#fafafa',
  light: '#d4d4d4',
  mid: '#a3a3a3',
  dim: '#737373',
  dark: '#525252',
};

// The five operating pillars of the seeded organisation.
const departments: Department[] = [
  { id: 'dept-sales', name: 'Sales', slug: 'sales', tagline: '파이프라인과 거래.', color: GRAY.white, order: 1 },
  { id: 'dept-marketing-growth', name: 'Marketing/Growth', slug: 'marketing-growth', tagline: '게시, 콘텐츠, 관심 끌기.', color: GRAY.light, order: 2 },
  { id: 'dept-tech', name: 'TECH', slug: 'tech', tagline: 'AI & 자동화 · G-Brain.', color: GRAY.mid, order: 3 },
  { id: 'dept-finance', name: 'Finances', slug: 'finances', tagline: '모든 결제 수단을 한눈에.', color: GRAY.dim, order: 4 },
  { id: 'dept-comms', name: 'Communications', slug: 'communications', tagline: 'Gmail, WhatsApp, Slack → 하나의 피드.', color: GRAY.dark, order: 5 },
  { id: 'dept-clients', name: 'Clients', slug: 'clients', tagline: '모든 고객의 온보딩과 관리.', color: GRAY.light, order: 6 },
];

// The roster IS the runtime — every row here maps 1:1 to a RuntimeAgent in
// lib/agents/real.ts (enforced by tests/seed.test.ts). No demo agents.
//
// Shape: top-level agents (parentId null) are INSTANCE slots — each one is
// what becomes its own Clawline / Claude Code process on a dedicated host
// (`instance` records that binding; everything is 'builtin' until then).
// Worker rows underneath them do one specific task each and sit at the
// bottom of the hierarchy.
const agents: Agent[] = [
  // ── TECH: AI head ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'conductor',
    departmentId: 'dept-tech',
    name: 'Conductor',
    role: '일괄 전송 & 조율',
    status: 'active',
    tier: 'lead',
    description: '메시지를 모든 에이전트에게 한 번에 보내고, 앞으로 연결할 수 있는 인스턴스 호스트(Clawline, Ollama, tmux)가 있는지 확인합니다.',
    model: 'fan-out runtime',
    tools: ['broadcast', 'clawline', 'tmux'],
    parentId: null,
    instance: 'builtin',
  },
  // ── Communications: one instance, three channel workers feeding /comms ────────
  {
    id: 'comms-digest',
    departmentId: 'dept-comms',
    name: 'Comms Digest',
    role: '아침 보고서 · 매일 09:00',
    status: 'active',
    tier: 'lead',
    description:
      '받은편지함 4개, WhatsApp, Slack의 최근 24시간을 모아 답장이 필요한 순서로 정렬합니다: 통화 먼저, 그다음 고객, 커뮤니티 멤버, 브랜드 협찬, 단체 채팅, 회사는 마지막. 구독 해지할 것도 알려 줍니다.',
    model: 'rules + connectors',
    tools: ['comms-feed', 'calendar', 'ledger'],
    parentId: null,
    instance: 'builtin',
  },
  {
    id: 'comms-agent',
    departmentId: 'dept-comms',
    name: 'Comms Agent',
    role: '통합 커뮤니케이션 인스턴스',
    status: 'active',
    tier: 'lead',
    description: '통합 /comms 피드를 담당합니다. 채널 작업자 3개를 모으고 어느 것이 가동 중인지 보고합니다.',
    model: 'aggregate of workers',
    tools: ['comms-feed'],
    parentId: null,
    instance: 'builtin',
  },
  {
    id: 'gmail-worker',
    departmentId: 'dept-comms',
    name: 'Gmail Worker',
    role: 'IMAP 받은편지함 ×4',
    status: 'planned',
    tier: 'worker',
    description: '최대 4개의 IMAP 받은편지함에서 안 읽은 수와 최근 메일을 /comms로 가져옵니다. INBOX_* 인증 정보가 들어오면 활성화됩니다.',
    model: 'imapflow',
    tools: ['imap'],
    parentId: 'comms-agent',
    instance: 'builtin',
  },
  {
    id: 'whatsapp-worker',
    departmentId: 'dept-comms',
    name: 'WhatsApp Worker',
    role: '채팅 모니터',
    status: 'active',
    tier: 'worker',
    description: '로컬 WhatsApp ChatStorage(로컬 팀 채팅)를 /comms로 읽어 옵니다. 지금 바로 동작합니다.',
    model: 'local sqlite (read-only)',
    tools: ['whatsapp'],
    parentId: 'comms-agent',
    instance: 'builtin',
  },
  {
    id: 'slack-worker',
    departmentId: 'dept-comms',
    name: 'Slack Worker',
    role: '채널 요약',
    status: 'planned',
    tier: 'worker',
    description: '참여한 채널의 최신 메시지를 /comms로 가져옵니다. SLACK_BOT_TOKEN이 필요합니다.',
    model: '@slack/web-api',
    tools: ['slack'],
    parentId: 'comms-agent',
    instance: 'builtin',
  },
  // ── Marketing/Growth: social/content crew ───────────────────────────
  {
    id: 'social-agent',
    departmentId: 'dept-marketing-growth',
    name: 'Social Agent',
    role: '소셜 미디어 & 콘텐츠 제작 인스턴스',
    status: 'active',
    tier: 'lead',
    description: '게시와 콘텐츠 제작을 담당합니다. Postly와 Adsmith 작업자를 모읍니다.',
    model: 'aggregate of workers',
    tools: ['postly', 'adsmith', 'reelkit', 'renderly', 'dmflow'],
    parentId: null,
    instance: 'builtin',
  },
  {
    id: 'brand-deal-agent',
    departmentId: 'dept-sales',
    name: 'Brand Deal Agent',
    role: 'Vera · 브랜드 협찬 매니저',
    status: 'active',
    tier: 'worker',
    description:
      'Alex의 브랜드 협찬 매니저 Vera로서 협상합니다: 들어온 문의를 검토하고, 가격을 제시하고 역제안하며, 미지급 청구서를 독촉하고, 멈춘 대화를 다시 띄웁니다. 검증된 연락 제한 규칙이 대화를 건드려도 되는지 결정합니다 (최대 5번 재연락, 브랜드당 6개월에 한 번 재개). 초안만 쓰고 보내지는 않습니다.',
    model: 'rules + gateway',
    tools: ['ledger', 'imap'],
    parentId: 'sales-agent',
    instance: 'builtin',
  },
  {
    id: 'newsletter-agent',
    departmentId: 'dept-marketing-growth',
    name: 'Newsletter Agent',
    role: '뉴스레터 초안 작성',
    status: 'active',
    tier: 'worker',
    description:
      '뉴스레터 발송 성과를 읽고, 기록이 얼마나 부족한지 솔직하게 밝힌 요약을 만들어 스킬 파일에 맞춰 다음 호 초안을 씁니다. 초안만 쓰고 예약하거나 보내지는 않습니다.',
    model: 'rules + gateway',
    tools: ['newsletter'],
    parentId: 'social-agent',
    instance: 'builtin',
  },
  {
    id: 'postly-publisher',
    departmentId: 'dept-marketing-growth',
    name: 'Postly Publisher',
    role: '6개 플랫폼 게시',
    status: 'active',
    tier: 'worker',
    description: 'Postly로 @commandcenter.demo 계정의 6개 플랫폼에 게시하고 모니터링합니다. Postly 키가 설정되면 가동됩니다.',
    model: 'postly api',
    tools: ['postly'],
    parentId: 'social-agent',
    instance: 'builtin',
  },
  {
    id: 'adsmith-creative',
    departmentId: 'dept-marketing-growth',
    name: 'Adsmith Creative',
    role: 'UGC 광고 생성',
    status: 'active',
    tier: 'worker',
    description: 'Adsmith API로 Vantage용 UGC 광고(Veo/Sora/Kling)를 만듭니다. Adsmith 인증이 설정되면 가동됩니다.',
    model: 'adsmith api',
    tools: ['adsmith'],
    parentId: 'social-agent',
    instance: 'builtin',
  },
  {
    id: 'reelkit-editor',
    departmentId: 'dept-marketing-growth',
    name: 'Reelkit Editor',
    role: '소셜 편집 파이프라인',
    status: 'active',
    tier: 'worker',
    description: '소셜 미디어 클립, 자막, 홍보 영상을 위한 편집 및 렌더링 파이프라인.',
    model: 'reelkit pipeline',
    tools: ['reelkit', 'whisper'],
    parentId: 'social-agent',
    instance: 'builtin',
  },
  {
    id: 'renderly-creative',
    departmentId: 'dept-marketing-growth',
    name: 'Renderly Creative',
    role: 'AI 크리에이티브 스튜디오',
    status: 'active',
    tier: 'worker',
    description: '소셜 자료, 제품 사진, 캠페인 비주얼을 Renderly로 생성합니다.',
    model: 'renderly cli',
    tools: ['renderly'],
    parentId: 'social-agent',
    instance: 'builtin',
  },
  {
    id: 'dmflow-mcp',
    departmentId: 'dept-marketing-growth',
    name: 'DMFlow MCP',
    role: 'DM 자동화',
    // live: the MCP server is registered user-scope and the
    // connector authenticates against the real Instagram Pro account
    status: 'active',
    tier: 'worker',
    description: '소셜 DM 자동화, 키워드 흐름, 리드 수집을 위한 DMFlow MCP/API 레인.',
    model: 'dmflow api',
    tools: ['dmflow'],
    parentId: 'social-agent',
    instance: 'builtin',
  },
  {
    id: 'sales-agent',
    departmentId: 'dept-sales',
    name: 'Sales Agent',
    role: '거래 & 파이프라인 인스턴스',
    status: 'active',
    tier: 'lead',
    description: '영업 축을 담당합니다. CRM Pulse를 모으고 실시간 Ledger 거래 파이프라인을 보고합니다.',
    model: 'aggregate of workers',
    tools: ['ledger', 'paykit', 'stripe', 'flexpay', 'recall', 'plaud'],
    parentId: null,
    instance: 'builtin',
  },
  {
    id: 'launchpad-cohort-sales',
    departmentId: 'dept-sales',
    name: 'Launchpad Cohort',
    role: '영업 계정 레인',
    status: 'planned',
    tier: 'worker',
    description: 'Launchpad Cohort 영업 레인: 제안, 통화, 결제 확인, CRM 맥락.',
    model: 'account lane',
    tools: ['ledger', 'stripe', 'paykit'],
    parentId: 'sales-agent',
    instance: 'builtin',
  },
  {
    id: 'vantage-sales',
    departmentId: 'dept-sales',
    name: 'Vantage',
    role: '영업 계정 레인',
    status: 'planned',
    tier: 'worker',
    description: 'Vantage 영업 레인: 계정 파이프라인, PayKit 맥락, 결제 확인, 통화 데이터.',
    model: 'account lane',
    tools: ['ledger', 'stripe', 'paykit'],
    parentId: 'sales-agent',
    instance: 'builtin',
  },
  {
    id: 'paykit-sales',
    departmentId: 'dept-finance',
    name: 'PayKit',
    role: '제안 & 결제 플랫폼',
    status: 'planned',
    tier: 'worker',
    description: '제안과 고객/결제 맥락을 위한 PayKit 영업 플랫폼 연결.',
    model: 'paykit api',
    tools: ['paykit'],
    parentId: 'payments-pulse',
    instance: 'builtin',
  },
  {
    id: 'vantage-paykit',
    departmentId: 'dept-sales',
    name: 'Vantage PayKit',
    role: 'Vantage PayKit 레인',
    status: 'planned',
    tier: 'worker',
    description: 'Vantage 전용 PayKit 레인: 제안, 결제, 고객 맥락.',
    model: 'paykit api',
    tools: ['paykit'],
    parentId: 'vantage-sales',
    instance: 'builtin',
  },
  {
    id: 'stripe-sales',
    departmentId: 'dept-finance',
    name: 'Stripe',
    role: '영업 결제 처리',
    status: 'planned',
    tier: 'worker',
    description: '영업 워크플로와 계정별 매출 확인을 위한 Stripe 결제 확인 레인.',
    model: 'stripe sdk',
    tools: ['stripe'],
    parentId: 'payments-pulse',
    instance: 'builtin',
  },
  {
    id: 'processor-confirmation',
    departmentId: 'dept-finance',
    name: 'Processor Confirm',
    role: '결제 API 확인',
    status: 'planned',
    tier: 'worker',
    description: '결제 완료, 실패, 분쟁, 대기 상태를 확인하기 위한 결제 대행사 API.',
    model: 'processor registry',
    tools: ['stripe', 'paypal', 'square', 'whop', 'paykit'],
    parentId: 'payments-pulse',
    instance: 'builtin',
  },
  {
    id: 'flexpay-financing',
    departmentId: 'dept-finance',
    name: 'FlexPay Financing',
    role: '할부 옵션',
    status: 'planned',
    tier: 'worker',
    description: '영업 제안과 분할 결제 맥락을 위한 FlexPay 할부 레인.',
    model: 'flexpay api',
    tools: ['flexpay'],
    parentId: 'payments-pulse',
    instance: 'builtin',
  },
  {
    id: 'sales-calls-data',
    departmentId: 'dept-sales',
    name: 'Sales Calls Data',
    role: '통화 인텔리전스',
    status: 'planned',
    tier: 'worker',
    description: '녹음, 메모, 결과, 후속 맥락을 위한 영업 통화 데이터 레인: 통화는 Recall, 대면 회의는 Plaud.',
    model: 'recall + plaud + crm',
    tools: ['recall', 'plaud', 'ledger'],
    parentId: 'sales-agent',
    instance: 'builtin',
  },
  // ── TECH: the G-Brain data analyst and its auditors ──────────────────────────────
  {
    id: 'data-agent',
    departmentId: 'dept-tech',
    name: 'Data Agent',
    role: 'G-Brain 분석가',
    status: 'active',
    tier: 'lead',
    description: 'G-Brain 인스턴스에 연결되어 마크다운 + 벡터 저장소 상태를 분석하고 아이디어를 제시합니다. 일괄 메시지에는 브레인을 검색해 답합니다.',
    model: 'gbrain CLI',
    tools: ['gbrain', 'brain-store', 'ollama', 'supabase'],
    parentId: null,
    instance: 'builtin',
  },
  {
    id: 'markdown-auditor',
    departmentId: 'dept-tech',
    name: 'Markdown Auditor',
    role: '브레인 저장소 상태',
    status: 'active',
    tier: 'worker',
    description: '지식 베이스를 점검합니다: 깨진 위키 링크, 고아 페이지, 중복 제목, 검색 인덱스가 디스크의 저장소와 여전히 일치하는지.',
    model: 'link audit',
    tools: ['brain-store'],
    parentId: 'data-agent',
    instance: 'builtin',
  },
  {
    id: 'vector-auditor',
    departmentId: 'dept-tech',
    name: 'Vector Auditor',
    role: 'pgvector / Supabase 상태',
    status: 'active',
    tier: 'worker',
    description: 'gbrain doctor를 실행합니다: Supabase pgvector 연결, 임베딩 확인, 상태 점수. 지금 바로 동작합니다.',
    model: 'gbrain doctor',
    tools: ['supabase', 'ollama'],
    parentId: 'data-agent',
    instance: 'builtin',
  },
  // ── Finances ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'payments-pulse',
    departmentId: 'dept-finance',
    name: 'Payments Pulse',
    role: '결제 수단 모니터',
    status: 'planned',
    tier: 'lead',
    description: 'Stripe 잔액 + 최근 결제. PayPal/Square/Whop은 등록되어 키를 기다리는 중.',
    model: 'stripe sdk',
    tools: ['stripe', 'paypal', 'square', 'whop'],
    parentId: null,
    instance: 'builtin',
  },
  {
    id: 'crm-pulse',
    departmentId: 'dept-sales',
    name: 'Ledger CRM',
    role: 'ATTO / Ledger 거래 파이프라인',
    status: 'active',
    tier: 'worker',
    description: 'Ledger의 Vantage + LC 거래. 키는 MCP 설정에서 재사용. 지금 바로 동작합니다.',
    model: 'ledger api',
    tools: ['ledger'],
    parentId: 'sales-agent',
    instance: 'builtin',
  },
  // ── TECH: automations ─────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'stack-monitor',
    departmentId: 'dept-tech',
    name: 'Stack Monitor',
    role: '로컬 스택 상태',
    status: 'active',
    tier: 'lead',
    description: 'Reelkit, Ollama, command-center, Clawline, tmux, whisper, ffmpeg, renderly, gh + Dictate Flow 상태.',
    model: 'local checks',
    tools: ['reelkit', 'ollama', 'tmux', 'dictate'],
    parentId: null,
    instance: 'builtin',
  },
  // ── Clients: roster, onboarding, service ──────────────────────────────────
  {
    id: 'client-roster',
    departmentId: 'dept-clients',
    name: 'Client Roster',
    role: '실시간 고객 명단',
    status: 'active',
    tier: 'lead',
    description: '누가 고객인지에 대한 단일 기준: Ledger와 PayKit을 퍼널과 대조해 명단을 최신으로 유지합니다.',
    model: 'funnel + Ledger',
    tools: ['ledger', 'paykit'],
    parentId: null,
    instance: 'builtin',
  },
  {
    id: 'client-onboarding',
    departmentId: 'dept-clients',
    name: 'Onboarding Agent',
    role: '계약 성사부터 킥오프까지',
    status: 'planned',
    tier: 'worker',
    description: '거래가 성사되면 온보딩 SOP를 처음부터 끝까지 실행합니다: 환영 자료, 작업 공간 설정, 킥오프 예약, 인수인계 메모.',
    model: 'ledger + slack',
    tools: ['ledger', 'slack'],
    parentId: 'client-roster',
    instance: 'builtin',
  },
  {
    id: 'client-success',
    departmentId: 'dept-clients',
    name: 'Client Success',
    role: '서비스 & 갱신',
    status: 'planned',
    tier: 'worker',
    description: '활성 고객을 관리합니다: 정기 점검 주기, 통화 메모(Recall)와 대면 회의 녹음(Plaud)에서 산출물 추적, 갱신 및 추가 판매 표시.',
    model: 'recall + plaud + slack',
    tools: ['recall', 'plaud', 'slack'],
    parentId: 'client-roster',
    instance: 'builtin',
  },
];

// ── Humans in the process ─────────────────────────────────────────────────────
// Named heads plus demo-first seeds for the roles an operator hires
// into (rename when a real person lands). Tools use the agents' slug
// namespace so the graph chain still ends in tools for humans too.
const people: Person[] = [
  { id: 'person-marco', departmentId: 'dept-sales', name: 'Marco', role: '영업 총괄', tools: ['recall', 'ledger'] },
  { id: 'person-nadia', departmentId: 'dept-marketing-growth', name: 'Nadia', role: '성장 & 마케팅 총괄', tools: ['postly', 'dmflow'] },
  { id: 'person-mia', departmentId: 'dept-comms', name: 'Mia Torres', role: '비서실장', tools: ['imap', 'slack'] },
  { id: 'person-dana', departmentId: 'dept-finance', name: 'Dana Whitfield', role: '경리 담당', tools: ['stripe', 'paykit'] },
  { id: 'person-sasha', departmentId: 'dept-clients', name: 'Sasha Bell', role: '고객 담당 매니저', tools: ['ledger', 'recall'] },
];

// ── SOP tasks — every department role's job, written out ─────────────────────
// One task per worker, one worker per task (monogamous; tests enforce it).
// The chain the /brain graph draws: department → task → worker → tools.
const leadMagnets: LeadMagnet[] = [
  {
    id: 'operator-stack',
    name: 'The Operator Stack',
    offer: '에이전트 스택의 모든 계층과 각각을 대체할 도구',
    url: 'https://stack.example.com',
    status: 'live',
    captures: 'email',
    destination: '뉴스레터 · 메인 리스트',
    source: 'Carousel · "One person, a company of agents" (comment STACK)',
    launchedAt: '2026-08-12',
    origin: 'seed',
    notes: '잠금 없음. 뉴스레터 가입과 별도의 코호트 대기자 폼.',
  },
  {
    id: 'automation-teardown',
    name: 'The Automation Teardown',
    offer: '워크플로를 단계별로 분해하고 각 단계에 드는 시간까지',
    url: 'https://teardown.example.com',
    status: 'live',
    captures: 'email',
    destination: '뉴스레터 · 메인 리스트',
    source: '숏폼 · "일주일이 실제로 어디로 가는가" (댓글 TEARDOWN)',
    launchedAt: '2026-08-05',
    origin: 'seed',
    notes: '워크플로 화면으로 만들었습니다. 코호트 1강 자료로도 씁니다.',
  },
  {
    id: 'cohort-waitlist',
    name: 'Cohort Waitlist',
    offer: '공개 모집 전에 다음 코호트 자리 확보',
    url: 'https://waitlist.example.com',
    status: 'paused',
    captures: 'email',
    destination: '뉴스레터 · 코호트 대기자 세그먼트',
    source: 'Bio link + end cards',
    launchedAt: '2026-07-28',
    origin: 'seed',
    notes: '코호트 사이에는 일시정지. 다음 모집 날짜가 정해지면 다시 엽니다.',
  },
];

const sopTasks: SopTask[] = [
  // TECH
  {
    id: 'sop-conductor', departmentId: 'dept-tech', assigneeKind: 'agent', assigneeId: 'conductor',
    title: '모든 에이전트에게 지시 전달',
    summary: '메시지 하나로 모든 에이전트에게 알리고 답변을 모읍니다.',
    steps: [
      '운영자 콘솔에서 지시를 받는다',
      '대상 목록을 정한다: 전체 에이전트, 또는 지시에 적힌 축',
      '전송 전에 인스턴스 호스트(Clawline, Ollama, tmux)가 사용 가능한지 확인한다',
      '메시지를 모든 대상에게 한 번에 보내고 전송마다 기록을 남긴다',
      '답변이 오는 대로 모아 실행 기록을 agent_runs에 저장한다',
      '60초가 지나도 답이 없는 대상을 보고해 조용히 실패하는 일이 없게 한다',
    ],
  },
  {
    id: 'sop-data-agent', departmentId: 'dept-tech', assigneeKind: 'agent', assigneeId: 'data-agent',
    title: 'G-Brain으로 질문에 답하기',
    summary: '세컨드 브레인 하이브리드 검색, 정직한 대체 경로.',
    steps: [
      '들어온 질문을 gbrain 검색어로 바꾼다',
      'Supabase에 대해 gbrain 하이브리드 검색(--no-expand)을 실행한다',
      '데이터베이스가 일시정지되면 로컬 브레인 저장소 grep으로 대체한다',
      '문단의 순위를 매기고 실제로 질문에 답하는 것만 남긴다',
      '출처 메모와 함께 인용한 문단을 돌려주며, 지어내지 않는다',
      '답할 수 없는 질문은 마크다운 감사자가 채울 빈틈으로 기록한다',
    ],
  },
  {
    id: 'sop-markdown-auditor', departmentId: 'dept-tech', assigneeKind: 'agent', assigneeId: 'markdown-auditor',
    title: '브레인 저장소 마크다운 상태 점검',
    summary: '지식 베이스를 깔끔하고 연결 가능하게 유지합니다.',
    steps: [
      'knowledge/brain-store의 모든 마크다운 파일을 훑는다',
      '깨진 위키 링크, 고아 메모, 오래된 프런트매터를 표시한다',
      '생성된 조직 문서가 실제 에이전트, SOP, 도구와 여전히 일치하는지 확인한다',
      '폴더별 점수가 담긴 상태 보고서를 쓴다',
      '가장 심한 문제부터 수정 작업을 대기열에 넣고 끝날 때까지 추적한다',
    ],
  },
  {
    id: 'sop-vector-auditor', departmentId: 'dept-tech', assigneeKind: 'agent', assigneeId: 'vector-auditor',
    title: '벡터 인덱스 점검',
    summary: 'Supabase의 임베딩은 브레인 저장소와 같아야 합니다.',
    steps: [
      'Supabase 세컨드 브레인 프로젝트를 확인한다 (무료 플랜은 유휴 시 일시정지)',
      '비교하기 전에 데이터베이스를 깨우고 쿼리를 받을 때까지 기다린다',
      'pgvector 청크 수를 브레인 저장소 파일 수와 비교한다',
      '차이와 일시정지 경고를 /brain 진단 카드에 표시한다',
      '차이가 난 문서는 bge-m3로 다시 임베딩하고 이후 개수를 확인한다',
    ],
  },
  {
    id: 'sop-stack-monitor', departmentId: 'dept-tech', assigneeKind: 'agent', assigneeId: 'stack-monitor',
    title: '로컬 스택 감시',
    summary: '모든 포트, 세션, 실행 파일의 정직한 상태.',
    steps: [
      '커맨드 센터 :3100과 작업자 게이트웨이 :8642를 확인한다',
      '에이전트가 호출하는 brew 실행 파일(ffmpeg, pdftotext, whisper, gh)과 gbrain CLI를 확인한다',
      '정직한 ConnectorStatus를 기록하며, 연결됐다고 꾸미지 않는다',
      '지난 점검과 비교해 켜졌다 꺼졌다 하는 서비스를 잡아낸다',
      '켜져 있던 것이 꺼지면 콘솔에 알린다',
    ],
  },

  // COMMUNICATIONS
  {
    id: 'sop-comms-digest', departmentId: 'dept-comms', assigneeKind: 'agent', assigneeId: 'comms-digest',
    title: '09:00 커뮤니케이션 보고서 실행',
    summary: '매일 아침: 이메일, WhatsApp, Slack의 24시간을 답장이 필요한 순서로 정리.',
    steps: [
      '받은편지함 4개, WhatsApp, Slack의 최근 24시간을 가져온다 (채널마다 보호된 호출 하나 — 죽은 채널은 보고서를 약하게 만들 뿐 취소시키지 않는다)',
      '순위 기준 맥락을 불러온다: 예정된 통화의 캘린더 제목, 고객용 Ledger 명단, 커뮤니티 멤버용 연락처 태그',
      '모든 메시지의 순위를 매긴다: 통화 먼저, 그다음 고객과 제안 답장, 커뮤니티 질문, 브랜드 협찬, 단체 채팅, 회사와 소프트웨어는 마지막',
      '자동 발신자를 구독 해지 목록으로 모은다, 가장 시끄러운 것부터',
      '보고서를 저장해 /comms가 바로 보여 주게 하고, 일정에 맞춰 실행을 기록한다',
    ],
  },
  {
    id: 'sop-comms-agent', departmentId: 'dept-comms', assigneeKind: 'agent', assigneeId: 'comms-agent',
    title: '통합 커뮤니케이션 피드 구성',
    summary: '채널 3개를 /comms의 타임라인 하나로.',
    steps: [
      'Gmail, WhatsApp, Slack 작업자의 새 결과를 모은다',
      '중복을 없애고 하나의 정렬된 타임라인으로 합친다',
      '각 항목에 연락처 등급 태그를 붙인다',
      '급하거나 답장이 필요한 항목을 피드 위로 올린다',
      '피드를 게시하고 어느 채널이 가동 중인지 보고한다',
    ],
  },
  {
    id: 'sop-gmail-worker', departmentId: 'dept-comms', assigneeKind: 'agent', assigneeId: 'gmail-worker',
    title: 'Gmail 받은편지함 4개 분류',
    summary: 'IMAP 슬롯 1–4를 읽고, 분류하고, 올립니다.',
    steps: [
      '설정된 IMAP 받은편지함 4개에 동기화 주기마다 연결한다',
      '안 읽은 수와 지난 점검 이후의 모든 스레드를 가져온다',
      '각 스레드를 분류한다: 긴급, 답장 필요, 우리 쪽 대기, 참고',
      '답장이 필요한 스레드에는 Alex 말투로 답장 초안을 쓴다',
      '긴급 스레드는 한 줄 요약과 함께 에스컬레이션 대기열로 넘긴다',
      '고객 도메인에서 온 것은 고객 축에도 띄운다',
    ],
  },
  {
    id: 'sop-whatsapp-worker', departmentId: 'dept-comms', assigneeKind: 'agent', assigneeId: 'whatsapp-worker',
    title: 'WhatsApp 채팅 모니터링',
    summary: '로컬 팀 채팅을 띄워 줍니다.',
    steps: [
      '로컬 ChatStorage.sqlite를 읽는다 (읽기 전용, 아무것도 컴퓨터 밖으로 나가지 않는다)',
      'LC와 Vantage 팀 채팅의 새 메시지를 띄운다',
      '보낸 사람을 연락처 태그와 연결한다',
      '돈, 마감, 막힘을 언급한 메시지를 표시한다',
      '태그된 메시지를 통합 피드에 넣는다',
    ],
  },
  {
    id: 'sop-slack-worker', departmentId: 'dept-comms', assigneeKind: 'agent', assigneeId: 'slack-worker',
    title: 'Slack 채널 요약',
    summary: '참여한 채널을 요약해 피드에 넣습니다.',
    steps: [
      '봇이 참여한 채널 목록을 가져온다',
      '지난 점검 이후 채널별 최신 메시지를 가져온다',
      '채널마다 짧은 요약을 만든다',
      '직접 멘션과 답 없는 질문은 따로 표시한다',
      '요약을 통합 피드에 넣는다',
    ],
  },

  // MARKETING / GROWTH
  {
    id: 'sop-social-agent', departmentId: 'dept-marketing-growth', assigneeKind: 'agent', assigneeId: 'social-agent',
    title: '매일 콘텐츠 파이프라인 실행',
    summary: '캘린더 → 브리프 → 자료 → 게시 대기열.',
    steps: [
      '콘텐츠 캘린더에서 오늘 일정을 가져온다',
      '크리에이티브 작업자(Adsmith, Renderly, Reelkit)에게 훅과 형식을 브리핑한다',
      '완성된 자료를 모아 브리프와 맞는지 확인한다',
      '브랜드와 맞지 않는 것은 한 줄 이유와 함께 반려해 빨리 고치게 한다',
      '승인된 게시물을 플랫폼별 캡션과 함께 Postly 게시 대기열에 넣는다',
      '게시된 것을 캘린더에 기록해 내일 브리프가 이어서 시작되게 한다',
    ],
  },
  {
    id: 'sop-newsletter-agent', departmentId: 'dept-marketing-growth', assigneeKind: 'agent', assigneeId: 'newsletter-agent',
    title: '다음 뉴스레터 초안 작성',
    summary: '구독자가 실제로 열고 클릭한 것에 맞춰 초안을 씁니다.',
    steps: [
      '뉴스레터 발송 기록을 가져와 성과 브리프를 만든다',
      '기록이 너무 적어 패턴을 말할 수 없으면 솔직하게 말한다',
      '제목 3개와 본문을 스킬 파일에 맞춰 쓴다',
      '브리프에서 최근 호와 같은 각도를 반복하지 않는다',
      '보내지 않은 상태로 초안을 넘기고, 측정하지 않은 지표는 절대 말하지 않는다',
    ],
  },
  {
    id: 'sop-postly-publisher', departmentId: 'dept-marketing-growth', assigneeKind: 'agent', assigneeId: 'postly-publisher',
    title: '6개 플랫폼에 게시',
    summary: '대기열 하나로 모든 @commandcenter.demo 채널에 게시.',
    steps: [
      '파이프라인에서 다음 대기 게시물을 가져온다',
      '플랫폼별로 캡션을 맞춘다 (IG, TikTok, X, YouTube, LinkedIn, Facebook)',
      'Postly API로 게시한다',
      '게시물 id를 기록하고 각각 실제로 올라갔는지 확인한다',
      '실패한 플랫폼은 한 번 재시도하고, 그래도 안 되면 소셜 에이전트에게 알린다',
    ],
  },
  {
    id: 'sop-adsmith-creative', departmentId: 'dept-marketing-growth', assigneeKind: 'agent', assigneeId: 'adsmith-creative',
    title: 'UGC 광고 변형 생성',
    summary: 'Vantage 광고 각도를 UGC 배우 영상으로 렌더링.',
    steps: [
      '훅, 각도, 제안이 담긴 광고 브리프를 받는다',
      'Veo / Sora / Kling으로 배우 변형을 만든다',
      '최종 렌더링 전에 브리프를 벗어난 테이크를 걸러낸다',
      '최종본을 렌더링하고 각도별로 이름을 붙인다',
      '변형 정리표와 함께 크리에이티브 검토로 넘긴다',
    ],
  },
  {
    id: 'sop-reelkit-editor', departmentId: 'dept-marketing-growth', assigneeKind: 'agent', assigneeId: 'reelkit-editor',
    title: '숏폼 편집',
    summary: '원본 영상을 플랫폼에 맞는 크기로.',
    steps: [
      '원본 클립을 Whisper로 로컬에서 전사한다',
      '전사본에서 훅과 가장 강한 구간을 고른다',
      '알맞은 테마(LC / Vantage)로 Reelkit 파이프라인에서 렌더링한다',
      '내보내기 전에 자막이 박자에 맞는지 확인한다',
      '플랫폼별 크기로 내보내 파이프라인에 넘긴다',
    ],
  },
  {
    id: 'sop-renderly-creative', departmentId: 'dept-marketing-growth', assigneeKind: 'agent', assigneeId: 'renderly-creative',
    title: 'AI 비주얼 제작',
    summary: '크리에이티브 브리프로 이미지와 영상 제작.',
    steps: [
      '크리에이티브 브리프를 읽고 맞는 Renderly 모델을 고른다',
      '브리프의 사양대로 이미지나 영상을 만든다',
      '업스케일에 비용을 쓰기 전에 가장 좋은 테이크만 남긴다',
      '고른 것을 납품 해상도로 업스케일한다',
      '브리프를 첨부해 최종본을 편집자에게 넘긴다',
    ],
  },
  {
    id: 'sop-dmflow-mcp', departmentId: 'dept-marketing-growth', assigneeKind: 'agent', assigneeId: 'dmflow-mcp',
    title: 'DM 퍼널 자동화',
    summary: '키워드 트리거부터 예약된 상담까지.',
    steps: [
      '플랫폼 전반에서 설정된 트리거 키워드를 지켜본다',
      '트리거마다 맞는 DMFlow 흐름을 실행한다',
      '흐름을 지나는 구독자에게 의도별 태그를 붙인다',
      '뜨거운 리드는 대화 기록과 함께 영업 축에 넘긴다',
      '전환 결과를 성장 대시보드에 보고한다',
    ],
  },
  {
    id: 'sop-nadia', departmentId: 'dept-marketing-growth', assigneeKind: 'person', assigneeId: 'person-nadia',
    title: '콘텐츠 전략 수립 & 게시 승인',
    summary: '게시되는 모든 것의 사람 편집 관문.',
    steps: [
      '대시보드에서 지난 주기의 성과 숫자를 검토한다',
      '이번 주 각도를 정하고 캘린더에 배치한다',
      '게시 전에 대기 중인 모든 자료를 승인하거나 폐기한다',
      '게시된 게시물이 승인한 그대로 올라갔는지 표본 확인한다',
      '무엇이 잘 됐고 무엇이 망했는지 팀과 회고한다',
    ],
  },

  // SALES
  {
    id: 'sop-sales-agent', departmentId: 'dept-sales', assigneeKind: 'agent', assigneeId: 'sales-agent',
    title: '파이프라인이 계속 움직이게',
    summary: '거래를 매일 점검해 조용히 멈추는 것이 없게.',
    steps: [
      '매일 아침 Ledger에서 모든 진행 중 거래와 단계를 가져온다',
      '금액과 단계 체류 일수로 순위를 매긴다; 7일이 넘으면 정체로 본다',
      '정체된 거래마다 구체적인 다음 행동과 담당자를 붙인다',
      '통화 전에 PayKit, Stripe, FlexPay 결제 링크를 준비한다',
      '통화마다 그 전에 Marco에게 상위 거래 5개와 반대 의견을 브리핑한다',
      '단계 변경은 생긴 날 바로 Ledger에 기록한다',
    ],
  },
  {
    id: 'sop-lc-lane', departmentId: 'dept-sales', assigneeKind: 'agent', assigneeId: 'launchpad-cohort-sales',
    title: 'Launchpad Cohort 레인 운영',
    summary: '웨비나 신청자부터 LC 거래 성사까지.',
    steps: [
      'LC 리드를 웨비나 신청부터 통화 예약까지 추적한다',
      '노쇼는 24시간 안에 재예약 시퀀스로 다시 연락한다',
      '모든 단계 변경을 Ledger에 동기화한다',
      'LC 결제를 Stripe와 대사한다',
      '레인 매출을 파이프라인 브리프에 보고한다',
    ],
  },
  {
    id: 'sop-vantage-lane', departmentId: 'dept-sales', assigneeKind: 'agent', assigneeId: 'vantage-sales',
    title: 'Vantage 레인 운영',
    summary: '지역 사업체 문의를 처음부터 끝까지 처리.',
    steps: [
      '들어온 Vantage 리드를 ICP 기준으로 검토한다',
      '적합한 리드는 맥락을 붙여 Marco의 캘린더에 예약한다',
      '단계 변경을 Ledger에 동기화한다',
      'PayKit과 Stripe 결제를 대사한다',
      '레인 매출을 파이프라인 브리프에 보고한다',
    ],
  },
  {
    id: 'sop-vantage-paykit', departmentId: 'dept-sales', assigneeKind: 'agent', assigneeId: 'vantage-paykit',
    title: 'Vantage PayKit 레인 대사',
    summary: 'PayKit 고객을 CRM 거래와 맞춥니다.',
    steps: [
      'PayKit에서 이번 달 누적 고객을 가져온다',
      '결제마다 해당 Ledger 거래와 맞춘다',
      '거래 없는 결제와 결제 없는 거래를 표시한다',
      '모든 불일치는 표시로 끝내지 않고 해결될 때까지 추적한다',
      '이번 달 누적 합계를 재무에 올린다',
    ],
  },
  {
    id: 'sop-sales-calls-data', departmentId: 'dept-sales', assigneeKind: 'agent', assigneeId: 'sales-calls-data',
    title: '영업 통화 녹음 분석',
    summary: '모든 Recall 통화와 Plaud 녹음을 CRM 정보로 만듭니다.',
    steps: [
      '녹음된 통화가 끝날 때마다 Recall 메모를 수집한다',
      '대면 회의나 현장 방문이 끝날 때마다 Plaud 전사 + AI 메모를 수집한다',
      '반대 의견, 약속, 다음 단계를 뽑아낸다',
      '뽑아낸 내용을 Ledger 기록에 다시 쓴다',
      '가격이나 경쟁사가 언급된 통화에 태그를 붙인다',
      '반복되는 패턴을 파이프라인 브리프에 반영한다',
    ],
  },
  {
    id: 'sop-crm-pulse', departmentId: 'dept-sales', assigneeKind: 'agent', assigneeId: 'crm-pulse',
    title: 'Ledger 깔끔하게 유지',
    summary: '숫자를 믿을 수 있는 CRM.',
    steps: [
      '기록에서 빠진 항목과 중복을 찾는다',
      '거래 단계가 실제로 일어난 일과 맞는지 확인한다',
      '중복을 합치고 안전하게 채울 수 있는 것은 채운다',
      '오래 방치된 기록은 레인 담당자에게 알린다',
      '대시보드용 파이프라인 지표 스냅샷을 찍는다',
    ],
  },
  {
    id: 'sop-brand-deal-agent', departmentId: 'dept-sales', assigneeKind: 'agent', assigneeId: 'brand-deal-agent',
    title: 'Vera로서 브랜드 협찬 파이프라인 관리',
    summary: '검토, 견적, 독촉, 재연락 — 직접 보내지는 않음.',
    steps: [
      'OS 브랜드 협찬 저장소를 읽고 오늘 답해야 할 것의 순위를 매긴다',
      '어떤 스레드든 건드리기 전에 연락 제한 규칙을 확인하고, 거부되면 따른다',
      'Vera로서 답장, 역제안, 재연락 초안을 쓰고 Alex는 3인칭으로 언급한다',
      '하한가 미만, 지분 형태, 통화 요청은 위로 올린다',
      '모든 초안은 Alex가 보내도록 남기고, 보냈다고 말하지 않는다',
    ],
  },
  {
    id: 'sop-marco', departmentId: 'dept-sales', assigneeKind: 'person', assigneeId: 'person-marco',
    title: '상담 & 계약 통화 진행',
    summary: '인사부터 서명까지 전화하는 사람.',
    steps: [
      '통화 전 브리프와 리드의 최근 접점 3개를 검토한다',
      '상담 스크립트를 진행하고 예산과 일정을 엄격하게 확인한다',
      '반대 의견은 대응 시트로 처리하고 가격은 즉흥으로 정하지 않는다',
      '맞는 제안을 보여 주고, 적합하면 할부 옵션도 제시한다',
      '다음 통화 전에 결과, 다음 단계, 결제 링크를 기록한다',
    ],
  },

  // FINANCES
  {
    id: 'sop-paykit', departmentId: 'dept-finance', assigneeKind: 'agent', assigneeId: 'paykit-sales',
    title: 'PayKit 수입 추적',
    summary: '이번 달 누적, 사업별 분리, 환불 표시.',
    steps: [
      'PayKit API에서 이번 달 누적 고객을 가져온다',
      '수입을 사업별로 나눈다 (LC vs Vantage)',
      '재무 화면용 수입 스냅샷을 기록한다',
      '환불과 분쟁은 들어온 날 바로 표시한다',
      '누적 합계를 월말 장부와 대사한다',
    ],
  },
  {
    id: 'sop-stripe', departmentId: 'dept-finance', assigneeKind: 'agent', assigneeId: 'stripe-sales',
    title: 'Stripe 수입 추적',
    summary: 'Launchpad Cohort로 표시된 잔액과 결제.',
    steps: [
      'Stripe에서 잔액과 최근 결제를 가져온다',
      '수입을 Launchpad Cohort로 표시한다',
      '수입 차트용 스냅샷을 기록한다',
      '최근 평균과 비교해 이상치를 표시한다',
      '예정된 지급을 기록해 현금 흐름에 놀랄 일이 없게 한다',
    ],
  },
  {
    id: 'sop-processor-confirm', departmentId: 'dept-finance', assigneeKind: 'agent', assigneeId: 'processor-confirmation',
    title: '결제 수단 전반의 결제 확인',
    summary: 'API 영수증 없이는 어떤 거래도 결제 완료로 표시하지 않습니다.',
    steps: [
      '영업 레인에서 결제 주장을 받는다',
      '주장된 결제 수단의 API를 확인한다 (Stripe / PayPal / Square / Whop / PayKit)',
      '결제를 확인하거나 불일치를 크게 표시한다',
      '확인 결과를 거래 기록에 쓴다',
      '월말 결산을 위해 모든 확인의 감사 기록을 남긴다',
    ],
  },
  {
    id: 'sop-flexpay', departmentId: 'dept-finance', assigneeKind: 'agent', assigneeId: 'flexpay-financing',
    title: '할부 옵션 안내',
    summary: '진행 중인 제안에 분할 결제 플랜을 붙입니다.',
    steps: [
      '레인에서 거래 규모와 구매자 프로필을 받는다',
      'FlexPay에서 맞는 플랜 옵션을 가져온다',
      '통화 전에 조건을 제안에 붙인다',
      '어떤 플랜이 수락되고 어떤 플랜이 거래를 멈추게 하는지 추적한다',
      '수락률을 보고해 가격 책정이 계속 정교해지게 한다',
    ],
  },
  {
    id: 'sop-payments-pulse', departmentId: 'dept-finance', assigneeKind: 'agent', assigneeId: 'payments-pulse',
    title: '결제 수단 상태 감시',
    summary: '모든 결제 수단을 확인하고 상태를 정직하게 기록.',
    steps: [
      '목록에 등록된 결제 수단을 하나씩 확인한다',
      '정직한 ConnectorStatus를 기록하며, 연결됐다고 꾸미지 않는다',
      '결제 수단이 다운되면 재무에 알린다',
      '실패한 결제 수단은 복구될 때까지 더 짧은 주기로 다시 확인한다',
      '분석 화면용 가동 기록을 유지한다',
    ],
  },

  // CLIENTS
  {
    id: 'sop-client-roster', departmentId: 'dept-clients', assigneeKind: 'agent', assigneeId: 'client-roster',
    title: '고객 명단 최신 유지',
    summary: '모든 고객의 단일 목록, 항상 최신.',
    steps: [
      '매일 아침 Ledger와 PayKit에서 고객과 거래 상태를 가져온다',
      '퍼널 여정과 결제 기록에 대조한다',
      '각 계정을 활성, 위험, 이탈로 표시하고 이유를 단다',
      '오래된 기록과 빠진 항목을 담당 레인에 알린다',
      '명단을 고객 축에 게시하고 변경 사항을 기록한다',
    ],
  },
  {
    id: 'sop-client-onboarding', departmentId: 'dept-clients', assigneeKind: 'agent', assigneeId: 'client-onboarding',
    title: '신규 고객 온보딩',
    summary: '계약 성사부터 킥오프까지 빠짐없이.',
    steps: [
      'Ledger에서 거래가 계약 성사로 바뀌면 시작한다',
      '무엇이든 보내기 전에 결제 확인으로 결제가 들어왔는지 확인한다',
      '24시간 안에 환영 자료와 서명된 계약서를 보낸다',
      'Slack 채널을 만들고 고객 팀을 초대하고 범위 문서를 고정한다',
      '영업일 5일 안에 킥오프 통화를 예약하고 참석을 확인한다',
      '접근 권한과 자료(로그인, 브랜드 키트, 추적)를 한 번에 요청해 받는다',
      '전체 맥락 메모와 위험 표시를 붙여 고객 성공 담당에게 넘긴다',
    ],
  },
  {
    id: 'sop-client-success', departmentId: 'dept-clients', assigneeKind: 'agent', assigneeId: 'client-success',
    title: '활성 고객 관리',
    summary: '점검 주기, 산출물, 갱신을 체계적으로.',
    steps: [
      '고객별로 매주 점검 주기를 지키고 빠뜨리는 주가 없게 한다',
      '판매한 범위 대비 산출물을 추적하고 지연을 일찍 표시한다',
      'Recall 통화 메모는 당일에 고객 기록에 남긴다',
      '매달 계정 상태를 점수로 매긴다: 양호, 주의, 위험 (이유 포함)',
      '갱신과 추가 판매 기회는 30일 전에 Sasha와 영업에 알린다',
    ],
  },
  {
    id: 'sop-mia', departmentId: 'dept-comms', assigneeKind: 'person', assigneeId: 'person-mia',
    title: '에스컬레이션 & VIP 답장 처리',
    summary: '판단이 필요한 대화를 직접 다루는 사람.',
    steps: [
      '작업자들이 밤사이 만든 에스컬레이션 대기열을 검토한다',
      'VIP 스레드는 Alex 말투로 답장 초안을 쓴다',
      '승인된 것은 보내고 나머지는 Alex의 승인을 받도록 정리한다',
      '우리 쪽 답변을 24시간 넘게 기다리는 스레드는 독촉한다',
      '/comms에서 마무리해 걸려 있는 것이 없게 한다',
    ],
  },
  {
    id: 'sop-dana', departmentId: 'dept-finance', assigneeKind: 'person', assigneeId: 'person-dana',
    title: '월말 결산',
    summary: '매달 숫자에 대한 사람의 최종 승인.',
    steps: [
      '매달 3일까지 그달의 은행 및 결제 수단 명세서를 가져온다',
      '명세서 자체의 카테고리로 거래를 분류한다',
      '에이전트가 기록한 수입과 대사하고 모든 차이를 추적한다',
      '환불과 분쟁이 사업별 합계에 반영됐는지 확인한다',
      '월말 손익계산서를 세 줄 코멘트와 함께 Alex에게 전달한다',
    ],
  },
  {
    id: 'sop-sasha', departmentId: 'dept-clients', assigneeKind: 'person', assigneeId: 'person-sasha',
    title: '고객 관계 책임',
    summary: '모든 계정에 책임지는 사람.',
    steps: [
      '킥오프와 분기별 비즈니스 리뷰 통화를 진행한다',
      '에스컬레이션은 들어온 날 해결한다',
      '작업 시작 전에 범위 변경을 승인한다',
      '매달 고객 성공 담당과 계정 상태 점수를 검토한다',
      '갱신을 승인하고 가격 변경은 영업에 넘긴다',
    ],
  },
];

// The tool registry behind /reference and the graph. `status` is honest about
// what the host can actually reach: connected = credentials or binary present
// and working; available = implemented but waiting on a key or a running service.
const tools: Tool[] = [
  // Knowledge
  { id: 'tool-gbrain', name: 'G-Brain (gbrain CLI)', category: 'Knowledge', status: 'connected', color: GRAY.white, description: '마크다운 브레인 저장소 + 호스팅 벡터 백엔드 + 로컬 임베딩.' },
  { id: 'tool-brain-store', name: 'brain-store/', category: 'Knowledge', status: 'connected', color: GRAY.light, description: '디스크의 로컬 마크다운 지식 베이스.' },
  { id: 'tool-ollama', name: 'Ollama (bge-m3)', category: 'Knowledge', status: 'connected', color: GRAY.mid, description: 'gbrain 하이브리드 검색 뒤의 로컬 1024차원 임베딩과 로컬 재정렬. 키도, 외부 업체도 필요 없음.' },
  { id: 'tool-supabase', name: 'Supabase (Second Brain)', category: 'Knowledge', status: 'available', color: GRAY.mid, description: '약 1000페이지 분량의 청크 지식. 무료 플랜은 유휴 시 일시정지: 검색이 실패하면 대시보드에서 다시 켜세요.' },
  { id: 'tool-obsidian', name: 'Notes Vault', category: 'Knowledge', status: 'connected', color: GRAY.light, description: '로컬 메모 보관소. 파일 시스템에 직접 접근.' },
  // Social & growth
  { id: 'tool-postly', name: 'Postly', category: 'Social', status: 'connected', color: GRAY.white, description: '게시 계정 하나로 6개 플랫폼 (IG, TikTok, X…). 키는 환경 변수에서.' },
  { id: 'tool-dmflow', name: 'DMFlow', category: 'Social', status: 'connected', color: GRAY.white, description: 'DM 자동화, 독립 DMFlow MCP로 가동. 키워드 흐름은 여전히 DMFlow UI에서 만듭니다: 공개 API에는 흐름 작성 기능이 없습니다.' },
  { id: 'tool-skool', name: 'Skool (via Playwright)', category: 'Social', status: 'connected', color: GRAY.mid, description: 'launchpad-cohort 커뮤니티, 문서화된 Playwright 워크플로로 운영.' },
  // CRM & revenue
  { id: 'tool-ledger', name: 'Ledger', category: 'CRM & Revenue', status: 'connected', color: GRAY.white, description: 'Vantage와 Launchpad Cohort 거래, 읽기 권한 (목록이 아니라 레코드 조회).' },
  { id: 'tool-paykit', name: 'PayKit', category: 'CRM & Revenue', status: 'planned', color: GRAY.light, description: '영업용 제안/결제/고객 맥락, Vantage PayKit 레인 포함.' },
  { id: 'tool-flexpay', name: 'FlexPay', category: 'CRM & Revenue', status: 'planned', color: GRAY.mid, description: '영업 제안용 할부 옵션과 분할 결제 맥락.' },
  { id: 'tool-stripe', name: 'Stripe', category: 'CRM & Revenue', status: 'available', color: GRAY.light, description: '클라이언트 구현 완료 — STRIPE_SECRET_KEY를 설정하면 잔액 + 결제가 실시간으로.' },
  { id: 'tool-ghl', name: 'GoHighLevel', category: 'CRM & Revenue', status: 'planned', color: GRAY.dark, description: 'CLI 래퍼 골격만 있음, 설정된 키 없음.' },
  { id: 'tool-recall', name: 'Recall', category: 'CRM & Revenue', status: 'available', color: GRAY.mid, description: 'AI 회의 기록. API 접근에는 RECALL_API_KEY가 필요합니다.' },
  { id: 'tool-plaud', name: 'Plaud', category: 'CRM & Revenue', status: 'connected', color: GRAY.light, description: '대면용 포켓 녹음기: 고객 대면 미팅, 현장 방문, 메모. API로 전사 + AI 메모, 녹음 탭에서 Recall과 함께 표시.' },
  { id: 'tool-trakyo', name: 'Trakyo', category: 'CRM & Revenue', status: 'planned', color: GRAY.dim, description: 'Launchpad Cohort 매출 추적: 콘텐츠 → 예약 통화 → 결제. Trakyo가 공개 API를 내기 전까지는 상태만 표시 (TRAKYO_API_KEY).' },
  // Creative studio
  { id: 'tool-reelkit', name: 'Reelkit Pipeline', category: 'Creative', status: 'connected', color: GRAY.white, description: '브랜드별 테마와 스킬 라이브러리가 있는 로컬 렌더링 파이프라인.' },
  { id: 'tool-renderly', name: 'Renderly CLI', category: 'Creative', status: 'connected', color: GRAY.light, description: '인증된 CLI: generate / product-photoshoot / marketing-studio / soul-id.' },
  { id: 'tool-adsmith', name: 'Adsmith', category: 'Creative', status: 'connected', color: GRAY.mid, description: 'Vantage용 UGC 광고 (Veo/Sora/Kling). 환경 변수의 Basic 인증.' },
  { id: 'tool-whisper', name: 'Whisper (local)', category: 'Creative', status: 'connected', color: GRAY.dim, description: '로컬 전사 CLI + ffmpeg. 아무것도 호스트 밖으로 나가지 않음.' },
  { id: 'tool-miro', name: 'Miro', category: 'Creative', status: 'connected', color: GRAY.mid, description: '환경 변수 토큰을 쓰는 REST API. 아키텍처 보드가 여기 있습니다.' },
  { id: 'tool-canva-figma', name: 'Canva + Figma', category: 'Creative', status: 'available', color: GRAY.dark, description: '세션 범위 MCP로 연결됨. 독립 API에는 별도 키가 필요합니다.' },
  // Comms
  { id: 'tool-imap', name: 'Email (4 IMAP slots)', category: 'Comms', status: 'available', color: GRAY.light, description: '받은편지함 4개용 클라이언트 구현 완료 — INBOX_1..4_HOST/_USER/_PASS를 설정하세요.' },
  { id: 'tool-slack', name: 'Slack', category: 'Comms', status: 'available', color: GRAY.mid, description: '클라이언트 구현 완료. channels:read/history 권한이 있는 봇 토큰이 필요합니다.' },
  { id: 'tool-dictate', name: 'Dictate Flow', category: 'Comms', status: 'connected', color: GRAY.white, description: '음성 받아쓰기. 로컬 SQLite 기록을 실시간으로 읽습니다.' },
  { id: 'tool-whatsapp', name: 'WhatsApp', category: 'Comms', status: 'connected', color: GRAY.white, description: '데스크톱 앱의 로컬 ChatStorage.sqlite, 읽기 전용: 로컬 팀 채팅.' },
  // Orchestration & infra
  { id: 'tool-command-center', name: 'Command Center (:4000)', category: 'Orchestration', status: 'available', color: GRAY.light, description: '칸반, 브랜드 협찬, 영업 통화, SOP, 배분. npm run dev 로 시작하세요.' },
  { id: 'tool-clawline', name: 'Clawline Gateway', category: 'Orchestration', status: 'available', color: GRAY.dim, description: '휴면: 게이트웨이 오프라인, 토큰 없음. 재설치가 필요합니다.' },
  { id: 'tool-tmux', name: 'tmux', category: 'Orchestration', status: 'connected', color: GRAY.mid, description: '다중 세션 조율. 대시보드가 실시간 세션 목록을 읽습니다.' },
  { id: 'tool-ollama', name: 'Ollama', category: 'Orchestration', status: 'available', color: GRAY.mid, description: '로컬 LLM 서버 :11434, 인증 없음. 켜면 무료 로컬 추론을 쓸 수 있습니다.' },
  { id: 'tool-vercel', name: 'Vercel CLI', category: 'Orchestration', status: 'connected', color: GRAY.mid, description: '인증된 CLI. 공개 빌드의 배포 대상.' },
  { id: 'tool-gh', name: 'GitHub CLI', category: 'Orchestration', status: 'connected', color: GRAY.dim, description: '저장소, 이슈, 릴리스용 인증된 CLI.' },
  // Payments (registry awaiting keys)
  { id: 'tool-paypal', name: 'PayPal', category: 'Payments', status: 'planned', color: GRAY.mid, description: '결제 수단 목록에 등록됨. 키가 들어오면 클라이언트도 붙습니다.' },
  { id: 'tool-square', name: 'Square', category: 'Payments', status: 'planned', color: GRAY.dim, description: '결제 수단 목록에 등록됨. 키가 들어오면 클라이언트도 붙습니다.' },
  { id: 'tool-whop', name: 'Whop', category: 'Payments', status: 'planned', color: GRAY.dark, description: '결제 수단 목록에 등록됨. 키가 들어오면 클라이언트도 붙습니다.' },
];

// Every row names the phase it advances: the phase cards on /roadmap read
// their bar as done/total of the rows they own, so a row without a phase
// would quietly shrink a percentage instead of showing up in it.
const roadmap: RoadmapItem[] = [
  { id: 'rm-v1', title: '커맨드 센터 v1 기본판', quarter: '2026-Q2', status: 'done', departmentId: 'dept-tech', description: '화면 6개, SQLite 저장소, 테스트 32개.', phaseId: 'phase-2' },
  { id: 'rm-mono', title: '흑백 재구축 + 실제 커넥터', quarter: '2026-Q2', status: 'done', departmentId: 'dept-tech', description: '흑백 테마. IMAP, Slack, Stripe, gbrain 연결.', phaseId: 'phase-1' },
  { id: 'rm-gbrain', title: 'G-Brain 제공자 가동', quarter: '2026-Q2', status: 'done', departmentId: 'dept-tech', description: 'gbrain CLI 진단/검색 + 브레인 저장소 로컬 대체 경로.', phaseId: 'phase-1' },
  { id: 'rm-creds-email', title: '이메일 받은편지함 4개 연결', quarter: '2026-Q2', status: 'done', departmentId: 'dept-comms', description: '앱 비밀번호로 Gmail IMAP 슬롯 4개 가동, /comms에 공급.', phaseId: 'phase-1' },
  { id: 'rm-creds-slack', title: 'Slack 워크스페이스 연결', quarter: '2026-Q2', status: 'done', departmentId: 'dept-comms', description: '봇 토큰으로 고객별 보드용 채널 + 기록을 읽습니다.', phaseId: 'phase-1' },
  { id: 'rm-creds-payments', title: '결제 수단 연결', quarter: '2026-Q2', status: 'done', departmentId: 'dept-finance', description: 'Stripe 가동, PayKit, PayPal, Square는 목록에 등록.', phaseId: 'phase-1' },
  { id: 'rm-supabase', title: 'Supabase 세컨드 브레인 되살리기', quarter: '2026-Q2', status: 'done', departmentId: 'dept-tech', description: '무료 플랜 프로젝트 재개, gbrain 하이브리드 검색이 다시 동작.', phaseId: 'phase-1' },
  { id: 'rm-scheduler', title: '에이전트 스케줄러 (크론 실행)', quarter: '2026-Q3', status: 'done', departmentId: 'dept-tech', description: '60초 주기로 일정 7개, cron_runs 기록과 놓친 실행 따라잡기.', phaseId: 'phase-3' },
  { id: 'rm-llm', title: 'LLM 요약 계층', quarter: '2026-Q3', status: 'done', departmentId: 'dept-tech', description: 'AI Gateway를 통한 에이전트 채팅과 요약, 모델 장애 대비 전환.', phaseId: 'phase-3' },
  { id: 'rm-host', title: '전용 호스트로 이전', quarter: '2026-Q3', status: 'done', departmentId: 'dept-tech', description: '앱, gbrain, 에이전트는 호스트에서 실행, Supabase는 관리형 유지.', phaseId: 'phase-4' },
  { id: 'rm-embeddings', title: '임베딩 스택 직접 보유', quarter: '2026-Q3', status: 'done', departmentId: 'dept-tech', description: '호스팅 업체가 사라지기 전에 브레인을 로컬 임베딩으로 옮김.', phaseId: 'phase-1' },
  { id: 'rm-call-archive', title: '모든 영업 통화 보관', quarter: '2026-Q3', status: 'done', departmentId: 'dept-sales', description: 'CRM과 회의 기록 전사본을 브레인 저장소에 하나씩 페이지로 내보냄.', phaseId: 'phase-2' },
  { id: 'rm-recorders', title: '음성 녹음기를 브레인에 연결', quarter: '2026-Q3', status: 'done', departmentId: 'dept-sales', description: '/comms에 포켓 녹음기와 Recall, 전사본이 G-Brain에 자동 저장.', phaseId: 'phase-2' },
  { id: 'rm-trading', title: '트레이딩 보드', quarter: '2026-Q3', status: 'done', departmentId: 'dept-finance', description: 'Robinhood와 Phantom 슬리브, 에이전트 판단 근거, 주문, 거래 기록.', phaseId: 'phase-2' },
  { id: 'rm-usage', title: '토큰 소모 보드', quarter: '2026-Q3', status: 'done', departmentId: 'dept-tech', description: '8월 과다 소모 이후 자리별 실시간 지출, 다른 컴퓨터도 데이터를 보냄.', phaseId: 'phase-2' },
  { id: 'rm-workers', title: '호스트의 작업자 풀', quarter: '2026-Q3', status: 'now', departmentId: 'dept-tech', description: '컨덕터 뒤의 저렴한 모델 자리. 보안 강화와 게이트웨이 설치가 남음.', phaseId: 'phase-3' },
  { id: 'rm-statements', title: '명세서 수집', quarter: '2026-Q3', status: 'now', departmentId: 'dept-finance', description: '카드와 은행 명세서를 손으로 입력하지 않고 /finances로 분석.', phaseId: 'phase-1' },
  { id: 'rm-railway', title: '호스팅을 Railway로 이전', quarter: '2026-Q3', status: 'now', departmentId: 'dept-tech', description: '모든 앱을 한 플랫폼으로 이전 중, 잠금된 OS 데모가 시범으로 먼저 이전.', phaseId: 'phase-4' },
  { id: 'rm-ui', title: '인터랙션 리브랜딩', quarter: '2026-Q3', status: 'now', departmentId: 'dept-tech', description: '연동이 가동됐으니 Alex가 OS 전체 디자인을 다듬음.', phaseId: 'phase-2' },
  { id: 'rm-auth', title: '인증 + 원격 접속', quarter: '2026-Q4', status: 'next', departmentId: 'dept-tech', description: '어디서든 안전하게 호스트의 커맨드 센터에 접속.', phaseId: 'phase-4' },
  { id: 'rm-postiz', title: 'Postly를 Postiz로 교체', quarter: '2026-Q4', status: 'next', departmentId: 'dept-clients', description: '게시물과 채널 분석이 자유로운 자체 호스팅 예약 도구.', phaseId: 'phase-1' },
  { id: 'rm-board-embed', title: '보드를 완전히 OS 안으로', quarter: '2026-Q4', status: 'later', departmentId: 'dept-tech', description: '컨덕터와 40개 이상의 에이전트를 OS에서 운영, SOP는 실제 스킬로 실행.', phaseId: 'phase-3' },
];

// Honest zeros — these flip to live numbers as connectors come online.
const metrics: Metric[] = [
  { id: 'metric-unread', key: 'unread_total', label: '안 읽음 (모든 받은편지함)', value: 0, unit: 'emails', delta: 0, period: '인증 정보 대기' },
  { id: 'metric-brain', key: 'brain_pages', label: '브레인 저장소 페이지', value: 0, unit: 'pages', delta: 0, period: 'Data Agent 실행 필요' },
  { id: 'metric-balance', key: 'stripe_available', label: 'Stripe 사용 가능 잔액', value: 0, unit: 'usd', delta: 0, period: '인증 정보 대기' },
  { id: 'metric-runs', key: 'agent_runs', label: '기록된 에이전트 실행', value: 0, unit: 'runs', delta: 0, period: '전체 기간' },
];

const domains: Domain[] = [
  { id: 'brm-1', number: 1, title: '명령 & 기억', color: GRAY.white, items: ['G-Brain (gbrain CLI)', '브레인 저장소 마크다운', '에이전트 실행 기록', '운영자 대시보드'] },
  { id: 'brm-2', number: 2, title: '이메일 운영', color: GRAY.light, items: ['IMAP 받은편지함 4개', '안 읽은 메일 분류', '받은편지함별 상태', '요약 (계획됨)'] },
  { id: 'brm-3', number: 3, title: '팀 커뮤니케이션', color: GRAY.light, items: ['Slack 채널', '메시지 요약', '멘션 추적 (계획됨)'] },
  { id: 'brm-4', number: 4, title: '결제 & 매출', color: GRAY.mid, items: ['Stripe 잔액 + 결제', 'PayPal / Square / Whop 등록', '대사 (계획됨)'] },
  { id: 'brm-5', number: 5, title: '지식 & 문서', color: GRAY.mid, items: ['메모 보관소', '로컬 임베딩', 'Supabase 세컨드 브레인'] },
  { id: 'brm-6', number: 6, title: '에이전트 런타임', color: GRAY.dim, items: ['레지스트리 + run()', '저장되는 실행 기록', '정직한 실패 상태'] },
  { id: 'brm-7', number: 7, title: '인프라', color: GRAY.dim, items: ['현재 호스트', '전용 호스트 (다음)', '로컬 SQLite', '관리형 Supabase'] },
  { id: 'brm-8', number: 8, title: '보안', color: GRAY.dark, items: ['.env.local 비밀 값 (git 제외)', '읽기 전용 커넥터 권한', '저장소에 키 없음'] },
];

const phases: Phase[] = [
  { id: 'phase-1', number: 1, title: '실제 연결', items: ['이메일 받은편지함 4개', 'Slack', '결제 수단', 'G-Brain'] },
  { id: 'phase-2', number: 2, title: '실제 에이전트', items: ['런타임 + 실행 기록', '정직한 상태 보드', '필요할 때 실행'] },
  { id: 'phase-3', number: 3, title: '자율', items: ['예약 실행', 'LLM 요약', '실패 알림'] },
  { id: 'phase-4', number: 4, title: '전용 호스트', items: ['연산 이전', '원격 접속 + 인증', '24시간 가동'] },
];

// The @commandcenter.demo footprint, handles straight from the Postly config.
const socialAccounts: SocialAccount[] = [
  { platform: 'instagram', handle: '@commandcenter.demo', url: null, order: 1 },
  { platform: 'tiktok', handle: '@commandcenter.demo', url: null, order: 2 },
  { platform: 'twitter', handle: '@commandcenterdemo', url: null, order: 3 },
  { platform: 'youtube', handle: '@commandcenterdemo', url: null, order: 4 },
  { platform: 'linkedin', handle: 'Alex', url: null, order: 5 },
];

// Demo follower counts. LinkedIn has no baseline in this demo, so it gets
// honest nulls until scrapes land. Live syncs append from here.
// 91 days of DAILY snapshot dates ending on the final seeded capture, so
// the audience lines read densely at every 7/30/60/all-time window — which is
// also how the live daily Postly sync will fill them going forward.
const SERIES_END = '2026-06-12';
const SERIES_LEN = 91;
const SERIES_DATES: string[] = (() => {
  const end = new Date(`${SERIES_END}T00:00:00Z`);
  const out: string[] = [];
  for (let i = SERIES_LEN - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
})();

/**
 * Deterministic upward ramp from `start` to `end` across SERIES_DATES, with a
 * seeded organic wobble (two mixed frequencies + a slow drift) so daily history
 * reads like real growth rather than a straight line. The final point is forced
 * to `end` so the latest dummy value matches the seeded current value.
 */
function ramp(start: number, end: number, seed: number): number[] {
  const n = SERIES_DATES.length;
  const span = Math.abs(end - start);
  return SERIES_DATES.map((_, i) => {
    if (i === n - 1) return end;
    const t = i / (n - 1);
    // Smooth-ish accelerating trend (subtle S-curve) plus layered jitter.
    const trend = start + (end - start) * (0.7 * t + 0.3 * t * t);
    const wobble =
      (Math.sin(i * 0.7 + seed) * 0.6 + Math.sin(i * 0.27 + seed * 2) * 0.4) * span * 0.012;
    return Math.max(0, Math.round(trend + wobble));
  });
}

// Demo current follower counts; LinkedIn history is fully DUMMY. Each
// platform ramps up to its current value.
const FOLLOWER_TARGETS: { platform: SocialAccount['platform']; start: number; end: number }[] = [
  { platform: 'instagram', start: 30000, end: 42000 },
  { platform: 'tiktok', start: 6000, end: 12000 },
  { platform: 'twitter', start: 3000, end: 5200 },
  { platform: 'youtube', start: 300, end: 900 },
  { platform: 'linkedin', start: 800, end: 1500 },
];

const socialBaseline: SocialSnapshot[] = FOLLOWER_TARGETS.flatMap((t, ti) =>
  ramp(t.start, t.end, ti + 1).map((followers, i) => ({
    platform: t.platform,
    capturedAt: SERIES_DATES[i],
    followers,
    // the final seeded point keeps its source; history is seeded dummy
    source: i === SERIES_DATES.length - 1 && t.platform !== 'linkedin' ? 'postly-config' : 'seed-dummy',
  })),
);

// Email list — demo newsletter snapshot. The provider's stats endpoint exposes
// only current + all-time aggregates, not a daily series, so we seed the honest
// shape: the list exists from a single import date and sits essentially flat
// over the window. Once BEEHIIV_API_KEY lands, syncBeehiivEmail overwrites
// today's point with the live count.
const BEEHIIV_IMPORT_DATE = '2026-05-28';
const BEEHIIV_ACTIVE_SUBSCRIBERS = 1850;
const emailListDates = SERIES_DATES.filter((d) => d >= BEEHIIV_IMPORT_DATE);
const emailListBaseline: EmailListSnapshot[] = emailListDates.map((capturedAt, i) => ({
  capturedAt,
  // flat since the import; the final point is the seeded current value
  subscribers: i === emailListDates.length - 1 ? BEEHIIV_ACTIVE_SUBSCRIBERS : BEEHIIV_ACTIVE_SUBSCRIBERS - 1,
  source: 'seed-beehiiv',
}));

// DM counts — DUMMY until a DMFlow/Postly source is wired. Current totals…
const DM_TARGETS: { platform: SocialDm['platform']; start: number; end: number }[] = [
  { platform: 'instagram', start: 800, end: 1200 },
  { platform: 'tiktok', start: 200, end: 400 },
  { platform: 'twitter', start: 120, end: 200 },
  { platform: 'youtube', start: 25, end: 60 },
  { platform: 'linkedin', start: 45, end: 90 },
];
const socialDms: SocialDm[] = DM_TARGETS.map((t) => ({
  platform: t.platform,
  count: t.end,
  updatedAt: '2026-06-12',
}));

// Instagram DM inbox — realistic seeded conversations so the /social DM tab is
// alive on a fresh clone. DUMMY until the DMFlow webhook feeds it live
// (source 'seed-dummy'; real messages arrive as source 'dmflow'). Four
// threads, inbound + outbound, believable Vantage / Command Center lead-gen tone.
const socialDmMessages: SocialDmMessage[] = [
  // Alex — agency owner off a reel
  ['ig-alex', 'Alex', 'alex', 'in', '에이전트 3개 세팅 릴스 봤어요 🔥 혹시 에이전시랑도 일하세요?', null, '2026-07-18T14:02:00.000Z'],
  ['ig-alex', 'Alex', 'alex', 'out', '감사해요! 네 — Vantage는 딱 에이전시를 위해 만든 거예요. 지금 어떤 걸 운영하고 계세요?', null, '2026-07-18T14:09:00.000Z'],
  ['ig-alex', 'Alex', 'alex', 'in', 'SMMA요, 고객 12곳 정도인데 솔직히 납품에 허덕이고 있어요 😅', null, '2026-07-18T14:15:00.000Z'],
  // Jordan — keyword flow "SCALE"
  ['ig-jordan', 'Jordan Blake', 'jordanbuilds', 'in', 'SCALE', 'SCALE', '2026-07-18T12:41:00.000Z'],
  ['ig-jordan', 'Jordan Blake', 'jordanbuilds', 'out', '짠 💥 무료 분석 자료예요 → commandcenter.example.com/scale. 님 퍼널에 어떻게 적용되는지 보여 드릴까요?', 'SCALE', '2026-07-18T12:41:20.000Z'],
  ['ig-jordan', 'Jordan Blake', 'jordanbuilds', 'in', '네 부탁해요', null, '2026-07-18T13:05:00.000Z'],
  // Priya — story reply
  ['ig-priya', 'Priya N', 'priya.builds', 'in', '스토리 보고 답장해요 — 리테이너 지옥에서 벗어나고 싶어요 😩', null, '2026-07-17T21:12:00.000Z'],
  ['ig-priya', 'Priya N', 'priya.builds', 'out', 'ㅋㅋ 공감해요. 그게 핵심이에요. 지금 방식은 어떠세요 — 리테이너예요, 프로젝트예요?', null, '2026-07-17T21:30:00.000Z'],
  // Sam — pricing question (unreplied → shows as needing attention)
  ['ig-sam', 'Sam Ortiz', 'sam.ortiz.co', 'in', '대신 다 만들어 주는 상품은 가격이 어떻게 되나요?', null, '2026-07-18T15:48:00.000Z'],
].map(([subscriberId, name, handle, direction, text, tag, ts], i) => ({
  id: `dm-${subscriberId}-${i}`,
  platform: 'instagram' as const,
  subscriberId: subscriberId as string,
  name: name as string,
  handle: handle as string,
  text: text as string,
  direction: direction as SocialDmMessage['direction'],
  tag: tag as string | null,
  ts: ts as string,
  source: 'seed-dummy',
}));
// …and the per-day history behind them, so DM growth charts over every window.
const socialDmSnapshots: SocialDmSnapshot[] = DM_TARGETS.flatMap((t, ti) =>
  ramp(t.start, t.end, ti + 50).map((count, i) => ({
    platform: t.platform,
    capturedAt: SERIES_DATES[i],
    count,
    source: 'seed-dummy',
  })),
);

// One example queued post so the composer's queue isn't empty on first load.
const socialPosts: SocialPost[] = [
  {
    id: 'post-seed-1',
    caption: 'Vantage 새 사례 연구 — 60일 만에 파이프라인 3배. 이번 주에 전체 분석 공개 🚀',
    mediaUrl: null,
    platforms: ['instagram', 'tiktok', 'twitter'],
    status: 'queued',
    scheduledFor: null,
    createdAt: '2026-06-12T18:00:00Z',
  },
];

// ── Funnel journeys — DUMMY clients from first touch to conversion ──────────
// Real-ready: `source` on every touch names where it will come from live —
// 'trakyo' (organic attribution), 'meta-ads' (Meta Ads MCP), 'manual' until
// then. Swapping seed for live pulls is a repo-level change; the shape stays.
// Touch dates are DAYS-AGO offsets resolved at seed time, so the space's
// stall coloring (quiet > 7 days pre-conversion → red) stays truthful no
// matter when the DB is re-seeded.
const funnelDay = (daysBack: number): string =>
  new Date(Date.now() - daysBack * 86_400_000).toISOString().slice(0, 10);

type SeededTouch = [FunnelTouch['stage'], FunnelTouch['channel'], string, FunnelTouch['source'], number];
type SeededJourney = {
  id: string;
  name: string;
  venture: FunnelContact['venture'];
  relationship: FunnelContact['relationship'];
  likelihood: number; // 0–100 likelihood-to-buy (dummy; later CRM/Trakyo-scored)
  product?: string;
  amountUsd?: number;
  email?: string; // dummy contact channels so the demo shows outreach actions
  phone?: string;
  person?: string; // the human behind the deal — demo dossier identity
  company?: string;
  role?: string;
  linkedin?: string;
  touches: SeededTouch[]; // 4–5, chronological (last number = days ago)
};

const FUNNEL_JOURNEYS: SeededJourney[] = [
  // — Launchpad Cohort (mentorship) —
  {
    id: 'fc-jake-moreau', name: 'Jake Moreau', venture: 'launchpad-cohort',
    relationship: 'hot', likelihood: 100,
    product: 'Launchpad Cohort — 멘토십 (일시불)', amountUsd: 6800,
    touches: [
      ['first_touch', 'organic', 'IG reel: "스스로 성사되는 AI 상품 3가지"', 'trakyo', 59],
      ['engaged', 'dm', '스토리 CTA에 답장 — "리테이너 지옥에서 벗어나고 싶다"', 'manual', 57],
      ['nurtured', 'email', '3일차 이메일: 수강생 사례 연구 (0→월 22k)', 'manual', 54],
      ['opted_in', 'call', 'Trakyo 링크로 전략 상담 예약', 'trakyo', 51],
      ['converted', 'checkout', '일시불 결제 — PayKit 결제', 'manual', 49],
    ],
  },
  {
    id: 'fc-priya-shah', name: 'Priya Shah', venture: 'launchpad-cohort',
    relationship: 'warm', likelihood: 95,
    product: 'Launchpad Cohort — 멘토십 (3회 분할)', amountUsd: 2600,
    touches: [
      ['first_touch', 'ads', 'Meta ad: "에이전시 대표님 — 30일 안에 AI 도입"', 'meta-ads', 45],
      ['engaged', 'ads', 'VSL 80% 시청 — 리타겟 대상', 'meta-ads', 45],
      ['opted_in', 'webinar', '라이브 교육 신청 + 참석', 'manual', 42],
      ['converted', 'checkout', '3회 분할 중 첫 결제 — PayKit', 'manual', 40],
    ],
  },
  {
    id: 'fc-danny-okafor', name: 'Danny Okafor', venture: 'launchpad-cohort',
    relationship: 'hot', likelihood: 100,
    product: 'Launchpad Cohort — 멘토십 (일시불)', amountUsd: 6800,
    touches: [
      ['first_touch', 'organic', 'TikTok: "AI 에이전시 운영하는 하루"', 'trakyo', 38],
      ['engaged', 'organic', '릴스 6개 몰아 보고, 팔로우, 리드 마그넷 게시물 저장', 'trakyo', 36],
      ['nurtured', 'ads', '리타겟팅 광고: 수강생 성과 캐러셀', 'meta-ads', 33],
      ['opted_in', 'call', '프로필 링크로 통화 예약 (Trakyo 추적)', 'trakyo', 30],
      ['converted', 'checkout', '일시불 결제 — PayKit 결제', 'manual', 29],
    ],
  },
  {
    id: 'fc-sofia-reyes', name: 'Sofia Reyes', venture: 'launchpad-cohort',
    relationship: 'warm', likelihood: 95,
    product: 'Launchpad Cohort — 멘토십 (3회 분할)', amountUsd: 2600,
    touches: [
      ['first_touch', 'organic', 'YT long-form: "2026년에 내가 에이전시를 시작한다면"', 'trakyo', 31],
      ['engaged', 'email', 'YT 설명란에서 newsletter 가입', 'manual', 30],
      ['nurtured', 'email', 'Newsletter: 가격 심리 호 클릭', 'manual', 26],
      ['opted_in', 'webinar', '라이브 교육 참석, 제안까지 시청', 'manual', 23],
      ['converted', 'checkout', '3회 분할 중 첫 결제 — PayKit', 'manual', 22],
    ],
  },
  {
    // Ads ghost — three engaged touches, quiet for 3 weeks: the red node.
    id: 'fc-liam-carter', name: 'Liam Carter', venture: 'launchpad-cohort',
    relationship: 'cold', likelihood: 15,
    touches: [
      ['first_touch', 'ads', 'Meta ad: "시간을 팔지 마세요" (콜드 트래픽)', 'meta-ads', 27],
      ['engaged', 'ads', '클릭해서 들어와 VSL 45% 시청', 'meta-ads', 27],
      ['engaged', 'ads', '리타겟 클릭 — 신청서 열었다가 이탈', 'meta-ads', 23],
      ['engaged', 'email', '이탈 폼 이메일 열람, 아직 답장 없음', 'manual', 21],
    ],
  },
  {
    // Warm but drifting — 10 quiet days in nurture: also red until re-touched.
    id: 'fc-marcus-webb', name: 'Marcus Webb', venture: 'launchpad-cohort',
    relationship: 'warm', likelihood: 42,
    touches: [
      ['first_touch', 'organic', 'IG carousel: "2026년에 돈 되는 에이전시 분야"', 'trakyo', 24],
      ['engaged', 'dm', 'DMFlow 키워드 "SCALE" → DM 흐름', 'manual', 24],
      ['nurtured', 'email', '리드 마그넷 전달, 1일차 이메일 열람', 'manual', 12],
      ['nurtured', 'email', 'Newsletter: 수강생 성과 분석 클릭', 'manual', 10],
    ],
  },
  {
    id: 'fc-tayla-nguyen', name: 'Tayla Nguyen', venture: 'launchpad-cohort',
    relationship: 'hot', likelihood: 84,
    email: 'tayla.nguyen@example.com', phone: '+15550100841',
    touches: [
      ['first_touch', 'organic', 'TikTok: "AI 접수원 데모"가 반쯤 바이럴', 'trakyo', 4],
      ['engaged', 'organic', '프로필 방문 → 팔로우 + 댓글', 'trakyo', 4],
      ['nurtured', 'dm', 'DM 대화 — 분할 결제 문의', 'manual', 3],
      ['opted_in', 'call', '다음 주 통화 예약 (Trakyo 추적)', 'trakyo', 2],
    ],
  },
  {
    // Mid-decay: 70 quiet days — visibly fading toward red, 20 days from the archive.
    id: 'fc-remy-cole', name: 'Remy Cole', venture: 'launchpad-cohort',
    relationship: 'cold', likelihood: 25,
    touches: [
      ['first_touch', 'organic', 'IG reel: "리드 발굴 에이전시를 해고하세요"', 'trakyo', 84],
      ['engaged', 'dm', '스토리 답장 대화, 가격 문의', 'manual', 80],
      ['engaged', 'email', '가격 안내 발송, 두 번 열람', 'manual', 74],
      ['engaged', 'email', '후속 연락: "다시 연락드려요" — 이후 답장 없음', 'manual', 70],
    ],
  },
  {
    // Went quiet in March — decayed past 90 days into the archive tab.
    id: 'fc-jordan-blake', name: 'Jordan Blake', venture: 'launchpad-cohort',
    relationship: 'cold', likelihood: 20,
    touches: [
      ['first_touch', 'ads', 'Meta ad: "고객 하나로 9-5 퇴사하기" (예전 캠페인)', 'meta-ads', 118],
      ['engaged', 'ads', '클릭해서 들어와 VSL 30% 시청', 'meta-ads', 118],
      ['engaged', 'dm', '한 단어 DM 답장 후 연락 끊김', 'manual', 112],
      ['engaged', 'email', '재참여 이메일 반송-열람, 클릭 없음', 'manual', 104],
    ],
  },
  // — Vantage (AI agency clients) —
  {
    id: 'fc-ava-stone', name: 'Ava Stone — Northwind Legal', venture: 'vantage',
    relationship: 'hot', likelihood: 100,
    product: 'Vantage — AI 접수 시스템 구축 (스프린트)', amountUsd: 12000,
    touches: [
      ['first_touch', 'organic', 'LinkedIn post: 법률 상담 접수 자동화 분석', 'trakyo', 57],
      ['engaged', 'email', 'newsletter에 답장 — "딱 우리 병목이에요"', 'manual', 55],
      ['opted_in', 'call', '사이트에서 상담 통화 예약 (Trakyo 추적)', 'trakyo', 50],
      ['nurtured', 'email', '제안서 + Loom 설명 영상 발송, 3회 시청', 'manual', 47],
      ['converted', 'checkout', '계약 — Stripe 청구서로 50% 선금', 'manual', 43],
    ],
  },
  {
    id: 'fc-omar-haddad', name: 'Omar Haddad — Pulse Fitness Group', venture: 'vantage',
    relationship: 'warm', likelihood: 95,
    product: 'Vantage — AI 운영 리테이너 (월간)', amountUsd: 4500,
    touches: [
      ['first_touch', 'ads', 'Meta ad: "헬스장 프런트 데스크 자동화"', 'meta-ads', 48],
      ['engaged', 'ads', '사례 연구 페이지 4분 체류 — 리타겟 대상', 'meta-ads', 47],
      ['nurtured', 'email', '폼 작성 후 ROI 요약 자료 이메일 발송', 'manual', 44],
      ['opted_in', 'call', '데모 통화 — 지점 3곳 범위 확정', 'manual', 41],
      ['converted', 'checkout', '리테이너 시작 — Stripe 구독', 'manual', 37],
    ],
  },
  {
    id: 'fc-elena-brooks', name: 'Elena Brooks — Harbor Dental', venture: 'vantage',
    relationship: 'hot', likelihood: 100,
    product: 'Vantage — AI 접수 시스템 구축 (스프린트)', amountUsd: 9500,
    touches: [
      ['first_touch', 'organic', 'IG reel: 부재중 전화 → 환자 예약 데모', 'trakyo', 31],
      ['engaged', 'dm', 'DM: "치과에도 되나요?"', 'manual', 30],
      ['opted_in', 'call', '프로필 링크로 상담 통화 (Trakyo 추적)', 'trakyo', 27],
      ['converted', 'checkout', '계약 — Stripe 청구서로 선금', 'manual', 23],
    ],
  },
  {
    id: 'fc-noah-fields', name: 'Noah Fields — Fields Roofing', venture: 'vantage',
    relationship: 'warm', likelihood: 66,
    touches: [
      ['first_touch', 'ads', 'Meta ad: "자동으로 월 20건 견적 예약"', 'meta-ads', 8],
      ['engaged', 'ads', '리드 폼 열람, VSL 60%', 'meta-ads', 8],
      ['nurtured', 'email', '후속 시퀀스 2일차 — 사례 연구 클릭', 'manual', 5],
      ['opted_in', 'call', '금요일 상담 통화 예약', 'manual', 2],
    ],
  },
  {
    id: 'fc-grace-lin', name: 'Grace Lin — Lin & Co Accounting', venture: 'vantage',
    relationship: 'warm', likelihood: 74,
    email: 'grace@linandco.example.com', phone: '+15550100742',
    person: 'Grace Lin', company: 'Lin & Co Accounting', role: 'Managing Partner',
    linkedin: 'https://linkedin.com/in/gracelin-example',
    touches: [
      ['first_touch', 'organic', 'X thread: 고객 온보딩 에이전트 분석', 'trakyo', 6],
      ['engaged', 'organic', '팔로우 + 북마크, 사이트 2회 방문', 'trakyo', 5],
      ['nurtured', 'email', 'Newsletter 가입 — 웰컴 시퀀스 시작', 'manual', 3],
      ['opted_in', 'call', '통화 요청 form 제출 (Trakyo 추적)', 'trakyo', 1],
    ],
  },
];

const funnelContacts: FunnelContact[] = FUNNEL_JOURNEYS.map((j) => ({
  id: j.id,
  name: j.name,
  venture: j.venture,
  status: j.touches[j.touches.length - 1][0], // furthest stage reached
  product: j.product ?? null,
  amountUsd: j.amountUsd ?? null,
  relationship: j.relationship,
  likelihood: j.likelihood,
  url: null,
  email: j.email ?? null,
  phone: j.phone ?? null,
  person: j.person ?? null,
  company: j.company ?? null,
  role: j.role ?? null,
  linkedin: j.linkedin ?? null,
  createdAt: funnelDay(j.touches[0][4]), // journey starts at the first touch
}));

const funnelTouches: FunnelTouch[] = FUNNEL_JOURNEYS.flatMap((j) =>
  j.touches.map(([stage, channel, label, source, daysBack], i) => ({
    id: `${j.id}-t${i + 1}`,
    contactId: j.id,
    seq: i + 1,
    stage,
    channel,
    label,
    source,
    at: funnelDay(daysBack),
  })),
);

// The machine, mapped: each venture's process as an owned chain of steps.
// Real-ready — owners, weekly hours, tools, the bottlenecks that leak money,
// and the automations (live or suggested) that carry the load back.
const workflows: Workflow[] = [
  {
    id: 'wf-vantage-sales',
    name: 'Vantage 영업 머신',
    subtitle: '콜드 아웃바운드부터 리테이너 계약까지.',
    revenueUsd: 120_000,
    order: 0,
    steps: [
      {
        id: 'wf-mer-1',
        title: '아웃바운드 캠페인 실행',
        detail: '',
        branch: null,
        ownerKind: 'agent',
        owner: 'Postly Publisher',
        hoursPerWeek: 6,
        tools: ['postly', 'adsmith'],
        edgeLabel: '답장',
        leakUsd: null,
        automation: { title: '상시 콘텐츠 + DM 연락', state: 'live', recoveredUsd: 4200 },
      },
      {
        id: 'wf-mer-2',
        title: '답장 검토',
        detail: '',
        branch: null,
        ownerKind: 'agent',
        owner: 'Comms Agent',
        hoursPerWeek: 9,
        tools: ['dmflow', 'gmail'],
        edgeLabel: '적합',
        leakUsd: 14_000,
        automation: { title: '자동 검토 + 예약', state: 'suggested', recoveredUsd: 9000 },
      },
      {
        id: 'wf-mer-3',
        title: '데모 예약',
        detail: '',
        branch: null,
        ownerKind: 'human',
        owner: 'Alex · Founder',
        hoursPerWeek: 4,
        tools: ['calendar', 'ledger'],
        edgeLabel: '데모',
        leakUsd: null,
        automation: null,
      },
      {
        id: 'wf-mer-4',
        title: '영업 통화',
        detail: '',
        branch: null,
        ownerKind: 'human',
        owner: 'Alex · Founder',
        hoursPerWeek: 10,
        tools: ['ledger'],
        edgeLabel: '제안',
        leakUsd: null,
        automation: null,
      },
      {
        id: 'wf-mer-5',
        title: '제안 & 후속 연락',
        detail: '',
        branch: null,
        ownerKind: 'human',
        owner: 'Alex · Founder',
        hoursPerWeek: 5,
        tools: ['proposal-gen', 'gmail'],
        edgeLabel: '성사',
        leakUsd: 6000,
        automation: { title: '제안 후속 시퀀스', state: 'suggested', recoveredUsd: 6000 },
      },
      {
        id: 'wf-mer-6',
        title: '온보딩 & 납품',
        detail: '',
        branch: null,
        ownerKind: 'agent',
        owner: 'Onboarding Agent',
        hoursPerWeek: 3,
        tools: ['ledger', 'slack'],
        edgeLabel: null,
        leakUsd: null,
        automation: { title: '온보딩 레일', state: 'live', recoveredUsd: 3000 },
      },
    ],
  },
  {
    id: 'wf-lc-delivery',
    name: 'Launchpad Cohort 운영',
    subtitle: '웨비나 리드부터 계속 남는 프로그램 멤버까지.',
    revenueUsd: 80_000,
    order: 1,
    steps: [
      {
        id: 'wf-lc-1',
        title: '웨비나 리드 수집',
        detail: '',
        branch: null,
        ownerKind: 'agent',
        owner: 'GoHighLevel',
        hoursPerWeek: 2,
        tools: ['ghl'],
        edgeLabel: '신청',
        leakUsd: null,
        automation: { title: '웨비나 → GHL 동기화', state: 'live', recoveredUsd: 2500 },
      },
      {
        id: 'wf-lc-2',
        title: 'GHL에서 육성',
        detail: '',
        branch: null,
        ownerKind: 'agent',
        owner: 'GoHighLevel',
        hoursPerWeek: 3,
        tools: ['ghl'],
        edgeLabel: '예약',
        leakUsd: 8000,
        automation: { title: '육성 시퀀스', state: 'live', recoveredUsd: 5000 },
      },
      {
        id: 'wf-lc-3',
        title: '전략 상담',
        detail: '',
        branch: null,
        ownerKind: 'human',
        owner: 'Alex · Founder',
        hoursPerWeek: 8,
        tools: ['ghl', 'calendar'],
        edgeLabel: '성사',
        leakUsd: null,
        automation: null,
      },
      {
        id: 'wf-lc-4',
        title: '프로그램 제공',
        detail: '',
        branch: null,
        ownerKind: 'human',
        owner: 'LC Team',
        hoursPerWeek: 12,
        tools: ['skool'],
        edgeLabel: '유지',
        leakUsd: 5000,
        automation: { title: 'Skool 커뮤니티 운영', state: 'suggested', recoveredUsd: 4000 },
      },
      {
        id: 'wf-lc-5',
        title: '유입 추적',
        detail: '',
        branch: null,
        ownerKind: 'agent',
        owner: 'Trakyo',
        hoursPerWeek: 1,
        tools: ['trakyo'],
        edgeLabel: null,
        leakUsd: null,
        automation: { title: '매출 추적', state: 'suggested', recoveredUsd: 0 },
      },
    ],
  },
];

// Agent task board — seeded across open/doing/done so the Kanban is alive on
// first load. Demo cards; user-added tasks coexist (we insert by id, never wipe).
const SEED_TS = '2026-07-21T12:00:00.000Z';
const agentTasks: AgentTask[] = [
  { id: 'task-seed-1', agentId: 'comms-agent', title: '받은편지함 4개의 밤사이 메일 분류', status: 'open', createdAt: SEED_TS, updatedAt: SEED_TS },
  { id: 'task-seed-2', agentId: 'social-agent', title: 'Vantage 출시용 IG 훅 3개 초안', status: 'open', createdAt: SEED_TS, updatedAt: SEED_TS },
  { id: 'task-seed-3', agentId: 'gmail-worker', title: '답장 없는 관심 리드 6명에게 후속 연락', status: 'open', createdAt: SEED_TS, updatedAt: SEED_TS },
  { id: 'task-seed-4', agentId: 'adsmith-creative', title: '새 상품용 UGC 변형 5개 생성', status: 'open', createdAt: SEED_TS, updatedAt: SEED_TS },
  { id: 'task-seed-5', agentId: 'postly-publisher', title: '이번 주 교차 플랫폼 게시물 예약', status: 'doing', createdAt: SEED_TS, updatedAt: SEED_TS },
  { id: 'task-seed-6', agentId: 'comms-agent', title: '캠페인으로 들어온 새 DM 12개 검토', status: 'doing', createdAt: SEED_TS, updatedAt: SEED_TS },
  { id: 'task-seed-7', agentId: 'reelkit-editor', title: '영업 통화 하이라이트 릴스 편집', status: 'doing', createdAt: SEED_TS, updatedAt: SEED_TS },
  { id: 'task-seed-8', agentId: 'gmail-worker', title: 'Vantage 제안 후속 연락 보내기', status: 'done', createdAt: SEED_TS, updatedAt: SEED_TS },
  { id: 'task-seed-9', agentId: 'slack-worker', title: '월요일 스탠드업 요약 게시', status: 'done', createdAt: SEED_TS, updatedAt: SEED_TS },
  { id: 'task-seed-10', agentId: 'social-agent', title: '화요일 캐러셀 게시', status: 'done', createdAt: SEED_TS, updatedAt: SEED_TS },
  { id: 'task-seed-11', agentId: 'postly-publisher', title: '6개 플랫폼 팔로워 수 동기화', status: 'done', createdAt: SEED_TS, updatedAt: SEED_TS },
];

const SKILL_STATUS_NOTE: Record<string, string> = {
  live: '운영 중. 담당 에이전트가 지금 이걸 실행합니다.',
  learning: '학습 중. 보정하는 동안 사람이 함께 확인하며 실행합니다.',
  planned: '계획됨. 범위가 정해져 대기 중이며 아직 연결되지 않았습니다.',
};

/** Compose a real-ready SKILL.md doc from a skill's fields (viewed from its card). */
function skillDoc(s: Omit<Skill, 'markdown'>): string {
  const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const toolLine = s.tools.length ? s.tools.map((t) => `\`${t}\``).join(', ') : 'no external tools';
  return `---
name: ${slug}
description: ${s.description}
category: ${s.category}
status: ${s.status}
---

# ${s.name}

${s.description}

## When to use
Reach for this when the ${s.category.toLowerCase()} flow needs to ${s.name.toLowerCase()}. It runs on ${toolLine}.

## Status
${SKILL_STATUS_NOTE[s.status] ?? s.status}
`;
}

// The capability library the agent workforce draws on.
const skills: Omit<Skill, 'markdown'>[] = [
  { id: 'skill-outbound', name: '콜드 아웃바운드 시퀀스', category: 'Sales', description: '대규모로 대화를 여는 다회 DM + 콘텐츠 주기.', ownerAgentId: 'postly-publisher', status: 'live', tools: ['postly', 'dmflow'], order: 0 },
  { id: 'skill-qualify', name: '답장 검토', category: 'Sales', description: '들어온 답장을 읽고 의도를 점수화해 적합한 사람을 예약합니다.', ownerAgentId: 'comms-agent', status: 'live', tools: ['dmflow', 'gmail'], order: 1 },
  { id: 'skill-proposal', name: '제안서 작성', category: 'Sales', description: '통화 전사본을 브랜드에 맞는 맞춤 제안서로 바꿉니다.', ownerAgentId: null, status: 'learning', tools: ['proposal-gen', 'ledger'], order: 2 },
  { id: 'skill-hooks', name: '훅 작성', category: 'Content', description: '플랫폼별로 맞춘 숏폼 훅과 캡션.', ownerAgentId: 'social-agent', status: 'live', tools: ['postly'], order: 3 },
  { id: 'skill-ugc', name: 'UGC 생성', category: 'Content', description: '광고용 UGC 변형을 생성합니다 (Veo / Sora / Kling).', ownerAgentId: 'adsmith-creative', status: 'live', tools: ['adsmith'], order: 4 },
  { id: 'skill-edit', name: '영상 편집', category: 'Content', description: '릴스와 하이라이트 클립을 프로그램으로 편집합니다.', ownerAgentId: 'reelkit-editor', status: 'live', tools: ['reelkit'], order: 5 },
  { id: 'skill-schedule', name: '교차 게시 예약', category: 'Content', description: '연결된 모든 플랫폼에 대기열로 넣고 게시합니다.', ownerAgentId: 'postly-publisher', status: 'live', tools: ['postly'], order: 6 },
  { id: 'skill-triage', name: '받은편지함 분류', category: 'Ops', description: '받은편지함 4개를 업무 / 개인 / 기타로 나누고 우선순위를 표시합니다.', ownerAgentId: 'gmail-worker', status: 'live', tools: ['gmail'], order: 7 },
  { id: 'skill-dm', name: 'DM 관리', category: 'Ops', description: 'Instagram과 WhatsApp DM을 처음부터 끝까지 처리합니다.', ownerAgentId: 'comms-agent', status: 'live', tools: ['dmflow', 'whatsapp'], order: 8 },
  { id: 'skill-retrieval', name: '지식 검색', category: 'Ops', description: 'G-Brain 하이브리드 검색으로 모든 에이전트가 하나의 기억을 공유합니다.', ownerAgentId: 'conductor', status: 'live', tools: ['gbrain'], order: 9 },
  { id: 'skill-reconcile', name: '결제 대사', category: 'Ops', description: 'Stripe와 PayKit 전반의 지급을 고객과 맞춥니다.', ownerAgentId: null, status: 'planned', tools: ['stripe', 'paykit'], order: 10 },
  { id: 'skill-attribution', name: '매출 추적', category: 'Ops', description: 'Trakyo로 콘텐츠와 통화를 성사된 매출에 연결합니다.', ownerAgentId: null, status: 'planned', tools: ['trakyo', 'ghl'], order: 11 },
];

// A deterministic xorshift stream seeded from a string (no Math.random), so the
// seeded run history is stable across re-seeds.
function seedRand(str: string): () => number {
  let h = 2166136261 >>> 0;
  for (const c of str) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return () => {
    h ^= h << 13; h >>>= 0;
    h ^= h >> 17;
    h ^= h << 5; h >>>= 0;
    return (h >>> 0) / 4294967295;
  };
}

// Leads/specialists run on the bigger model, workers on the cheaper one, so the
// cost analysis has real spread. About a third of agents are pure-connector and
// carry no token cost.
const RUN_MODEL_BY_TIER: Record<string, string> = {
  lead: 'claude-sonnet-5',
  specialist: 'claude-sonnet-5',
  worker: 'claude-haiku-4.5',
};

/**
 * Seeded agent-run history so /agents shows live runtimes and estimated spend
 * out of the box (demo-first). Stable ids (`seed-run-*`) keep re-seeds
 * idempotent and let the operator's own real runs coexist. Real token usage
 * flows in through lib/agents/runtime as agents actually run.
 */
function seededAgentRuns(agentList: Agent[]): AgentRun[] {
  const now = Date.now();
  const runs: AgentRun[] = [];
  for (const a of agentList) {
    const rnd = seedRand(`runs:${a.id}`);
    const count = 5 + Math.floor(rnd() * 10); // 5..14 runs each
    const usesModel = rnd() > 0.3; // ~2/3 of agents bill an LLM
    const model = RUN_MODEL_BY_TIER[a.tier] ?? 'claude-sonnet-5';
    for (let i = 0; i < count; i++) {
      const startedAt = new Date(now - rnd() * 20 * 86_400_000).toISOString(); // within ~3 weeks
      const durMs = 400 + Math.floor(rnd() * 7000);
      const finishedAt = new Date(Date.parse(startedAt) + durMs).toISOString();
      const ok = rnd() > 0.08;
      let tokensIn: number | null = null;
      let tokensOut: number | null = null;
      let runModel: string | null = null;
      let costUsd: number | null = null;
      if (usesModel) {
        tokensIn = 800 + Math.floor(rnd() * 14000);
        tokensOut = 200 + Math.floor(rnd() * 4000);
        runModel = model;
        costUsd = Math.round(runCostUsd(tokensIn, tokensOut, runModel) * 1e6) / 1e6;
      }
      runs.push({
        id: `seed-run-${a.id}-${i}`,
        agentId: a.id,
        startedAt,
        finishedAt,
        ok,
        summary: ok ? `${a.name} 실행을 완료했습니다.` : `${a.name} 실행이 실패해 다시 시도했습니다.`,
        model: runModel,
        tokensIn,
        tokensOut,
        costUsd,
      });
    }
  }
  return runs;
}

// --- Trading (Robinhood agentic account) -------------------------------------
// Seeded snapshot so /trading is alive before a real agent feeds it. Source
// 'seed' marks it as dummy; a live push (source 'robinhood') supersedes it.
const TRADING_AT = '2026-08-13T15:00:00.000Z';
const INDIV = { accountId: 'individual', accountLabel: 'Individual' };
const AGENTIC = { accountId: 'agentic', accountLabel: 'Agentic' };

const tradingSnapshots: TradingAccountSnapshot[] = [
  { ...INDIV, capturedAt: TRADING_AT, accountValueUsd: 10250.0, buyingPowerUsd: 2960.0, cashUsd: 2960.0, dayPnlUsd: 130.0, totalPnlUsd: 250.0, source: 'seed' },
  { ...AGENTIC, capturedAt: TRADING_AT, accountValueUsd: 1040.0, buyingPowerUsd: 420.0, cashUsd: 420.0, dayPnlUsd: 12.0, totalPnlUsd: 40.0, source: 'seed' },
];
// A few hours of agentic account value so the graph has a shape before a real
// agent has fed anything. Source 'seed' marks the whole series as dummy.
const tradingHistory: TradingAccountSnapshot[] = [
  { ...AGENTIC, capturedAt: '2026-08-13T11:00:00.000Z', accountValueUsd: 1000.0, buyingPowerUsd: 1000.0, cashUsd: 1000.0, dayPnlUsd: 0, totalPnlUsd: 0, source: 'seed' },
  { ...AGENTIC, capturedAt: '2026-08-13T12:00:00.000Z', accountValueUsd: 1004.7, buyingPowerUsd: 604.7, cashUsd: 604.7, dayPnlUsd: 4.7, totalPnlUsd: 4.7, source: 'seed' },
  { ...AGENTIC, capturedAt: '2026-08-13T13:00:00.000Z', accountValueUsd: 1021.9, buyingPowerUsd: 418.5, cashUsd: 418.5, dayPnlUsd: 21.9, totalPnlUsd: 21.9, source: 'seed' },
  { ...AGENTIC, capturedAt: '2026-08-13T14:00:00.000Z', accountValueUsd: 1016.4, buyingPowerUsd: 418.5, cashUsd: 418.5, dayPnlUsd: 16.4, totalPnlUsd: 16.4, source: 'seed' },
];
const tradingPositions: TradingPosition[] = [
  { ...INDIV, capturedAt: TRADING_AT, symbol: 'NVDA', quantity: 4, avgCostUsd: 902.1, marketValueUsd: 3812.6, unrealizedPnlUsd: 204.2 },
  { ...INDIV, capturedAt: TRADING_AT, symbol: 'AAPL', quantity: 8, avgCostUsd: 214.35, marketValueUsd: 1760.4, unrealizedPnlUsd: 45.6 },
  { ...INDIV, capturedAt: TRADING_AT, symbol: 'MSFT', quantity: 3, avgCostUsd: 428.0, marketValueUsd: 1301.7, unrealizedPnlUsd: 17.7 },
  { ...INDIV, capturedAt: TRADING_AT, symbol: 'VOO', quantity: 5, avgCostUsd: 82.9, marketValueUsd: 413.79, unrealizedPnlUsd: -1.71 },
];
const agenticPositions: TradingPosition[] = [
  { ...AGENTIC, capturedAt: TRADING_AT, symbol: 'SPY', quantity: 1, avgCostUsd: 601.4, marketValueUsd: 624.7, unrealizedPnlUsd: 23.3 },
];
const tradingActivity: TradeActivity[] = [
  { id: 'tr-seed-5', at: '2026-08-13T14:58:00.000Z', ...AGENTIC, agent: 'Markets Agent', action: 'buy', symbol: 'SPY', quantity: 1, priceUsd: 601.4, rationale: '놀고 있는 매수 여력을 인덱스 슬리브에 넣어 둡니다.', status: 'filled' },
  { id: 'tr-seed-4', at: '2026-08-13T13:20:00.000Z', ...AGENTIC, agent: 'Markets Agent', action: 'sell', symbol: 'TSLA', quantity: 2, priceUsd: 240.8, rationale: '강세에 일부 매도; 근거가 실현돼 현금으로 전환.', status: 'filled' },
  { id: 'tr-seed-3', at: '2026-08-12T18:05:00.000Z', ...INDIV, agent: 'Operator (manual)', action: 'buy', symbol: 'AAPL', quantity: 4, priceUsd: 213.9, rationale: '핵심 보유 종목에 분할 매수.', status: 'filled' },
  { id: 'tr-seed-2', at: '2026-08-12T15:41:00.000Z', ...AGENTIC, agent: 'Markets Agent', action: 'buy', symbol: 'VOO', quantity: 5, priceUsd: 83.02, rationale: '놀고 있는 매수 여력을 인덱스 슬리브에 넣어 둡니다.', status: 'filled' },
  { id: 'tr-seed-1', at: '2026-08-11T16:12:00.000Z', ...INDIV, agent: 'Operator (manual)', action: 'buy', symbol: 'MSFT', quantity: 3, priceUsd: 428.0, rationale: '승인된 관심 종목에 따라 신규 매수.', status: 'filled' },
];


// --- Proposals -----------------------------------------------------------
// Client proposals are the one table this demo ships EMPTY on purpose: a real
// row carries a client's name, the deal size, and the share code that opens
// the page. Create them from the OS instead (they land with origin 'os', which
// a re-seed leaves alone). The export and its type stay so every reader of the
// Deliverables folder keeps compiling.
export const SEEDED_PROPOSALS: Proposal[] = [];

/**
 * Proposals, re-applied on every boot rather than only when the table is empty.
 *
 * getDb()'s guard fires when a table has NO rows, which back-fills a new table
 * but never propagates an EDIT to an existing one. So correcting a client name
 * or adding a proposal would land on a fresh clone and silently never reach the
 * host, whose database already has the old rows. Re-syncing here is cheap (a
 * handful of rows) and safe: seeded rows are replaced by id, and anything
 * Alex adds through the OS carries origin 'os' and is left alone.
 */
export function syncSeededProposals(db: FounderDb): void {
  for (const p of SEEDED_PROPOSALS) db.proposals.insert(p);
  db.proposals.deleteSeededNotIn(SEEDED_PROPOSALS.map((p) => p.id));
}

/**
 * Scheduled jobs that ship with the OS, starting with a 9am sweep of every
 * inbox, WhatsApp and Slack that lands as one ranked report. Seeded rather than
 * hand-created so they survive a fresh database and appear on every install; the runner is the tick in
 * instrumentation.ts -> POST /api/cron/tick.
 */
export const seededCrons: AgentCron[] = [
  {
    id: 'cron-comms-digest-0900',
    agentId: 'comms-digest',
    schedule: '0 9 * * *',
    description: '아침 커뮤니케이션 보고서: 이메일, WhatsApp, Slack의 24시간을 답장 필요 순으로 정리',
    enabled: true,
    createdAt: '2026-08-18T00:00:00.000Z',
  },
  {
    id: 'cron-plaud-ingest-30m',
    agentId: 'sales-calls-data',
    schedule: '*/30 * * * *',
    description: '새로 전사된 Plaud 녹음을 모두 G-Brain에 저장하고(요약 + 전사본) 할 일은 클레임 저장소에 저장; LLM 없이 순수 코드',
    enabled: true,
    createdAt: '2026-08-26T00:00:00.000Z',
  },
  // Every cron below maps onto an agent whose run genuinely does the described
  // check. Each description says what that agent ACTUALLY does, not the job it
  // was proposed for: a cron fires the agent, it does not carry its own
  // instructions. Jobs with no agent behind them (nightly green check, offsite
  // backup, model-usage posture) belong in the host's own routine runner, so
  // they are deliberately absent rather than seeded as rows that would never
  // work.
  {
    id: 'cron-stack-monitor-0700',
    agentId: 'stack-monitor',
    schedule: '0 7 * * *',
    description: '로컬 스택 점검: 커맨드 센터, 작업자 풀, G-Brain, OS가 호출하는 CLI',
    enabled: true,
    createdAt: '2026-08-18T00:00:00.000Z',
  },
  {
    id: 'cron-payments-pulse-0800',
    agentId: 'payments-pulse',
    schedule: '0 8 * * *',
    description: '결제 수단 연결 확인, Stripe 잔액과 최근 결제',
    enabled: true,
    createdAt: '2026-08-18T00:00:00.000Z',
  },
  {
    id: 'cron-client-onboarding-0830',
    agentId: 'client-onboarding',
    schedule: '30 8 * * *',
    description: '온보딩 SOP 준비 상태: Ledger 트리거와 그것이 만드는 Slack 워크스페이스',
    enabled: true,
    createdAt: '2026-08-18T00:00:00.000Z',
  },
  {
    id: 'cron-crm-pulse-0900',
    agentId: 'crm-pulse',
    schedule: '0 9 * * 1-5',
    description: 'Vantage와 Launchpad Cohort 전반의 Ledger 거래 파이프라인',
    enabled: true,
    createdAt: '2026-08-18T00:00:00.000Z',
  },
  {
    id: 'cron-social-agent-1800',
    agentId: 'social-agent',
    schedule: '0 18 * * *',
    description: 'Postly 게시와 Adsmith 광고 생성, 저녁 전에 점검',
    enabled: true,
    createdAt: '2026-08-18T00:00:00.000Z',
  },
];

/**
 * Bump this whenever the seed's CONTENT changes in a way production must see,
 * above all a removal.
 *
 * getDb() otherwise only seeds when a table is empty, so on a long-lived
 * install — where every table has been full for months — the seed would never
 * run at all: rows deleted from this file went on being served in production
 * because nothing ever re-ran the seed. The stamp forces exactly one re-seed
 * per change.
 */
export const SEED_VERSION = '2026-09-30-alex-first-name';

export function seedDatabase(db: FounderDb): void {
  // INSERT OR REPLACE in every repo makes re-seeding idempotent by id.
  for (const c of seededCrons) db.agentCrons.insert(c);
  for (const d of departments) db.departments.insert(d);
  for (const a of agents) db.agents.insert(a);
  // The roster IS the runtime: rows that left the roster leave the DB too,
  // and departments that left the operating model go with them.
  db.agents.deleteWhereIdNotIn(agents.map((a) => a.id));
  db.departments.deleteWhereIdNotIn(departments.map((d) => d.id));
  for (const p of people) db.people.insert(p);
  db.people.deleteWhereIdNotIn(people.map((p) => p.id));
  for (const m of leadMagnets) db.leadMagnets.insert(m);
  db.leadMagnets.deleteWhereIdNotIn(leadMagnets.map((m) => m.id));
  for (const t of sopTasks) db.sopTasks.insert(t);
  db.sopTasks.deleteWhereIdNotIn(sopTasks.map((t) => t.id));
  db.tools.deleteWhereIdNotIn(tools.map((t) => t.id));
  for (const w of workflows) db.workflows.insert(w);
  db.workflows.deleteWhereIdNotIn(workflows.map((w) => w.id));
  for (const s of skills) db.skills.insert({ ...s, markdown: skillDoc(s) });
  db.skills.deleteWhereIdNotIn(skills.map((s) => s.id));
  for (const t of agentTasks) db.agentTasks.insert(t); // insert-by-id; user tasks coexist
  // Seeded run history (idempotent by id) so /agents shows runtimes + spend; the
  // operator's own real runs (uuid ids) coexist and add real token cost over time.
  for (const r of seededAgentRuns(agents)) db.agentRuns.insert(r);
  for (const t of tools) db.tools.insert(t);
  for (const r of roadmap) db.roadmap.insert(r);
  // A row that left the seed left the plan: prune it so retired work cannot
  // outlive its removal on a long-lived install.
  db.roadmap.deleteWhereIdNotIn(roadmap.map((r) => r.id));
  for (const m of metrics) db.metrics.insert(m);
  for (const d of domains) db.domains.insert(d);
  for (const p of PERSONAS) db.personas.insert(p);
  for (const p of phases) db.phases.insert(p);
  for (const a of socialAccounts) db.social.upsertAccount(a);
  for (const s of socialBaseline) db.social.insertSnapshot(s);
  for (const d of socialDms) db.social.upsertDm(d);
  for (const s of socialDmSnapshots) db.social.insertDmSnapshot(s);
  for (const m of socialDmMessages) db.social.upsertDmMessage(m);
  // Retired dummy email history leaves the DB on re-seed; the seeded
  // baseline is authoritative. Live-synced snapshots survive.
  db.emailList.deleteSeeded();
  for (const s of emailListBaseline) db.emailList.insertSnapshot(s);
  for (const p of socialPosts) db.socialPosts.enqueue(p);
  for (const c of funnelContacts) db.funnel.insertContact(c);
  for (const t of funnelTouches) db.funnel.insertTouch(t);
  syncSeededProposals(db);
  // Trading is the one seeded island that a re-seed must NOT touch once it is
  // real. /trading is fed by the Markets agent through
  // POST /api/trading/*, and the seeded placeholder trades were deliberately
  // evicted from that log. A SEED_VERSION bump re-runs this whole function, so
  // without this guard every retirement would drag the fake trades back in.
  // NB latestSnapshot() sorts by account VALUE, not recency, so it cannot
  // answer "is this real?" — ask whether ANY account has a non-seed source.
  const liveTrading = db.trading.latestSnapshots().some((t) => t.source !== 'seed');
  if (!liveTrading) {
    for (const h of tradingHistory) db.trading.recordSnapshot(h, []);
    db.trading.recordSnapshot(tradingSnapshots[0], tradingPositions);
    db.trading.recordSnapshot(tradingSnapshots[1], agenticPositions);
    for (const a of tradingActivity) db.trading.recordActivity(a);
  }

  // Last: a half-finished seed must not claim to be up to date.
  db.meta.set('seed_version', SEED_VERSION);
}
