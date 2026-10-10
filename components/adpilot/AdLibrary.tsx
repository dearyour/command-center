'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bookmark,
  ChevronDown,
  Library as LibraryBig,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import type { WallAd } from '@/lib/foreplay/wall';
import type { WatchEntry } from '@/lib/foreplay/watchlist';
import type { SavedAd } from '@/lib/foreplay/saved';
import type { Signal } from '@/lib/foreplay/signals';
import { forYou } from '@/lib/foreplay/personal';

/**
 * The Ad library: ONE bounded module (viewport-height, internal scroll;
 * the page ends cleanly after it). Tabs: For you (personalized, honest,
 * labeled ranking) · Search (concept mining) · Saved (the swipe file) ·
 * Watchlist · Activity (the wire, in plain English). Ask Adscout is the
 * prompt bar pinned at the top. Every surface wears the red glass
 * (.ap-panel): no teal tint on this page.
 */

type Props = {
  initialWall: WallAd[];
  watchlist: WatchEntry[];
  saved: SavedAd[];
  signals: Signal[];
  credits: { remaining: number; total: number } | null;
  lastSyncAt: string | null;
};

type Tab = 'foryou' | 'search' | 'saved' | 'watchlist' | 'activity';

const nf = new Intl.NumberFormat('en-US');

