import { z } from 'zod';
import type { SopTask } from '@/lib/schemas';

/**
 * SOP playbooks — the rich breakdown behind each SOP task card in the /brain
 * knowledge graph. demo-first, real-ready: a repo-level lookup keyed by task id,
 * so it can later be swapped for engine/DB-backed data without touching the card.
 *
 * Each SOP decomposes into sub-skills (BREAKS INTO), stands on upstream work
 * (BUILDS ON), states what it displaces (WHAT IT REPLACES), and carries the
 * autonomy ladder (human-led → human-assisted → fully-autonomous), the human's
 * role, build notes, a runnable skill file, and a build status. Skill file
 * bodies are generated dummy SKILL.md for now (Alex: "dummy data for the
 * skills for now").
 */

export const AUTONOMY_LEVELS = ['human-led', 'human-assisted', 'fully-autonomous'] as const;
export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[number];

export const PLAYBOOK_STATUSES = ['not-started', 'in-development', 'ready-to-run'] as const;
export type PlaybookStatus = (typeof PLAYBOOK_STATUSES)[number];

export const SopPlaybookSchema = z.object({
  autonomy: z.enum(AUTONOMY_LEVELS),
  categoryPath: z.string().min(1),
  description: z.string().min(1),
  breaksInto: z.array(z.string().min(1)).min(1),
  buildsOn: z.array(z.string().min(1)),
  replaces: z.string().min(1),
  ladder: z.object({
    humanLed: z.string().min(1),
    humanAssisted: z.string().min(1),
    fullyAutonomous: z.string().min(1),
  }),
  theHuman: z.string().min(1),
  buildNotes: z.string().min(1),
  skill: z.object({
    name: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    blurb: z.string().min(1),
  }),
  status: z.enum(PLAYBOOK_STATUSES),
});
export type SopPlaybook = z.infer<typeof SopPlaybookSchema>;

/** A playbook plus the generated runnable skill file, ready for the card. */
export type ResolvedPlaybook = SopPlaybook & { skillMarkdown: string };

const AUTONOMY_LABEL: Record<AutonomyLevel, string> = {
  'human-led': '사람 주도',
  'human-assisted': '사람 보조',
  'fully-autonomous': '완전 자율',
};
export function autonomyLabel(level: AutonomyLevel): string {
  return AUTONOMY_LABEL[level];
}

const STATUS_LABEL: Record<PlaybookStatus, string> = {
  'not-started': '시작 전',
  'in-development': '개발 중',
  'ready-to-run': '실행 준비됨',
};
export function statusLabel(status: PlaybookStatus): string {
  return STATUS_LABEL[status];
}

