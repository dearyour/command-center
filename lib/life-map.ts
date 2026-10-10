/**
 * Alex's life map: the radial taxonomy at the heart of the OS.
 * Center = Alex's life; ring 1 = color-coded life areas; ring 2 = the
 * modules inside each area. Communication additionally carries the contact
 * tier system — the numbered/colored response-priority ladder for people.
 *
 * This is the one place colors enter the otherwise black & white OS:
 * each life area owns a hue, and everything underneath inherits it.
 */
import type { LifeMap, LifeMapNode } from '@/lib/schemas';

export type LifeModule = { id: string; label: string; detail: string };

export type LifeArea = {
  id: string;
  label: string;
  color: string;
  detail: string;
  modules: LifeModule[];
  agents: string[]; // RuntimeAgent ids working this area
  brainFolders: string[]; // brain-store folders feeding this area
  departmentIds: string[]; // seeded departments that roll up to this area
};

export const LIFE_AREAS: LifeArea[] = [
  {
    id: 'marketing',
    label: '마케팅',
    color: '#f59e0b',
    detail: '관심을 얻는 모든 것.',
    modules: [
      { id: 'content', label: '콘텐츠', detail: 'IG/TikTok/YT/X 게시물, 대본, 크리에이티브.' },
      { id: 'email', label: '이메일', detail: '캠페인과 시퀀스.' },
      { id: 'newsletter', label: '뉴스레터', detail: '내 구독자에게 정기적으로 보내는 발송.' },
      { id: 'sms', label: 'SMS', detail: '문자 일괄 발송과 알림.' },
      { id: 'editing', label: '편집', detail: '컷 편집, 자막, 후반 작업.' },
    ],
    agents: ['social-agent', 'postly-publisher', 'adsmith-creative', 'reelkit-editor', 'renderly-creative', 'dmflow-mcp', 'social-pulse'],
    brainFolders: ['media', 'writing', 'ideas'],
    departmentIds: ['dept-marketing-growth'],
  },
  {
    id: 'sales',
    label: '영업',
    color: '#ef4444',
    detail: '거래, 파이프라인, 매출로 이어지는 관계.',
    modules: [
      { id: 'pipeline', label: '파이프라인', detail: '진행 중인 거래와 단계.' },
      { id: 'crm', label: 'CRM', detail: '사람, 회사, 계정 이력.' },
      { id: 'follow-up', label: '후속 조치', detail: '다음 행동과 알림.' },
      { id: 'offers', label: '제안', detail: '제안서, 가격, 성사 경로.' },
    ],
    agents: [
      'sales-agent',
      'crm-pulse',
      'launchpad-cohort-sales',
      'vantage-sales',
      'paykit-sales',
      'vantage-paykit',
      'stripe-sales',
      'processor-confirmation',
      'flexpay-financing',
      'sales-calls-data',
    ],
    brainFolders: ['people', 'companies', 'hiring'],
    departmentIds: ['dept-sales'],
  },
  {
    id: 'finances',
    label: '재무',
    color: '#22c55e',
    detail: '들어오는 돈, 나가는 돈, 모든 결제 수단.',
    modules: [
      { id: 'payments', label: '결제', detail: 'Stripe + 결제 대행사 목록.' },
      { id: 'invoicing', label: '청구', detail: '누가 얼마를 내야 하는지.' },
      { id: 'subscriptions', label: '구독', detail: '반복 매출과 이탈.' },
      { id: 'bookkeeping', label: '장부', detail: '분류, 대사 완료, 세금 신고 준비.' },
    ],
    agents: ['payments-pulse'],
    brainFolders: ['companies'],
    departmentIds: ['dept-finance'],
  },
  {
    id: 'communication',
    label: '커뮤니케이션',
    color: '#3b82f6',
    detail: '모든 사람, 모든 채널, 하나의 우선순위 사다리.',
    modules: [
      {
        id: 'client-management',
        label: '고객 관리',
        detail: '응답 등급이 붙은 사람들 — 누구에게 바로 답해야 하는지.',
      },
      { id: 'inbox', label: '받은편지함', detail: 'IMAP 받은편지함 4개 통합.' },
      { id: 'whatsapp', label: 'WhatsApp', detail: '로컬 ChatStorage의 대화.' },
      { id: 'slack', label: 'Slack', detail: '워크스페이스 메시지와 멘션.' },
      { id: 'meetings', label: '회의', detail: '메모와 후속 조치.' },
    ],
    agents: ['comms-agent', 'gmail-worker', 'whatsapp-worker', 'slack-worker'],
    brainFolders: ['inbox', 'meetings', 'people'],
    departmentIds: ['dept-comms'],
  },
  {
    id: 'clients',
    label: '고객',
    color: '#14b8a6',
    detail: '모든 고객의 온보딩과 관리.',
    modules: [
      { id: 'roster', label: '명단', detail: '지금 고객인 사람, 사업별로.' },
      { id: 'onboarding', label: '온보딩', detail: '계약 성사부터 킥오프까지 빠짐없이.' },
      { id: 'service', label: '서비스', detail: '정기 점검 주기와 산출물 추적.' },
      { id: 'renewals', label: '갱신', detail: '확장과 갱신 시점.' },
    ],
    agents: ['client-roster', 'client-onboarding', 'client-success'],
    brainFolders: ['people', 'companies'],
    departmentIds: ['dept-clients'],
  },
  {
    id: 'knowledge',
    label: '지식',
    color: '#a855f7',
    detail: 'G-Brain: 마크다운, 벡터, 기억 검색.',
    modules: [
      { id: 'brain-store', label: '브레인 저장소', detail: '디스크의 마크다운 원본.' },
      { id: 'vector-db', label: '벡터 DB', detail: '청크 → 임베딩 → pgvector.' },
      { id: 'prompts', label: '프롬프트', detail: '재사용 가능한 프롬프트 라이브러리.' },
      { id: 'sources', label: '자료', detail: '참고 자료와 출처.' },
    ],
    agents: ['data-agent', 'markdown-auditor', 'vector-auditor', 'notion-sync', 'brain-librarian'],
    brainFolders: ['concepts', 'prompts', 'sources', 'archive'],
    departmentIds: ['dept-tech'],
  },
  {
    id: 'operations',
    label: '운영',
    color: '#fafafa',
    detail: '기계를 돌리는 기계.',
    modules: [
      { id: 'agents', label: '에이전트', detail: '명단과 조직 구조.' },
      { id: 'automations', label: '자동화', detail: '예약 작업과 자가 복구 작업.' },
      { id: 'infra', label: '인프라', detail: '로컬 스택, 포트, 전용 호스트 대상.' },
      { id: 'hiring', label: '채용', detail: '후보자와 역할.' },
    ],
    // dept-tech rolls up to knowledge first (lifeAreaForDepartment takes the
    // first match); operations still owns the conductor + stack agents.
    agents: ['conductor', 'stack-monitor'],
    brainFolders: ['org', 'projects', 'hiring'],
    departmentIds: ['dept-tech'],
  },
];

