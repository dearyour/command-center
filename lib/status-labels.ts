/**
 * Korean display labels for the status enums the UI prints verbatim (agent
 * status, connector state, roadmap/task/post/trade states…). The stored values
 * stay English — they are keys compared all over the code — so only the text
 * a person reads goes through here. Unknown values fall through unchanged.
 */
const STATUS_KO: Record<string, string> = {
  // agents
  active: '가동 중',
  idle: '대기',
  training: '학습 중',
  planned: '계획됨',
  lead: '리드',
  specialist: '전문가',
  worker: '작업자',
  // connectors / tools
  connected: '연결됨',
  available: '사용 가능',
  not_configured: '설정 안 됨',
  error: '오류',
  // roadmap
  done: '완료',
  now: '진행 중',
  next: '다음',
  later: '나중',
  // tasks / board issues / runs
  open: '열림',
  doing: '진행 중',
  review: '검토',
  todo: '할 일',
  in_progress: '진행 중',
  in_review: '검토 중',
  blocked: '막힘',
  backlog: '백로그',
  running: '실행 중',
  succeeded: '성공',
  timed_out: '시간 초과',
  // posts / magnets / skills / workflows
  queued: '대기 중',
  published: '게시됨',
  scheduled: '예약됨',
  failed: '실패',
  live: '운영 중',
  draft: '초안',
  paused: '일시정지',
  archived: '보관됨',
  learning: '학습 중',
  suggested: '제안됨',
  // proposals / deals
  sent: '보냄',
  won: '성사',
  lost: '무산',
  // trades
  buy: '매수',
  sell: '매도',
  filled: '체결',
  pending: '대기 중',
  cancelled: '취소됨',
  rejected: '거부됨',
  // health
  ok: '정상',
  warn: '경고',
  fail: '실패',
  healthy: '정상',
  overdue: '지연',
  failing: '실패 중',
  degraded: '성능 저하',
  offline: '오프라인',
  online: '온라인',
  unknown: '알 수 없음',
  // trading verdicts
  signal: '신호',
  trim: '축소',
  'no-signal': '신호 없음',
  dropped: '제외',
};

/** Spend categories the ledger stores in English (lib/statements.ts rules). */
const CATEGORY_KO: Record<string, string> = {
  Advertising: '광고',
  Infrastructure: '인프라',
  Contractors: '외주',
  'CRM & Revenue': 'CRM & 매출',
  Software: '소프트웨어',
  Income: '수입',
  Uncategorized: '미분류',
  // integration catalog categories (lib/schemas INTEGRATION_CATEGORIES)
  Productivity: '생산성',
  Communication: '커뮤니케이션',
  'CRM & Sales': 'CRM & 영업',
  Developer: '개발',
  Scheduling: '일정',
  Finance: '재무',
  Marketing: '마케팅',
  Storage: '저장소',
  Knowledge: '지식',
  'AI & Automation': 'AI & 자동화',
  Creative: '크리에이티브',
};

export function categoryKo(value: string): string {
  return CATEGORY_KO[value] ?? value;
}

export function statusKo(value: string | null | undefined): string {
  if (value == null) return '';
  return STATUS_KO[value] ?? value;
}