// slug -> playbook. One authored entry per seeded SOP (35 total).
const PLAYBOOKS: Record<string, SopPlaybook> = {
  // ── TECH ────────────────────────────────────────────────────────────────
  'sop-conductor': {
    autonomy: 'fully-autonomous',
    categoryPath: 'TECH · 에이전트 전체 조율',
    description: '지시 하나를 모든 에이전트에게 보내고, 답변을 모으고, 응답하지 않은 대상을 드러냅니다.',
    breaksInto: ['target-resolver', 'fan-out-dispatch', 'reply-collector'],
    buildsOn: ['Agent Registry', 'Instance Health'],
    replaces: '연봉 $90-120k짜리 운영 리드가 Slack 앞에 서서 같은 지시를 열두 명에게 반복하는 일.',
    ladder: {
      humanLed: '에이전트마다 직접 DM으로 지시를 보내고 답변을 손으로 쫓아다닙니다.',
      humanAssisted: '컨덕터가 일괄 메시지와 대상 목록 초안을 쓰고, 보내기는 당신이 누릅니다.',
      fullyAutonomous: '대상을 정하고, 일괄 전송하고, 전송마다 기록을 남기고, 연락이 끊긴 대상을 보고합니다.',
    },
    theHuman: '지시 내용과 받을 대상은 당신이 정합니다. 전달과 책임은 컨덕터가 맡습니다.',
    buildNotes: '대상 지정이 핵심입니다. 보내기 전에 전체 에이전트인지 한 축인지 먼저 정합니다. 절대 조용히 실패하지 않으며, 60초가 지나도 응답 없는 대상은 보고서에 올립니다.',
    skill: { name: 'Fleet Broadcaster', slug: 'fleet-broadcaster', blurb: '지시를 전체 에이전트나 한 축에 보내고, 전송마다 기록을 남기며, 응답 없는 대상을 보고합니다.' },
    status: 'ready-to-run',
  },
  'sop-data-agent': {
    autonomy: 'fully-autonomous',
    categoryPath: 'TECH · 지식 검색',
    description: '세컨드 브레인 하이브리드 검색, 출처가 달린 문단과 정직한 대체 경로.',
    breaksInto: ['query-parser', 'hybrid-search', 'passage-ranker'],
    buildsOn: ['Vector Index', 'brain-store Sync'],
    replaces: "Slack에서 모두가 '그 문서 어디 있죠?'라고 묻는 연봉 $70k짜리 지식 관리자.",
    ladder: {
      humanLed: '브레인 저장소를 직접 grep 하면서 파일 이름이 기억나길 바랍니다.',
      humanAssisted: '후보 문단을 돌려주고, 실제로 답이 되는지는 당신이 판단합니다.',
      fullyAutonomous: '파싱하고, 검색하고, 순위를 매기고, 출처가 달린 문단만 돌려주며, 답할 수 없는 빈틈은 기록합니다.',
    },
    theHuman: '무엇이 사실인지는 당신이 책임집니다. 인용을 지어내지 않고, 답할 수 없는 것은 빈틈으로 기록합니다.',
    buildNotes: '출처를 절대 지어내지 않습니다: 인용하거나 아무것도 아니거나. Supabase가 일시정지되면 실패하지 말고 로컬 grep으로 대체합니다.',
    skill: { name: 'G-Brain Answerer', slug: 'gbrain-answerer', blurb: '세컨드 브레인을 하이브리드 검색해 출처가 달린 문단만 돌려주고, 지어내지 않습니다.' },
    status: 'ready-to-run',
  },
  'sop-markdown-auditor': {
    autonomy: 'fully-autonomous',
    categoryPath: 'TECH · 지식 위생',
    description: '브레인 저장소를 훑어 깨진 링크와 오래된 문서를 표시하고, 수정이 끝날 때까지 추적합니다.',
    breaksInto: ['link-checker', 'orphan-finder', 'frontmatter-linter'],
    buildsOn: ['brain-store Sync'],
    replaces: '결코 따라잡지 못하는 파트타임 지식 베이스 청소부.',
    ladder: {
      humanLed: '고객 앞에서 404가 떠야 깨진 링크를 알게 됩니다.',
      humanAssisted: '깨진 링크와 고아 문서를 나열하고, 정리는 당신이 합니다.',
      fullyAutonomous: '모든 파일을 훑고, 폴더마다 점수를 매기고, 수정이 끝날 때까지 추적합니다.',
    },
    theHuman: '건강하다는 기준은 당신이 정합니다. 에이전트는 규칙을 적용하고 점수를 보고합니다.',
    buildNotes: '폴더마다 점수를 매기는 편이 전체 숫자 하나보다 낫습니다. 가장 나쁜 문제부터 끝까지 해결하고, 표시만 하고 넘기지 않습니다.',
    skill: { name: 'Markdown Auditor', slug: 'markdown-auditor', blurb: '브레인 저장소를 훑어 깨진 위키 링크와 오래된 프런트매터를 표시하고 폴더마다 점수를 매깁니다.' },
    status: 'in-development',
  },
  'sop-vector-auditor': {
    autonomy: 'fully-autonomous',
    categoryPath: 'TECH · 인덱스 무결성',
    description: 'pgvector 임베딩이 브레인 저장소와 같도록 유지하고, 차이가 나면 다시 임베딩합니다.',
    breaksInto: ['db-waker', 'chunk-differ', 'reembed-trigger'],
    buildsOn: ['brain-store Sync', 'Supabase Project'],
    replaces: '임베딩 작업을 손으로 돌보는 데이터 엔지니어.',
    ladder: {
      humanLed: '검색이 조용히 아무것도 안 돌려줄 때까지 인덱스가 괜찮다고 생각합니다.',
      humanAssisted: '청크 차이를 보고하고, 다시 임베딩은 당신이 시작합니다.',
      fullyAutonomous: '일시정지된 DB를 깨우고, 개수를 비교하고, 차이 난 문서를 다시 임베딩하고, 이후 확인합니다.',
    },
    theHuman: '허용할 차이는 당신이 정합니다. 그 안에서 깨우고, 비교하고, 인덱스를 고칩니다.',
    buildNotes: '무료 등급 Supabase는 유휴 상태에서 일시정지됩니다. 비교하기 전에 깨우고 쿼리가 응답할 때까지 기다리세요. 그렇지 않으면 잘못된 0을 읽게 됩니다.',
    skill: { name: 'Vector Index Auditor', slug: 'vector-index-auditor', blurb: 'pgvector 청크 수를 브레인 저장소와 비교하고 차이가 나면 다시 임베딩합니다.' },
    status: 'in-development',
  },
  'sop-notion-sync': {
    autonomy: 'fully-autonomous',
    categoryPath: 'TECH · 소스 동기화',
    description: '공유된 Notion 페이지를 정리된 마크다운으로 지식 코어에 가져옵니다.',
    breaksInto: ['page-differ', 'block-normalizer', 'core-indexer'],
    buildsOn: ['Notion Integration Token'],
    replaces: 'Notion 문서를 지식 베이스에 손으로 복사해 붙여넣습니다.',
    ladder: {
      humanLed: '바뀐 게 생각날 때 Notion 페이지를 직접 내보냅니다.',
      humanAssisted: '바뀐 페이지를 표시하고, 가져오기는 당신이 합니다.',
      fullyAutonomous: '차이를 비교하고, 바뀐 부분을 가져오고, 마크다운으로 정리하고, 동기화 지점을 기록합니다.',
    },
    theHuman: '토큰이 볼 수 있는 페이지는 당신이 고릅니다. 그 페이지들을 계속 똑같이 유지합니다.',
    buildNotes: '동기화마다 지점을 기록해 다음 실행은 바뀐 부분만 가져옵니다. 인덱싱 전에 블록을 깔끔한 마크다운으로 정리합니다.',
    skill: { name: 'Notion Mirror', slug: 'notion-mirror', blurb: '공유된 Notion 페이지의 차이를 비교해 바뀐 블록을 지식 코어에 반영합니다.' },
    status: 'not-started',
  },
  'sop-stack-monitor': {
    autonomy: 'fully-autonomous',
    categoryPath: 'TECH · 인프라 모니터링',
    description: '모든 포트, tmux 세션, 필요한 실행 파일의 정직한 가동/다운 상태.',
    breaksInto: ['port-prober', 'session-checker', 'flap-detector'],
    buildsOn: [],
    replaces: '스택이 살아 있는지 보려고 터미널을 새로고침하는 SRE.',
    ladder: {
      humanLed: '아래쪽에서 뭔가 고장 나야 서비스가 죽은 걸 알게 됩니다.',
      humanAssisted: '현재 상태를 보고하고, 지난번과의 비교는 당신이 합니다.',
      fullyAutonomous: '확인하고, 정직한 상태를 기록하고, 켜졌다 꺼졌다 하는 것을 잡아내고, 다운되면 알립니다.',
    },
    theHuman: '무엇이 "정상"인지는 당신이 정합니다. 에이전트는 사실만 보고하며, 가짜 초록불은 절대 내지 않습니다.',
    buildNotes: '연결됐다고 꾸미지 않습니다. 지난 점검과 비교해 깜빡임을 잡고, 실제 상태 변화에만 알립니다.',
    skill: { name: 'Local Stack Watch', slug: 'local-stack-watch', blurb: '포트, tmux 세션, 실행 파일을 확인해 정직한 상태와 깜빡임을 보고합니다.' },
    status: 'ready-to-run',
  },

  // ── COMMUNICATIONS ────────────────────────────────────────────────────────
  'sop-comms-agent': {
    autonomy: 'fully-autonomous',
    categoryPath: '커뮤니케이션 · 피드 구성',
    description: 'Gmail, WhatsApp, Slack을 등급별로 정렬된 하나의 타임라인으로 합칩니다.',
    breaksInto: ['channel-collector', 'timeline-merger', 'urgency-ranker'],
    buildsOn: ['Gmail Triage', 'WhatsApp Monitor', 'Slack Digest'],
    replaces: '누가 답장을 기다리는지 기억하려고 앱 4개를 오가는 당신.',
    ladder: {
      humanLed: '앱을 하나씩 열어 보고 우선순위는 머릿속에 담아 둡니다.',
      humanAssisted: '에이전트가 채널을 합치고, 무엇이 급한지는 당신이 정합니다.',
      fullyAutonomous: '모으고, 중복을 없애고, 연락처별로 등급을 매기고, 답장 필요한 것을 위로 올립니다.',
    },
    theHuman: '당신은 피드를 보고 행동합니다. 행동할 가치가 있는 것이 묻히지 않게 해 줍니다.',
    buildNotes: '합치기 전에 채널 간 중복을 없앱니다. 정렬은 시간만이 아니라 연락처 등급이 좌우합니다.',
    skill: { name: 'Unified Feed Composer', slug: 'unified-feed-composer', blurb: '채널 3개를 하나의 등급별 타임라인으로 합치고 급한 항목을 위에 둡니다.' },
    status: 'ready-to-run',
  },
  'sop-gmail-worker': {
    autonomy: 'human-assisted',
    categoryPath: '커뮤니케이션 · 이메일 분류',
    description: '받은편지함 4개를 모두 읽고, 모든 스레드를 분류하고, 당신 말투로 답장 초안을 씁니다.',
    breaksInto: ['imap-reader', 'thread-classifier', 'reply-drafter'],
    buildsOn: ['IMAP Credentials', 'Voice Profile'],
    replaces: '매일 아침 받은편지함을 정리해 주는 연봉 4.5~5.5만 달러짜리 비서.',
    ladder: {
      humanLed: '받은편지함 4개를 직접 읽고 어디에 답했는지 잊어버립니다.',
      humanAssisted: '스레드를 분류하고 답장 초안을 쓰며, 보내기 전에 당신이 승인합니다.',
      fullyAutonomous: '참고용과 우리 쪽 대기는 정리하고, 당신의 판단이 필요한 것만 올립니다.',
    },
    theHuman: '모든 발송은 당신이 승인합니다. 당신의 허락 없이는 실제 스레드에 답장을 보내지 않습니다.',
    buildNotes: '말투가 전부입니다. 초안은 당신의 말투 파일을 따라야 봇처럼 들리지 않습니다. 고객 도메인 스레드는 고객 부서로도 보냅니다.',
    skill: { name: 'Inbox Triage', slug: 'inbox-triage', blurb: '받은편지함 4개의 스레드를 분류하고, 승인받을 답장 초안을 당신의 말투로 씁니다.' },
    status: 'in-development',
  },
  'sop-whatsapp-worker': {
    autonomy: 'human-assisted',
    categoryPath: '커뮤니케이션 · 채팅 모니터링',
    description: '로컬 채팅 600개 이상을 읽고, 돈과 마감 신호가 있는 LC·Vantage 팀 메시지를 골라 냅니다.',
    breaksInto: ['local-reader', 'sender-tagger', 'risk-flagger'],
    buildsOn: ['Full Disk Access'],
    replaces: '600개 채팅을 스크롤하면서 고객 질문을 놓치지 않았기를 바라는 일.',
    ladder: {
      humanLed: '왓츠앱을 스크롤하며 중요한 메시지가 지나가지 않았기를 바랍니다.',
      humanAssisted: '팀 채팅을 골라 내고 돈과 마감 항목을 표시합니다. 답장은 당신이 합니다.',
      fullyAutonomous: '읽고, 보낸 사람에 태그를 달고, 위험을 표시하고, 중요한 것만 피드에 올립니다.',
    },
    theHuman: '사람들에게 답하는 것은 당신입니다. 중요한 메시지가 나머지 600개에 묻히지 않도록 에이전트가 챙깁니다.',
    buildNotes: '읽기 전용이며 데이터는 기기 밖으로 나가지 않습니다. 읽으려면 전체 디스크 접근 권한이 필요하고, 없으면 멈추므로 자식 프로세스로 시간을 제한합니다.',
    skill: { name: 'WhatsApp Watcher', slug: 'whatsapp-watcher', blurb: '로컬 왓츠앱 저장소를 읽기 전용으로 읽고, 표시된 팀 메시지를 골라 냅니다.' },
    status: 'in-development',
  },
  'sop-slack-worker': {
    autonomy: 'fully-autonomous',
    categoryPath: '커뮤니케이션 · 슬랙 요약',
    description: '참여 중인 모든 채널을 요약하고, 멘션과 열린 질문을 따로 뽑아냅니다.',
    breaksInto: ['channel-lister', 'digest-writer', 'mention-extractor'],
    buildsOn: ['Slack Bot Token'],
    replaces: '당신에게 필요한 메시지 두 개를 찾으려고 모든 채널을 읽는 일.',
    ladder: {
      humanLed: '당신에게 필요한 한 개를 찾으려고 모든 채널을 읽습니다.',
      humanAssisted: '에이전트가 채널마다 요약하고, 당신은 요약을 훑어봅니다.',
      fullyAutonomous: '요약하고, 직접 멘션과 답 없는 질문을 짚어 내고, 피드에 올립니다.',
    },
    theHuman: '멘션에 답하는 것은 당신입니다. 에이전트는 당신이 그것을 놓치지 않도록 챙깁니다.',
    buildNotes: '멘션과 답 없는 질문은 일반 요약과 분리합니다. 이것들은 인지가 아니라 조치가 필요합니다.',
    skill: { name: 'Slack Digester', slug: 'slack-digester', blurb: '참여 채널을 요약하고 멘션과 답 없는 질문을 표시합니다.' },
    status: 'not-started',
  },

  // ── MARKETING / GROWTH ────────────────────────────────────────────────────
  'sop-social-agent': {
    autonomy: 'human-assisted',
    categoryPath: '마케팅 · 콘텐츠 파이프라인',
    description: '캘린더에서 브리프, 소재, 발행 대기열까지 가며 편집 승인을 거칩니다.',
    breaksInto: ['calendar-reader', 'creative-briefer', 'asset-qa'],
    buildsOn: ['Content Calendar', 'Brand Voice'],
    replaces: '크리에이터에게 소재를 쫓아다니는 월 $4-6k짜리 콘텐츠 코디네이터.',
    ladder: {
      humanLed: '크리에이터마다 하나씩 브리프를 보내고 대기열을 손으로 맞춥니다.',
      humanAssisted: '에이전트가 크리에이티브 워커에게 브리프를 보내고 소재를 검수합니다. 공개는 당신이 승인합니다.',
      fullyAutonomous: '캘린더에서 대기열까지 진행하며, 브랜드에 맞지 않는 소재는 이유와 함께 거부합니다.',
    },
    theHuman: 'Nadia Kapoor가 모든 공개를 승인합니다. 파이프라인이 대기열을 채우고, 사람이 관문을 엽니다.',
    buildNotes: '브랜드에 맞지 않으면 한 줄 이유와 함께 거부해서 수정이 빠르게 합니다. 출시된 것을 기록해 두면 내일 브리프가 더 나은 상태에서 시작합니다.',
    skill: { name: 'Content Pipeline Runner', slug: 'content-pipeline-runner', blurb: '캘린더를 브리프로 바꾸고, 돌아온 소재를 검수하며, 승인된 게시물을 대기열에 넣습니다.' },
    status: 'in-development',
  },
  'sop-postly-publisher': {
    autonomy: 'fully-autonomous',
    categoryPath: '마케팅 · 크로스 플랫폼 발행',
    description: '하나의 대기열에서 @alexx.ai의 모든 채널로 보내고, 채널마다 캡션을 맞춥니다.',
    breaksInto: ['caption-adapter', 'multi-publish', 'post-verifier'],
    buildsOn: ['Content Pipeline Runner', 'Postly API'],
    replaces: '같은 클립을 여섯 개 앱에 캡션만 조금씩 바꿔 손으로 다시 올리는 일.',
    ladder: {
      humanLed: '플랫폼마다 직접 업로드하고 캡션을 여섯 번 고쳐 씁니다.',
      humanAssisted: '에이전트가 캡션을 맞추고 게시합니다. 각 게시가 올라갔는지는 당신이 확인합니다.',
      fullyAutonomous: '여섯 곳에 모두 게시하고 확인하며, 실패하면 한 번 재시도한 뒤 표시합니다.',
    },
    theHuman: '게시물은 앞 단계에서 당신이 승인합니다. 그 이후 발행은 전부 기계적으로 진행됩니다.',
    buildNotes: '플랫폼별로 캡션을 맞춥니다(IG/TikTok/X/YouTube/LinkedIn/FB). 각 게시물 ID가 올라갔는지 확인하고, 한 번 재시도한 뒤 표시합니다.',
    skill: { name: 'Six-Platform Publisher', slug: 'six-platform-publisher', blurb: '플랫폼마다 캡션을 맞추고, Postly로 게시하며, 각 게시물이 올라갔는지 확인합니다.' },
    status: 'ready-to-run',
  },
  'sop-adsmith-creative': {
    autonomy: 'fully-autonomous',
    categoryPath: '마케팅 · UGC 크리에이티브',
    description: 'Vantage 광고 각도를 Veo, Sora, Kling의 UGC 배우 영상으로 만듭니다.',
    breaksInto: ['actor-generator', 'take-culler', 'variant-sheet'],
    buildsOn: ['Ad Brief'],
    replaces: '광고 각도 한 묶음마다 $2-3k짜리 UGC 촬영.',
    ladder: {
      humanLed: '크리에이터를 고용하고 각도 한 묶음마다 일주일을 기다립니다.',
      humanAssisted: '에이전트가 배우 테이크를 생성하고, 최종본은 당신이 고릅니다.',
      fullyAutonomous: '생성하고, 브리프에 맞지 않는 테이크를 걸러내고, 최종본을 렌더링한 뒤 변형 시트를 냅니다.',
    },
    theHuman: '후크와 오퍼는 당신이 정합니다. 에이전트는 그것을 테스트할 변형을 만듭니다.',
    buildNotes: '최종본을 렌더링하기 전에 브리프를 어기는 테이크를 걸러내세요. 컴퓨팅 비용이 가장 많이 드는 곳이 거기입니다. 최종본은 각도 이름으로 붙입니다.',
    skill: { name: 'UGC Variant Generator', slug: 'ugc-variant-generator', blurb: '광고 각도를 UGC 배우 변형으로 렌더링하고, 이름 붙은 변형 시트를 전달합니다.' },
    status: 'in-development',
  },
  'sop-reelkit-editor': {
    autonomy: 'fully-autonomous',
    categoryPath: '마케팅 · 숏폼 편집',
    description: '원본 영상을 플랫폼에 맞는 크롭으로 바꾸고, 자막을 박자에 맞춥니다.',
    breaksInto: ['whisper-transcribe', 'hook-picker', 'crop-exporter'],
    buildsOn: ['Source Footage'],
    replaces: '시간당 $50-70인 편집자가 릴스를 한 편씩 자르는 일.',
    ladder: {
      humanLed: '편집기에서 원본을 훑고 클립을 하나하나 손으로 자릅니다.',
      humanAssisted: '에이전트가 받아쓰기를 하고 후크를 제안합니다. 마무리 컷은 당신이 합니다.',
      fullyAutonomous: '받아쓰기하고, 후크를 고르고, 주제에 맞는 크롭을 렌더링하고, 자막 타이밍을 확인합니다.',
    },
    theHuman: '주제(LC 또는 Vantage)는 당신이 정합니다. 에이전트는 사양대로 컷을 만듭니다.',
    buildNotes: '내보내기 전에 자막이 박자에 맞는지 확인합니다. Whisper로 로컬에서 받아쓰기하며 업로드하지 않습니다.',
    skill: { name: 'Short-Form Cutter', slug: 'short-form-cutter', blurb: '원본을 받아쓰고, 후크를 고르고, 시간 맞춘 자막이 들어간 플랫폼 크롭을 렌더링합니다.' },
    status: 'in-development',
  },
  'sop-renderly-creative': {
    autonomy: 'fully-autonomous',
    categoryPath: '마케팅 · AI 비주얼',
    description: '크리에이티브 브리프에서 정지 이미지와 영상을 만들고, 골라낸 뒤 업스케일합니다.',
    breaksInto: ['model-picker', 'take-culler', 'upscaler'],
    buildsOn: ['Creative Brief'],
    replaces: '모든 비주얼에 드는 스톡 및 디자이너 예산.',
    ladder: {
      humanLed: '비주얼마다 직접 의뢰하거나 라이선스를 따로 구매합니다.',
      humanAssisted: '에이전트가 선택지를 만들고, 업스케일할 것은 당신이 고릅니다.',
      fullyAutonomous: '모델을 고르고, 사양대로 생성하고, 걸러내고, 우수작을 업스케일합니다.',
    },
    theHuman: '브리프는 당신이 씁니다. 에이전트는 거기에 맞는 모델을 골라 최종본을 전달합니다.',
    buildNotes: '업스케일 전에 가장 좋은 테이크로 좁히세요. 그 단계가 비용이 큽니다. 최종본에 브리프를 붙여 둡니다.',
    skill: { name: 'AI Visual Producer', slug: 'ai-visual-producer', blurb: '브리프에 맞는 Renderly 모델을 고르고, 생성하고, 걸러내고, 업스케일합니다.' },
    status: 'not-started',
  },
  'sop-dmflow-mcp': {
    autonomy: 'fully-autonomous',
    categoryPath: '마케팅 · DM 퍼널',
    description: '키워드 트리거에서 예약된 대화까지 이어지며, 뜨거운 리드는 영업팀에 넘깁니다.',
    breaksInto: ['keyword-watcher', 'flow-firer', 'intent-tagger'],
    buildsOn: ['DMFlow API', 'Trigger Keywords'],
    replaces: '매일 같은 DM 답장을 복사해 붙여넣는 소셜 담당자.',
    ladder: {
      humanLed: "'댓글 X' DM에 하나하나 손으로 답합니다.",
      humanAssisted: '에이전트가 플로우를 실행하고, 전환은 당신이 지켜봅니다.',
      fullyAutonomous: '키워드를 감시하고, 플로우를 실행하고, 관심도를 태그하고, 뜨거운 리드를 영업팀에 넘깁니다.',
    },
    theHuman: '퍼널과 오퍼는 당신이 설계합니다. 에이전트는 트리거와 라우팅을 돌립니다.',
    buildNotes: '구독자가 움직일 때마다 관심도를 태그해서 영업팀이 이름만이 아니라 맥락을 받게 합니다. 전환은 대시보드에 보고합니다.',
    skill: { name: 'DM Funnel Automator', slug: 'dm-funnel-automator', blurb: 'DMFlow 플로우를 키워드 트리거로 실행하고 뜨거운 리드를 영업팀에 넘깁니다.' },
    status: 'ready-to-run',
  },
  'sop-nadia': {
    autonomy: 'human-led',
    categoryPath: '마케팅 · 편집',
    description: '사람이 맡는 편집 관문입니다. 각도를 정하고, 모든 공개물을 승인하거나 취소합니다.',
    breaksInto: ['performance-review', 'angle-setting', 'drop-approval'],
    buildsOn: ['Content Pipeline Runner'],
    replaces: '없음. 파이프라인이 보고하는 취향의 층입니다.',
    ladder: {
      humanLed: 'Nadia Kapoor가 각도를 정하고, 출시 전에 모든 소재를 승인합니다.',
      humanAssisted: '에이전트가 성과를 바탕으로 각도를 제안하고, 결정은 Nadia Kapoor가 합니다.',
      fullyAutonomous: '목표가 아닙니다. 편집 취향은 사람이 맡습니다.',
    },
    theHuman: 'Nadia Kapoor가 무엇을 언제 왜 공개할지 책임집니다. 에이전트는 대기열을 채우고, 사람이 관문을 엽니다.',
    buildNotes: '의도적으로 사람이 주도합니다. 스킬은 성과를 보여 주고 각도를 제안하며, 승인과 취소는 Nadia Kapoor에게 남깁니다.',
    skill: { name: 'Editorial Gate', slug: 'editorial-gate', blurb: '지난 주기의 수치와 제안된 각도를 보여 주어 사람이 승인하거나 취소하게 합니다.' },
    status: 'ready-to-run',
  },

  // ── SALES ─────────────────────────────────────────────────────────────────
  'sop-sales-agent': {
    autonomy: 'human-assisted',
    categoryPath: '영업 · 파이프라인 운영',
    description: '열린 거래를 매일 점검하고, 멈춘 거래에는 다음 액션과 담당자를 붙입니다.',
    breaksInto: ['deal-puller', 'stall-detector', 'call-briefer'],
    buildsOn: ['Ledger CRM', 'Payment Links'],
    replaces: '보드를 깨끗하게 유지하는 연봉 6~8만 달러짜리 영업 운영 매니저.',
    ladder: {
      humanLed: '생각날 때 보드를 훑어보고, 멈춘 거래가 없기를 바랍니다.',
      humanAssisted: '에이전트가 멈춘 거래 순위를 매기고 클로저에게 브리핑합니다. 거래는 당신이 진행합니다.',
      fullyAutonomous: '점검하고, 다음 액션을 붙이고, 결제 링크를 준비하고, 단계 변경을 당일에 기록합니다.',
    },
    theHuman: 'Theo가 거래를 진행합니다. 에이전트는 어떤 거래도 조용히 방치되지 않도록 챙깁니다.',
    buildNotes: '단계에 7일 넘게 머물면 멈춘 것으로 봅니다. 통화 전에 PayKit·Stripe·FlexPay 결제 링크를 미리 준비합니다. 통화 중에 만들지 않습니다.',
    skill: { name: 'Pipeline Keeper', slug: 'pipeline-keeper', blurb: '멈춘 거래 순위를 매기고, 다음 액션을 붙이고, 매일 클로저에게 브리핑합니다.' },
    status: 'in-development',
  },
  'sop-lc-lane': {
    autonomy: 'fully-autonomous',
    categoryPath: '영업 · LC 레인',
    description: '웨비나 등록자에서 체결된 LC 거래까지 이어 가며, 노쇼는 24시간 안에 다시 예약합니다.',
    breaksInto: ['lead-tracker', 'noshow-rebooker', 'revenue-reporter'],
    buildsOn: ['Ledger CRM'],
    replaces: '웨비나 노쇼를 손으로 쫓아다니는 SDR.',
    ladder: {
      humanLed: '등록자 명단을 내보내고 노쇼를 손으로 쫓습니다.',
      humanAssisted: '에이전트가 리드를 추적하고 노쇼를 표시합니다. 재예약은 당신이 합니다.',
      fullyAutonomous: '등록부터 통화까지 추적하고, 24시간 안에 노쇼를 재예약하며, 결제를 맞춥니다.',
    },
    theHuman: '통화는 당신이 진행합니다. 레인은 퍼널을 채우고 정산 상태를 맞춥니다.',
    buildNotes: '노쇼 뒤 24시간 안에 재예약 시퀀스가 나가야 합니다. 그렇지 않으면 리드가 식습니다. 모든 단계 변경은 Ledger에 동기화합니다.',
    skill: { name: 'LC Lane Runner', slug: 'lc-lane-runner', blurb: 'LC 웨비나 리드를 예약된 통화까지 추적하고 노쇼를 자동으로 재예약합니다.' },
    status: 'in-development',
  },
  'sop-vantage-lane': {
    autonomy: 'fully-autonomous',
    categoryPath: '영업 · Vantage 레인',
    description: '지역 비즈니스의 인바운드를 자격 확인, 예약, 정산까지 끝까지 처리합니다.',
    breaksInto: ['icp-qualifier', 'calendar-booker', 'revenue-reporter'],
    buildsOn: ['ICP Definition', 'Ledger CRM'],
    replaces: '인바운드를 손으로 자격 확인하고 예약하는 SDR.',
    ladder: {
      humanLed: '인바운드 리드를 하나하나 읽고 통화를 손으로 예약합니다.',
      humanAssisted: '에이전트가 ICP 기준으로 자격을 확인하고, 좋은 리드는 당신이 예약합니다.',
      fullyAutonomous: 'ICP 자격을 확인하고, 맥락을 붙여 Theo의 캘린더에 예약하며, 결제를 맞춥니다.',
    },
    theHuman: 'Theo가 클로징합니다. 레인은 어떤 리드가 Theo의 캘린더를 쓸 만한지 판단합니다.',
    buildNotes: '모든 예약에 맥락을 붙여 통화가 따뜻하게 시작하게 합니다. 예약 전에 ICP 기준으로 엄격히 자격을 확인합니다.',
    skill: { name: 'Vantage Lane Runner', slug: 'vantage-lane-runner', blurb: 'ICP 기준으로 인바운드를 자격 확인하고, 맥락을 붙여 통화를 예약합니다.' },
    status: 'in-development',
  },
  'sop-vantage-paykit': {
    autonomy: 'fully-autonomous',
    categoryPath: '영업 · 결제 정산',
    description: 'PayKit 고객을 CRM 거래와 맞추고, 모든 불일치를 해결될 때까지 추적합니다.',
    breaksInto: ['payment-puller', 'deal-matcher', 'mismatch-chaser'],
    buildsOn: ['PayKit API', 'Ledger CRM'],
    replaces: '결제와 CRM을 손으로 대조하는 경리.',
    ladder: {
      humanLed: '매달 스프레드시트에서 PayKit과 Ledger를 직접 맞춥니다.',
      humanAssisted: '에이전트가 불일치를 표시하고, 당신이 추적합니다.',
      fullyAutonomous: '모든 결제를 거래와 맞추고, 불일치를 해결될 때까지 추적합니다.',
    },
    theHuman: '정말 애매한 건은 당신이 해결합니다. 명확한 것은 에이전트가 정리합니다.',
    buildNotes: '양방향으로 표시합니다. 거래 없는 결제와 결제 없는 거래 모두. 표시만 하지 말고 해결될 때까지 추적합니다.',
    skill: { name: 'PayKit Reconciler', slug: 'paykit-reconciler', blurb: 'PayKit 결제를 Ledger 거래와 맞추고 모든 불일치를 추적합니다.' },
    status: 'not-started',
  },
  'sop-sales-calls-data': {
    autonomy: 'fully-autonomous',
    categoryPath: '영업 · 통화 인텔리전스',
    description: 'Recall 통화와 Plaud 녹음을 모두 CRM 인텔리전스로 바꿉니다: 이의, 약속, 다음 단계.',
    breaksInto: ['recall-ingest', 'plaud-ingest', 'objection-extractor', 'crm-writer'],
    buildsOn: ['Recall', 'Plaud', 'Ledger CRM'],
    replaces: '통화 후 기억에 의존해 통화 메모를 타이핑하는 클로저.',
    ladder: {
      humanLed: '통화 메모를 기억에 의존해 쓰거나, 아예 쓰지 않습니다.',
      humanAssisted: '에이전트가 이의와 다음 단계를 뽑고, 당신이 정리합니다.',
      fullyAutonomous: '통화마다 받아들여 정보를 추출하고 Ledger에 다시 씁니다.',
    },
    theHuman: '대화는 당신이 진행합니다. 에이전트는 무슨 말이 오갔고 다음에 무엇을 할지 기록합니다.',
    buildNotes: '가격이나 경쟁사가 나온 통화에 태그를 답니다. 그 패턴이 파이프라인 브리프로 들어갑니다.',
    skill: { name: 'Call Miner', slug: 'call-miner', blurb: 'Recall 통화와 Plaud 대면 녹음을 이의, 약속, 다음 단계로 바꿔 Ledger에 넣습니다.' },
    status: 'in-development',
  },
  'sop-crm-pulse': {
    autonomy: 'fully-autonomous',
    categoryPath: '영업 · CRM 관리',
    description: '숫자를 믿을 수 있는 CRM을 만듭니다: 중복 제거, 누락 보충, 단계 검증.',
    breaksInto: ['dupe-merger', 'stage-verifier', 'metric-snapshotter'],
    buildsOn: ['Ledger CRM'],
    replaces: '매주 금요일 CRM을 정리하는 RevOps 분석가.',
    ladder: {
      humanLed: '숫자가 이상해질 때 CRM을 정리합니다.',
      humanAssisted: '에이전트가 중복과 오래된 기록을 표시하고, 당신이 고칩니다.',
      fullyAutonomous: '중복을 합치고, 안전하게 보충하고, 단계를 검증하고, 지표를 스냅샷으로 남깁니다.',
    },
    theHuman: '위험한 병합은 당신이 결정합니다. 에이전트는 안전한 것을 처리하고 오래된 기록의 담당자에게 알립니다.',
    buildNotes: '안전하게 보충할 수 있는 것만 보충합니다. 오래된 필드를 추측하지 말고 레인 담당자에게 알립니다.',
    skill: { name: 'CRM Pulse', slug: 'crm-pulse', blurb: 'Ledger에서 중복을 제거하고, 단계를 검증하고, 파이프라인 지표를 스냅샷으로 남깁니다.' },
    status: 'not-started',
  },
  'person-theo': {
    autonomy: 'human-led',
    categoryPath: '영업 · 클로징',
    description: '첫 인사부터 서명까지 전화에서 진행하는 사람.',
    breaksInto: ['precall-review', 'discovery-script', 'objection-handling'],
    buildsOn: ['Pipeline Keeper', 'Call Miner'],
    replaces: '없음. 레인 전체가 먹여 주는 클로저입니다.',
    ladder: {
      humanLed: 'Theo가 브리프부터 서명까지 모든 통화를 직접 진행합니다.',
      humanAssisted: '에이전트가 브리프와 이의 답변을 준비하고, Theo가 통화를 진행합니다.',
      fullyAutonomous: '목표가 아닙니다. 클로징은 사람이 맡습니다.',
    },
    theHuman: 'Theo가 대화와 클로징을 책임집니다. 가격을 즉흥으로 말하지 말고 이의 대응 시트를 쓰세요.',
    buildNotes: '의도적으로 사람이 주도합니다. 스킬은 통화 브리프와 최근 세 번의 접촉을 준비하고, 통화는 Theo가 진행합니다.',
    skill: { name: 'Close Call Runner', slug: 'close-call-runner', blurb: '사람 클로저를 위해 통화 전 브리프와 이의 대응 시트를 준비합니다.' },
    status: 'ready-to-run',
  },

  // ── FINANCES ──────────────────────────────────────────────────────────────
  'sop-paykit': {
    autonomy: 'fully-autonomous',
    categoryPath: '재무 · 수입 추적',
    description: '이번 달 PayKit 수입을 사업부별로 나누고, 환불은 당일에 표시합니다.',
    breaksInto: ['mtd-puller', 'venture-splitter', 'refund-flagger'],
    buildsOn: ['PayKit API'],
    replaces: 'PayKit 수입을 손으로 집계하는 경리.',
    ladder: {
      humanLed: '월말에 스프레드시트에서 PayKit 결제를 직접 더합니다.',
      humanAssisted: '에이전트가 이번 달 누적을 가져오고, 당신이 사업부별로 나눕니다.',
      fullyAutonomous: '이번 달 누적을 가져와 LC와 Vantage로 나누고, 환불이 발생한 당일에 표시합니다.',
    },
    theHuman: '장부는 당신이 책임집니다. 에이전트는 마감 사이에도 누적 합계를 정확하게 유지합니다.',
    buildNotes: '환불과 분쟁은 월말이 아니라 당일에 표시합니다. 누적 합계를 마감과 맞춰 봅니다.',
    skill: { name: 'PayKit Income Tracker', slug: 'paykit-income-tracker', blurb: '이번 달 PayKit 수입을 사업부별로 가져오고 환불을 표시합니다.' },
    status: 'in-development',
  },
  'sop-stripe': {
    autonomy: 'fully-autonomous',
    categoryPath: '재무 · 수입 추적',
    description: 'Stripe 잔액과 결제를 LC로 표시하고, 이상치를 표시하며, 지급을 기록합니다.',
    breaksInto: ['balance-puller', 'income-labeler', 'anomaly-flagger'],
    buildsOn: ['Stripe Key'],
    replaces: 'LC 합계를 위해 Stripe 대시보드를 손으로 확인하는 일.',
    ladder: {
      humanLed: 'Stripe를 열고 잔액을 눈대중으로 봅니다.',
      humanAssisted: '에이전트가 결제를 가져오고, 당신이 표시하고 대조합니다.',
      fullyAutonomous: '잔액과 결제를 가져오고, LC로 표시하고, 이상치를 표시하며, 지급을 기록합니다.',
    },
    theHuman: '대조는 당신이 책임집니다. 에이전트는 수입 차트를 최신으로 유지합니다.',
    buildNotes: '잔액과 결제를 읽을 수 있는 실제 키가 필요합니다(권한이 제한된 키는 403). 이상치는 최근 평균과 비교해 표시합니다.',
    skill: { name: 'Stripe Income Tracker', slug: 'stripe-income-tracker', blurb: 'Stripe 잔액과 결제를 가져오고, 수입에 표시하고, 이상치를 표시합니다.' },
    status: 'in-development',
  },
  'sop-processor-confirm': {
    autonomy: 'fully-autonomous',
    categoryPath: '재무 · 결제 검증',
    description: '청구한 결제 processor의 API 영수증 없이는 거래를 결제 완료로 표시하지 않습니다.',
    breaksInto: ['claim-receiver', 'api-verifier', 'audit-writer'],
    buildsOn: ['Processor Registry'],
    replaces: '거래가 결제되었다는 영업 담당자의 말을 그대로 믿는 일.',
    ladder: {
      humanLed: "'결제했어요'라는 Slack 메시지를 믿고 사실이기를 바랍니다.",
      humanAssisted: '에이전트가 processor를 확인하고, 당신이 결과를 기록합니다.',
      fullyAutonomous: '청구를 받아 결제를 검증하고, 확인을 남기거나 크게 표시합니다.',
    },
    theHuman: '진짜 분쟁은 당신이 해결합니다. 에이전트는 영수증 없이는 결제 완료로 표시하지 않습니다.',
    buildNotes: '확인하거나 크게 표시하며, 조용히 넘기지 않습니다. 모든 확인의 감사 기록을 월말을 위해 남깁니다.',
    skill: { name: 'Payment Confirmer', slug: 'payment-confirmer', blurb: '거래를 결제 완료로 표시하기 전에 processor API로 결제 청구를 검증합니다.' },
    status: 'ready-to-run',
  },
  'sop-flexpay': {
    autonomy: 'fully-autonomous',
    categoryPath: '재무 · 할부 금융',
    description: 'FlexPay의 결제 플랜을 가져와 통화 전에 진행 중인 오퍼에 붙입니다.',
    breaksInto: ['profile-reader', 'plan-matcher', 'acceptance-tracker'],
    buildsOn: ['FlexPay API', 'Deal Size'],
    replaces: '거래마다 결제 플랜 옵션을 손으로 견적 내는 재무 담당자.',
    ladder: {
      humanLed: '거래마다 금융 조건을 손으로 찾아봅니다.',
      humanAssisted: '에이전트가 플랜 옵션을 가져오고, 당신이 붙입니다.',
      fullyAutonomous: '플랜을 구매자 프로필에 맞추고 통화 전에 조건을 붙입니다.',
    },
    theHuman: '무엇을 제안할지는 당신이 정합니다. 에이전트는 맞는 플랜을 골라 어떤 것이 성사되는지 추적합니다.',
    buildNotes: '통화 중이 아니라 통화 전에 조건을 붙입니다. 수락률을 추적해서 가격이 계속 정교해지게 합니다.',
    skill: { name: 'Financing Quoter', slug: 'financing-quoter', blurb: 'FlexPay 플랜을 구매자 프로필에 맞춰 오퍼에 조건을 붙입니다.' },
    status: 'not-started',
  },
  'sop-payments-pulse': {
    autonomy: 'fully-autonomous',
    categoryPath: '재무 · 결제 processor 모니터링',
    description: '모든 processor에 핑을 보내고, 정직한 상태를 기록하며, 장애를 알립니다.',
    breaksInto: ['registry-pinger', 'status-recorder', 'recovery-checker'],
    buildsOn: ['Processor Registry'],
    replaces: '결제가 실패해서야 processor가 죽었다는 것을 아는 일.',
    ladder: {
      humanLed: '결제 실패를 보고서야 processor가 죽었다는 것을 압니다.',
      humanAssisted: '에이전트가 상태를 보고하고, 당신은 장애를 지켜봅니다.',
      fullyAutonomous: '각 processor에 핑을 보내고, 정직한 상태를 기록하고, 장애를 알리며, 회복될 때까지 다시 확인합니다.',
    },
    theHuman: '장애 때 무엇을 할지는 당신이 정합니다. 에이전트는 장애가 시작된 순간을 당신이 알도록 합니다.',
    buildNotes: '연결됨을 가짜로 표시하지 않습니다. 실패한 processor는 더 촘촘한 주기로 다시 확인하고, 분석을 위해 가동 기록을 남깁니다.',
    skill: { name: 'Processor Health Watch', slug: 'processor-health-watch', blurb: '모든 processor에 핑을 보내고, 정직한 상태를 기록하며, 장애를 알립니다.' },
    status: 'ready-to-run',
  },

  // ── CLIENTS ───────────────────────────────────────────────────────────────
  'sop-client-roster': {
    autonomy: 'fully-autonomous',
    categoryPath: '고객 · 명단',
    description: '모든 고객을 항상 최신인 하나의 목록으로 두고, 건강 상태마다 이유를 붙입니다.',
    breaksInto: ['source-puller', 'health-marker', 'delta-publisher'],
    buildsOn: ['Ledger CRM', 'PayKit API'],
    replaces: '아무도 믿지 않는 낡은 고객 스프레드시트.',
    ladder: {
      humanLed: '생각날 때 업데이트하는 고객 목록을 직접 관리합니다.',
      humanAssisted: '에이전트가 출처를 맞추고, 당신이 건강 상태를 표시합니다.',
      fullyAutonomous: '매일 출처를 가져와 활성·위험·이탈을 이유와 함께 표시하고, 변경분을 게시합니다.',
    },
    theHuman: '위험 계정은 당신이 처리합니다. 에이전트는 목록이 틀리지 않도록 합니다.',
    buildNotes: '모든 건강 표시에는 색깔만이 아니라 이유가 필요합니다. 변경분을 기록해서 바뀐 것이 보이게 합니다.',
    skill: { name: 'Client Roster Keeper', slug: 'client-roster-keeper', blurb: '고객 출처를 매일 맞추고 계정 건강 상태를 이유와 함께 표시합니다.' },
    status: 'in-development',
  },
  'sop-client-onboarding': {
    autonomy: 'human-assisted',
    categoryPath: '고객 · 온보딩',
    description: '계약 성사에서 킥오프까지 단계가 빠지지 않게 하고, 결제를 먼저 확인합니다.',
    breaksInto: ['welcome-pack', 'workspace-setup', 'kickoff-booker'],
    buildsOn: ['Payment Confirmer', 'Notion Mirror'],
    replaces: '체크리스트를 돌리는 연봉 5~6만 달러짜리 온보딩 코디네이터.',
    ladder: {
      humanLed: '고객마다 온보딩 체크리스트를 직접 돌립니다.',
      humanAssisted: '에이전트가 단계를 실행하고, 당신은 접근 권한을 확인하고 넘깁니다.',
      fullyAutonomous: '계약 성사를 기준으로 시작하고, 결제를 검증하고, 자료를 보내고, 킥오프를 예약합니다.',
    },
    theHuman: '관계의 인수인계는 Sasha가 맡습니다. 에이전트는 단계를 빠뜨리지 않고 기계적 체크리스트를 돌립니다.',
    buildNotes: '결제가 들어왔는지 확인하기 전에는 아무것도 보내지 않습니다. 접근 권한은 다섯 번의 후속 연락이 아니라 한 번의 요청으로 모읍니다.',
    skill: { name: 'Client Onboarder', slug: 'client-onboarder', blurb: '계약 성사에서 킥오프까지의 체크리스트를 결제 확인 후 빠짐없이 실행합니다.' },
    status: 'in-development',
  },
  'sop-client-success': {
    autonomy: 'human-assisted',
    categoryPath: '고객 · 성공 관리',
    description: '정기 미팅, 산출물, 갱신을 궤도에 올려 두고, 건강 상태를 매달 점수화합니다.',
    breaksInto: ['cadence-runner', 'scope-tracker', 'renewal-flagger'],
    buildsOn: ['Client Roster Keeper', 'Call Miner'],
    replaces: '머릿속으로 체크인을 굴리는 연봉 5.5~7만 달러짜리 CSM.',
    ladder: {
      humanLed: '가능할 때 고객에게 체크인하고, 범위가 유지되기를 바랍니다.',
      humanAssisted: '에이전트가 주기와 범위를 추적하고, 통화는 당신이 진행합니다.',
      fullyAutonomous: '주기를 돌리고, 지연을 표시하고, 건강을 점수화하고, 갱신을 30일 전에 올립니다.',
    },
    theHuman: '관계는 Sasha가 운영합니다. 에이전트는 주간 미팅이나 갱신이 빠지지 않도록 챙깁니다.',
    buildNotes: '주기에서 주간 미팅을 거르지 않습니다. 갱신과 추가 판매는 만료 시점이 아니라 30일 전에 올립니다.',
    skill: { name: 'Client Success Runner', slug: 'client-success-runner', blurb: '체크인 주기를 돌리고, 범위를 추적하며, 갱신을 30일 전에 표시합니다.' },
    status: 'not-started',
  },
  'sop-sasha': {
    autonomy: 'human-led',
    categoryPath: '고객 · 계정',
    description: '모든 계정에 책임지는 사람: 킥오프, QBR, 에스컬레이션, 갱신.',
    breaksInto: ['qbr-runner', 'escalation-resolver', 'renewal-signoff'],
    buildsOn: ['Client Success Runner'],
    replaces: '없음. 모든 계정이 귀속되는 책임자입니다.',
    ladder: {
      humanLed: 'Sasha가 킥오프, QBR, 에스컬레이션을 직접 진행합니다.',
      humanAssisted: '에이전트가 건강 점수와 자료를 준비하고, Sasha가 통화를 진행합니다.',
      fullyAutonomous: '목표가 아닙니다. 계정 책임은 사람이 맡습니다.',
    },
    theHuman: 'Sasha가 모든 계정 관계를 책임집니다. 에스컬레이션은 당일에 해결하고, 작업 시작 전에 범위를 승인합니다.',
    buildNotes: '의도적으로 사람이 주도합니다. 스킬은 QBR 자료와 건강 검토를 준비하고, 관계는 Sasha의 몫입니다.',
    skill: { name: 'Account Owner', slug: 'account-owner', blurb: '책임자를 위해 QBR 자료와 건강 검토를 준비합니다.' },
    status: 'ready-to-run',
  },
};

