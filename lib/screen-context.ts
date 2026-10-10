/**
 * Screen context for the Conductor panel — a short, honest summary of what
 * the operator is looking at, resolved per route and handed to the agent so
 * it can talk about the screen (Notion-agent style). The funnel gets the
 * full live read; other views get cheap repo-backed counts; unknown paths
 * degrade to the route name. Never blocks a chat: resolvers that fail return
 * a plain title line.
 */
import { NAV_AGENTS, NAV_INTELLIGENCE, NAV_LIBRARY, NAV_OPERATE, NAV_SYSTEM } from '@/lib/nav';
import { getDb } from '@/lib/data';
import { funnelSummary, journeyMeta, splitFunnelJourneys, FUNNEL_STAGES } from '@/lib/funnel';
import { attioFunnelJourneys } from '@/lib/funnel-live';
import { ghlFunnelJourneys } from '@/lib/funnel-ghl';

const ALL_NAV = [...NAV_OPERATE, ...NAV_AGENTS, ...NAV_INTELLIGENCE, ...NAV_SYSTEM, ...NAV_LIBRARY];

export function screenTitleFor(path: string): string {
  const clean = path.split('?')[0] || '/';
  const hit = ALL_NAV.find((n) => (n.href === '/' ? clean === '/' : clean === n.href || clean.startsWith(`${n.href}/`)));
  return hit?.label ?? clean;
}

export type FunnelContextInput = {
  clients: number;
  converted: number;
  revenueUsd: number;
  stageCounts: [string, number][];
  archived: number;
  sources: string;
  decaying: number;
  reddest: { name: string; days: number }[];
};