export type ContactTier = {
  tier: number;
  label: string;
  color: string;
  respond: string;
  tags: string[];
};

/**
 * The response-priority ladder for people Alex talks to.
 * 1 = red (clients & students), 2 = yellow (brand), 3 = green (personal).
 * Specific people get overrides via the contact_tags table.
 */
export const CONTACT_TIERS: ContactTier[] = [
  { tier: 1, label: '우선순위 1', color: '#ef4444', respond: '즉시', tags: ['client', 'student'] },
  { tier: 2, label: '우선순위 2', color: '#eab308', respond: '당일', tags: ['brand', 'partner', 'lead'] },
  { tier: 3, label: '우선순위 3', color: '#22c55e', respond: '여유 있을 때', tags: ['personal', 'friend', 'community'] },
];

export function lifeAreaForDepartment(departmentId: string): LifeArea | null {
  return LIFE_AREAS.find((a) => a.departmentIds.includes(departmentId)) ?? null;
}

export function buildLifeMap(): LifeMap {
  const nodes: LifeMapNode[] = [
    {
      id: 'center',
      type: 'center',
      label: 'Alex의 삶',
      color: '#fafafa',
      parent: null,
      detail: '중심. 모든 것이 이 주위를 돈다.',
      agents: [],
      brainFolders: [],
    },
  ];
  const edges: LifeMap['edges'] = [];

  for (const area of LIFE_AREAS) {
    nodes.push({
      id: area.id,
      type: 'area',
      label: area.label,
      color: area.color,
      parent: 'center',
      detail: area.detail,
      agents: area.agents,
      brainFolders: area.brainFolders,
    });
    edges.push({ source: 'center', target: area.id });

    for (const mod of area.modules) {
      const id = `${area.id}/${mod.id}`;
      nodes.push({
        id,
        type: 'module',
        label: mod.label,
        color: area.color,
        parent: area.id,
        detail: mod.detail,
        agents: [],
        brainFolders: [],
      });
      edges.push({ source: area.id, target: id });
    }
  }

  // the contact priority ladder hangs off client management
  for (const t of CONTACT_TIERS) {
    const id = `tier-${t.tier}`;
    nodes.push({
      id,
      type: 'tier',
      label: `T${t.tier} ${t.label}`,
      color: t.color,
      parent: 'communication/client-management',
      detail: `${t.tags.join(', ')} — ${t.respond} 응답`,
      agents: [],
      brainFolders: [],
    });
    edges.push({ source: 'communication/client-management', target: id });
  }

  return { nodes, edges };
}