/** A safe generated fallback so any SOP without an authored entry still renders
 *  a full card (keeps every task covered even if the seed grows). */
function fallbackPlaybook(task: SopTask): SopPlaybook {
  const human = task.assigneeKind === 'person';
  return {
    autonomy: human ? 'human-led' : 'fully-autonomous',
    categoryPath: '운영 · SOP',
    description: task.summary,
    breaksInto: ['intake', 'execute', 'report'],
    buildsOn: [],
    replaces: '사람이 손으로 반복해야 했을 수작업.',
    ladder: {
      humanLed: '사람이 모든 단계를 손으로 진행합니다.',
      humanAssisted: '에이전트가 작업을 하고, 사람은 결과물을 승인합니다.',
      fullyAutonomous: '에이전트가 SOP 전체를 끝까지 실행하고 보고합니다.',
    },
    theHuman: human
      ? '이 SOP는 사람이 책임집니다. 스킬은 돕지만 그 판단을 대신하지 않습니다.'
      : '사람이 목표를 정하고 결과물을 검토합니다. 에이전트가 실행합니다.',
    buildNotes: 'SOP 체크리스트의 실제 단계를 아래 스킬에 연결하세요.',
    skill: {
      name: `${task.title} Skill`,
      slug: task.id.replace(/^sop-/, '').replace(/[^a-z0-9-]/g, '-'),
      blurb: task.summary,
    },
    status: 'not-started',
  };
}

