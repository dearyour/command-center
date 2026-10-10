'use client';

import { useState } from 'react';
import type { BusinessSeries, IncomeRange, MonthPoint } from '@/lib/bank-statements';
import { Chip } from '@/components/Pressable';

const RANGES: { label: string; value: IncomeRange }[] = [
  { label: '3개월', value: 3 },
  { label: '6개월', value: 6 },
  { label: '전체', value: 'all' },
];

/** What the card plots: deposits, outflow, or what's left after outflow. */
type Metric = 'in' | 'out' | 'net';
const METRICS: { label: string; value: Metric }[] = [
  { label: '들어온 돈', value: 'in' },
  { label: '나간 돈', value: 'out' },
  { label: '지출 후 순액', value: 'net' },
];
const metricCents = (m: MonthPoint, metric: Metric): number =>
  metric === 'in' ? m.creditsCents : metric === 'out' ? m.debitsCents : m.netCents;

const usd = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const signedUsd = (cents: number) => `${cents < 0 ? '−' : '+'}${usd(Math.abs(cents))}`;
const fmtMonth = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString('ko-KR', { month: 'short', timeZone: 'UTC' });

/** Per-business bank-statement money with range + metric dropdowns — money
    in (deposits), money out (outflow), or the net that's left after it, as a
    total over the window plus monthly bars. Statements are monthly, 30d≈1mo. */
export function BusinessIncomeChart({ series }: { series: BusinessSeries }) {
  const [range, setRange] = useState<IncomeRange>('all');
  const [metric, setMetric] = useState<Metric>('in');
  const [hovered, setHovered] = useState<string | null>(null);
  const shown = range === 'all' ? series.months : series.months.slice(-range);
  const totalIn = shown.reduce((s, m) => s + m.creditsCents, 0);
  const totalOut = shown.reduce((s, m) => s + m.debitsCents, 0);
  const net = shown.reduce((s, m) => s + m.netCents, 0);
  const total = metric === 'in' ? totalIn : metric === 'out' ? totalOut : net;
  const max = Math.max(1, ...shown.map((m) => Math.abs(metricCents(m, metric))));

  const headlineClass =
    metric === 'in' ? 'text-os-ok' : metric === 'out' ? 'text-os-err' : net >= 0 ? 'text-os-ok' : 'text-os-err';
  const subLabel =
    metric === 'in' ? (
      <span className={`font-mono text-[11px] ${net >= 0 ? 'text-os-ok' : 'text-os-err'}`}>순액 {signedUsd(net)}</span>
    ) : metric === 'out' ? (
      <span className="font-mono text-[11px] text-os-dim">of {usd(totalIn)} in</span>
    ) : (
      <span className="font-mono text-[11px] text-os-dim">
        입금 {usd(totalIn)} − 출금 {usd(totalOut)}
      </span>
    );

  return (
    <div className="rounded-lg-t border border-os-border bg-os-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{series.business}</div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-os-dim">
            {metric === 'in' ? '수입 · 은행 입금' : metric === 'out' ? '지출 · 은행 출금' : '순액 · 지출 후'}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-1">
            {METRICS.map((m) => (
              <Chip key={m.value} on={metric === m.value} onClick={() => setMetric(m.value)}>
                {m.label}
              </Chip>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {RANGES.map((r) => (
              <Chip key={r.label} on={range === r.value} onClick={() => setRange(r.value)}>
                {r.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className={`font-mono text-[26px] font-semibold tracking-[-0.02em] ${headlineClass}`}>
          {metric === 'net' && net < 0 ? `−${usd(Math.abs(net))}` : usd(total)}
        </span>
        {subLabel}
      </div>

      {shown.length === 0 ? (
        <div className="mt-4 font-mono text-[11px] text-os-dim">이 기간에는 명세서가 없습니다</div>
      ) : (
        <div className="mt-4 flex items-end gap-1.5" style={{ height: 104 }}>
          {shown.map((m) => {
            const hot = hovered === m.month;
            const cents = metricCents(m, metric);
            const h = Math.max(2, (Math.abs(cents) / max) * 76);
            // in = accent · out = red · net = green/red by the month's sign
            const barClass =
              metric === 'in' ? 'bg-os-accent' : metric === 'out' ? 'bg-os-err' : cents >= 0 ? 'bg-os-ok' : 'bg-os-err';
            return (
              <div
                key={m.month}
                className="flex flex-1 flex-col items-center gap-1"
                onMouseEnter={() => setHovered(m.month)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="relative flex w-full items-end justify-center" style={{ height: 84 }}>
                  {/* the month's number rises out of the bar on hover */}
                  {hot && (
                    <span
                      className="fin-tip pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-sm-t border border-os-border-strong bg-os-surface2 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-os-text"
                      style={{ bottom: `${h + 6}px` }}
                    >
                      {metric === 'net' ? signedUsd(cents) : usd(cents)}
                    </span>
                  )}
                  <div
                    className={`grow w-full max-w-[28px] rounded-sm-t transition-[opacity,filter] duration-150 ${barClass}`}
                    style={{ height: `${h}px`, opacity: hot ? 1 : hovered ? 0.45 : 0.8 }}
                  />
                </div>
                <span className={`state-fade font-mono text-[9px] ${hot ? 'text-os-text' : 'text-os-dim'}`}>
                  {fmtMonth(m.month)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
