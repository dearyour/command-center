'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { AsyncButton } from '@/components/AsyncButton';

type Hit = { title: string; snippet: string; source: string };

/**
 * Mock 1d: the node hover card. 240px, panel radius, pinned bottom-left of the
 * graph canvas, entering on the shared `enter` animation. It names the node the
 * pointer last touched and gives two honest controls: "open note" jumps the
 * graph to that node's detail, and "gbrain › query" really runs
 * GET /api/brain?q=<label> and lists what came back — no fake destination.
 */
export function GraphNodeCard({
  label,
  kind,
  links,
  sub,
  onOpen,
  onDismiss,
}: {
  label: string;
  kind: string;
  links: number;
  sub?: string;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [failed, setFailed] = useState(false);

  const query = async () => {
    setFailed(false);
    setHits(null);
    try {
      const res = await fetch(`/api/brain?q=${encodeURIComponent(label)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { results: Hit[] };
      setHits(body.results ?? []);
    } catch {
      setFailed(true);
      throw new Error('query failed');
    }
  };

  return (
    <div className="enter w-60 rounded-panel border border-os-border-strong bg-os-bg px-3 py-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-os-dim">노드 · 미리보기 카드</div>
          <div className="mt-1 truncate text-[12px] font-bold text-os-text">{label}</div>
          <div className="mt-0.5 truncate font-mono text-[10px] text-os-dim">
            {sub ? `${sub} · ` : ''}
            {kind} · 연결 {links}개
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          title="닫기"
          aria-label="노드 카드 닫기"
          data-lens="c"
          className="pressable is-dark -mr-1 -mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-ctl text-os-dim"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpen}
          data-lens="c"
          className="pressable is-dark inline-flex h-[22px] items-center rounded-ctl border border-os-border bg-os-bg px-2 font-mono text-[10px] font-semibold text-os-muted"
        >
          메모 열기
        </button>
        <AsyncButton
          run={query}
          tone="secondary"
          busyLabel="검색 중"
          doneLabel="결과"
          failLabel="실패"
          failed={failed}
          className="!h-[22px] !px-2 !text-[10px]"
        >
          gbrain › 검색
        </AsyncButton>
      </div>

      {hits && (
        <div className="mt-2 border-t border-os-border pt-2">
          {hits.length === 0 ? (
            <p className="font-mono text-[10px] text-os-dim">브레인 저장소에 결과가 없습니다</p>
          ) : (
            <ul className="space-y-1">
              {hits.slice(0, 3).map((h) => (
                <li key={h.title} className="truncate font-mono text-[10px] text-os-muted">
                  · {h.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