/** Generate the dummy-but-runnable SKILL.md body from the playbook + SOP.
 *  Real skill wiring lands later; this reads like the file it will become. */
export function skillFileMarkdown(pb: SopPlaybook, task: SopTask): string {
  const steps = task.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
  const buildsOn = pb.buildsOn.length ? pb.buildsOn.map((b) => `- ${b}`).join('\n') : '- 선행 작업 없음';
  return `---
name: ${pb.skill.slug}
title: ${pb.skill.name}
description: ${pb.skill.blurb}
autonomy: ${pb.autonomy}
status: ${pb.status}
---

# ${pb.skill.name}

${pb.description}

## 실행 시점
${task.summary}

## 하위 단계
${pb.breaksInto.map((s) => `- ${s}`).join('\n')}

## 선행 작업
${buildsOn}

## 절차
${steps}

## 사람의 역할
${pb.theHuman}

## 구현 메모
${pb.buildNotes}

> 더미 스킬 파일입니다. 위 단계는 실제 SOP를 따릅니다. ${pb.status} 단계에서 이 스킬을 승격할 때 실행 가능한 구현을 여기에 연결하세요.
`;
}

/** Resolve the full, card-ready playbook for a SOP task (authored or fallback),
 *  including the generated runnable skill file. */
export function playbookFor(task: SopTask): ResolvedPlaybook {
  const pb = PLAYBOOKS[task.id] ?? fallbackPlaybook(task);
  return { ...pb, skillMarkdown: skillFileMarkdown(pb, task) };
}
