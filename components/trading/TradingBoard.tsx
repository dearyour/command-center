'use client';

/**
 * Trading: the Robinhood accounts and the Phantom wallet as one slab in the
 * Brand Deals mould (Alex, 2026-09-18: "big and boxy, like the brand deals
 * tab as a model"). The page floats as one surface, numerals rule, data owns
 * the chroma (one hue per account), the sleeve's value line is the hero with
 * the agent's reasoning beside it, hatched meters for the accounts, a
 * dot-matrix of position sizes, exactly ONE gradient insight card (the agent's
 * next move), open orders, a filterable trade log with a detail drawer, and
 * the limits editor at the foot. Since 2026-09-24 it is built from the shared
 * slab kit (components/slab.tsx): the same title row, count-up headline, dot
 * chips, sweeping meters, dot matrix and insight card as every other page.
 *
 * Monitor-only by design: the broker numbers arrive by push from the Markets
 * Agent runner (`agents/markets/run.ts --feed`), so the board re-reads the OS
 * every 60s and on demand and never calls Robinhood itself. Freshness is
 * shown honestly: live, stale, seeded or none, from lib/trading-view.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, RefreshCw, ExternalLink, Bot } from 'lucide-react';
import { Badge, Label } from '@/components/terminal';
import { Chip } from '@/components/Pressable';
import { AgentTradeChart } from '@/components/AgentTradeChart';
import { AgentReasoning } from '@/components/AgentReasoning';
import { TradingLimits } from '@/components/TradingLimits';
import { Slab, SlabTitle, BigStat, MeterStack, InsightCard, chipClass } from '@/components/slab';
import { DotMatrix } from '@/components/slab-charts';
import { agentSummary } from '@/lib/trading-chart';
import { AGENTIC_ID, TRADING_HUE, activityCounts, filterActivity, freshness, positionSizes, tradingVolume, type ActivityFilter, type TradingPayload } from '@/lib/trading-view';
import type { TradeActivity, TradingAccountSnapshot, TradingOrder } from '@/lib/schemas';
import { statusKo } from '@/lib/status-labels';

const EASE = 'cubic-bezier(.2,.7,.2,1)';

// One hue per account (anti-drift rule), shared with the view-model's meters.
const HUE = TRADING_HUE;

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const usd0 = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/** Signed money with a +/- and a status tint class. */
function pnl(n: number): { text: string; cls: string } {
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return { text: `${sign}${usd(Math.abs(n))}`, cls: n > 0 ? 'text-os-ok' : n < 0 ? 'text-os-err' : 'text-os-muted' };
}

const timeAgo = (iso: string, now: number) => {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}분`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}시간` : `${Math.round(h / 24)}일`;
};

const clock = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Card shell: near-bg surface, stagger-in, 1px hover lift. */
function Card({ children, delay = 0, className = '', style }: { children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`tb-card relative min-w-0 rounded-[12px] border border-os-border bg-os-surface ${className}`} style={{ animation: `tb-rise .6s ${EASE} ${delay}ms both`, ...style }}>
      {children}
    </div>
  );
}