/** Pure formatter — what the Conductor reads about the funnel screen. */
export function describeFunnelContext(d: FunnelContextInput): string {
  return [
    `퍼널: ${d.sources} 기준 활성 리드 ${d.clients}명, 전환 ${d.converted}명 ($${Math.round(d.revenueUsd).toLocaleString('en-US')}), 보관 ${d.archived}명 (90일 넘게 조용함).`,
    `현재 단계별 인원 — ${d.stageCounts.map(([label, n]) => `${label}: ${n}`).join(' · ')}.`,
    `${d.decaying}명이 90일 보관함 쪽으로 사라지는 중 (21일 넘게 조용함).`,
    d.reddest.length > 0
      ? `가장 위험: ${d.reddest.map((r) => `${r.name} (${r.days}일 조용함)`).join(', ')}.`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

async function funnelContext(): Promise<string> {
  const now = new Date();
  const [attioLive, ghlLive] = await Promise.all([attioFunnelJourneys(now), ghlFunnelJourneys(now)]);
  const live = [...(attioLive?.journeys ?? []), ...(ghlLive?.journeys ?? [])];
  const all = live.length > 0 ? live : getDb().funnel.journeys();
  const { active, archived } = splitFunnelJourneys(all, now);
  const summary = funnelSummary(active);
  const metas = active.map((j) => ({ j, meta: journeyMeta(j, now) }));
  const decaying = metas.filter(({ j, meta }) => j.status !== 'converted' && meta.daysSinceLastTouch > 21).length;
  const reddest = metas
    .filter(({ j }) => j.status !== 'converted')
    .sort((a, b) => b.meta.daysSinceLastTouch - a.meta.daysSinceLastTouch)
    .slice(0, 5)
    .map(({ j, meta }) => ({ name: j.name, days: meta.daysSinceLastTouch }));
  const stageCounts = new Map<string, number>();
  for (const j of active) {
    const label = FUNNEL_STAGES.find((s) => s.id === j.status)?.label ?? j.status;
    stageCounts.set(label, (stageCounts.get(label) ?? 0) + 1);
  }
  const sources =
    live.length > 0
      ? [
          attioLive?.journeys.length ? `Attio ${attioLive.total}` : null,
          ghlLive?.journeys.length ? `GHL ${ghlLive.total}` : null,
        ]
          .filter(Boolean)
          .join(' + ') + ' (실시간)'
      : '샘플 데모 데이터';
  return describeFunnelContext({
    clients: summary.clients,
    converted: summary.converted,
    revenueUsd: summary.revenueUsd,
    stageCounts: FUNNEL_STAGES.map((s) => [s.label, stageCounts.get(s.label) ?? 0]),
    archived: archived.length,
    sources,
    decaying,
    reddest,
  });
}

export type QuickAction = { label: string; prompt: string };

/**
 * The four one-tap openers the dock offers on a given screen. They are the way
 * out of an empty transcript, so they have to be about the screen he is on: on
 * /finances the first question is never "what is the board doing".
 *
 * Pure and per route, so the panel can render them the instant the context
 * lands and the tests can read them without a database.
 */
const QUICK_BY_ROUTE: [string, QuickAction[]][] = [
  ['/funnel', [
    { label: '식어 가는 리드는?', prompt: '퍼널에서 90일 보관함 쪽으로 사라져 가는 리드는 누구이고, 각각 다음에 어떤 연락을 하면 좋을까?' },
    { label: '단계 병목', prompt: '지금 고객이 가장 많이 몰려 있는 퍼널 단계는 어디고, 왜 거기서 막혀 있어?' },
    { label: '이번 달 매출', prompt: '이번 달 퍼널에서 전환된 매출은 얼마고, 아직 열려 있는 파이프라인과 비교하면 어때?' },
    { label: '후속 메시지 초안', prompt: '퍼널에서 가장 조용한 리드에게 보낼 후속 메시지 초안을 써 줘. 보내지 말고 먼저 보여 줘.' },
  ]],
  ['/brain', [
    { label: '뭘 알고 있어?', prompt: 'G-Brain이 지금 내 사업에 대해 알고 있는 것을 요약해 줘: 가장 큰 묶음과 정보가 부족한 곳.' },
    { label: '브레인 검색', prompt: 'G-Brain 검색을 실행해서 상위 결과를 출처와 함께 보여 줘.' },
    { label: '저장소 빈틈', prompt: '브레인 페이지가 가장 적은 축은 어디고, 그걸 채우려면 뭘 기록해야 해?' },
    { label: '메모 저장', prompt: 'G-Brain에 메모를 저장해 줘. 먼저 어떤 내용인지 물어봐.' },
  ]],
  ['/agents', [
    { label: '뭐가 돌고 있어?', prompt: '지금 실행 중인 에이전트, 막힌 에이전트, 오늘 한 번도 안 돈 에이전트를 알려 줘.' },
    { label: '최근 실행 실패', prompt: '마지막 실행이 실패한 에이전트를 모두 오류 내용과 고치는 방법과 함께 보여 줘.' },
    { label: '보드 작업 만들기', prompt: '내가 설명할 일로 보드 작업을 만들어 줘. 먼저 제목을 물어봐.' },
    { label: '축에 위임', prompt: '이 화면의 남은 일을 알맞은 축에 위임하고 누가 맡았는지 알려 줘.' },
  ]],
  ['/org', [
    { label: '누가 뭘 맡아?', prompt: '조직을 훑어 줘: 어느 축이 어떤 작업자를 맡고 있고, 아무것도 안 하는 자리는 어디야?' },
    { label: '일괄 전송 초안', prompt: '오늘의 우선순위에 대해 모든 축에 보낼 일괄 메시지 초안을 써 줘. 보내기 전에 보여 줘.' },
    { label: '놀고 있는 자리', prompt: '가장 오래 놀고 있는 에이전트 자리는 어디고, 무슨 일을 맡기면 좋을까?' },
    { label: '축에 위임', prompt: '한 축에 작업을 위임하고 어떤 에이전트가 맡았는지 알려 줘.' },
  ]],
  ['/comms', [
    { label: '답장할 것은?', prompt: '모든 받은편지함과 Slack 레인에서 내 답장을 기다리는 게 뭐야?' },
    { label: '오늘 요약', prompt: '오늘의 커뮤니케이션을 요약해 줘: 누가 연락했고, 뭘 원했고, 뭐가 답장 안 됐는지.' },
    { label: '가장 어려운 답장 초안', prompt: '가장 고민이 필요한 메시지에 대한 답장 초안을 써 줘. 보내지 말고 보여 줘.' },
    { label: '녹음 실행 항목', prompt: '가장 최근 통화 녹음에서 해야 할 일들을 뽑아 줘.' },
  ]],
  ['/social', [
    { label: '뭐가 잘 돼?', prompt: '최근 30일간 성장을 가장 많이 이끈 게시물은 뭐고, 공통점은 뭐야?' },
    { label: '팔로워 변화', prompt: '이번 달 각 계정의 팔로워 수는 어떻게 변했어?' },
    { label: '답 안 한 DM', prompt: '아직 답장을 기다리는 DM은 뭐야?' },
    { label: '다음 게시물 초안', prompt: '최근 가장 성과가 좋았던 것을 바탕으로 내 형식에 맞춰 다음 게시물 초안을 써 줘.' },
  ]],
  ['/finances', [
    { label: '이번 달 현금', prompt: '이번 달 모든 결제 수단으로 들어온 돈은 얼마고, 지난달과 비교하면 어때?' },
    { label: '미수금 청구서', prompt: '지금 청구했는데 아직 안 들어온 건 뭐고, 각각 얼마나 지났어?' },
    { label: '돈이 어디로 가?', prompt: '이번 달 지출을 카테고리별로 나누고 이상한 게 있으면 표시해 줘.' },
    { label: '결제 링크 만들기', prompt: 'Stripe 결제 링크를 만들어 줘. 먼저 금액과 용도를 물어봐.' },
  ]],
  ['/trading', [
    { label: '슬리브 상황은?', prompt: '오늘 에이전트 운용 슬리브는 어떻고, 마켓 에이전트는 어떻게 판단했어?' },
    { label: '미체결 주문', prompt: '지금 열려 있는 주문은 뭐고, 오래 방치된 건 있어?' },
    { label: '가장 크게 움직인 종목', prompt: '오늘 가장 크게 움직인 포지션은 뭐고 이유는 뭐야?' },
    { label: '거래 설명', prompt: '로그의 가장 최근 거래를 설명해 줘: 근거와 결과가 맞았는지.' },
  ]],
  ['/integrations', [
    { label: '뭐가 끊겼어?', prompt: '지금 연결 안 된 연결은 뭐고, 각각 뭐가 필요해?' },
    { label: '실패 원인 설명', prompt: '가장 심하게 고장 난 커넥터를 골라서 정확히 왜 실패하는지 설명해 줘.' },
    { label: '데이터 신선도', prompt: '데이터가 가장 오래된 커넥터는 어디고, 얼마나 오래됐어?' },
    { label: '보드 작업 만들기', prompt: '가장 고칠 가치가 있는 커넥터를 고치는 보드 작업을 만들어 줘.' },
  ]],
  ['/roadmap', [
    { label: '다음은 뭐야?', prompt: '로드맵에서 실제로 막힘 없이 진행 가능한 다음 항목은 뭐야?' },
    { label: '밀리는 항목', prompt: '분기를 넘긴 로드맵 항목은 뭐고, 각각 뭐 때문에 막혀 있어?' },
    { label: '이번 분기', prompt: '이번 분기를 요약해 줘: 출시한 것, 진행 중인 것, 위험한 것.' },
    { label: '보드 작업 만들기', prompt: '로드맵 항목 하나를 보드 작업으로 만들어 줘. 먼저 어떤 걸로 할지 물어봐.' },
  ]],
  ['/content', [
    { label: '뭘 올릴까?', prompt: '성과가 좋았던 것을 바탕으로 다음 콘텐츠는 뭐가 좋을까?' },
    { label: '남은 초안', prompt: '초안만 쓰고 발행하지 않은 콘텐츠는 뭐야?' },
    { label: '리드 마그넷 성과', prompt: '실제로 전환되는 리드 마그넷은 뭐고, 쓸모없는 건 뭐야?' },
    { label: '캡션 초안', prompt: '해시태그 3개를 넣어서 내 형식으로 캡션 초안을 써 줘. 먼저 주제를 물어봐.' },
  ]],
  ['/workflows', [
    { label: '다음 실행은?', prompt: '다음에 실행될 예약 워크플로는 뭐고, 무슨 일을 해?' },
    { label: '최근 실패', prompt: '최근 실패한 워크플로 실행은 뭐고, 오류는 뭐였어?' },
    { label: '지금 하나 실행', prompt: '지금 실행할 가치가 있는 워크플로는 뭐고, 왜?' },
    { label: '보드 작업 만들기', prompt: '고쳐야 하는 워크플로에 대한 보드 작업을 만들어 줘.' },
  ]],
  ['/tasks', [
    { label: '내가 할 일은?', prompt: '에이전트가 아니라 실제로 나를 기다리는 작업은 뭐야?' },
    { label: '막힌 레인', prompt: '뭐가 막혀 있고, 각각 뭐 때문에 막혀 있어?' },
    { label: '보드 작업 만들기', prompt: '보드 작업을 만들어 줘. 먼저 제목과 담당자를 물어봐.' },
    { label: '축에 위임', prompt: '가장 오래된 열린 작업을 알맞은 축에 위임해 줘.' },
  ]],
  ['/doctor', [
    { label: '뭐가 고장 났어?', prompt: '진단 항목을 훑어보고 진짜 고장 난 것과 그냥 시끄러운 것을 구분해 줘.' },
    { label: '진단 항목 설명', prompt: '가장 심하게 실패하는 진단 항목을 설명해 줘: 무엇을 측정하고 어떻게 고치는지.' },
    { label: '언제부터?', prompt: '실패 중인 각 진단 항목은 얼마나 오래 실패하고 있어?' },
    { label: '보드 작업 만들기', prompt: '오늘 가장 고칠 가치가 있는 실패에 대한 보드 작업을 만들어 줘.' },
  ]],
];

const QUICK_DEFAULT: QuickAction[] = [
  { label: '이 화면 요약', prompt: '지금 보고 있는 이 화면을 요약하고 눈에 띄는 점을 알려 줘.' },
  { label: '확인할 일은?', prompt: '지금 OS 전체에서 내가 신경 써야 할 일이 뭐야?' },
  { label: '보드 작업 만들기', prompt: '이 화면의 일로 보드 작업을 만들어 줘. 먼저 제목을 물어봐.' },
  { label: '축에 위임', prompt: '이 화면의 일을 알맞은 축에 위임하고 누가 맡았는지 알려 줘.' },
];

/** Four openers for the screen at `path`; unknown routes get the generic set. */
export function quickActionsFor(path: string): QuickAction[] {
  const clean = path.split('?')[0] || '/';
  const hit = QUICK_BY_ROUTE.find(([href]) => clean === href || clean.startsWith(`${href}/`));
  return hit ? hit[1] : QUICK_DEFAULT;
}

/** Route-aware context. Cheap everywhere except the funnel (the flagship). */
export async function screenContextFor(
  path: string,
): Promise<{ title: string; context: string; quickActions: QuickAction[] }> {
  const title = screenTitleFor(path);
  const clean = path.split('?')[0] || '/';
  const quickActions = quickActionsFor(path);
  try {
    if (clean.startsWith('/funnel')) {
      return { title, context: await funnelContext(), quickActions };
    }
    const db = getDb();
    if (clean === '/' || clean.startsWith('/agents') || clean.startsWith('/org')) {
      const agents = db.agents.all();
      const active = agents.filter((a) => a.status === 'active').length;
      return {
        title,
        quickActions,
        context: `${title}: 에이전트 명단 — 축 ${db.departments.all().length}개에 에이전트 ${agents.length}개 (가동 중 ${active}개).`,
      };
    }
    if (clean.startsWith('/integrations')) {
      const tools = db.tools.all();
      return {
        title,
        quickActions,
        context: `${title}: 연결 보드 — 추적 중인 연동 ${tools.length}개 (연결됨 ${tools.filter((t) => t.status === 'connected').length}개).`,
      };
    }
    if (clean.startsWith('/roadmap')) {
      return { title, context: `${title}: 분기별 로드맵 항목 ${db.roadmap.all().length}개.`, quickActions };
    }
    return { title, context: `커맨드 센터의 ${title} 화면.`, quickActions };
  } catch {
    return { title, context: `커맨드 센터의 ${title} 화면.`, quickActions };
  }
}
