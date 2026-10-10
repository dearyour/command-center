'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Mail, MessageSquare, Hash, RefreshCw, BellOff, Check, Undo2, ExternalLink } from 'lucide-react';
import { Badge, Label } from '@/components/terminal';
import { entryKey, replyTarget } from '@/lib/comms-digest';
import type { CommsDigest, DigestEntry, DigestTier } from '@/lib/comms-digest';
import type { DigestSourceState } from '@/lib/comms-digest-run';

/**
 * The 9am report, on /comms: a roundup of who needs a response. Tiers follow
 * the operator's stated priority, not a guess: calls
 * first, then clients, personal contacts, brand deals, group chats, and
 * companies last with an unsubscribe list beside them.
 *
 * Rendered from the STORED digest the cron wrote, so opening the page is
 * instant; "run now" regenerates against live connectors.
 */
const TIER_LABEL: Record<DigestTier, string> = {
  call: '통화 예정인 상대',
  client: '고객 및 거래',
  people: '사람 · 개인 및 커뮤니티 연락처',
  branddeal: '브랜드 협찬',
  group: '단체 채팅',
  noise: '회사 및 소프트웨어',
};

const TIER_SHORT: Record<DigestTier, string> = {
  call: '통화',
  client: '고객',
  people: '사람',
  branddeal: '협찬',
  group: '단체',
  noise: '광고성',
};

const TIER_TONE: Record<DigestTier, string> = {
  call: 'var(--err)',
  client: 'var(--warn)',
  people: 'var(--ok)',
  branddeal: 'var(--accent)',
  group: 'var(--muted)',
  noise: 'var(--dim)',
};

const SOURCE_ICON = { email: Mail, whatsapp: MessageSquare, slack: Hash } as const;

function when(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${Math.max(m, 1)}분 전`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}시간 전` : `${Math.floor(h / 24)}일 전`;
}

