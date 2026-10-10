import type { ConnectorStatus } from '@/lib/connectors/types';
import {
  INTEGRATION_CATEGORIES,
  type Integration,
  type IntegrationCategory,
} from '@/lib/schemas';

/**
 * The connections marketplace catalog. demo-first: a rich, honest catalog of
 * popular tools. `connectorId` ties an entry to a real connector so its live
 * "connected" state is never faked; everything else reads as "not connected"
 * with a Connect affordance. Logos resolve from `slug` via lib/brand-logos
 * (simple-icons + a few hand-authored marks + intentional lettermarks).
 */
export const INTEGRATIONS: Integration[] = [
  // Communication
  { slug: 'slack', name: 'Slack', tagline: '채널 & DM', category: 'Communication', connectorId: 'slack', popular: true, envKeys: ['SLACK_BOT_TOKEN'] },
  { slug: 'gmail', name: 'Gmail', tagline: '이메일 보내기 & 읽기', category: 'Communication', connectorId: 'email', popular: true, envKeys: [] },
  { slug: 'whatsapp', name: 'WhatsApp', tagline: '메시지 & 일괄 발송', category: 'Communication', connectorId: 'whatsapp', envKeys: [] },
  { slug: 'discord', name: 'Discord', tagline: '서버 & 채널', category: 'Communication' },
  { slug: 'telegram', name: 'Telegram', tagline: '채팅 & 봇', category: 'Communication' },
  { slug: 'zoom', name: 'Zoom', tagline: '회의 & 녹화', category: 'Communication', popular: true },
  { slug: 'manychat', name: 'ManyChat', tagline: 'IG DM 자동화', category: 'Communication', connectorId: 'manychat', envKeys: ['MANYCHAT_API_KEY'] },

  // Productivity
  { slug: 'airtable', name: 'Airtable', tagline: '베이스 & 레코드', category: 'Productivity', popular: true },
  { slug: 'googlesheets', name: 'Google Sheets', tagline: '스프레드시트 읽기 & 쓰기', category: 'Productivity' },
  { slug: 'googledocs', name: 'Google Docs', tagline: '문서 만들기 & 편집', category: 'Productivity' },
  { slug: 'clickup', name: 'ClickUp', tagline: '문서, 작업 & 목표', category: 'Productivity' },
  { slug: 'trello', name: 'Trello', tagline: '보드 & 카드', category: 'Productivity' },
  { slug: 'coda', name: 'Coda', tagline: '앱처럼 동작하는 문서', category: 'Productivity' },
  { slug: 'wispr', name: 'Wispr Flow', tagline: '음성 받아쓰기', category: 'Productivity', connectorId: 'wispr', envKeys: [] },

  // CRM & Sales
  { slug: 'hubspot', name: 'HubSpot', tagline: '연락처 & 거래', category: 'CRM & Sales', popular: true },
  { slug: 'salesforce', name: 'Salesforce', tagline: '계정 & 파이프라인', category: 'CRM & Sales' },
  { slug: 'attio', name: 'Attio', tagline: '데이터 기반 CRM', category: 'CRM & Sales', connectorId: 'attio', envKeys: ['ATTIO_API_KEY'] },
  { slug: 'zendesk', name: 'Zendesk', tagline: '티켓 & 지원', category: 'CRM & Sales' },
  { slug: 'intercom', name: 'Intercom', tagline: '채팅 & 고객 생애주기', category: 'CRM & Sales' },
  { slug: 'gohighlevel', name: 'GoHighLevel', tagline: 'LC 파이프라인 & 연락처', category: 'CRM & Sales', connectorId: 'ghl', envKeys: ['GHL_API_KEY', 'GHL_LOCATION_ID'] },

  // Developer
  { slug: 'github', name: 'GitHub', tagline: '저장소, 이슈 & PR', category: 'Developer', popular: true },
  { slug: 'linear', name: 'Linear', tagline: '이슈 & 프로젝트', category: 'Developer' },
  { slug: 'jira', name: 'Jira', tagline: '보드 & 티켓', category: 'Developer' },
  { slug: 'vercel', name: 'Vercel', tagline: '배포 & 로그', category: 'Developer' },
  { slug: 'sentry', name: 'Sentry', tagline: '오류 & 추적', category: 'Developer' },
  { slug: 'gitlab', name: 'GitLab', tagline: '저장소 & 파이프라인', category: 'Developer' },

  // Scheduling
  { slug: 'googlecalendar', name: 'Google Calendar', tagline: '일정 & 가능 시간', category: 'Scheduling', connectorId: 'calendar', popular: true, envKeys: [] },
  { slug: 'calendly', name: 'Calendly', tagline: '예약 링크', category: 'Scheduling' },
  { slug: 'caldotcom', name: 'Cal.com', tagline: '오픈 일정 예약', category: 'Scheduling' },
  { slug: 'googlemeet', name: 'Google Meet', tagline: '화상 통화', category: 'Scheduling' },

  // Finance
  { slug: 'stripe', name: 'Stripe', tagline: '결제 & 청구서', category: 'Finance', connectorId: 'payments', popular: true, envKeys: ['STRIPE_SECRET_KEY'] },
  { slug: 'stripe-vantage', name: 'Stripe · Vantage', tagline: 'Vantage 결제 & 청구서', category: 'Finance', connectorId: 'payments', envKeys: ['STRIPE_VANTAGE_KEY'] },
  { slug: 'quickbooks', name: 'QuickBooks', tagline: '장부 & 손익', category: 'Finance' },
  { slug: 'xero', name: 'Xero', tagline: '회계 & 청구', category: 'Finance' },
  { slug: 'paypal', name: 'PayPal', tagline: '결제 & 지급', category: 'Finance', envKeys: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'] },
  { slug: 'wise', name: 'Wise', tagline: '다중 통화 잔액', category: 'Finance' },
  { slug: 'plaid', name: 'Plaid', tagline: '은행 연결', category: 'Finance' },

  // Marketing
  { slug: 'mailchimp', name: 'Mailchimp', tagline: '이메일 캠페인', category: 'Marketing' },
  { slug: 'googleanalytics', name: 'Google Analytics', tagline: '트래픽 & 전환', category: 'Marketing' },
  { slug: 'meta', name: 'Meta Ads', tagline: '캠페인 & 오디언스', category: 'Marketing', connectorId: 'meta-ads', envKeys: ['META_ADS_ACCESS_TOKEN'] },
  { slug: 'beehiiv', name: 'beehiiv', tagline: '뉴스레터 & 구독자', category: 'Marketing', connectorId: 'beehiiv', envKeys: ['BEEHIIV_API_KEY'] },
  { slug: 'buffer', name: 'Buffer', tagline: '소셜 게시물 예약', category: 'Marketing' },
  { slug: 'hootsuite', name: 'Hootsuite', tagline: '소셜 관리', category: 'Marketing' },
  { slug: 'zernio', name: 'Zernio', tagline: '여러 플랫폼 동시 게시', category: 'Marketing', connectorId: 'zernio', envKeys: ['ZERNIO_API_KEY'] },
  { slug: 'trakyo', name: 'Trakyo', tagline: '자연 유입 추적', category: 'Marketing', connectorId: 'trakyo', envKeys: ['TRAKYO_API_KEY'] },
  { slug: 'fathom', name: 'Fathom', tagline: '통화용 AI 기록', category: 'CRM & Sales', connectorId: 'fathom', envKeys: ['FATHOM_API_KEY'] },
  { slug: 'plaud', name: 'Plaud', tagline: '대면 회의용 AI 녹음기', category: 'CRM & Sales', connectorId: 'plaud', envKeys: ['PLAUD_REFRESH_TOKEN'] },
  { slug: 'docusign', name: 'DocuSign', tagline: '계약 & 전자 서명', category: 'CRM & Sales', connectorId: 'docusign', envKeys: ['DOCUSIGN_INTEGRATION_KEY', 'DOCUSIGN_USER_ID', 'DOCUSIGN_ACCOUNT_ID', 'DOCUSIGN_PRIVATE_KEY_B64'] },

  // Storage
  { slug: 'googledrive', name: 'Google Drive', tagline: '파일 & 폴더', category: 'Storage' },
  { slug: 'dropbox', name: 'Dropbox', tagline: '동기화 & 공유', category: 'Storage' },
  { slug: 'box', name: 'Box', tagline: '콘텐츠 클라우드', category: 'Storage' },
  { slug: 'onedrive', name: 'OneDrive', tagline: 'Microsoft 파일', category: 'Storage' },
  { slug: 'obsidian', name: 'Obsidian', tagline: '마크다운 보관소', category: 'Storage', connectorId: 'obsidian', envKeys: [] },

  // AI & Automation
  { slug: 'openai', name: 'OpenAI', tagline: 'GPT 모델 & 임베딩', category: 'AI & Automation' },
  { slug: 'anthropic', name: 'Anthropic', tagline: 'Claude 모델', category: 'AI & Automation', popular: true },
  { slug: 'zapier', name: 'Zapier', tagline: '무엇이든 자동화', category: 'AI & Automation' },
  { slug: 'make', name: 'Make', tagline: '시각적 워크플로', category: 'AI & Automation' },
  { slug: 'n8n', name: 'n8n', tagline: '자체 호스팅 자동화', category: 'AI & Automation' },

  // Creative
  { slug: 'figma', name: 'Figma', tagline: '디자인 & 프로토타입', category: 'Creative', popular: true },
  { slug: 'canva', name: 'Canva', tagline: '템플릿 & 그래픽', category: 'Creative' },
  { slug: 'miro', name: 'Miro', tagline: '화이트보드 & 맵', category: 'Creative', connectorId: 'miro', envKeys: ['MIRO_ACCESS_TOKEN'] },
  { slug: 'loom', name: 'Loom', tagline: '화면 녹화', category: 'Creative', connectorId: 'loom', envKeys: [] },
  { slug: 'typeform', name: 'Typeform', tagline: '폼 & 설문', category: 'Creative' },
  { slug: 'arcads', name: 'Arcads', tagline: 'AI 영상 광고', category: 'Creative', connectorId: 'arcads', envKeys: ['ARCADS_BASIC_AUTH'] },
];

export type CatalogEntry = Integration & { connected: boolean; keySaved: boolean };

/** The env var names the connect flow may write for an entry. Explicit
 *  envKeys win; no envKeys = a generic <SLUG>_API_KEY; [] = guidance only
 *  (the tool connects through something other than a pasted key). */
export function connectKeysFor(entry: Integration): string[] {
  if (entry.envKeys) return entry.envKeys;
  return [`${entry.slug.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_API_KEY`];
}

/** Merge live connector state onto the catalog. `connected` is true only when a
 *  linked connector actually reports 'connected' — never faked. `keySaved`
 *  means every connect-flow key for the entry sits in .env.local (pass a fresh
 *  readEnvLocal()); a saved key on a connector-less tile shows as stored, not
 *  connected. */
export function connectionCatalog(
  statuses: ConnectorStatus[],
  savedEnv: Record<string, string> = {},
): CatalogEntry[] {
  const byId = new Map(statuses.map((s) => [s.id, s]));
  return INTEGRATIONS.map((i) => {
    const keys = connectKeysFor(i);
    return {
      ...i,
      connected: i.connectorId ? byId.get(i.connectorId)?.state === 'connected' : false,
      keySaved: keys.length > 0 && keys.every((k) => Boolean(savedEnv[k])),
    };
  });
}

/** Catalog grouped by category, in the canonical category order, skipping any
 *  category with no tools. */
export function integrationsByCategory(
  entries: Integration[] = INTEGRATIONS,
): Map<IntegrationCategory, Integration[]> {
  const out = new Map<IntegrationCategory, Integration[]>();
  for (const cat of INTEGRATION_CATEGORIES) {
    const tools = entries.filter((i) => i.category === cat);
    if (tools.length) out.set(cat, tools);
  }
  return out;
}
