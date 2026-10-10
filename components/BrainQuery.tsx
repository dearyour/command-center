'use client';

import { useState } from 'react';

type Hit = { title: string; snippet: string; source: string };
type QueryState =
  | { phase: 'idle' }
  | { phase: 'busy'; query: string }
  | { phase: 'done'; query: string; hits: Hit[] }
  | { phase: 'error'; query: string; message: string };

/** Live `gbrain ›` prompt — hits GET /api/brain?q= (hybrid search, local fallback). */
export function BrainQuery({ fallbackActive }: { fallbackActive: boolean }) {
  const [q, setQ] = useState('');
  const [state, setState] = useState<QueryState>({ phase: 'idle' });

  async function run() {
    const query = q.trim();
    if (!query || state.phase === 'busy') return;
    setState({ phase: 'busy', query });
    try {
      const res = await fetch(`/api/brain?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { results: Hit[] };
      setState({ phase: 'done', query, hits: body.results });
      setQ('');
    } catch (err) {
      setState({ phase: 'error', query, message: err instanceof Error ? err.message : String(err) });
    }
  }

  const statusLine =
    state.phase === 'busy'
      ? '검색 중 — 하이브리드 (로컬 + bge-m3)…'
      : state.phase === 'done'
        ? `결과 ${state.hits.length}개 · "${state.query}"${fallbackActive ? ' · 로컬 대체 검색 (supabase 일시정지)' : ''}`
        : state.phase === 'error'
          ? `검색 실패 · ${state.message}`
          : '↵ 를 누르면 세컨드 브레인을 검색합니다';

  return (
    <div className="flex min-h-[220px] flex-1 flex-col rounded-lg-t border border-os-border bg-os-surface p-1">
      <div className="flex items-center gap-[9px] border-b border-os-border px-3.5 py-[11px] font-mono text-xs">
        <span className="font-bold text-os-accent">gbrain ›</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          // the pop-out's whole point is the prompt — land the caret in it
          autoFocus
          placeholder="세컨드 브레인 검색…"
          className="flex-1 bg-transparent font-mono text-xs text-os-text outline-none placeholder:text-os-dim"
        />
        <kbd className="rounded-sm-t border border-os-border-strong border-b-2 bg-os-surface px-1.5 py-0.5 font-mono text-[10px] text-os-muted">
          ↵
        </kbd>
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto p-2">
        <div className={`px-[11px] py-1.5 font-mono text-[10px] tracking-[0.08em] ${state.phase === 'error' ? 'text-os-err' : 'text-os-dim'}`}>
          {statusLine}
        </div>
        {state.phase === 'done' &&
          state.hits.map((hit) => (
            <div
              key={hit.title}
              data-lens="r"
              className="pressable is-row rounded-ctl border border-transparent px-[11px] py-[9px]"
            >
              <div className="flex items-baseline gap-2 font-mono text-[11.5px] text-os-text">
                <span className="text-os-accent">▸</span>
                <span className="min-w-0 flex-1 truncate">{hit.title}</span>
                <span className="shrink-0 font-mono text-[10px] text-os-accent">{hit.source}</span>
              </div>
              <div className="mt-[3px] text-[11px] leading-relaxed text-os-dim">{hit.snippet}</div>
            </div>
          ))}
        {state.phase === 'done' && state.hits.length === 0 && (
          <div className="px-[11px] py-2 text-[11px] text-os-dim">
            일치하는 결과가 없습니다 — 더 넓은 표현으로 검색하거나 다음 명령으로 저장소를 확인하세요 <code className="font-mono">gbrain doctor</code>
          </div>
        )}
      </div>
    </div>
  );
}
