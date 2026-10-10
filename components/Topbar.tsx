'use client';

import { usePathname } from 'next/navigation';
import { Bot, Search } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { OsMark } from '@/components/OsMark';
import { CONDUCTOR_OPEN_EVENT } from '@/components/ConductorPanel';

const SEGMENT_LABELS: Record<string, string> = {
  '': '홈',
  comms: '커뮤니케이션',
  funnel: '퍼널',
  workflows: '워크플로',
  social: '소셜',
  content: '콘텐츠',
  'brand-deals': '브랜드-협찬',
  finances: '재무',
  trading: '트레이딩',
  adpilot: '광고-파일럿',
  agents: '에이전트',
  chats: '채팅',
  tasks: '작업',
  skills: '스킬',
  org: '조직도',
  blueprint: '설계도',
  brain: 'g-brain',
  doctor: '진단',
  integrations: '연결',
  usage: '사용량',
  roadmap: '로드맵',
  analytics: '분석',
  reference: '참조-모델',
  personas: '페르소나',
};

export function openPalette() {
  window.dispatchEvent(new CustomEvent('alex:palette'));
}

export function Topbar() {
  const pathname = usePathname();
  const segment = pathname.split('/')[1] ?? '';
  const here = SEGMENT_LABELS[segment] ?? segment;

  return (
    <div className="sticky top-0 z-30 flex h-[52px] shrink-0 items-center gap-3.5 border-b border-os-border bg-os-bg2/70 px-6 backdrop-blur">
      <div className="flex items-center gap-[7px] whitespace-nowrap font-mono text-[11px] tracking-[0.04em] text-os-dim">
        <span>command-center</span>
        <span className="opacity-45">/</span>
        <span className="text-os-text">{here}</span>
      </div>
      <div className="ml-auto flex items-center gap-2.5">
        <ThemeToggle />
        <button
          onClick={openPalette}
          title="명령 팔레트 (⌘K)"
          data-lens="c"
          className="pressable is-dark grid h-[30px] w-[30px] place-items-center rounded-ctl border border-os-border bg-os-surface text-os-muted hover:text-os-text"
        >
          <Search className="h-3.5 w-3.5" />
        </button>
        {/* the agent dock, on the far right where ⌘K used to sit — the
            Conductor answers about whatever screen you're on */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent(CONDUCTOR_OPEN_EVENT))}
          title="이 화면에 대해 컨덕터에게 물어보기"
          aria-label="컨덕터 에이전트 패널 열기"
          data-lens="c"
          className="pressable is-dark grid h-[30px] w-[30px] place-items-center rounded-ctl border border-os-border bg-os-surface text-os-muted hover:text-os-accent"
        >
          <Bot className="h-3.5 w-3.5" />
        </button>
        {/* Command Center emblem — brand mark in the top-right corner */}
        <OsMark size={26} className="ml-1 shrink-0" />
      </div>
    </div>
  );
}
