'use client';

/**
 * The live token-burn board. Polls /api/usage every 10s -- the refresh path
 * is pure file parsing on the server, so polling costs nothing billable.
 *
 * One card per plan Alex pays for (one Claude plan, one ChatGPT plan, one
 * Ollama plan), each with the active plan name, the official gauges when the
 * provider exposes them, and the burn for the last hour, the 5-hour session,
 * today and the week. Clicking a card opens where those tokens went: the
 * agent board, Superset sessions, the terminal, crons/headless runs, and the
 * biggest single burners inside each.
 *
 * House rule: a bar labelled "% of limit" only ever renders an OFFICIAL
 * number or an estimate derived from one, and says "est." when derived.
 *
 * Brand Deals look (2026-09-24): the reading opens as the slab's hero row
 * (a 7-day burn step line + a Burn Volume card of sweeping meters), a second
 * row (models waffle, the official limit gauges, one insight card), then the
 * plan cards. The numbers come from lib/usage-volume.ts, derived per poll.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Dot, Label } from '@/components/terminal';
import { VolumeMeter } from '@/components/VolumeMeter';
import { SlabCard, BigStat, MeterStack, InsightCard, chipClass } from '@/components/slab';
import { StepLine, DotMatrix } from '@/components/slab-charts';
import { LANE_HUE, limitMeter, usageVolume } from '@/lib/usage-volume';
import {
  BURN_SOURCES,
  SOURCE_LABEL,
  WINDOWS,
  WINDOW_LABEL,
  burnOf,
  fmtTokens,
  laneBurn,
  totalBurn,
  windowTable,
  type OllamaBoard,
  type OfficialWindow,
  type PlanUsage,
  type UsageWindow,
} from '@/lib/usage';

const POLL_MS = 10_000;

type Board = {
  generatedAt: string;
  claude: PlanUsage | null;
  codex: PlanUsage | null;
  ollama: OllamaBoard;
  errors?: Record<string, string>;
};
type PlanKey = 'claude' | 'codex' | 'ollama';

function age(iso: string | null, now: number): string {
  if (!iso) return ' - ';
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 90) return `${s}초 전`;
  if (s < 5400) return `${Math.round(s / 60)}분 전`;
  if (s < 90000) return `${Math.round(s / 3600)}시간 전`;
  return `${Math.round(s / 86400)}일 전`;
}

const pct = (n: number) => (n >= 10 || n === 0 ? `${n.toFixed(0)}%` : `${n.toFixed(1)}%`);

/** One stacked bar across the four lanes, one hue per lane. */
function LaneBar({ plan, window, height = 'h-2' }: { plan: PlanUsage; window: UsageWindow; height?: string }) {
  const lanes = plan.breakdown?.windows[window];
  const total = lanes ? laneBurn(lanes) : 0;
  return (
    <div className={`flex ${height} w-full gap-[2px] overflow-hidden rounded-full`} style={{ background: 'color-mix(in oklab, var(--text) 8%, transparent)' }}>
      {total > 0 &&
        BURN_SOURCES.map((s) => {
          const w = (burnOf(lanes![s]) / total) * 100;
          return w > 0 ? <div key={s} className="h-full" style={{ width: `${w}%`, background: LANE_HUE[s] }} title={`${SOURCE_LABEL[s]} · ${fmtTokens(burnOf(lanes![s]))}`} /> : null;
        })}
    </div>
  );
}

function LaneLegend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {BURN_SOURCES.map((s) => (
        <span key={s} className="flex items-center gap-1.5 text-[11.5px] text-os-muted">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: LANE_HUE[s] }} />
          {SOURCE_LABEL[s]}
        </span>
      ))}
    </div>
  );
}