function Row({ e, read, onToggle }: { e: DigestEntry; read: boolean; onToggle: (k: string) => void }) {
  const Icon = SOURCE_ICON[e.source as keyof typeof SOURCE_ICON] ?? Mail;
  const target = replyTarget(e);
  const key = entryKey(e);
  return (
    <div
      className={`flex items-start gap-2 border-b border-os-border px-3 py-2 last:border-b-0 transition-opacity ${
        read ? 'opacity-40' : ''
      }`}
    >
      {/* Tick it off: go through the whole list and get it down to nothing.
          Read state persists server-side and
          is keyed to the message, so tomorrow's rebuild does not resurrect it. */}
      <button
        onClick={() => onToggle(key)}
        title={read ? '안 읽음으로 표시' : '읽음으로 표시'}
        className={`pressable mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-ctl border ${
 read ? 'border-os-ok text-os-ok' : 'border-os-border text-transparent hover:border-os-dim hover:text-os-dim'
 }`}
      >
        <Check className="h-2.5 w-2.5" />
      </button>
      <Icon className="mt-0.5 h-3 w-3 shrink-0 text-os-dim" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={`truncate text-[12px] font-semibold ${read ? 'line-through' : ''}`}>{e.sender}</span>
          <span className="shrink-0 font-mono text-[9px] text-os-dim">{when(e.ts)}</span>
          {/* Held over from an earlier report: never cleared, so it keeps
              riding along. Showing the age is the point — a name sitting here
              for days is the thing the report exists to surface. */}
          {e.carried && (
            <span
              className="shrink-0 rounded-md border border-os-warn/40 px-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-os-warn"
              title={`${new Date(e.firstSeenAt ?? e.ts).toLocaleDateString('ko-KR')}부터 아직 열려 있음`}
            >
              보류 {when(e.firstSeenAt ?? e.ts).replace(' 전', '')}
            </span>
          )}
        </div>
        <div className="truncate text-[11.5px] text-os-muted">{e.title}</div>
        {e.preview && <div className="mt-0.5 line-clamp-1 text-[11px] text-os-dim">{e.preview}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {target.href && (
          <a
            href={target.href}
            target={target.kind === 'whatsapp' ? '_blank' : undefined}
            rel="noreferrer"
            data-lens="c"
            className="pressable is-dark flex items-center gap-1 rounded-full border border-os-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-os-dim"
          >
            {target.label} <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
        <span className="hidden font-mono text-[9px] uppercase tracking-[0.12em] text-os-dim sm:inline">{e.reason}</span>
      </div>
    </div>
  );
}

export function CommsDigestPanel({
  initial,
  sources,
  generatedAt,
  initialRead = [],
}: {
  initial: CommsDigest | null;
  sources: DigestSourceState[];
  generatedAt: string | null;
  initialRead?: string[];
}) {
  const [digest, setDigest] = useState(initial);
  const [srcs, setSrcs] = useState(sources);
  const [at, setAt] = useState(generatedAt);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(true);
  const [showNoise, setShowNoise] = useState(false);
  const [read, setRead] = useState<Set<string>>(() => new Set(initialRead));
  const [hideRead, setHideRead] = useState(true);

  // Optimistic: the tick lands instantly and the write follows. A failed write
  // is not worth blocking the sweep — the worst case is a row returning
  // tomorrow, which is safer than a row silently vanishing unread.
  const toggleRead = (key: string) => {
    const next = new Set(read);
    const wasRead = next.has(key);
    if (wasRead) next.delete(key);
    else next.add(key);
    setRead(next);
    void fetch('/api/comms/digest/read', {
      method: wasRead ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    }).catch(() => {});
  };

  const clearTier = (rows: DigestEntry[]) => {
    for (const r of rows) if (!read.has(entryKey(r))) toggleRead(entryKey(r));
  };

  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/comms/digest', { method: 'POST' });
      if (res.ok) {
        const b = (await res.json()) as { digest: CommsDigest; sources: DigestSourceState[]; generatedAt: string };
        setDigest(b.digest);
        setSrcs(b.sources ?? []);
        setAt(b.generatedAt);
      }
    } catch {
      /* leave the last report on screen */
    } finally {
      setBusy(false);
    }
  };

  const tiers: DigestTier[] = showNoise
    ? ['call', 'client', 'people', 'branddeal', 'group', 'noise']
    : ['call', 'client', 'people', 'branddeal', 'group'];
  const dead = srcs.filter((s) => !s.ok);

  return (
    <section className="mb-5 rounded-2xl border border-os-border bg-os-surface">
      {/* The rule under the header belongs to the CONTENT below it. Collapsed,
          there is nothing below, and a straight border on a rounded-2xl section
          runs out past the curve at both bottom corners, reading as a stray line
          under the collapsed morning report. */}
      <div
        className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 ${
          open ? 'border-b border-os-border' : ''
        }`}
      >
        <button onClick={() => setOpen((o) => !o)} className="pressable text-os-dim hover:text-os-text">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <Label>아침 보고서</Label>
        {digest ? (
          <span className="font-mono text-[10px] text-os-dim">
            {digest.entries.filter((e) => e.tier !== 'noise' && !read.has(entryKey(e))).length}개 남음 ·{' '}
            {/* the report stacks, so "in 24h" would be a lie once anything is
                held over: say how much is new and how much is carried */}
            {(() => {
              const held = digest.entries.filter((e) => e.carried).length;
              return held
                ? `새 항목 ${digest.total - held} · 이월 ${held}`
                : `${digest.windowHours}시간 동안 ${digest.total}건`;
            })()}
            {at ? ` · ${when(at)}` : ''}
          </span>
        ) : (
          <span className="font-mono text-[10px] text-os-dim">아직 보고서 없음 — 매일 09:00에 실행됩니다</span>
        )}
        {dead.length > 0 && (
          <span className="font-mono text-[10px] text-os-err">{dead.map((d) => d.source).join(', ')} 사용 불가</span>
        )}
        {digest && (
          <button
            onClick={() => setHideRead((h) => !h)}
            className="pressable ml-auto flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-os-dim hover:text-os-text"
            title={hideRead ? '이미 정리한 항목 보기' : '정리한 항목 숨기기'}
          >
            <Undo2 className="h-3 w-3" /> {hideRead ? '정리한 항목 보기' : '정리한 항목 숨기기'}
          </button>
        )}
        <button
          onClick={run}
          disabled={busy}
          className="pressable flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-os-dim hover:text-os-text disabled:opacity-40"
        >
          <RefreshCw className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`} /> {busy ? '수집 중' : '지금 실행'}
        </button>
      </div>

      {open &&
        (digest === null || digest.total === 0 ? (
          <p className="px-4 py-3 font-mono text-[10.5px] text-os-dim">
            최근 24시간 동안 {digest ? '' : '아직 '}아무것도 없습니다. 이 보고서는 09:00 작업이 작성하며, 지금 실행을 누르면
            바로 만들 수 있습니다.
          </p>
        ) : (
          <div className="p-3">
            <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {(['call', 'client', 'people', 'branddeal', 'group', 'noise'] as DigestTier[]).map((t) => (
                <div key={t} className="rounded-xl border border-os-border bg-os-bg px-2 py-1.5">
                  <div className="font-mono text-[16px] font-semibold leading-none" style={{ color: TIER_TONE[t] }}>
                    {digest.counts[t]}
                  </div>
                  <div className="mt-1 truncate font-mono text-[8.5px] uppercase tracking-[0.1em] text-os-dim">{TIER_SHORT[t]}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {tiers.map((t) => {
                const all = digest.entries.filter((e) => e.tier === t);
                const rows = hideRead ? all.filter((e) => !read.has(entryKey(e))) : all;
                if (all.length === 0) return null;
                const left = all.filter((e) => !read.has(entryKey(e))).length;
                return (
                  <div key={t} className="rounded-xl border border-os-border bg-os-bg">
                    <div className="flex items-center gap-2 border-b border-os-border px-3 py-1.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TIER_TONE[t] }} />
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-os-muted">
                        {TIER_LABEL[t]}
                      </span>
                      <span className="ml-auto font-mono text-[9.5px] text-os-dim">
                        {left === 0 ? '정리됨' : `${left}개 남음`}
                      </span>
                      {left > 0 && (
                        <button
                          onClick={() => clearTier(all)}
                          title="이 그룹 전체를 읽음으로 표시"
                          className="pressable shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] text-os-dim hover:text-os-ok"
                        >
                          정리
                        </button>
                      )}
                    </div>
                    {rows.length === 0 ? (
                      <p className="px-3 py-2 font-mono text-[10px] text-os-dim">모두 정리됨</p>
                    ) : (
                      rows
                        .slice(0, 12)
                        .map((e, i) => (
                          <Row
                            key={`${e.sender}-${e.ts}-${i}`}
                            e={e}
                            read={read.has(entryKey(e))}
                            onToggle={toggleRead}
                          />
                        ))
                    )}
                  </div>
                );
              })}
            </div>

            {digest.unsubscribes.length > 0 && (
              <div className="mt-3 rounded-xl border border-os-border bg-os-bg">
                <div className="flex items-center gap-2 border-b border-os-border px-3 py-1.5">
                  <BellOff className="h-3 w-3 shrink-0 text-os-dim" />
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-os-muted">
                    구독 해지 후보
                  </span>
                  <span className="ml-auto font-mono text-[9.5px] text-os-dim">{digest.unsubscribes.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2.5">
                  {digest.unsubscribes.slice(0, 24).map((u) => (
                    <span
                      key={u.sender}
                      title={u.reason}
                      className="rounded-lg border border-os-border px-2 py-0.5 font-mono text-[9.5px] text-os-dim"
                    >
                      {u.sender} {u.count > 1 && <span className="text-os-warn">×{u.count}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowNoise((v) => !v)}
              className="pressable mt-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-os-dim hover:text-os-text"
            >
              {showNoise ? 'hide' : 'show'} companies and software ({digest.counts.noise})
            </button>
          </div>
        ))}
    </section>
  );
}
