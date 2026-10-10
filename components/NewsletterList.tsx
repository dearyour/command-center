'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import type { Newsletter } from '@/lib/newsletters';

const fmt = (n: number) => n.toLocaleString('en-US');
const pct = (n: number) => `${n.toFixed(n < 10 ? 2 : 1)}%`;
const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', year: 'numeric' });

/** A labeled metric cell inside the expanded analytics grid. */
function Metric({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'ok' | 'warn' | 'err' }) {
  const color = tone === 'ok' ? 'text-os-ok' : tone === 'warn' ? 'text-os-warn' : tone === 'err' ? 'text-os-err' : 'text-os-text';
  return (
    <div className="rounded-[8px] border border-os-border bg-os-surface px-3 py-2.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-os-dim">{label}</div>
      <div className={`mt-1 font-mono text-[17px] font-semibold leading-none tracking-[-0.02em] ${color}`}>{value}</div>
      {sub && <div className="mt-1 font-mono text-[9.5px] text-os-dim">{sub}</div>}
    </div>
  );
}

/**
 * The expandable newsletter list: each past send is a row showing its open
 * rate and audience collapsed; clicking it unfolds the full send analytics
 * (delivery, opens, clicks, unsubscribes, spam, web). Newest first.
 */
export function NewsletterList({ newsletters }: { newsletters: Newsletter[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (newsletters.length === 0) {
    return <p className="py-6 text-center text-[12.5px] text-os-dim">아직 뉴스레터가 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {newsletters.map((n) => {
        const expanded = openId === n.id;
        return (
          <div key={n.id} className="overflow-hidden rounded-[10px] border border-os-border bg-os-bg">
            <button
              onClick={() => setOpenId(expanded ? null : n.id)}
              aria-expanded={expanded}
              className="pressable flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-[color-mix(in_oklab,var(--text)_4%,transparent)]"
            >
              <span className="shrink-0 text-os-dim">
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium">{n.title}</span>
                <span className="mt-0.5 block font-mono text-[11px] text-os-dim">
                  {dateLabel(n.publishedAt)} · {fmt(n.recipients)}명 발송
                </span>
              </span>
              <span className="hidden shrink-0 font-mono text-[11px] tabular-nums text-os-dim sm:inline">클릭 {pct(n.clickRate)}</span>
              <span
                className="shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[11px] tabular-nums tracking-[0.04em]"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                title="오픈율"
              >
                {pct(n.openRate)} open
              </span>
            </button>

            {expanded && (
              <div className="border-t border-os-border px-5 pb-5 pt-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                  <Metric label="수신자" value={fmt(n.recipients)} />
                  <Metric label="전달됨" value={fmt(n.delivered)} sub={'전달률 ' + pct(n.deliveryRate)} tone="ok" />
                  <Metric label="오픈율" value={pct(n.openRate)} sub={'열람 ' + fmt(n.opens)} tone="ok" />
                  <Metric label="클릭률" value={pct(n.clickRate)} sub={'클릭 ' + fmt(n.clicks)} />
                  <Metric label="구독 해지" value={fmt(n.unsubscribes)} sub={pct(n.unsubscribeRate)} tone={n.unsubscribeRate > 1 ? 'warn' : undefined} />
                  <Metric label="스팸 신고" value={fmt(n.spamReports)} tone={n.spamReports > 0 ? 'warn' : undefined} />
                  <Metric label="웹 조회" value={fmt(n.webViews)} />
                  <Metric label="전달률" value={pct(n.deliveryRate)} />
                </div>
                {n.webUrl && (
                  <a
                    href={n.webUrl}
                    target="_blank"
                    rel="noreferrer"
                    data-lens="c"
                    className="pressable is-dark mt-4 inline-flex items-center gap-1.5 rounded-full border border-os-border px-3.5 py-1.5 text-[12.5px] text-os-accent"
                  >
                    Read the issue <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
