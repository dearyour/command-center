'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { SlidingTabs } from '@/components/SlidingTabs';
import { DeliverablesList } from '@/components/DeliverablesList';
import { NeedsYouList } from '@/components/NeedsYouList';
import { TaskReviewPanel } from '@/components/TaskReviewPanel';
import { needsYou } from '@/lib/board-approvals';
import { partitionByDecision } from '@/lib/deliverable-decisions';
import type { DeliverableItem } from '@/lib/board-deliverables';
import { useDeliverables } from '@/components/useDeliverables';

/**
 * /agents tab shell — "Roster" is the OS's own agent runtime (children,
 * server-rendered); "Hermes" embeds the stock worker-pool dashboard from the
 * mini over the private network. We embed rather than rebuild so Hermes updates never
 * cost us UI work. The iframe mounts on first activation only (visited flag)
 * and stays mounted after, so switching back is instant and /agents never
 * pays the dashboard load cost unless the tab is used.
 *
 * Deliverables data is fetched HERE rather than inside the list, because the
 * unread badge has to count new items while that list is unmounted.
 */
type TabId = 'roster' | 'hermes' | 'deliverables' | 'needsyou';

/** A round count that rides inside a tab label. Round, not square: the square
    badge belongs to SlidingTabs' own `count` slot, which the other two
    consumers use — these three are status colors and read as dots that grew. */
function TabBadge({ n, tone, title }: { n: number; tone: 'warn' | 'err' | 'ok'; title: string }) {
  return (
    <span
      title={title}
      className={`inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 font-mono text-[9px] font-bold leading-none text-os-bg ${
        tone === 'warn' ? 'bg-os-warn' : tone === 'err' ? 'bg-os-err' : 'bg-os-ok'
      }`}
    >
      {n}
    </span>
  );
}

export function AgentsTabs({
  hermesUrl,
  boardUrl = null,
  children,
}: {
  hermesUrl: string;
  boardUrl?: string | null;
  children: React.ReactNode;
}) {
  const [tab, setTab] = useState<TabId>('roster');
  const [visited, setVisited] = useState(false);
  const [reviewing, setReviewing] = useState<DeliverableItem | null>(null);
  const {
    groups,
    refreshing,
    reload,
    unseenCount,
    changedCount,
    acknowledge,
    decisions,
    decide,
    unseenOf,
    markItemOpened,
    dismissMany,
    snoozedOf,
    snooze,
    wake,
  } = useDeliverables();

  // Opening an item is what clears ITS dot. Doing this on the tab, rather than
  // inside the panel, keeps the panel a pure renderer.
  const openItem = (item: DeliverableItem) => {
    markItemOpened(item);
    setReviewing(item);
  };

  // The waiting count is NOT the unread badge. Unread clears when the operator looks;
  // this one clears only when the agents stop asking, or when the operator makes the call
  // — an approved or dismissed file is no longer waiting on a decision.
  const waiting =
    groups === null
      ? 0
      : partitionByDecision(
          needsYou(groups.flatMap((g) => g.items).filter((i) => i.kind === 'file')),
          decisions,
        ).open.length;

  // Looking at the tab is what clears it, whether the operator switched to it or was
  // already sitting on it when something new landed.
  useEffect(() => {
    if (tab === 'deliverables' && unseenCount + changedCount > 0) acknowledge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, unseenCount, changedCount]);

  // Hermes is the only tab with a mount cost, so switching TO it is what arms
  // the iframe. Every other switch is a plain setTab.
  const switchTo = (id: TabId) => {
    setTab(id);
    if (id === 'hermes') setVisited(true);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* One sliding underline across fixed 150px tabs: the marker travels
          between them instead of each tab owning its own border, so nothing
          jumps when the active tab changes width. */}
      <div className="mb-4 flex shrink-0 items-center gap-1">
        <SlidingTabs<TabId>
          tabs={[
            { id: 'roster', label: '명단' },
            {
              id: 'needsyou',
              label: (
                <>
                  확인 필요
                  {waiting > 0 && (
                    <TabBadge n={waiting} tone="warn" title={`에이전트 파일 ${waiting}개가 확인을 기다리는 중`} />
                  )}
                </>
              ),
            },
            {
              id: 'deliverables',
              label: (
                <>
                  산출물
                  {changedCount > 0 && (
                    <TabBadge n={changedCount} tone="err" title={`마지막으로 본 이후 ${changedCount}개 변경됨`} />
                  )}
                  {unseenCount > 0 && (
                    <TabBadge n={unseenCount} tone="ok" title={`마지막으로 본 이후 ${unseenCount}개 새로 생김`} />
                  )}
                </>
              ),
            },
            { id: 'hermes', label: 'Hermes' },
          ]}
          value={tab}
          onChange={switchTo}
          tabWidth={150}
        />
        {tab === 'hermes' && (
          <a
            href={hermesUrl}
            target="_blank"
            rel="noreferrer"
            data-lens="c"
            className="pressable is-dark ml-auto flex items-center gap-1 rounded-ctl px-2 py-1 font-mono text-[10px] text-os-dim hover:text-os-text"
          >
            전체 대시보드 열기 <ArrowUpRight className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Roster stays mounted always (server-rendered content must not remount) */}
      <div className={tab === 'roster' ? 'min-h-0 flex-1' : 'hidden'}>{children}</div>

      {/* The queue of work asking for the operator's decision, from the same payload */}
      {tab === 'needsyou' && (
        <NeedsYouList
          groups={groups}
          refreshing={refreshing}
          onRefresh={reload}
          boardUrl={boardUrl}
          decisions={decisions}
          onOpen={openItem}
          unseenOf={unseenOf}
          onDismissMany={(items) => void dismissMany(items)}
          onDecide={(id, d, rev) => decide(id, d, rev)}
          snoozedOf={snoozedOf}
          onSnooze={snooze}
          onWake={wake}
        />
      )}

      {/* Agent deliverables — files the board agents actually produced */}
      {tab === 'deliverables' && (
        <DeliverablesList
          groups={groups}
          refreshing={refreshing}
          onRefresh={reload}
          onOpen={openItem}
          unseenOf={unseenOf}
        />
      )}

      {/* Read the work, then approve or dismiss it, without leaving the tab */}
      <TaskReviewPanel
        item={reviewing}
        decision={reviewing ? decisions[reviewing.id] : undefined}
        onDecide={(id, d, rev) => void decide(id, d, rev)}
        onClose={() => setReviewing(null)}
      />

      {/* Hermes dashboard — lazy first mount, then kept alive */}
      {visited && (
        <div className={tab === 'hermes' ? '' : 'hidden'}>
          <iframe
            src={hermesUrl}
            title="Hermes 작업자 풀 대시보드"
            className="h-[calc(100dvh-14rem)] min-h-[480px] w-full rounded-panel border border-os-border bg-os-bg"
          />
          <div className="mt-1.5 font-mono text-[9.5px] text-os-dim">
            호스트에서 실시간으로 불러온 기본 Hermes 대시보드입니다. 비어 있거나 오류가 나면
            os-host의 대시보드 프로세스가 꺼져 있을 수 있습니다 (VPN 서버가 502를 응답).
          </div>
        </div>
      )}
    </div>
  );
}