/** Card header with a REAL kebab: refresh the feed or open the broker. */
function CardHead({ title, meta, onRefresh }: { title: string; meta?: React.ReactNode; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex items-start justify-between gap-3 px-6 pt-5">
      <div className="min-w-0">
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h2>
        {meta && <div className="mt-0.5 truncate font-mono text-[10.5px] text-os-dim">{meta}</div>}
      </div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`${title} 메뉴`}
        className="pressable grid h-8 w-8 shrink-0 place-items-center rounded-full border border-os-border text-[13px] leading-none text-os-dim hover:border-os-border-strong hover:text-os-text"
      >
        ···
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[30]" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-5 top-14 z-[40] w-[220px] overflow-hidden rounded-md-t border border-os-border bg-os-bg2/95 py-1 backdrop-blur">
            <button
              onClick={() => {
                setOpen(false);
                onRefresh();
              }}
              className="pressable flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[12.5px] text-os-muted hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)] hover:text-os-text"
            >
              <RefreshCw size={13} strokeWidth={1.7} /> 피드에서 새로고침
            </button>
            <a
              href="https://robinhood.com/"
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[12.5px] text-os-muted hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)] hover:text-os-text"
            >
              <ExternalLink size={13} strokeWidth={1.7} /> Robinhood 열기
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function ActionTag({ action }: { action: TradeActivity['action'] }) {
  const buy = action === 'buy';
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${buy ? 'bg-os-ok/15 text-os-ok' : 'bg-os-err/15 text-os-err'}`}>
      {statusKo(action)}
    </span>
  );
}

function Field({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-os-hairline py-2 last:border-0">
      <span className="text-[12px] text-os-dim">{k}</span>
      <span className="text-right text-[12.5px] tabular-nums text-os-text">{v ?? <span className="text-os-dim">not set</span>}</span>
    </div>
  );
}

function statusTone(status: TradeActivity['status']): 'ok' | 'warn' | 'err' | 'default' {
  if (status === 'filled') return 'ok';
  if (status === 'pending') return 'warn';
  if (status === 'rejected' || status === 'cancelled') return 'err';
  return 'default';
}

/** Orders still working at the broker. Separate from the trade log on
 *  purpose: the log is what the agent did, this is what has not happened yet. */
function OpenOrders({ orders, now }: { orders: TradingOrder[]; now: number }) {
  if (orders.length === 0) {
    return <div className="px-6 py-7 text-center font-mono text-[11.5px] text-os-dim">증권사에 진행 중인 주문이 없습니다.</div>;
  }
  return (
    <ul className="mt-4 border-t border-os-border">
      {orders.map((o) => (
        <li key={o.id} data-lens="r" className="pressable is-row flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-os-hairline px-6 py-3 last:border-0">
          <ActionTag action={o.side} />
          <span className="font-mono text-[12.5px] font-bold">{o.symbol}</span>
          <span className="font-mono text-[11px] tabular-nums text-os-muted">
            {o.dollarAmountUsd !== null ? usd(o.dollarAmountUsd) : `${o.quantity}`}
            {o.limitPriceUsd !== null && ` 지정가 ${usd(o.limitPriceUsd)}`}
            {o.filledQuantity > 0 && ` · ${o.filledQuantity}/${o.quantity} 체결`}
          </span>
          <Badge tone="warn" ghost>
            {statusKo(o.state)}
          </Badge>
          {/* Who placed it, said as loudly as the state: Robinhood stamps
              placed_agent 'agentic' on anything the agent submitted. */}
          <Badge tone={o.placedAgent === 'agentic' ? 'ok' : 'default'} ghost>
            {o.placedAgent === 'agentic' ? '에이전트' : '나'}
          </Badge>
          <span className="flex-1" />
          <span className="font-mono text-[10px] text-os-dim">
            {o.type} · {timeAgo(o.createdAt, now)} 전
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TradingBoard({ initial }: { initial: TradingPayload }) {
  const [data, setData] = useState(initial);
  const [view, setView] = useState<string>(AGENTIC_ID);
  const [logFilter, setLogFilter] = useState<ActivityFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.parse(initial.at));

  const refresh = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch('/api/trading');
      if (r.ok) {
        const next = (await r.json()) as TradingPayload;
        setData(next);
        setNow(Date.parse(next.at));
      }
    } catch {
      /* keep last good */
    } finally {
      setBusy(false);
    }
  }, [busy]);

  useEffect(() => {
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { accounts, history, positions, activity, analysis, openOrders, phantom, status } = data;
  const fresh = freshness(accounts, now);
  const seeded = fresh.state === 'seeded';
  const agentAccount = accounts.find((a) => a.accountId === AGENTIC_ID) ?? null;
  const viewAccount = accounts.find((a) => a.accountId === view) ?? agentAccount;
  const viewId = viewAccount?.accountId ?? AGENTIC_ID;
  const viewTrades = useMemo(() => activity.filter((a) => a.accountId === viewId), [activity, viewId]);
  const agent = useMemo(
    () => agentSummary(agentAccount, positions.filter((p) => p.accountId === AGENTIC_ID), activity.filter((a) => a.accountId === AGENTIC_ID)),
    [agentAccount, positions, activity],
  );
  const vol = useMemo(() => tradingVolume({ accounts, positions, phantom }), [accounts, positions, phantom]);
  const invested = positions.reduce((s, p) => s + p.marketValueUsd, 0);
  const sizes = useMemo(() => positionSizes(positions), [positions]);
  const counts = useMemo(() => activityCounts(activity), [activity]);
  const rows = useMemo(() => filterActivity(activity, logFilter), [activity, logFilter]);
  const selected = activity.find((a) => a.id === selectedId) ?? null;
  const total = accounts.reduce((s, a) => s + a.accountValueUsd, 0) + (phantom?.usdValue ?? 0);
  const deployedFrac = agentAccount ? agent.deployedUsd / Math.max(agentAccount.accountValueUsd, 1) : 0;

  return (
    <div>
      <style>{`
        @keyframes tb-rise { from { opacity: 0; transform: translateY(10px) scale(.992); } to { opacity: 1; transform: none; } }
        .tb-card { transition: transform .15s ease, border-color .15s ease; }
        .tb-card:hover { transform: translateY(-1px); border-color: var(--border-strong); }
      `}</style>

      {/* The slab: the whole view floats as one surface. */}
      <Slab>
        <SlabTitle
          eyebrow="시장 · robinhood + phantom · 에이전트 연동"
          title="트레이딩"
          meta={
            <>
              계좌 {accounts.length}개 합계 {usd(total)}
              {phantom ? ' + 지갑' : ''} · {fresh.label}
              {fresh.state === 'stale' && ' · 피드가 한동안 갱신되지 않았습니다'}
            </>
          }
          right={
            <>
              {fresh.state === 'live' ? (
                <Badge tone="ok">실시간 · robinhood</Badge>
              ) : fresh.state === 'stale' ? (
                <Badge tone="warn">오래됨 · {fresh.label.replace(' 동기화', '')}</Badge>
              ) : fresh.state === 'seeded' ? (
                <Badge tone="warn">샘플 · 피드 대기 중</Badge>
              ) : (
                <Badge tone="err">피드 없음</Badge>
              )}
              <span className="rounded-full border border-os-border px-4 py-2 text-[13px] text-os-muted">모니터 전용 · 60초마다 새로고침</span>
              <button
                onClick={refresh}
                aria-label="피드 새로고침"
                title="피드 새로고침"
                className="pressable grid h-10 w-10 place-items-center rounded-full border border-os-border text-os-muted hover:border-os-border-strong hover:text-os-text"
              >
                <RefreshCw size={15} strokeWidth={1.7} className={busy ? 'animate-spin' : ''} />
              </button>
            </>
          }
        />

        {accounts.length === 0 ? (
          <Card delay={120} className="px-6 py-12 text-center">
            <div className="text-[19px] font-semibold">아직 계좌 데이터가 없습니다</div>
            <div className="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-os-dim">{status.detail}</div>
          </Card>
        ) : (
          <>
            {/* Hero row: the value line + the accounts card */}
            <div className="grid grid-cols-[2fr_1fr] gap-6 max-[1200px]:grid-cols-1">
              <Card delay={120} className="flex flex-col pb-5">
                <CardHead
                  title={view === AGENTIC_ID ? '에이전트 · 운용 슬리브' : `${viewAccount?.accountLabel ?? '계좌'} · 평가액`}
                  meta={
                    view === AGENTIC_ID
                      ? agent.hasActed
                        ? `거래 ${agent.tradeCount}건 · 마지막 ${timeAgo(agent.lastTradeAt!, now)} 전`
                        : '아직 거래 없음'
                      : '에이전트는 읽기만 가능'
                  }
                  onRefresh={refresh}
                />
                <div className="mt-3 flex flex-wrap items-center gap-1.5 px-6">
                  {accounts.map((a) => (
                    <Chip key={a.accountId} on={viewId === a.accountId} onClick={() => setView(a.accountId)}>
                      {a.accountLabel}
                    </Chip>
                  ))}
                </div>
                <div className="px-6 pt-4">
                  <AgentTradeChart history={history[viewId] ?? []} trades={viewTrades} />
                </div>
                <div className="mx-6 mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-os-border bg-os-border sm:grid-cols-4">
                  {[
                    { label: '투입 자금', value: usd(agent.deployedUsd) },
                    { label: '대기 현금', value: usd(agent.idleCashUsd) },
                    { label: '평가 손익', value: pnl(agent.unrealizedPnlUsd).text, cls: pnl(agent.unrealizedPnlUsd).cls },
                    { label: '에이전트 거래', value: String(agent.tradeCount) },
                  ].map((s) => (
                    <div key={s.label} className="min-w-0 bg-os-surface px-4 py-3">
                      <div className="truncate font-mono text-[9px] uppercase tracking-[0.2em] text-os-dim">{s.label}</div>
                      <div className={`mt-1 truncate font-mono text-[16px] font-bold tabular-nums ${s.cls ?? ''}`}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {!agent.hasActed && (
                  <div className="mx-6 mt-3 text-[12px] leading-relaxed text-os-dim">
                    {agentAccount
                      ? `슬리브에 ${usd(agentAccount.cashUsd)}이(가) 현금으로 들어 있습니다. 에이전트가 거래를 넣기 전까지는 아무것도 움직이지 않습니다.`
                      : '아직 에이전트 계좌 데이터가 들어오지 않았습니다.'}
                  </div>
                )}
              </Card>

              <Card delay={220} className="flex flex-col">
                <CardHead title="계좌" meta={status.detail} onRefresh={refresh} />
                <div className="flex flex-1 flex-col px-6 pb-6 pt-3">
                  {/* Deal Volume's shape: count-up headline, dot chips, one meter
                      per account plus the wallet, each its share of everything held */}
                  <BigStat value={vol.headline} kind="usdCents" chips={vol.chips} caption={vol.caption} />
                  <MeterStack meters={vol.meters} foot={vol.foot} />
                </div>
              </Card>
            </div>

            {/* Second row: reasoning + positions + THE gradient card */}
            <div className="mt-6 grid grid-cols-[1.15fr_1fr_.85fr] gap-6 max-[1200px]:grid-cols-1">
              <Card delay={320} className="flex min-h-0 flex-col">
                <CardHead
                  title="에이전트 · 판단 근거"
                  meta={
                    analysis
                      ? `검토 ${analysis.examined}개 · 신호 ${analysis.signals}개 · ${timeAgo(analysis.at, now)} 전`
                      : '기록된 실행 없음'
                  }
                  onRefresh={refresh}
                />
                <AgentReasoning analysis={analysis} now={now} />
              </Card>

              <Card delay={420} className="flex min-h-0 flex-col">
                <CardHead title="보유 종목" meta={`투자금 ${usd0(invested)}`} onRefresh={refresh} />
                <div className="flex items-end justify-between gap-4 px-6 pt-3">
                  <BigStat size={30} value={positions.length} caption="보유 중인 종목" />
                  <DotMatrix cols={sizes} hue={HUE.individual} />
                </div>
                <ul className="mt-4 max-h-[236px] flex-1 overflow-y-auto border-t border-os-border">
                  {positions.map((p) => {
                    const u = pnl(p.unrealizedPnlUsd);
                    return (
                      <li key={`${p.accountId}-${p.symbol}`} data-lens="r" className="pressable is-row grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-3 border-b border-os-hairline px-6 py-2.5 last:border-0">
                        <div className="min-w-0">
                          <span className="font-mono text-[12.5px] font-bold">{p.symbol}</span>
                          <span className="ml-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-os-dim">{p.accountId}</span>
                          <div className="truncate font-mono text-[10.5px] tabular-nums text-os-dim">
                            {p.quantity} @ {usd(p.avgCostUsd)}
                          </div>
                        </div>
                        <span className="font-mono text-[12px] tabular-nums">{usd(p.marketValueUsd)}</span>
                        <span className={`w-[72px] text-right font-mono text-[11px] tabular-nums ${u.cls}`}>{u.text}</span>
                      </li>
                    );
                  })}
                  {positions.length === 0 && <li className="px-6 py-7 text-center font-mono text-[11.5px] text-os-dim">No open positions.</li>}
                </ul>
              </Card>

              {/* the ONE gradient insight card: the agent's next move */}
              <InsightCard
                i={6}
                badge="에이전트 · 다음 행동"
                value={openOrders.length > 0 ? openOrders.length : (analysis?.signals ?? 0)}
                headline={
                  openOrders.length > 0
                    ? `건의 주문이 증권사에서 진행 중입니다.`
                    : analysis
                      ? `개의 신호가 마지막 실행(${timeAgo(analysis.at, now)} 전)에서 나왔습니다.`
                      : '건의 실행 기록. 에이전트가 아직 보고하지 않았습니다.'
                }
                body={
                  <>
                    <span className="line-clamp-4">
                      {analysis?.notes ||
                        '핵심 지수: QQQ와 SPY를 하락 시 매수하고 매달 추가 매수하며, 킬스위치 하한에 닿으면 매수를 멈춥니다. 모든 주문은 증권사에 가기 전에 코드로 검사합니다.'}
                    </span>
                    <span className="mt-1.5 block font-mono text-[10px] text-white/60">슬리브의 {Math.round(deployedFrac * 100)}% 투입됨</span>
                  </>
                }
                frac={deployedFrac}
              />
            </div>

            {/* Open orders */}
            <Card delay={620} className="mt-6">
              <CardHead title="미체결 주문" meta={openOrders.length === 0 ? '진행 중 없음' : `진행 중 ${openOrders.length}건`} onRefresh={refresh} />
              <OpenOrders orders={openOrders} now={now} />
            </Card>

            {/* Trade log */}
            <Card delay={720} className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-5">
                <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
                  거래 기록{' '}
                  <span className="ml-1 font-mono text-[12px] font-normal tabular-nums text-os-dim">
                    {activity.length}건 중 {rows.length}건
                  </span>
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  {(
                    [
                      ['all', `전체 ${counts.all}`],
                      ['agent', `에이전트 ${counts.agent}`],
                      ['you', `나 ${counts.you}`],
                      ['rejected', `거부됨 ${counts.rejected}`],
                    ] as Array<[ActivityFilter, string]>
                  ).map(([key, label]) => (
                    <button key={key} onClick={() => setLogFilter(key)} className={chipClass(logFilter === key)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 border-t border-os-border">
                {rows.map((a) => (
                  <button
                    key={a.id}
                    data-lens="r"
                    onClick={() => setSelectedId(a.id)}
                    className="pressable is-row grid w-full min-w-0 grid-cols-[52px_minmax(0,1fr)_auto] items-start gap-x-4 border-b border-os-hairline px-6 py-3.5 text-left last:border-0 max-[900px]:grid-cols-[52px_minmax(0,1fr)]"
                  >
                    <ActionTag action={a.action} />
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 font-mono text-[12.5px]">
                        <span className="font-bold">{a.symbol}</span>
                        <span className="tabular-nums text-os-muted">
                          {a.quantity} @ {usd(a.priceUsd)}
                        </span>
                        <Badge tone={statusTone(a.status)} ghost>
                          {statusKo(a.status)}
                        </Badge>
                      </div>
                      <div className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-os-dim">{a.rationale || '기록된 근거 없음'}</div>
                    </div>
                    <div className="shrink-0 text-right font-mono text-[10px] text-os-dim max-[900px]:hidden">
                      <div className="truncate">
                        {a.agent} · <span className="uppercase tracking-wider">{a.accountId}</span>
                      </div>
                      <div>{timeAgo(a.at, now)} 전</div>
                    </div>
                  </button>
                ))}
                {rows.length === 0 && (
                  <div className="px-6 py-8 text-center text-[12.5px] text-os-dim">
                    {activity.length === 0 ? '아직 기록된 거래가 없습니다.' : '해당 필터와 일치하는 항목이 없습니다.'}
                  </div>
                )}
              </div>
            </Card>
          </>
        )}

        {/* Settings, not state: shown even with no account data, since the
            limits govern the agent's next run either way. */}
        <div className="mt-6" style={{ animation: `tb-rise .6s ${EASE} 820ms both` }}>
          <TradingLimits />
        </div>
        {seeded && (
          <div className="mt-4 text-center font-mono text-[10.5px] text-os-dim">
            예시 데이터입니다. 마켓 에이전트 피드에서 첫 실제 데이터가 들어오면 대체됩니다.
          </div>
        )}
      </Slab>

      {/* Detail drawer: the full rationale, never truncated away */}
      {selected && <div className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px]" onClick={() => setSelectedId(null)} aria-hidden="true" />}
      {selected && (
        <aside className="fixed right-0 top-0 z-[70] flex h-full w-[460px] max-w-[92vw] flex-col border-l border-os-border bg-os-bg2/95 backdrop-blur">
          <div className="flex items-start justify-between gap-4 border-b border-os-border px-6 py-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[17px] font-semibold">
                <ActionTag action={selected.action} /> {selected.symbol}
              </div>
              <div className="mt-0.5 truncate font-mono text-[11.5px] text-os-dim">
                {selected.quantity} @ {usd(selected.priceUsd)} · {clock(selected.at)}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
                <Badge tone={/agent/i.test(selected.agent) && !/alex/i.test(selected.agent) ? 'ok' : 'default'} ghost>
                  {selected.agent}
                </Badge>
                <Badge tone="default" ghost>
                  {selected.accountId}
                </Badge>
              </div>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              aria-label="닫기"
              className="pressable grid h-[30px] w-[30px] shrink-0 place-items-center rounded-sm-t border border-os-border text-os-muted hover:border-os-border-strong hover:text-os-text"
            >
              <X size={15} strokeWidth={1.8} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <section className="mb-6">
              <Label rule>근거</Label>
              <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-os-text">{selected.rationale || '이 거래에는 기록된 근거가 없습니다.'}</p>
            </section>
            <section className="mb-6">
              <Label rule>주문</Label>
              <div className="mt-2">
                <Field k="구분" v={statusKo(selected.action)} />
                <Field k="수량" v={String(selected.quantity)} />
                <Field k="가격" v={usd(selected.priceUsd)} />
                <Field k="거래 금액" v={usd(selected.quantity * selected.priceUsd)} />
                <Field k="결과" v={statusKo(selected.status)} />
              </div>
            </section>
            <section>
              <Label rule>주체와 위치</Label>
              <div className="mt-2">
                <Field k="주문자" v={selected.agent} />
                <Field k="계좌" v={selected.accountId} />
                <Field k="시각" v={`${timeAgo(selected.at, now)} 전 (${selected.at.slice(0, 10)})`} />
              </div>
              <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-os-dim">
                <Bot size={12} className="mt-0.5 shrink-0" /> 거부된 행에는 증권사나 안전장치의 정확한 거부 사유가 근거에 남으며, 몰래 재시도하지 않습니다.
              </p>
            </section>
          </div>
        </aside>
      )}
    </div>
  );
}