function ago(iso: string | null): string {
  if (!iso) return 'never';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}분 전`;
  if (mins < 60 * 36) return `${Math.round(mins / 60)}시간 전`;
  return `${Math.round(mins / 1440)}일 전`;
}

export function AdLibrary({ initialWall, watchlist: initialWatch, saved: initialSaved, signals, credits, lastSyncAt }: Props) {
  const [tab, setTab] = useState<Tab>('foryou');
  const [watchlist, setWatchlist] = useState(initialWatch);
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<WallAd | null>(null);
  const [mineResults, setMineResults] = useState<WallAd[] | null>(null);
  const [libOpen, setLibOpen] = useState(false);

  const savedIds = useMemo(() => new Set(saved.map((s) => s.ad.id)), [saved]);
  const savedAds = useMemo(() => saved.map((s) => s.ad), [saved]);

  // For-you: watchlist store + saved snapshots + last mine results, scored
  // against niche keywords, longevity, and the taste of what the operator saved.
  const feed = useMemo(() => {
    const pool = new Map<string, WallAd>();
    for (const ad of initialWall) pool.set(ad.id, ad);
    for (const ad of mineResults ?? []) pool.set(ad.id, ad);
    return forYou([...pool.values()], savedAds).slice(0, 30);
  }, [initialWall, mineResults, savedAds]);

  const toggleSave = async (ad: WallAd) => {
    const isSaved = savedIds.has(ad.id);
    const res = await fetch('/api/adscout/saved', {
      method: isSaved ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isSaved ? { adId: ad.id } : ad),
    });
    const body = await res.json();
    if (res.ok && body.ok) setSaved(body.saved);
  };

  const runSync = async () => {
    setBusy('sync');
    setNotice(null);
    try {
      const res = await fetch('/api/adscout/sync', { method: 'POST' });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setNotice(`새로고침됨: 브랜드 ${body.brands}개 · 새 신호 ${body.signals.length}개`);
      window.location.reload();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : '새로고침 실패');
      setBusy(null);
    }
  };

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'foryou', label: '추천' },
    { key: 'search', label: '검색' },
    { key: 'saved', label: '저장됨', count: saved.length },
    { key: 'watchlist', label: '관심 목록', count: watchlist.length },
    { key: 'activity', label: '활동', count: signals.length },
  ];

  return (
    <div>
      {/* Ask Adscout: the centerpiece: frosted glass with the orbiting glow */}
      <AskWidget wall={initialWall} onOpen={setSelected} />

      {/* The band: one loud element, two quiet ones */}
      <div className="mt-6 grid gap-4 lg:grid-cols-12">
        <button
          type="button"
          onClick={() => setLibOpen((v) => !v)}
          className="pressable ap-bright flex items-center justify-between p-5 text-left transition-transform hover:-translate-y-px lg:col-span-5"
        >
          <span>
            <span className="flex items-center gap-2 text-[16px] font-medium text-white">
              <LibraryBig className="h-5 w-5" strokeWidth={1.7} />
              {libOpen ? '광고 라이브러리 닫기' : '광고 라이브러리 열기'}
            </span>
            <span className="mt-1 block text-[12.5px] text-white/75">
              추적 중인 광고 {nf.format(initialWall.length)}개 · 저장 {saved.length}개 · 콘셉트로 검색하고, 잘 되는 광고를 저장하고, 다시 만드세요
            </span>
          </span>
          <ChevronDown className={`h-5 w-5 shrink-0 text-white/85 transition-transform ${libOpen ? 'rotate-180' : ''}`} strokeWidth={1.9} />
        </button>
        <div className="ap-panel p-5 lg:col-span-4">
          <div className="text-[12.5px] text-os-dim">API 크레딧</div>
          <div className="mt-1 text-[25px] font-light tabular-nums text-os-text">
            {credits ? (
              <>
                {nf.format(credits.remaining)} <span className="text-[14px] text-os-dim">/ {nf.format(credits.total)}</span>
              </>
            ) : (
              '연결 안 됨'
            )}
          </div>
          <div className="mt-2.5 flex gap-[3px]">
            {Array.from({ length: 20 }, (_, i) => (
              <span
                key={i}
                className="h-[10px] flex-1 rounded-[2px]"
                style={{
                  background:
                    credits && i < Math.round((credits.remaining / credits.total) * 20)
                      ? 'rgba(255,69,87,0.85)'
                      : 'rgba(255,255,255,0.07)',
                }}
              />
            ))}
          </div>
        </div>
        <div className="ap-panel flex flex-col justify-center p-5 lg:col-span-3">
          <button type="button" onClick={runSync} disabled={busy === 'sync'} className="pressable c-btn c-btn-primary flex items-center justify-center gap-2 py-2.5 text-[13px]">
            {busy === 'sync' ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.7} /> : <RefreshCw className="h-4 w-4" strokeWidth={1.7} />}
            데이터 새로고침
          </button>
          <div className="mt-2 text-center text-[12px] text-os-dim">{notice ?? `마지막 동기화 ${ago(lastSyncAt)}`}</div>
        </div>
      </div>

      {libOpen && (
        <div className="ap-panel mt-4 flex h-[80vh] flex-col overflow-hidden">
      {/* Tab rail */}
      <div className="flex gap-1 border-b border-[rgba(255,69,87,0.14)] px-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`pressable flex items-center gap-1.5 border-b-2 px-2.5 py-2.5 text-[12.5px] ${
              tab === t.key ? 'border-[var(--accent)] text-os-text' : 'border-transparent text-os-dim hover:text-os-muted'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="text-[10.5px] tabular-nums text-os-dim">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content: internal scroll; the page never sprawls */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'foryou' && (
          <>
            <CardGrid ads={feed.map((f) => f.ad)} savedIds={savedIds} onOpen={setSelected} onSave={toggleSave} />
            <p className="mt-3 text-center text-[11px] text-os-dim">
              내 분야 적합도 + 저장한 광고 + 검증된 지속 기간 순 정렬: 저장할수록 이 피드가 학습합니다
            </p>
          </>
        )}
        {tab === 'search' && (
          <SearchTab savedIds={savedIds} onOpen={setSelected} onSave={toggleSave} onResults={setMineResults} />
        )}
        {tab === 'saved' &&
          (saved.length === 0 ? (
            <Empty line1="아직 저장한 광고가 없습니다." line2="광고의 북마크를 누르면 여기에 저장되고, 추천 피드가 학습합니다." />
          ) : (
            <CardGrid ads={savedAds} savedIds={savedIds} onOpen={setSelected} onSave={toggleSave} />
          ))}
        {tab === 'watchlist' && (
          <WatchlistTab watchlist={watchlist} wall={initialWall} setWatchlist={setWatchlist} busy={busy} setBusy={setBusy} setNotice={setNotice} />
        )}
        {tab === 'activity' && <ActivityTab signals={signals} wall={initialWall} onOpen={setSelected} />}
      </div>

        </div>
      )}

      {selected && (
        <Dossier
          ad={selected}
          isSaved={savedIds.has(selected.id)}
          onClose={() => setSelected(null)}
          onSave={toggleSave}
          onWatch={async (ad) => {
            if (!ad.brandId) return;
            const res = await fetch('/api/adscout/watchlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ brandId: ad.brandId, name: ad.brand, avatar: ad.thumbnail }),
            });
            const body = await res.json();
            if (res.ok && body.ok) {
              setWatchlist(body.watchlist);
              setNotice(`${ad.brand} 관심 등록`);
            }
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------- Ask widget ------------------------------- */

/** Keyword-overlap match: the ads the answer is most plausibly about. */
function relatedAds(text: string, wall: WallAd[]): WallAd[] {
  const words = new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9$]+/)
      .filter((w) => w.length > 3),
  );
  return wall
    .map((ad) => {
      const hay = `${ad.hook ?? ''} ${ad.brand}`.toLowerCase().split(/[^a-z0-9$]+/);
      let score = 0;
      for (const w of hay) if (words.has(w)) score += 1;
      return { ad, score: score + (ad.live ? 0.5 : 0) + Math.min(ad.daysRunning / 200, 0.5) };
    })
    .filter((r) => r.score >= 1.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => r.ad);
}

