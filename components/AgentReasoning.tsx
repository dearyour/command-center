'use client';

import { useMemo, useState } from 'react';
import { Chip } from '@/components/Pressable';
import type { TradeAnalysis } from '@/lib/schemas';
import { statusKo } from '@/lib/status-labels';

/** Verdict marker. Colour is status only, so the word carries the meaning. */
function Verdict({ verdict }: { verdict: string }) {
  const tone = verdict === 'signal' ? 'text-os-ok' : verdict === 'dropped' ? 'text-os-dim' : 'text-os-muted';
  return <span className={`shrink-0 font-mono text-[9px] uppercase tracking-wider ${tone}`}>{statusKo(verdict)}</span>;
}

/** The chip order the strategy actually thinks in; anything else it invents
 *  lands after these, alphabetically, rather than being hidden. */
const VERDICT_ORDER = ['signal', 'watch', 'dropped'];

/**
 * The body of the reasoning card on the /trading slab: the agent's notes for
 * its latest run, verdict chips built from the verdicts present in the run
 * (never a hard-coded list), and the per-ticker rows. The card head is drawn
 * by the board; this owns the two scrolling regions, each capped so a long
 * run can never stretch the row it shares with the positions card.
 */
export function AgentReasoning({ analysis, now }: { analysis: TradeAnalysis | null; now: number }) {
  const [filter, setFilter] = useState<string>('all');
  void now;

  const verdicts = useMemo(() => {
    if (!analysis) return [];
    const seen = [...new Set(analysis.rows.map((r) => r.verdict))];
    return seen.sort((a, b) => {
      const ia = VERDICT_ORDER.indexOf(a);
      const ib = VERDICT_ORDER.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.localeCompare(b);
    });
  }, [analysis]);

  const rows = analysis ? analysis.rows.filter((r) => filter === 'all' || r.verdict === filter) : [];

  if (!analysis) {
    return (
      <div className="px-6 py-10 text-center text-[12.5px] leading-relaxed text-os-dim">
        아직 올라온 분석이 없습니다. 에이전트는 거래 여부와 관계없이 실행할 때마다 여기에 기록합니다.
      </div>
    );
  }

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col">
      {/* The agent writes a lot here, and it is worth reading, but it must not
          push the per-ticker list off the card. Both regions scroll in their own right. */}
      {analysis.notes && (
        <p className="mx-6 max-h-[132px] shrink-0 overflow-y-auto rounded-[10px] border border-os-border bg-os-bg px-3.5 py-3 text-[11.5px] leading-relaxed text-os-muted [text-wrap:pretty]">
          {analysis.notes}
        </p>
      )}
      {verdicts.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-1.5 px-6 py-3">
          <Chip on={filter === 'all'} onClick={() => setFilter('all')}>
            전체
          </Chip>
          {verdicts.map((v) => (
            <Chip key={v} on={filter === v} onClick={() => setFilter(v)}>
              {statusKo(v)}
            </Chip>
          ))}
        </div>
      )}
      <ul className="max-h-[260px] min-h-[120px] flex-1 overflow-y-auto border-t border-os-border">
        {rows.map((r) => (
          <li key={r.ticker} className="border-b border-os-hairline px-6 py-2.5 last:border-b-0 animate-enter">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="font-mono text-[12.5px] font-bold">{r.ticker}</span>
              <span className="font-mono text-[10px] tabular-nums text-os-dim">{r.score === null ? '점수 없음' : `점수 ${r.score}`}</span>
              <span className="flex-1" />
              <Verdict verdict={r.verdict} />
            </div>
            {r.reason && <div className="mt-0.5 line-clamp-3 text-[11.5px] leading-snug text-os-dim [text-wrap:pretty]">{r.reason}</div>}
          </li>
        ))}
        {rows.length === 0 && (
          <li className="px-6 py-6 text-center font-mono text-[11px] text-os-dim">
            {analysis.rows.length === 0 ? '이번 실행에는 종목별 상세 기록이 없습니다.' : `이번 실행에는 '${statusKo(filter)}' 항목이 없습니다.`}
          </li>
        )}
      </ul>
    </div>
  );
}
