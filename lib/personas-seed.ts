import type { Persona } from '@/lib/schemas';

/**
 * Ten operator personas — each a variant of this platform configured for a
 * different kind of founder, aligned to the creator-founder skeleton (pillars →
 * agents, connectors, metrics, G-Brain). Generated as templates; swap for live
 * configs when a persona gets provisioned.
 */
export const PERSONAS: Persona[] = [
  {
    "id": "persona-marketing-agency",
    "order": 1,
    "name": "에이전시 오너",
    "archetype": "에이전시 운영자",
    "tagline": "4명 팀으로 고객 리테이너 14개를 공 하나도 떨어뜨리지 않고 운영합니다",
    "summary": "고객 납품, 신규 사업 파이프라인, 보고를 떠안고 사는 마케팅·크리에이티브 에이전시 오너입니다. 이 OS 변형은 작은 팀의 혼돈을 감시되는 생산 라인으로 바꿉니다. 모든 리테이너의 범위, 마감, 산출물, 월간 보고가 궤도 위에서 돌아가므로 아무것도 미끄러지지 않고 고객이 조용히 떠나지 않습니다.",
    "accent": "#3df08c",
    "northStar": "유지된 순 리테이너 MRR (따낸 매출이 아니라 지켜 낸 매출)",
    "pillars": [
      {
        "name": "신규 사업",
        "focus": "리드에서 서명된 리테이너까지의 파이프라인과 제안서",
        "agents": [
          "Pipeline Bot",
          "Proposal Drafter",
          "Discovery Scheduler",
          "Win-Loss Logger"
        ]
      },
      {
        "name": "고객 납품",
        "focus": "모든 계정의 리테이너 범위, 마감, 산출물",
        "agents": [
          "Account Pilot",
          "Deadline Sentinel",
          "Scope Guard",
          "QA Reviewer"
        ]
      },
      {
        "name": "크리에이티브 스튜디오",
        "focus": "소재 제작, 브랜드 일관성, 승인",
        "agents": [
          "Brief Builder",
          "Asset Wrangler",
          "Brand Cop",
          "Approval Chaser"
        ]
      },
      {
        "name": "보고와 리텐션",
        "focus": "월간 고객 보고, 건강 점수, 이탈 방어",
        "agents": [
          "Report Compiler",
          "Health Scorer",
          "Churn Sentinel",
          "QBR Prep"
        ]
      },
      {
        "name": "에이전시 운영",
        "focus": "팀 가동률, 청구, 계정별 마진",
        "agents": [
          "Capacity Planner",
          "Invoice Runner",
          "Margin Watch",
          "Time Auditor"
        ]
      }
    ],
    "connectors": [
      "HubSpot CRM",
      "Asana",
      "Slack",
      "Google Analytics 4",
      "Meta Ads Manager",
      "Google Ads",
      "Harvest",
      "QuickBooks Online"
    ],
    "metrics": [
      "순 리테이너 MRR",
      "고객 건강 점수",
      "정시 납품률",
      "팀 가동률 %",
      "계정별 매출총이익률"
    ],
    "brainUse": "모든 에이전트가 공유 G-Brain에서 고객별 브랜드 가이드, 작업 범위, 과거 승인, 계정 이력을 읽습니다. 그래서 제안서, 크리에이티브, 보고서가 다시 브리핑하지 않아도 올바른 목소리로 나옵니다.",
    "signaturePlay": "매월 1일, Report Compiler가 활성 리테이너 전체의 GA4, Meta, Google Ads 수치를 가져와 고객마다 그 고객의 목소리로 브랜드 보고서 초안을 씁니다. Health Scorer는 이탈 쪽으로 기울고 있는 계정을 표시합니다. 그러면 오너는 모든 QBR에 들어설 때 누가 위험하고 누구에게 추가 판매할지 이미 알고 있습니다."
  },
  {
    "id": "persona-brick-and-mortar",
    "order": 2,
    "name": "다점포 운영자",
    "archetype": "오프라인 매장 창업자",
    "tagline": "매장 6곳, 하나의 현장 화면: 인건비, 재고, 리뷰, 방문객.",
    "summary": "하나의 콘솔에서 매장 6곳을 운영하는 다점포 음식점·소매 창업자입니다. 이 OS는 POS, 인건비, 재고, 지역 평판 데이터를 하나의 현장 화면으로 묶어, 오너가 현장에 없어도 모든 매장이 목표대로 돌아가게 합니다.",
    "accent": "#5ec9f8",
    "northStar": "전 매장 통합 노동시간당 기존점 매출",
    "pillars": [
      {
        "name": "홀 운영",
        "focus": "매장별 인력 배치, 교대 근무, 인건비",
        "agents": [
          "Dispatch Bot",
          "Shift Filler",
          "Labor Cop"
        ]
      },
      {
        "name": "재고와 원가",
        "focus": "재고, 매출원가, 납품업체 청구서, 폐기",
        "agents": [
          "Count Keeper",
          "Invoice Reconciler",
          "Waste Watcher",
          "Reorder Bot"
        ]
      },
      {
        "name": "지역 평판",
        "focus": "리뷰, 지역 검색, 매장 등록 정보 전체",
        "agents": [
          "Review Harvester",
          "Reply Bot",
          "Listing Sentry"
        ]
      },
      {
        "name": "유동 인구와 매출",
        "focus": "방문객 수, 처리량, 시간대별 매출, 로열티",
        "agents": [
          "Traffic Counter",
          "Daypart Analyst",
          "Loyalty Driver"
        ]
      },
      {
        "name": "백오피스",
        "focus": "결제, 급여, 현금, 다법인 손익",
        "agents": [
          "Settlement Bot",
          "Payroll Runner",
          "P&L Closer"
        ]
      }
    ],
    "connectors": [
      "Toast POS",
      "7shifts",
      "Square",
      "MarginEdge",
      "Google Business Profile",
      "Gusto",
      "QuickBooks Online",
      "G-Brain"
    ],
    "metrics": [
      "기존점 매출 (전년 대비)",
      "매출 대비 인건비 %",
      "식자재 원가 % (매출원가)",
      "구글 평균 평점 + 리뷰 속도",
      "방문객 수 대비 결제 전환율"
    ],
    "brainUse": "모든 에이전트가 공유 G-Brain을 읽습니다. 적정 재고 기준, 납품 조건, 레시피 원가, 오픈 체크리스트, 매장별 플레이북이 들어 있어서, 한 매장에서 고친 것이 여섯 매장 모두의 기준이 됩니다.",
    "signaturePlay": "개점 전에 OS가 어젯밤 Toast 매출과 오늘 7shifts 근무표를 가져오고, 매장마다 시간대별 손님 수를 예측합니다. 인건비 목표를 넘을 매장을 표시하고, Shift Filler에 자동으로 알려 결근을 메우게 합니다. 그리고 매장별 한 줄 준비 상황(인원 배치, 재고, 리뷰 답변 완료)을 오전 7시까지 오너의 휴대폰에 보냅니다."
  },
  {
    "id": "persona-ecommerce-dtc",
    "order": 3,
    "name": "DTC 브랜드 운영자",
    "archetype": "DTC 운영자",
    "tagline": "감이 아니라 마진으로 Shopify 브랜드를 운영하는 한 명의 운영자.",
    "summary": "Shopify 스토어, 유료 광고 유입, 3PL 물류, 이메일·SMS 리텐션을 혼자 한 화면에서 운영하는 이커머스·DTC 브랜드 오너입니다. 이 OS 변형은 주문마다 공헌이익을 실시간으로 보고, 에이전트가 손해 보는 광고 세트를 끄고, 버려진 장바구니를 쫓고, 출시를 망치기 전에 재고 소진을 표시하게 합니다.",
    "accent": "#e1306c",
    "northStar": "광고비를 뺀 공헌이익 (주문당, 통합)",
    "pillars": [
      {
        "name": "유입",
        "focus": "유료 광고와 트래픽 · 수익이 되는 주문을 사는 지출",
        "agents": [
          "Spend Sentinel",
          "Creative Tester",
          "Attribution Bot"
        ]
      },
      {
        "name": "스토어와 전환율 최적화",
        "focus": "Shopify 상품 목록, 상품 상세, 결제, 전환율",
        "agents": [
          "Catalog Bot",
          "CRO Tester",
          "Cart Recovery Bot"
        ]
      },
      {
        "name": "리텐션",
        "focus": "이메일·SMS 흐름, LTV, 재구매 엔진",
        "agents": [
          "Flow Builder",
          "Winback Bot",
          "Review Harvester"
        ]
      },
      {
        "name": "물류와 운영",
        "focus": "재고, 3PL, 배송 SLA, 품절 방어",
        "agents": [
          "Stockout Sentinel",
          "Dispatch Bot",
          "Returns Triage"
        ]
      },
      {
        "name": "마진과 재무",
        "focus": "단위 경제성, 매출원가, 통합 CAC, 현금",
        "agents": [
          "Margin Watch",
          "CAC Auditor",
          "Reconcile Bot"
        ]
      }
    ],
    "connectors": [
      "Shopify",
      "Meta Ads Manager",
      "Google Ads",
      "TikTok Ads",
      "Klaviyo",
      "Postscript",
      "ShipBob (3PL)",
      "Stripe"
    ],
    "metrics": [
      "주문당 공헌이익",
      "통합 ROAS",
      "CAC 대 60일 LTV",
      "재구매율",
      "재고 보유 일수"
    ],
    "brainUse": "모든 에이전트가 하나의 공유 G-Brain에서 읽습니다. SKU 경제성, 브랜드 목소리, 핵심 크리에이티브에서 얻은 교훈, 고객 세그먼트가 들어 있어서, 잘 먹힌 광고 각도가 Klaviyo 흐름과 상품 상세 문구에 바로 반영됩니다.",
    "signaturePlay": "Spend Sentinel이 밤사이 광고 세트별 지출을 Shopify와 매출원가 데이터로 계산한 실제 공헌이익과 대조합니다. 적자인 것은 자동으로 멈추고, 예산을 수익이 나는 핵심 크리에이티브로 옮기며, 어제 버려진 장바구니 고객에게 Klaviyo·Postscript 윈백 메시지를 보냅니다. 그래서 운영자는 이미 손해 본 것을 잘라 내고 돈을 쫓아 둔 브랜드를 보며 깨어납니다."
  },
  {
    "id": "persona-online-coach",
    "order": 4,
    "name": "개인 온라인 코치",
    "archetype": "변화 코치",
    "tagline": "고객이 성과를 내고, 남고, 추천합니다. 사업은 스스로 돌아갑니다.",
    "summary": "1:1과 그룹으로 변화를 돕는 코치(피트니스·건강·마인드셋)입니다. 프리미엄 개인 고객과 기수제 프로그램을 함께 운영합니다. 이 OS 변형은 코칭을 운영 체계로 바꿉니다. 모든 리드를 키우고, 모든 고객을 온보딩하고, 모든 체크인에 답하고, 위험한 고객을 잡아내고, 모든 성과를 추천이나 후기로 바꿉니다.",
    "accent": "#ffc53d",
    "northStar": "활성 유지 고객 수 × 90일 변화 달성률",
    "pillars": [
      {
        "name": "유입",
        "focus": "리드와 상담 통화를 계약된 고객으로 바꿉니다",
        "agents": [
          "Lead Catcher",
          "Booking Bot",
          "Close Tracker"
        ]
      },
      {
        "name": "온보딩과 제공",
        "focus": "접수, 프로그램 구성, 첫날부터 고객이 움직이게 하기",
        "agents": [
          "Intake Bot",
          "Program Builder",
          "Loom Recap Bot"
        ]
      },
      {
        "name": "책임과 성과",
        "focus": "체크인, 습관 연속 기록, 변화 데이터 추적",
        "agents": [
          "Check-in Bot",
          "Streak Sentinel",
          "Results Logger"
        ]
      },
      {
        "name": "리텐션과 재계약",
        "focus": "이탈 위험 포착, 재계약 유도, 성과 수확",
        "agents": [
          "Churn Sentinel",
          "Renewal Closer",
          "Win Harvester"
        ]
      },
      {
        "name": "브랜드와 리드 생성",
        "focus": "파이프라인을 채우는 콘텐츠, 커뮤니티, 추천 엔진",
        "agents": [
          "Content Bot",
          "Community Bot",
          "Referral Bot"
        ]
      }
    ],
    "connectors": [
      "Trainerize",
      "Calendly",
      "Stripe",
      "Kajabi",
      "Typeform",
      "WhatsApp",
      "Loom",
      "Circle"
    ],
    "metrics": [
      "활성 유지 고객 수",
      "90일 변화 달성률",
      "체크인 응답률",
      "재계약률",
      "추천 및 후기 수"
    ],
    "brainUse": "모든 에이전트가 하나의 공유 고객 기억을 읽습니다. 목표, 부상, 영양 목표치, 마일스톤, 마지막 대화 맥락이 들어 있어서, 체크인과 요약과 재계약 메시지가 모두 고객을 실제로 아는 코치의 목소리로 나옵니다.",
    "signaturePlay": "모든 고객 체크인을 자동으로 가져와 목표에 비추어 점수를 매기고, 맞춤형 음성·문자 답장 초안을 쓰거나 이탈 알림을 보냅니다. 그래서 아무도 연락이 끊기지 않고, 어떤 성과도 기록되지 않은 채 지나가지 않으며, 모든 변화가 후기와 추천 요청으로 이어집니다."
  },
  {
    "id": "persona-saas-founder",
    "order": 5,
    "name": "SaaS 커맨드 센터",
    "archetype": "SaaS 창업자",
    "tagline": "제품, 성장, MRR을 자동 조종으로 돌리는 1인 인디 SaaS 창업자",
    "summary": "외부 투자 없이 셀프 서비스 SaaS를 혼자 운영하는 인디 소프트웨어 창업자입니다. 이 OS 변형은 가입부터 확장, 이탈 방어까지 퍼널 전체를 이름 붙은 에이전트들의 닫힌 루프로 바꿉니다. 그래서 한 사람이 시리즈 A 성장팀처럼 움직입니다.",
    "accent": "#a855f7",
    "northStar": "순 MRR 성장 (신규 + 확장 − 이탈)",
    "pillars": [
      {
        "name": "유입",
        "focus": "퍼널 상단 성장 루프, SEO, 체험판 가입",
        "agents": [
          "Loop Engine",
          "SEO Crawler",
          "Trial Capture"
        ]
      },
      {
        "name": "활성화",
        "focus": "신규 가입자를 첫 가치(아하 모먼트)까지 온보딩",
        "agents": [
          "Onboarding Bot",
          "Aha Tracker",
          "Setup Nudger"
        ]
      },
      {
        "name": "리텐션",
        "focus": "해지 전 이탈 예측과 윈백",
        "agents": [
          "Churn Sentinel",
          "Win-Back Agent",
          "Expansion Hunter"
        ]
      },
      {
        "name": "지원",
        "focus": "문의함 분류, 티켓 전환 차단, 실제 티켓에서 만든 문서",
        "agents": [
          "Ticket Triage",
          "Deflection Bot",
          "Docs Synth"
        ]
      },
      {
        "name": "매출 운영",
        "focus": "MRR, 미납 독촉, 모든 청구 이벤트를 한 화면에서",
        "agents": [
          "MRR Pulse",
          "Dunning Agent",
          "Churn Accountant"
        ]
      }
    ],
    "connectors": [
      "Stripe Billing",
      "Intercom",
      "PostHog",
      "Customer.io",
      "Linear",
      "Ahrefs",
      "Slack",
      "G-Brain"
    ],
    "metrics": [
      "순 MRR",
      "체험판 대 유료 전환율 %",
      "순 매출 유지율",
      "고객사 + 매출 이탈률 %",
      "활성화율 (아하까지 걸린 시간)"
    ],
    "brainUse": "모든 에이전트가 같은 G-Brain 코어를 읽고 씁니다. 기능 결정, 이탈 사유, 지원 답변, 온보딩 플레이북이 들어 있어서, 지원 답장, 문서 페이지, 윈백 이메일이 모두 같은 제품 기억을 바탕으로 말합니다.",
    "signaturePlay": "Churn Sentinel이 PostHog 사용량 감소와 Stripe 청구 신호를 지켜보고, 위험 계정을 매일 밤 점수화합니다. 그다음 Win-Back Agent가 맞춤형 Customer.io 유지 제안을 보내고, 이탈을 일으킨 기능 공백에 대해 Linear 이슈를 엽니다. 창업자가 자리에 없어도 감지, 유지, 수정이 한 바퀴 도는 루프입니다."
  },
  {
    "id": "persona-real-estate",
    "order": 6,
    "name": "부동산 팀장",
    "archetype": "중개 운영자",
    "tagline": "성과를 내는 팀을 운영합니다. 리드가 들어오고, 매물이 올라가고, 계약이 닫힙니다.",
    "summary": "주거용 부동산 물량이 많은 팀을 이끄는 팀장이자 관리 중개인입니다. 이 OS 변형은 새는 리드-계약 파이프라인을 기계로 바꿉니다. 리드는 60초 안에 처리되고, 매물은 바로 올라가 여러 채널로 배포되며, 방문 예약은 계속 잡히고, 모든 거래는 아무것도 빠뜨리지 않고 결승선을 넘습니다.",
    "accent": "#22c55e",
    "northStar": "분기별 순 체결 GCI (체결되고 자금이 집행된 거래의 중개 수수료)",
    "pillars": [
      {
        "name": "리드 확보와 전환",
        "focus": "들어오는 매수·매도 리드를 예약된 약속으로",
        "agents": [
          "Speed-to-Lead Bot",
          "Drip Nurturer",
          "ISA Caller"
        ]
      },
      {
        "name": "매물과 마케팅",
        "focus": "모든 매물을 등록하고, 가격을 매기고, 출시하고, 배포합니다",
        "agents": [
          "Listing Launcher",
          "CMA Pricer",
          "Syndication Bot",
          "Open House Bot"
        ]
      },
      {
        "name": "방문과 거래",
        "focus": "방문을 예약하고 거래를 체결까지 끌고 갑니다",
        "agents": [
          "Showing Scheduler",
          "Deal Driver",
          "Compliance Hawk"
        ]
      },
      {
        "name": "팀과 책임",
        "focus": "중개인 실적, 수수료 배분, 파이프라인 커버리지",
        "agents": [
          "Roster Tracker",
          "Lead Router",
          "Split Calculator"
        ]
      },
      {
        "name": "고객 관리와 데이터베이스",
        "focus": "기존 고객, 리뷰, 재계약과 추천 거래",
        "agents": [
          "Review Harvester",
          "SOI Reactivator",
          "Closing Concierge"
        ]
      }
    ],
    "connectors": [
      "MLS / RESO Web API",
      "Follow Up Boss",
      "dotloop",
      "ShowingTime",
      "Zillow Premier Agent",
      "BombBomb"
    ],
    "metrics": [
      "리드 응대 속도 (첫 연락 평균 시간)",
      "리드 대 약속 전환율 %",
      "활성 매물 + 시장 체류 일수",
      "계약 대기 대 체결 비율",
      "GCI 파이프라인 (대기 + 체결)"
    ],
    "brainUse": "하나의 공유 G-Brain에 모든 리드의 이력, 매물 메모, 시세 비교, 기존 고객 관계가 들어 있습니다. 그래서 전화나 문자에 답하는 에이전트는 이미 전체 맥락을 알고 있습니다.",
    "signaturePlay": "밤 11시에 Zillow 리드가 들어옵니다. Speed-to-Lead Bot이 60초 안에 문자를 보내고, G-Brain에 비추어 예산과 일정을 확인합니다. 뜨거운 리드는 당번 중개인에게 넘기고, 리드가 경쟁사에 전화하기 전에 ShowingTime에 방문을 예약합니다."
  },
  {
    "id": "persona-course-creator",
    "order": 7,
    "name": "강의 크리에이터 / 정보 상품 운영자",
    "archetype": "강의 크리에이터",
    "tagline": "기수 과정, 상시 퍼널, 수강생의 성과를 자동 조종으로.",
    "summary": "유료 기수 과정과 상시 운영되는 에버그린 퍼널을 돌리는 정보 상품 판매자입니다. 이 OS 변형은 출시를 조율하고, 수강생이 강의를 끝까지 듣게 하고, 후기와 제휴 수익을 거둡니다. 그래서 창업자가 대시보드에 붙어 있지 않아도 수강 등록이 복리로 늘어납니다.",
    "accent": "#f59e0b",
    "northStar": "수강 매출 × 수강 완료율 (실제로 끝까지 듣는 수강생에게서 나오는 매출)",
    "pillars": [
      {
        "name": "퍼널과 출시",
        "focus": "에버그린 퍼널 + 실시간 출시 장바구니, 긴박감, 장바구니 오픈 운영",
        "agents": [
          "Cart Sentinel",
          "Launch Conductor",
          "Webinar Bot",
          "Deadline Driver"
        ]
      },
      {
        "name": "독자와 콘텐츠",
        "focus": "퍼널 상단 콘텐츠, 리드 자석, 퍼널에 공급되는 리스트 성장",
        "agents": [
          "Lead-Magnet Bot",
          "Content Repurposer",
          "List Builder"
        ]
      },
      {
        "name": "수강생 성공",
        "focus": "온보딩, 완료 독려, 커뮤니티 참여, 후기 수집",
        "agents": [
          "Onboarding Bot",
          "Completion Sentinel",
          "Win Harvester",
          "Community Pulse"
        ]
      },
      {
        "name": "매출과 회수",
        "focus": "결제 매출, 할부 플랜, 결제 실패 독촉, 환불·차지백 감시",
        "agents": [
          "Checkout Pulse",
          "Dunning Bot",
          "Refund Watch"
        ]
      },
      {
        "name": "제휴와 파트너",
        "focus": "제휴 모집, 홍보 문구, 수수료 추적, JV 출시 운영",
        "agents": [
          "Affiliate Recruiter",
          "Commission Bot",
          "Swipe Smith"
        ]
      }
    ],
    "connectors": [
      "Kajabi",
      "ThriveCart",
      "ConvertKit",
      "Circle",
      "Deadline Funnel",
      "Stripe",
      "Zoom",
      "PartnerStack"
    ],
    "metrics": [
      "장바구니 전환율",
      "강의 완료율",
      "이메일 리스트 성장 + EPC",
      "환불 / 차지백 비율",
      "제휴 유입 매출 %"
    ],
    "brainUse": "모든 에이전트가 하나의 공유 G-Brain을 읽습니다. 강의 커리큘럼, 홍보 문구, 수강생 FAQ, 이의 대응 스크립트, 과거 출시 수치가 들어 있어서, 온보딩 독려, 판매 답변, 제휴 홍보 문구가 하나의 일관된 목소리로 나옵니다.",
    "signaturePlay": "에버그린 출시 루프입니다. 리드가 웨비나를 다 보는 순간 Deadline Driver가 개인 마감이 있는 장바구니를 열고, Cart Sentinel이 ConvertKit 시퀀스를 보내며, Dunning Bot이 실패한 할부 결제를 살려 냅니다. 한편 Completion Sentinel은 새 수강생을 3모듈로 밀어 주고, Win Harvester는 수강생이 Circle에 성과를 올리는 즉시 후기를 받아 냅니다. 등록 한 건이 다음 판매를 파는 증거가 됩니다."
  },
  {
    "id": "persona-local-service",
    "order": 8,
    "name": "현장 서비스 OS",
    "archetype": "생활 서비스 운영자",
    "tagline": "트럭과 장비를 가진 가게의 오너. 모든 작업이 예약되고, 배차되고, 결제됩니다.",
    "summary": "트럭 여러 대를 굴리는 지역 냉난방·배관·공사 업체 오너입니다. 이 OS 변형은 서비스 업체의 전화와 화이트보드 혼돈을 닫힌 루프로 바꿉니다. 놓친 전화는 예약된 작업이 되고, 예약된 작업은 배정된 기사가 되며, 끝난 작업은 결제된 청구서와 별점 5개 리뷰가 되고, 모든 고객은 정기 점검 플랜으로 이어집니다.",
    "accent": "#0a85c2",
    "northStar": "트럭 하루당 예약 매출 (완료한 작업 × 평균 객단가, 가용 용량 대비).",
    "pillars": [
      {
        "name": "접수와 예약",
        "focus": "걸려 온 모든 전화, 양식, 놓친 전화를 예약된 작업 슬롯으로",
        "agents": [
          "Intake Bot",
          "Missed-Call Catcher",
          "Slot Booker"
        ]
      },
      {
        "name": "배차와 현장 운영",
        "focus": "알맞은 기사를 알맞은 작업에 보내고 보드를 가득 채웁니다",
        "agents": [
          "Dispatch Bot",
          "Route Optimizer",
          "Tech Tracker",
          "On-My-Way Texter"
        ]
      },
      {
        "name": "견적과 클로징",
        "focus": "견적을 빠르게 만들고, 보류 견적을 쫓고, 작업을 따냅니다",
        "agents": [
          "Estimate Builder",
          "Quote Chaser",
          "Upsell Prompter"
        ]
      },
      {
        "name": "매출과 플랜",
        "focus": "완료 시 청구하고, 대금을 받고, 정기 점검에 등록합니다",
        "agents": [
          "Invoice Closer",
          "Collections Bot",
          "Maintenance Enroller",
          "AR Sentinel"
        ]
      },
      {
        "name": "평판과 재방문",
        "focus": "리뷰를 모으고, 떠난 고객을 되찾고, 지역 순위를 지킵니다",
        "agents": [
          "Review Harvester",
          "Reputation Guard",
          "Win-Back Bot"
        ]
      }
    ],
    "connectors": [
      "Housecall Pro",
      "Jobber",
      "ServiceTitan",
      "CallRail",
      "Stripe",
      "QuickBooks Online",
      "Google Business Profile",
      "Twilio"
    ],
    "metrics": [
      "트럭 하루당 예약 매출",
      "전화 대 예약 전환율 %",
      "평균 객단가",
      "견적 수주율",
      "정기 점검 플랜 활성 회원 수"
    ],
    "brainUse": "모든 에이전트가 하나의 공유 G-Brain 코어를 읽습니다. 가격표, 서비스 권역 지도, 기사의 기술과 자격, 보증 조건, 고객별 설비 이력이 들어 있어서, 견적, 배차, 후속 연락이 모두 같은 숫자와 모든 건물에 대한 같은 기억을 바탕으로 말합니다.",
    "signaturePlay": "놓친 전화에서 결제까지 이어지는 루프입니다. 저녁 7시에 받지 못한 전화에는 즉시 문자가 가고, 다음 날 슬롯이 예약되며, 가장 가까운 자격 있는 기사에게 자동 배정됩니다. 새벽에는 \"출발합니다\" 문자가 나가고, 작업이 완료로 표시되는 순간 청구서가 발송되어 카드 결제가 이뤄지고, 10분 뒤 리뷰 요청이 나갑니다. 오너는 전화기를 만질 일이 없습니다."
  },
  {
    "id": "persona-fractional-exec",
    "order": 9,
    "name": "파트타임 임원 OS",
    "archetype": "파트타임 임원 운영자",
    "tagline": "파트타임 임원 한 명, 고객 조직 여섯 곳, 하나의 가게처럼 운영합니다.",
    "summary": "고객 회사 6~8곳으로 이뤄진 포트폴리오에서 자문 리테이너를 운영하는 파트타임 CFO·COO입니다. 시간이 아니라 프레임워크와 판단을 팝니다. 이 OS 변형은 모든 리테이너에 일감을 공급하고, 모든 산출물을 일정대로 내보내고, 모든 관계를 재계약이나 추천이 나올 만큼 따뜻하게 유지합니다. 그래서 운영자가 받은편지함에 살지 않아도 가동률이 높게 유지됩니다.",
    "accent": "#ff6259",
    "northStar": "포트폴리오 가동률 85% 이상에서의 월간 반복 리테이너 매출 (MRR)",
    "pillars": [
      {
        "name": "파이프라인과 리테이너",
        "focus": "들어오는 리드, 범위 협의 통화, 제안서, 리테이너 재계약",
        "agents": [
          "Scope Bot",
          "Proposal Drafter",
          "Renewal Watchdog",
          "Referral Tracer"
        ]
      },
      {
        "name": "고객 납품",
        "focus": "고객별 워크룸, 산출물, 활성 리테이너 전체의 주기",
        "agents": [
          "Engagement Lead",
          "Deliverable Forge",
          "Cadence Keeper",
          "Status Reporter"
        ]
      },
      {
        "name": "오피니언 리더십",
        "focus": "링크드인 에세이, 뉴스레터, 강연 · 파이프라인에 수요를 공급하는 엔진",
        "agents": [
          "Essay Drafter",
          "Hook Miner",
          "Repurpose Bot"
        ]
      },
      {
        "name": "사무소 재무",
        "focus": "리테이너 청구, 미수금 연령, 포트폴리오 전체의 가동률과 실질 시급",
        "agents": [
          "Invoice Runner",
          "AR Chaser",
          "Utilization Auditor"
        ]
      },
      {
        "name": "관계 운영",
        "focus": "모든 고객과 잠재 고객의 받은편지함과 DM을 맥락과 함께 하나의 분류된 대기열로",
        "agents": [
          "Inbox Triage",
          "Meeting Prep Bot",
          "Follow-up Sentinel"
        ]
      }
    ],
    "connectors": [
      "Ledger (CRM)",
      "Gmail",
      "Calendly",
      "Notion (client workrooms)",
      "Stripe (retainer billing)",
      "QuickBooks",
      "LinkedIn",
      "Recall (call notes)"
    ],
    "metrics": [
      "리테이너 MRR",
      "포트폴리오 가동률 %",
      "순 매출 유지율",
      "파이프라인 커버리지 (3배 규칙)",
      "실질 시급"
    ],
    "brainUse": "모든 고객의 프레임워크, 결정, 이사회 맥락, 이전 산출물이 하나의 G-Brain에 있습니다. 그래서 어떤 에이전트든 그 고객의 목소리로 초안을 쓰고, 이미 정해진 것을 다시 묻지 않습니다.",
    "signaturePlay": "고객과 통화가 끝나면 Recall 녹취록이 G-Brain에 들어갑니다. Deliverable Forge가 그 고객의 내부 스타일로 다음 메모나 모델 초안을 쓰고, Status Reporter가 워크룸에 진행 상황을 올리며, Cadence Keeper가 후속 미팅을 잡습니다. 운영자의 다음 통화가 끝나기 전에 일감이 이미 한 단계 나아가 있습니다."
  },
  {
    "id": "persona-community-operator",
    "order": 10,
    "name": "멤버십 커뮤니티 운영자",
    "archetype": "커뮤니티 운영자",
    "tagline": "유료 멤버십을 운영하는 크리에이터. 회원을 붙잡고, 계속 나타나게 합니다.",
    "summary": "독자층을 유료 멤버십·커뮤니티로 바꾼 크리에이터입니다. 정기 회원, 주간 라이브 통화, 체계적인 커리큘럼, 항상 돌아가는 커뮤니티 피드를 운영합니다. 이 OS 변형은 리텐션 장치 전체를 돌립니다. 이탈 조짐이 있는 회원을 지켜보고, 모든 행사 좌석을 채우고, 콘텐츠 주기를 일정대로 지키며, 카드가 거절되기 전에 위험한 구독을 살려 냅니다.",
    "accent": "#8b7cff",
    "northStar": "순 MRR 유지율 — 매달 유지되고 늘어난 회원",
    "pillars": [
      {
        "name": "멤버십 성장",
        "focus": "체험, 대기자 명단, 무료에서 유료 커뮤니티 회원으로의 전환",
        "agents": [
          "Waitlist Warden",
          "Trial Closer",
          "Referral Engine"
        ]
      },
      {
        "name": "리텐션과 이탈",
        "focus": "위험 감지, 미납 회수, 해지 방어",
        "agents": [
          "Churn Sentinel",
          "Dunning Recovery Bot",
          "Win-Back Agent"
        ]
      },
      {
        "name": "커뮤니티와 참여",
        "focus": "일일 피드 건강도, 회원 온보딩, 활동 회원의 연속 참여",
        "agents": [
          "Onboarding Concierge",
          "Engagement Pulse",
          "Ghost Hunter"
        ]
      },
      {
        "name": "행사와 라이브",
        "focus": "주간 통화, 참석 확인, 출석, 다시보기 배포",
        "agents": [
          "RSVP Wrangler",
          "Live Producer",
          "Replay Cutter"
        ]
      },
      {
        "name": "콘텐츠와 커리큘럼",
        "focus": "순차 발송 일정, 수업 주기, 회원 전용 콘텐츠 파이프라인",
        "agents": [
          "Drip Scheduler",
          "Curriculum Keeper",
          "Digest Writer"
        ]
      }
    ],
    "connectors": [
      "Circle",
      "Stripe Billing",
      "ConvertKit",
      "Discord",
      "Zoom Webinars",
      "Memberful",
      "Calendly",
      "G-Brain"
    ],
    "metrics": [
      "순 MRR 유지율",
      "월간 이탈률",
      "활성 회원 비율 (WAU/MAU)",
      "라이브 통화 출석률",
      "체험에서 유료 전환율"
    ],
    "brainUse": "모든 에이전트가 하나의 공유 회원 기억을 읽습니다. 사람마다의 가입일, 등급, 참여 이력, 마지막 로그인, 해지 방어와 윈백 시도가 들어 있어서, 해지 방어, 온보딩, 행사 독려가 일괄 발송이 아니라 개인에게 맞춘 메시지가 됩니다.",
    "signaturePlay": "Churn Sentinel이 14일 동안 로그인하지 않고 라이브 통화를 두 번 빠진 회원을 표시합니다. G-Brain에서 그 회원의 이력을 가져오고, Win-Back Agent가 맞춤형 윈백 메시지를 보냅니다. RSVP Wrangler는 다음 행사에 다시 초대합니다. 해지를 맞고 나서가 아니라 재결제일보다 몇 주 전에 이탈 조짐을 잡습니다."
  },
  {
    "id": "persona-law-firm",
    "order": 11,
    "name": "소규모 로펌 OS",
    "archetype": "담당 변호사",
    "tagline": "모든 사건이 움직이고, 모든 시간이 기록되고, 모든 기한이 안전합니다.",
    "summary": "접수, 사건 관리, 청구, 준법 업무 전체에 걸쳐 사건을 맡는 1인 또는 소규모 로펌의 담당 변호사입니다. 이 OS 변형은 쌓인 미결 사건 파일을 감시되는 사건 목록으로 바꿉니다. 모든 기한을 계산하고, 청구 가능한 모든 시간을 기록하고, 신탁 계좌의 모든 금액을 맞추고, 모든 의뢰인을 소식 흐름 안에 두어서 아무것도 미끄러지지 않고 사건이 방치되지 않게 합니다.",
    "accent": "#b8860b",
    "northStar": "기한 누락 0건에서의 수금 실현율 (청구한 시간 중 실제로 대금이 들어온 비율)",
    "pillars": [
      {
        "name": "접수와 이해충돌",
        "focus": "문의를 선별하고, 이해충돌을 해소하고, 사건 위임을 체결합니다",
        "agents": [
          "Intake Screener",
          "Conflict Checker",
          "Engagement Drafter",
          "Retainer Collector"
        ]
      },
      {
        "name": "사건 관리",
        "focus": "모든 진행 중 사건의 업무, 기한, 기일을 궤도 위에 올려 둡니다",
        "agents": [
          "Matter Pilot",
          "Docket Sentinel",
          "Task Router",
          "Limitations Watch"
        ]
      },
      {
        "name": "문서와 작성",
        "focus": "서식과 선례에서 문서를 초안 작성, 조립, 검토합니다",
        "agents": [
          "Draft Assembler",
          "Clause Librarian",
          "Redline Reviewer",
          "e-Filing Bot"
        ]
      },
      {
        "name": "청구와 신탁",
        "focus": "시간을 기록하고, 정해진 주기로 청구하고, 신탁 회계를 깨끗하게 유지합니다",
        "agents": [
          "Time Capturer",
          "Invoice Runner",
          "Trust Ledger Guard",
          "Collections Chaser"
        ]
      },
      {
        "name": "준법과 고객 관리",
        "focus": "법정 기한, 윤리 준수, 고객 소통",
        "agents": [
          "Deadline Guardian",
          "CLE Tracker",
          "Client Update Bot",
          "Review Harvester"
        ]
      }
    ],
    "connectors": [
      "Clio (practice management)",
      "LawPay",
      "NetDocuments",
      "Lexis+ / Westlaw",
      "Microsoft 365 (Outlook)",
      "DocuSign",
      "Court e-Filing (PACER / state)",
      "QuickBooks Online"
    ],
    "metrics": [
      "실현율 (청구 대비 수금)",
      "변호사 1인당 기록된 청구 가능 시간",
      "개시 대 종결 사건 수",
      "청구까지 걸린 일수 (미청구 업무 연령)",
      "기한 / 출소기간 준수율 (누락 0건)"
    ],
    "brainUse": "하나의 공유 G-Brain에 모든 사건의 사실관계, 선례, 이전 제출 서류, 고객 이력, 사무소 플레이북이 들어 있습니다. 그래서 어떤 에이전트든 사무소 자체의 작업 결과물을 바탕으로 초안을 쓰고, 이미 정리된 내용을 다시 조사하지 않습니다.",
    "signaturePlay": "새 문의가 들어오면 Conflict Checker가 G-Brain의 고객과 사건 관계도에 비추어 이해충돌을 확인합니다. Engagement Drafter가 사무소의 문체로 리테이너와 보수 약정서를 만들고, Retainer Collector가 LawPay를 통해 착수금을 신탁 계좌로 받습니다. Docket Sentinel은 관할 규칙에 따라 법정 기한을 모두 미리 계산해서 사건을 엽니다. 그래서 변호사는 파일을 처음부터 만들지 않고 검토하고 서명합니다."
  }
];