function WindowStrip({ plan }: { plan: PlanUsage }) {
  const rows = plan.breakdown ? windowTable(plan.breakdown, plan.official?.weekly?.usedPercent ?? null) : null;
  return (
    <div className="grid grid-cols-4 gap-2">
      {WINDOWS.map((w) => {
        const r = rows?.find((x) => x.window === w);
        return (
          <div key={w} className="border-l border-os-border pl-2">
            <div className="text-[19px] font-semibold tabular-nums tracking-[-0.02em]">{fmtTokens(r?.burn ?? 0)}</div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-os-dim">{WINDOW_LABEL[w]}</div>
            <div className="font-mono text-[9.5px] text-os-muted">
              {r?.pctOfWeekly !== null && r?.pctOfWeekly !== undefined ? `주간 한도의 ≈${pct(r.pctOfWeekly)}${w === 'week' ? '' : ' (추정)'}` : r ? `주간 소모량의 ${pct(r.shareOfWeek * 100)}` : ' - '}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlanCard({ title, plan, selected, onSelect, now }: { title: string; plan: PlanUsage | null; selected: boolean; onSelect: () => void; now: number }) {
  if (!plan) {
    return (
      <div className="rounded-[12px] border border-dashed border-os-border p-5 text-[12.5px] text-os-dim">
        <span className="text-[15px] font-semibold text-os-muted">{title}</span>
        <p className="mt-2">보고 중인 머신에서 세션을 찾지 못했습니다</p>
      </div>
    );
  }
  const hasData = totalBurn(plan.days) > 0 || plan.lastActivity !== null;
  return (
    <button type="button" onClick={onSelect} aria-expanded={selected} data-lens="r" className={`pressable is-row w-full rounded-[12px] border bg-os-bg p-5 text-left ${selected ? 'border-os-accent' : 'border-os-border'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Dot state={hasData ? 'ok' : 'off'} />
          <span className="text-[15px] font-semibold tracking-[-0.01em]">{title}</span>
        </div>
        {plan.planConflict ? <Badge tone="warn">요금제 다름</Badge> : <Badge tone={plan.plan ? 'accent' : 'default'}>{plan.plan ? `${plan.plan} · 사용 중` : '요금제 알 수 없음'}</Badge>}
      </div>
      {plan.planConflict && (
        <p className="mt-2 font-mono text-[10px] leading-relaxed text-os-warn">
          머신마다 다른 요금제로 로그인되어 있습니다: {plan.planConflict.join(' · ')}
        </p>
      )}

      {plan.official?.session || plan.official?.weekly ? (
        <div className="mt-4 space-y-4">
          {plan.official.session && <VolumeMeter {...limitMeter('세션 한도', '5시간', plan.official.session, now)} />}
          {plan.official.weekly && <VolumeMeter {...limitMeter('주간 한도', '7일', plan.official.weekly, now)} delay={150} />}
        </div>
      ) : (
        <p className="mt-4 text-[12px] leading-relaxed text-os-dim">공식 한도 정보 없음 · 아래 소모량은 기록에서 측정한 값입니다</p>
      )}

      <div className="mt-4">
        <WindowStrip plan={plan} />
      </div>

      <div className="mt-4 space-y-1.5">
        <LaneBar plan={plan} window="week" />
        <div className="flex items-center justify-between font-mono text-[10px] text-os-dim">
          <span>
            머신 {plan.machines.length}대 · 마지막 활동 {age(plan.lastActivity, now)}
          </span>
          <span>{selected ? '상세 ▾' : '상세 ▸'}</span>
        </div>
      </div>
    </button>
  );
}

function OllamaCard({ lane, selected, onSelect }: { lane: OllamaBoard; selected: boolean; onSelect: () => void }) {
  const cloud = lane.models.filter((m) => m.cloud).length;
  return (
    <button type="button" onClick={onSelect} aria-expanded={selected} data-lens="r" className={`pressable is-row w-full rounded-[12px] border bg-os-bg p-5 text-left ${selected ? 'border-os-accent' : 'border-os-border'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Dot state={lane.state === 'up' ? 'ok' : 'err'} />
          <span className="text-[15px] font-semibold tracking-[-0.01em]">Ollama</span>
        </div>
        <Badge tone={lane.plan ? 'accent' : 'default'}>{lane.plan ? `${lane.plan} · 사용 중` : lane.state === 'up' ? '요금제 알 수 없음' : '서버 다운'}</Badge>
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-os-dim">공식 한도 정보 없음 · ollama.com은 설정 페이지에서만 요금제 %를 보여 줍니다</p>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {WINDOWS.map((w) => {
          const r = lane.requests?.[w];
          return (
            <div key={w} className="border-l border-os-border pl-2">
              <div className="text-[19px] font-semibold tabular-nums tracking-[-0.02em]">{r ? r.chat + r.embed : ' - '}</div>
              <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-os-dim">{WINDOW_LABEL[w]}</div>
              <div className="font-mono text-[9.5px] text-os-muted">{r ? `채팅 ${r.chat} · 임베딩 ${r.embed}` : '기록 없음'}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between font-mono text-[10px] text-os-dim">
        <span>
          {lane.models.length} models · {cloud} cloud (bill the plan)
        </span>
        <span>{selected ? '상세 ▾' : '상세 ▸'}</span>
      </div>
    </button>
  );
}

const DETAIL = 'grid gap-6 rounded-[12px] border border-os-border bg-os-bg p-5 lg:grid-cols-[1.4fr_1fr]';
const TRACK = { background: 'color-mix(in oklab, var(--text) 8%, transparent)' };

function PlanDetail({ plan, now }: { plan: PlanUsage; now: number }) {
  const [win, setWin] = useState<UsageWindow>('day');
  const b = plan.breakdown;
  const lanes = b?.windows[win];
  const total = lanes ? laneBurn(lanes) : 0;
  const weekly = plan.official?.weekly?.usedPercent ?? null;
  const weekTotal = b ? laneBurn(b.windows.week) : 0;
  const topMax = Math.max(1, ...(b?.top.map((t) => t.burn) ?? [1]));
  const models = Object.entries(plan.byModel).sort((a, c) => burnOf(c[1]) - burnOf(a[1]));
  const modelTotal = models.reduce((s, [, t]) => s + burnOf(t), 0);
  const dayMax = Math.max(1, ...plan.days.map((d) => burnOf(d)));

  return (
    <div className={DETAIL}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>어디서 소모되나</Label>
          <div className="flex flex-wrap gap-2" role="tablist">
            {WINDOWS.map((w) => (
              <button key={w} type="button" role="tab" aria-selected={win === w} onClick={() => setWin(w)} className={chipClass(win === w)}>
                {WINDOW_LABEL[w]}
              </button>
            ))}
          </div>
        </div>

        {!b ? (
          <p className="text-[12.5px] text-os-dim">이 데이터에는 아직 영역별 내역이 없습니다 (이전 버전에서 보냄)</p>
        ) : (
          <>
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[30px] font-semibold tabular-nums tracking-[-0.03em]">{fmtTokens(total)}</span>
                <span className="font-mono text-[11px] text-os-muted">
                  {weekly !== null && weekTotal > 0 ? `주간 한도의 ≈${pct((weekly * total) / weekTotal)}${win === 'week' ? '' : ' (추정)'}` : weekTotal > 0 ? `이번 주 소모량의 ${pct((total / weekTotal) * 100)}` : '소모 없음'}
                </span>
              </div>
              <div className="mt-3">
                <LaneBar plan={plan} window={win} height="h-[10px]" />
              </div>
              <div className="mt-3">
                <LaneLegend />
              </div>
            </div>

            <div className="space-y-5 border-t border-os-border pt-5">
              {BURN_SOURCES.map((s, i) => {
                const v = burnOf(lanes![s]);
                const share = total > 0 ? v / total : 0;
                return (
                  <VolumeMeter key={`${win}-${s}`} label={SOURCE_LABEL[s]} frac={share} display={`${fmtTokens(v)} · ${pct(share * 100)}`} hue={LANE_HUE[s]} delay={i * 120} />
                );
              })}
            </div>

            <div>
              <Label>가장 많이 소모 · 7일</Label>
              <div className="mt-3 space-y-2">
                {b.top.length === 0 && <p className="text-[12.5px] text-os-dim">nothing burned this week</p>}
                {b.top.slice(0, 12).map((t) => (
                  <div key={`${t.source}|${t.label}`} className="grid grid-cols-[1fr_120px_60px] items-center gap-3 text-[12.5px]">
                    <span className="truncate" title={t.label}>
                      <span className="text-os-text">{t.label}</span>
                      <span className="ml-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-os-dim">{SOURCE_LABEL[t.source]}</span>
                    </span>
                    <div className="h-1.5 overflow-hidden rounded-full" style={TRACK}>
                      <div className="h-full rounded-full" style={{ width: `${(t.burn / topMax) * 100}%`, background: LANE_HUE[t.source] }} />
                    </div>
                    <span className="text-right font-mono text-[11px] tabular-nums">{fmtTokens(t.burn)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <Label>7일 소모량 · 일별</Label>
          <div className="mt-3 flex h-20 items-end gap-1.5">
            {plan.days.map((d, i) => {
              const v = burnOf(d);
              const h = v === 0 ? 2 : Math.max(3, Math.round((v / dayMax) * 72));
              const today = i === plan.days.length - 1;
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: 소모 ${fmtTokens(v)} · 맥락 다시 읽기 ${fmtTokens(d.cacheRead)}`}>
                  <div className="w-full rounded-t-[4px]" style={{ height: h, background: today ? 'var(--send-activity)' : 'color-mix(in oklab, var(--send-activity) 35%, transparent)' }} />
                  <span className="font-mono text-[9px] text-os-dim">{'SMTWTFS'[new Date(d.day + 'T12:00:00').getDay()]}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 font-mono text-[10px] text-os-dim">맥락 다시 읽기 (캐시 읽기, 소모량 아님): {fmtTokens(plan.days.reduce((s, d) => s + d.cacheRead, 0))}</p>
        </div>

        {models.length > 0 && (
          <div>
            <Label>모델</Label>
            <div className="mt-2 space-y-1.5">
              {models.slice(0, 5).map(([m, t]) => (
                <div key={m} className="flex items-center justify-between text-[12.5px]">
                  <span className="text-os-muted">{m.replace(/^claude-/, '')}</span>
                  <span className="font-mono text-[11px] tabular-nums">
                    {fmtTokens(burnOf(t))}
                    <span className="text-os-dim"> · {modelTotal ? Math.round((burnOf(t) / modelTotal) * 100) : 0}%</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label>보고 중인 머신</Label>
          <div className="mt-2 space-y-1.5">
            {plan.machines.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-[12.5px]">
                <span className="flex items-center gap-2">
                  <Dot state={m.stale ? 'warn' : 'ok'} />
                  {m.label}
                </span>
                <span className="font-mono text-[10.5px] text-os-dim">{m.source === 'local' ? '이 컴퓨터 · 실시간' : `${age(m.capturedAt, now)} 보냄${m.stale ? ' · 오래됨' : ''}`}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 font-mono text-[10px] leading-relaxed text-os-dim">
            연결된 머신이 보고하면 여기에 사용량이 표시됩니다.
          </p>
        </div>
        {plan.note && <p className="font-mono text-[10px] leading-relaxed text-os-dim">{plan.note}</p>}
      </div>
    </div>
  );
}

function OllamaDetail({ lane, now }: { lane: OllamaBoard; now: number }) {
  const max = Math.max(1, ...WINDOWS.map((w) => (lane.requests ? lane.requests[w].chat + lane.requests[w].embed : 0)));
  return (
    <div className={DETAIL}>
      <div>
        <Label>기간별 요청 · 채팅 vs 임베딩</Label>
        <div className="mt-3 space-y-3">
          {!lane.requests && <p className="text-[12.5px] text-os-dim">no Ollama server log on this box</p>}
          {lane.requests &&
            WINDOWS.map((w) => {
              const r = lane.requests![w];
              return (
                <div key={w} className="grid grid-cols-[90px_1fr_120px] items-center gap-3 text-[12.5px]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-os-dim">{WINDOW_LABEL[w]}</span>
                  <div className="flex h-2 gap-[2px] overflow-hidden rounded-full" style={TRACK}>
                    <div className="h-full" style={{ width: `${(r.chat / max) * 100}%`, background: 'var(--ramp-1)' }} title={`채팅 ${r.chat}`} />
                    <div className="h-full" style={{ width: `${(r.embed / max) * 100}%`, background: 'var(--ramp-3)' }} title={`임베딩 ${r.embed}`} />
                  </div>
                  <span className="text-right font-mono text-[11px] tabular-nums">
                    채팅 {r.chat} · 임베딩 {r.embed}
                  </span>
                </div>
              );
            })}
        </div>
        <p className="mt-4 font-mono text-[10px] leading-relaxed text-os-dim">{lane.note}</p>
      </div>
      <div>
        <Label>모델</Label>
        <div className="mt-2 space-y-1.5">
          {lane.models.map((m) => (
            <div key={`${m.host}|${m.name}`} className="flex items-center justify-between text-[12.5px]">
              <span className="text-os-muted">
                {m.name}
                <span className="ml-2 font-mono text-[10px] text-os-dim">{m.host.replace(/^Ollama · /, '')}</span>
              </span>
              <Badge tone={m.cloud ? 'warn' : 'default'}>{m.cloud ? '클라우드 · 요금제 과금' : '로컬 · 무료'}</Badge>
            </div>
          ))}
          {lane.models.length === 0 && <p className="text-[12.5px] text-os-dim">no models listed</p>}
        </div>
        <div className="mt-5">
          <Label>보고 중인 머신</Label>
          <div className="mt-2 space-y-1.5">
            {lane.machines.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-[12.5px]">
                <span className="flex items-center gap-2">
                  <Dot state={m.stale ? 'warn' : 'ok'} />
                  {m.label}
                </span>
                <span className="font-mono text-[10.5px] text-os-dim">{m.source === 'local' ? '이 컴퓨터 · 실시간' : `${age(m.capturedAt, now)} 보냄${m.stale ? ' · 오래됨' : ''}`}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UsageBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [open, setOpen] = useState<PlanKey | null>('claude');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/usage', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setBoard((await res.json()) as Board);
      setError(null);
      setFetchedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void load();
    timer.current = setInterval(() => void load(), POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  if (!board) {
    return (
      <div className="rounded-[12px] border border-os-border bg-os-surface px-6 py-8 text-[13px] text-os-dim">
        {error ? `사용량 읽기 실패: ${error}` : '로컬 기록 읽는 중…'}
      </div>
    );
  }

  const now = fetchedAt || Date.now();
  const toggle = (k: PlanKey) => setOpen((o) => (o === k ? null : k));
  const vol = usageVolume({ claude: board.claude, codex: board.codex, ollama: board.ollama, now });

  return (
    <div>
      {/* Hero row: the week's burn line + the Deal Volume card worn by token burn */}
      <div className="grid grid-cols-[2fr_1fr] gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={1} title="토큰 소모" sub="Claude + Codex · 최근 7일">
          <div className="px-6 pt-3">
            <span className="text-[30px] font-semibold tabular-nums tracking-[-0.03em]">{fmtTokens(vol.weekTokens)}</span>
            <span className="ml-2 text-[13px] text-os-dim">최근 7일간 소모한 토큰</span>
          </div>
          <StepLine series={vol.series} hue="var(--send-activity)" unit="k 토큰" empty="이 기간에는 소모량이 없습니다." />
          <div className="px-6 pb-5 font-mono text-[11px] text-os-dim">{vol.meta}</div>
        </SlabCard>

        <SlabCard i={2} title="소모 규모" className="flex flex-col">
          <div className="flex flex-1 flex-col px-6 pb-6 pt-3">
            <BigStat value={vol.headlineTokens} kind="tokens" unit="tokens" chips={vol.chips} caption={vol.caption} />
            <MeterStack meters={vol.meters} foot={vol.foot} />
          </div>
        </SlabCard>
      </div>

      {/* Second row: models, the official limits, THE insight card */}
      <div className="mt-6 grid grid-cols-3 gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={3} title="모델별 소모">
          {/* stacked, not side by side: model names are too long to share a row */}
          <div className="flex flex-col gap-5 px-6 pb-6 pt-3">
            <div className="min-w-0">
              {vol.topModel ? (
                <BigStat value={Math.round(vol.topModel.share * 100)} kind="pct" size={30} caption="이번 주 1위 모델 비중" />
              ) : (
                <BigStat display=" - " size={30} caption="이번 주 모델 소모 기록 없음" />
              )}
              {vol.topModel && (
                <div className="mt-4 w-fit max-w-full truncate rounded-full border border-os-border px-3 py-1 text-[12px] text-os-muted">
                  Top: <span className="font-semibold">{vol.topModel.label}</span>
                </div>
              )}
            </div>
            <DotMatrix cols={vol.models} hue="var(--ramp-1)" />
          </div>
        </SlabCard>

        <SlabCard i={4} title="요금제 한도" sub="공식 수치만">
          <div className="px-6 pb-6">
            <MeterStack meters={vol.limits} empty="공식 한도를 보고한 제공자가 없습니다. 소모량은 기록에서 측정합니다." baseDelay={700} />
          </div>
        </SlabCard>

        <InsightCard i={5} badge="가장 많이 소모 · 7일" value={vol.insight.value} kind="pct" headline={vol.insight.headline} body={vol.insight.body} frac={vol.insight.frac} />
      </div>

      {/* The plans: click a card to open where its tokens went */}
      <SlabCard
        i={6}
        className="mt-6"
        title="요금제"
        sub={`제공자 ${[board.claude, board.codex].filter(Boolean).length + 1}곳`}
        action={
          <>
            {(
              [
                ['claude', 'Claude'],
                ['codex', 'ChatGPT · Codex'],
                ['ollama', 'Ollama'],
              ] as Array<[PlanKey, string]>
            ).map(([k, label]) => (
              <button key={k} type="button" onClick={() => toggle(k)} className={chipClass(open === k)}>
                {label}
              </button>
            ))}
          </>
        }
      >
        <div className="space-y-4 px-6 pb-5 pt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <PlanCard title="Claude" plan={board.claude} selected={open === 'claude'} onSelect={() => toggle('claude')} now={now} />
            <PlanCard title="ChatGPT · Codex" plan={board.codex} selected={open === 'codex'} onSelect={() => toggle('codex')} now={now} />
            <OllamaCard lane={board.ollama} selected={open === 'ollama'} onSelect={() => toggle('ollama')} />
          </div>

          {open === 'claude' && board.claude && <PlanDetail plan={board.claude} now={now} />}
          {open === 'codex' && board.codex && <PlanDetail plan={board.codex} now={now} />}
          {open === 'ollama' && <OllamaDetail lane={board.ollama} now={now} />}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-os-border pt-3 font-mono text-[10.5px] text-os-dim">
            <span>{POLL_MS / 1000}초마다 새로고침 · 로컬 파일만 분석 · 유료 호출 없음</span>
            <span>{error ? `오래됨  -  마지막 조회 실패 (${error})` : `${age(board.generatedAt, Date.now())} 업데이트`}</span>
          </div>
        </div>
      </SlabCard>
    </div>
  );
}