function AskWidget({ wall, onOpen }: { wall: WallAd[]; onOpen: (ad: WallAd) => void }) {
  const [question, setQuestion] = useState('');
  const [state, setState] = useState<{ phase: 'idle' | 'running' | 'done' | 'error'; text?: string }>({ phase: 'idle' });
  const examples = useMemo(
    () => (state.phase === 'done' && state.text ? relatedAds(`${question} ${state.text}`, wall) : []),
    [state, question, wall],
  );

  const ask = async () => {
    const q = question.trim();
    if (q.length < 3 || state.phase === 'running') return;
    setState({ phase: 'running' });
    try {
      const res = await fetch('/api/adscout/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setState({ phase: 'done', text: body.answer });
    } catch (err) {
      setState({ phase: 'error', text: err instanceof Error ? err.message : '질문 실패' });
    }
  };

  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-[20px] border border-[rgba(255,120,132,0.28)]">
      {/* the light circling behind the glass */}
      <div className="ap-orbit" aria-hidden />
      <div className="absolute inset-0 bg-[#0a0608]/60 backdrop-blur-2xl" aria-hidden />
      <div className="relative px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-[14px] font-medium text-[var(--accent-2)]">Adscout에게 묻기</span>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
            placeholder="지금 내 분야에서 잘 되는 광고는?"
            className="min-w-0 flex-1 bg-transparent text-[14.5px] text-os-text outline-none placeholder:text-os-dim"
          />
          <button type="button" onClick={ask} disabled={state.phase === 'running'} aria-label="Adscout에게 묻기" className="pressable c-btn px-3 py-2">
            {state.phase === 'running' ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.7} /> : <Send className="h-4 w-4" strokeWidth={1.7} />}
          </button>
        </div>

        {/* the widget grows downward for the answer */}
        {state.phase === 'running' && (
          <p className="mt-3 text-[13px] text-os-muted">라이브러리 확인 중: 훅, 지속 기간, 감정 요인, 신호…</p>
        )}
        {state.phase === 'error' && <p className="mt-3 text-[13px] text-[#ff8790]">{state.text}</p>}
        {state.phase === 'done' && (
          <div className="mt-4 border-t border-[rgba(255,120,132,0.16)] pt-4">
            <div className="flex items-start gap-3">
              <p className="flex-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-os-text">{state.text}</p>
              <button
                type="button"
                onClick={() => setState({ phase: 'idle' })}
                aria-label="답변 닫기"
                className="pressable shrink-0 text-os-dim hover:text-os-text"
              >
                <X className="h-4 w-4" strokeWidth={1.7} />
              </button>
            </div>
            {examples.length > 0 && (
              <div className="mt-4">
                <div className="text-[12px] text-os-dim">라이브러리에서</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {examples.map((ad) => (
                    <button
                      key={ad.id}
                      type="button"
                      onClick={() => onOpen(ad)}
                      className="pressable flex items-center gap-2.5 rounded-[10px] border border-[rgba(255,120,132,0.18)] bg-black/35 p-2 text-left hover:bg-black/55"
                    >
                      {ad.thumbnail || ad.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ad.thumbnail ?? ad.image ?? ''} alt="" className="h-11 w-14 shrink-0 rounded-[7px] object-cover" />
                      ) : (
                        <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-[7px] bg-black/50 text-[10px] text-os-dim">
                          {ad.format ?? 'ad'}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] text-os-text">{ad.brand}</span>
                        <span className="block text-[11px] tabular-nums text-os-dim">
                          {ad.daysRunning}d {ad.live ? 'live' : 'off'}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- card grid ------------------------------- */

function CardGrid({
  ads,
  savedIds,
  onOpen,
  onSave,
}: {
  ads: WallAd[];
  savedIds: Set<string>;
  onOpen: (ad: WallAd) => void;
  onSave: (ad: WallAd) => void;
}) {
  // The 2x2 lead slot needs imagery: promote the first ad with a still.
  const display = useMemo(() => {
    const i = ads.findIndex((a) => a.thumbnail || a.image);
    if (i <= 0) return ads;
    return [ads[i], ...ads.slice(0, i), ...ads.slice(i + 1)];
  }, [ads]);

  if (display.length === 0) {
    return <Empty line1="아직 아무것도 없습니다." line2="관심 목록에 브랜드를 추가하거나 검색하면 라이브러리가 저절로 채워집니다." />;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
      {display.map((ad, i) => (
        <div key={ad.id} className={`group relative ${i === 0 ? 'col-span-2 row-span-2' : ''}`}>
          <button
            type="button"
            onClick={() => onOpen(ad)}
            className="pressable pressable is-row block w-full overflow-hidden rounded-[12px] border border-[rgba(255,69,87,0.13)] bg-[#0a0608] text-left"
          >
            <div className={`relative w-full ${i === 0 ? 'aspect-[4/3.05]' : 'aspect-[4/3]'} bg-[#0a0d0f]`}>
              {ad.thumbnail || ad.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ad.thumbnail ?? ad.image ?? ''}
                  alt={`${ad.brand} 광고 소재`}
                  className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center font-mono text-[11px] text-os-dim">{ad.format ?? 'ad'}</div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#04070ae8] to-transparent" />
              <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between gap-2">
                <span className="truncate text-[11.5px] text-os-muted">{ad.brand}</span>
                <span className="flex shrink-0 items-baseline gap-1">
                  <span className={`text-[19px] font-light tabular-nums ${ad.live ? 'text-[var(--accent)]' : 'text-os-dim'}`}>
                    {ad.daysRunning}
                  </span>
                  <span className="text-[10px] text-os-dim">일</span>
                </span>
              </div>
              {ad.live && <span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-[var(--accent)]" />}
            </div>
            {ad.hook && (
              <p className={`px-2.5 py-2 text-[12px] leading-snug text-os-muted ${i === 0 ? 'line-clamp-3' : 'line-clamp-2'}`}>
                “{ad.hook}”
              </p>
            )}
          </button>
          {/* Save toggle: the swipe-file affordance on every card */}
          <button
            type="button"
            aria-label={savedIds.has(ad.id) ? '광고 저장 취소' : '광고 저장'}
            onClick={(e) => {
              e.stopPropagation();
              onSave(ad);
            }}
            className={`pressable absolute right-2 top-2 rounded-full border p-1.5 backdrop-blur ${
              savedIds.has(ad.id)
                ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'border-[rgba(255,255,255,0.14)] bg-black/45 text-os-muted opacity-0 hover:text-os-text group-hover:opacity-100'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" strokeWidth={1.7} fill={savedIds.has(ad.id) ? 'currentColor' : 'none'} />
          </button>
        </div>
      ))}
    </div>
  );
}

function Empty({ line1, line2 }: { line1: string; line2: string }) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
      <p className="text-[13px] text-os-muted">{line1}</p>
      <p className="mt-1 max-w-md text-[12px] text-os-dim">{line2}</p>
    </div>
  );
}

/* --------------------------------- search --------------------------------- */

function SearchTab({
  savedIds,
  onOpen,
  onSave,
  onResults,
}: {
  savedIds: Set<string>;
  onOpen: (ad: WallAd) => void;
  onSave: (ad: WallAd) => void;
  onResults: (ads: WallAd[]) => void;
}) {
  const [concept, setConcept] = useState('');
  const [minDays, setMinDays] = useState(21);
  const [format, setFormat] = useState<'all' | 'video' | 'image'>('all');
  const [state, setState] = useState<
    | { phase: 'idle' }
    | { phase: 'running' }
    | { phase: 'done'; probes: { query: string; results: number }[]; pooled: number; apiCalls: number; winners: WallAd[] }
    | { phase: 'error'; message: string }
  >({ phase: 'idle' });

  const run = async () => {
    const q = concept.trim();
    if (q.length < 3 || state.phase === 'running') return;
    setState({ phase: 'running' });
    try {
      const res = await fetch('/api/adscout/mine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: q, minDays, ...(format !== 'all' ? { format } : {}) }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setState({ phase: 'done', probes: body.probes, pooled: body.pooled, apiCalls: body.apiCalls, winners: body.winners });
      onResults(body.winners);
    } catch (err) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : '검색 실패' });
    }
  };

  const chip = (active: boolean, label: string, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className={`pressable rounded-full border px-2.5 py-1 text-[11.5px] ${
        active ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[rgba(255,69,87,0.14)] text-os-dim hover:text-os-muted'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <label className="block text-[12.5px] text-os-muted" htmlFor="ap-concept">
        콘셉트를 설명하세요: 탐색어로 확장하고, 데이터베이스가 검증된 광고로 답합니다
      </label>
      <div className="ap-glow mt-2 flex items-center gap-2 rounded-[12px] border border-[rgba(255,69,87,0.3)] bg-black/45 p-1.5">
        <Search className="ml-2 h-4 w-4 shrink-0 text-[var(--accent)]" strokeWidth={1.7} />
        <input
          id="ap-concept"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder="AI 에이전트로 직원을 대체하는 창업자"
          className="min-w-0 flex-1 bg-transparent px-1 py-2 text-[14px] text-os-text outline-none placeholder:text-os-dim"
        />
        <button type="button" onClick={run} disabled={state.phase === 'running' || concept.trim().length < 3} className="pressable c-btn c-btn-primary flex items-center gap-1.5 text-[12.5px]">
          {state.phase === 'running' ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.7} /> : <Search className="h-4 w-4" strokeWidth={1.7} />}
          광고 검색
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] text-os-dim">검증 기간</span>
        {[21, 30, 60].map((d) => chip(minDays === d, `${d}일 이상`, () => setMinDays(d)))}
        <span className="ml-3 mr-1 text-[11px] text-os-dim">형식</span>
        {(['all', 'video', 'image'] as const).map((f) => chip(format === f, f, () => setFormat(f)))}
        <span className="ml-auto text-[11px] text-os-dim">검색당 API 크레딧 약 5</span>
      </div>

      <div className="mt-4">
        {state.phase === 'idle' && (
          <Empty line1="1억 개 광고 데이터베이스를 브랜드가 아니라 아이디어로 검색하세요." line2="결과는 선택한 기간이 지나도 계속 돌아가는 광고만 남깁니다: 정직한 검증 필터." />
        )}
        {state.phase === 'running' && (
          <p className="py-8 text-center text-[12.5px] text-os-dim">콘셉트 확장 → 탐색 → 검증된 광고만 걸러내는 중…</p>
        )}
        {state.phase === 'error' && <p className="py-8 text-center text-[12px] text-[#f04e52]">{state.message}</p>}
        {state.phase === 'done' && (
          <>
            <div className="mb-3 text-[11.5px] leading-relaxed text-os-dim">
              {state.probes.map((p) => (
                <span key={p.query} className="mr-3">
                  “{p.query}” → {p.results}
                </span>
              ))}
              <span className="text-os-muted">
                · 수집 {state.pooled}개 · 크레딧 {state.apiCalls}
              </span>
            </div>
            <CardGrid ads={state.winners} savedIds={savedIds} onOpen={onOpen} onSave={onSave} />
          </>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- watchlist -------------------------------- */

function WatchlistTab({
  watchlist,
  wall,
  setWatchlist,
  busy,
  setBusy,
  setNotice,
}: {
  watchlist: WatchEntry[];
  wall: WallAd[];
  setWatchlist: (w: WatchEntry[]) => void;
  busy: string | null;
  setBusy: (b: string | null) => void;
  setNotice: (n: string | null) => void;
}) {
  const [domain, setDomain] = useState('');

  const liveCounts = useMemo(() => {
    const counts = new Map<string, { live: number; top: number }>();
    for (const ad of wall) {
      if (!ad.brandId) continue;
      const cur = counts.get(ad.brandId) ?? { live: 0, top: 0 };
      if (ad.live) cur.live += 1;
      cur.top = Math.max(cur.top, ad.daysRunning);
      counts.set(ad.brandId, cur);
    }
    return counts;
  }, [wall]);

  const add = async () => {
    const d = domain.trim();
    if (!d) return;
    setBusy('add');
    try {
      const res = await fetch('/api/adscout/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: d }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setWatchlist(body.watchlist);
      setDomain('');
      setNotice(`${body.added.name} 관심 등록: 데이터를 새로고침하면 광고를 가져옵니다`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : '추가 실패');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (brandId: string) => {
    const res = await fetch('/api/adscout/watchlist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId }),
    });
    const body = await res.json();
    if (res.ok && body.ok) setWatchlist(body.watchlist);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <label className="block text-[12px] text-os-muted" htmlFor="ap-domain">
        브랜드 추적: 웹사이트를 입력하면 Adscout가 광고 페이지를 찾습니다
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          id="ap-domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="skool.com"
          className="min-w-0 flex-1 rounded-[10px] border border-[rgba(255,69,87,0.18)] bg-black/35 px-3 py-2.5 text-[13px] text-os-text outline-none placeholder:text-os-dim"
        />
        <button type="button" onClick={add} disabled={busy === 'add'} className="pressable c-btn flex items-center gap-1.5 text-[12.5px]">
          {busy === 'add' ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.7} /> : <Plus className="h-4 w-4" strokeWidth={1.7} />}
          브랜드 추적
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {watchlist.length === 0 && (
          <Empty line1="추적 중인 브랜드가 없습니다." line2="추적 중인 브랜드는 매일 동기화됩니다: 새 광고, 오래가는 광고, 중단, 속도 변화." />
        )}
        {watchlist.map((w) => {
          const counts = liveCounts.get(w.id);
          return (
            <div key={w.id} className="flex items-center gap-3 rounded-[12px] border border-[rgba(255,69,87,0.13)] bg-black/25 px-3.5 py-2.5">
              {w.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[12px] text-[var(--accent)]">
                  {w.name.slice(0, 1)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-os-text">{w.name}</div>
                <div className="text-[11px] text-os-dim">{w.domain ?? '검색 결과에서 추가됨'}</div>
              </div>
              {counts && (
                <div className="text-right text-[11.5px] tabular-nums text-os-muted">
                  운영 중 {counts.live} · 최장 {counts.top}일
                </div>
              )}
              <button type="button" aria-label={`${w.name} 관심 해제`} onClick={() => remove(w.id)} className="pressable c-btn p-1.5">
                <X className="h-3.5 w-3.5" strokeWidth={1.7} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------- activity --------------------------------- */

const SIGNAL_META: Record<Signal['type'], { icon: typeof Zap; label: string }> = {
  new_launch: { icon: Zap, label: '새로 시작' },
  winner: { icon: Trophy, label: '검증됨' },
  killed: { icon: XCircle, label: '중단됨' },
  velocity_spike: { icon: TrendingUp, label: '확대 중' },
  velocity_drop: { icon: TrendingDown, label: '축소 중' },
};

function ActivityTab({ signals, wall, onOpen }: { signals: Signal[]; wall: WallAd[]; onOpen: (ad: WallAd) => void }) {
  const byAd = useMemo(() => new Map(wall.map((a) => [a.id, a])), [wall]);
  const groups = useMemo(() => {
    const map = new Map<string, Signal[]>();
    for (const s of signals) {
      const day = s.at.slice(0, 10);
      map.set(day, [...(map.get(day) ?? []), s]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [signals]);

  if (signals.length === 0) {
    return <Empty line1="조용합니다." line2="새로고침할 때마다 관심 목록의 변화를 보여 줍니다: 새 광고, 21/30/60일을 넘긴 광고, 중단, 지출 속도 변화." />;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <p className="text-[12px] text-os-dim">관심 목록의 변화, 최신순.</p>
      {groups.map(([day, rows]) => (
        <div key={day}>
          <div className="mb-2 text-[11.5px] text-os-dim">{day}</div>
          <div className="flex flex-col gap-1.5">
            {rows.map((s, i) => {
              const meta = SIGNAL_META[s.type];
              const Icon = meta.icon;
              const ad = s.adId ? byAd.get(s.adId) : undefined;
              return (
                <button
                  key={`${s.at}-${i}`}
                  type="button"
                  disabled={!ad}
                  onClick={() => ad && onOpen(ad)}
                  className={`pressable flex items-center gap-3 rounded-[10px] border border-[rgba(255,69,87,0.1)] bg-black/20 px-3 py-2 text-left ${ad ? 'hover:bg-black/35' : 'cursor-default'}`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${s.type === 'winner' ? 'text-[var(--accent)]' : 'text-os-dim'}`} strokeWidth={1.7} />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-os-muted">{s.message}</span>
                  {ad && (ad.thumbnail || ad.image) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ad.thumbnail ?? ad.image ?? ''} alt="" className="h-8 w-11 shrink-0 rounded-[6px] object-cover" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ dossier drawer ----------------------------- */

function Dossier({
  ad,
  isSaved,
  onClose,
  onSave,
  onWatch,
}: {
  ad: WallAd;
  isSaved: boolean;
  onClose: () => void;
  onSave: (ad: WallAd) => void;
  onWatch: (ad: WallAd) => void;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [copied, setCopied] = useState(false);

  const topDrivers = useMemo(
    () => Object.entries(ad.drivers).sort((a, b) => b[1] - a[1]).slice(0, 6),
    [ad.drivers],
  );

  const remake = () => {
    const beats = ad.transcript.slice(0, 8).map((l) => l.s).join(' / ');
    const payload = {
      toolKey: 'video',
      title: `Remake: ${ad.brand}`,
      spec: {
        prompt: [
          `Remake this proven ad concept in the user's voice (source ran ${ad.daysRunning} days${ad.live ? ', still live' : ''}).`,
          ad.hook ? `Hook shape to model: "${ad.hook}"` : null,
          beats ? `Beat structure: ${beats}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
        medias: ad.video ? [{ role: 'video_references', ref: ad.video, label: `${ad.brand} source ad` }] : [],
      },
    };
    try {
      sessionStorage.setItem('founder:remake', JSON.stringify(payload));
    } catch {
      /* storage unavailable: the composer just opens blank */
    }
    router.push('/content?remake=1');
  };

  const copyHook = async () => {
    if (!ad.hook) return;
    try {
      await navigator.clipboard.writeText(ad.hook);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div className="ap-panel h-full w-full max-w-[460px] overflow-y-auto rounded-none border-y-0 border-r-0 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-[15px] text-os-text">{ad.brand}</div>
            <div className="mt-0.5 text-[12px] text-os-dim">
              {ad.format ?? '광고'} · {ad.daysRunning}일 {ad.live ? '· 운영 중' : '· 꺼짐'}
              {ad.ctaType ? ` · ${ad.ctaType.toLowerCase().replaceAll('_', ' ')}` : ''}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="close" className="pressable c-btn p-1.5">
            <X className="h-4 w-4" strokeWidth={1.7} />
          </button>
        </div>

        {ad.video ? (
          <video ref={videoRef} src={ad.video} controls playsInline className="w-full rounded-[10px] border border-[rgba(255,69,87,0.16)] bg-black" />
        ) : ad.thumbnail || ad.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.thumbnail ?? ad.image ?? ''} alt={`${ad.brand} 소재`} className="w-full rounded-[10px] border border-[rgba(255,69,87,0.16)]" />
        ) : null}

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button type="button" onClick={remake} className="pressable c-btn c-btn-primary flex items-center gap-1.5 text-[12px]">
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.7} /> 다시 만들기
          </button>
          <button type="button" onClick={() => onSave(ad)} className="pressable c-btn flex items-center gap-1.5 text-[12px]">
            <Bookmark className="h-3.5 w-3.5" strokeWidth={1.7} fill={isSaved ? 'currentColor' : 'none'} />
            {isSaved ? '저장됨' : '저장'}
          </button>
          {ad.brandId && (
            <button type="button" onClick={() => onWatch(ad)} className="pressable c-btn flex items-center gap-1.5 text-[12px]">
              <Plus className="h-3.5 w-3.5" strokeWidth={1.7} /> 브랜드 추적
            </button>
          )}
          {ad.hook && (
            <button type="button" onClick={copyHook} className="pressable c-btn flex items-center gap-1.5 text-[12px]">
              <Copy className="h-3.5 w-3.5" strokeWidth={1.7} /> {copied ? '복사됨' : '훅 복사'}
            </button>
          )}
          {ad.linkUrl && (
            <a href={ad.linkUrl} target="_blank" rel="noreferrer" className="c-btn flex items-center gap-1.5 text-[12px]">
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.7} /> 랜딩 페이지
            </a>
          )}
        </div>

        {ad.hook && (
          <div className="mt-4">
            <div className="text-[11px] text-os-dim">훅 ({ad.hookSource})</div>
            <p className="mt-1 text-[13.5px] leading-snug text-os-text">“{ad.hook}”</p>
          </div>
        )}

        {topDrivers.length > 0 && (
          <div className="mt-4">
            <div className="text-[11px] text-os-dim">감정 요인</div>
            <div className="mt-2 flex flex-col gap-1.5">
              {topDrivers.map(([axis, score]) => (
                <div key={axis} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-[12px] text-os-muted">{axis}</span>
                  <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-black/40">
                    <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(score / 10) * 100}%`, opacity: 0.4 + 0.06 * score }} />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[11.5px] tabular-nums text-os-dim">{score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {ad.transcript.length > 0 && (
          <div className="mt-4">
            <div className="text-[11px] text-os-dim">대본: 줄을 클릭하면 해당 위치로 이동</div>
            <div className="mt-2 flex flex-col">
              {ad.transcript.map((line, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const v = videoRef.current;
                    if (v) {
                      v.currentTime = line.t;
                      v.play().catch(() => undefined);
                    }
                  }}
                  className="pressable group flex gap-2.5 rounded-[7px] px-2 py-1.5 text-left hover:bg-black/35"
                >
                  <span className="shrink-0 text-[11px] tabular-nums text-os-dim group-hover:text-[var(--accent)]">
                    {Math.floor(line.t / 60)}:{String(Math.floor(line.t % 60)).padStart(2, '0')}
                  </span>
                  <span className="text-[12.5px] leading-snug text-os-muted group-hover:text-os-text">{line.s}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
