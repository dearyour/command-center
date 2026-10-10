'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { AlertTriangle, Check, Clock, Plus, Trash2, X } from 'lucide-react';
import { Dot, Label } from '@/components/terminal';
import type { ScheduledJobRow } from '@/lib/scheduled-jobs';

/**
 * Scheduled tasks on /workflows · the FUNCTIONAL half of the page.
 *
 * The workflow section needed the ability to add cronjobs through the UI
 * itself, rather than being a readout the operator could only look at. So
 * this is not a readout: add a task, run it now, pause
 * it, delete it, all in place. The API for every one of those already existed
 * (POST/PATCH/DELETE /api/agents/work); it simply had no controls anywhere in
 * the OS, which is why the page felt like a poster.
 *
 * Row shaping stays in lib/scheduled-jobs.ts so this and the /tasks strip can
 * never disagree about whether a job is late.
 */
const PRESETS: { label: string; expr: string }[] = [
  { label: '매일 오전 9시', expr: '0 9 * * *' },
  { label: '평일 오전 9시', expr: '0 9 * * 1-5' },
  { label: '매일 오전 7시', expr: '0 7 * * *' },
  { label: '매일 오후 6시', expr: '0 18 * * *' },
  { label: '매시간', expr: '0 * * * *' },
  { label: '15분마다', expr: '*/15 * * * *' },
];

const ago = (iso: string | null): string => {
  if (!iso) return '실행 기록 없음';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'now';
  const m = Math.floor(ms / 60_000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
};

/** "in 6m" / "in 2h 10m" for a future ISO minute; null once it has passed. */
const untilLabel = (iso: string | null): string | null => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const m = Math.ceil(ms / 60_000);
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 ${m % 60}분`;
  return `${Math.floor(h / 24)}일`;
};

function state(job: ScheduledJobRow): 'err' | 'warn' | 'ok' | 'off' {
  if (!job.enabled) return 'off';
  if (job.unknownAgent) return 'err';
  if (job.overdue) return 'warn';
  return job.lastOk === false ? 'err' : 'ok';
}

export function ScheduledTasks({
  jobs,
  agents,
}: {
  jobs: ScheduledJobRow[];
  agents: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ranMsg, setRanMsg] = useState<string | null>(null);

  const [agentId, setAgentId] = useState(agents[0]?.id ?? '');
  const [schedule, setSchedule] = useState('0 9 * * *');
  const [description, setDescription] = useState('');

  const refresh = () => startTransition(() => router.refresh());

  const call = async (input: RequestInit & { url: string }, label: string) => {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch(input.url, {
        ...input,
        headers: { 'Content-Type': 'application/json', ...(input.headers ?? {}) },
      });
      const body = (await res.json().catch(() => ({}))) as { error?: unknown; summary?: string };
      if (!res.ok) {
        setError(typeof body.error === 'string' ? body.error : `HTTP ${res.status}`);
        return null;
      }
      return body;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setBusy(null);
    }
  };

  const add = async () => {
    if (!agentId || !description.trim()) {
      setError('에이전트를 고르고 작업을 설명하세요');
      return;
    }
    const ok = await call(
      {
        url: '/api/agents/work',
        method: 'POST',
        body: JSON.stringify({ kind: 'cron', agentId, schedule, description: description.trim() }),
      },
      'add',
    );
    if (ok) {
      setDescription('');
      setAdding(false);
      refresh();
    }
  };

  const runNow = async (id: string) => {
    const body = await call({ url: '/api/cron/run', method: 'POST', body: JSON.stringify({ cronId: id }) }, id);
    if (body?.summary) setRanMsg(body.summary.slice(0, 220));
    refresh();
  };

  const toggle = async (id: string, enabled: boolean) => {
    await call({ url: '/api/agents/work', method: 'PATCH', body: JSON.stringify({ kind: 'cron', id, enabled }) }, id);
    refresh();
  };

  const remove = async (id: string) => {
    await call({ url: '/api/agents/work', method: 'DELETE', body: JSON.stringify({ kind: 'cron', id }) }, id);
    refresh();
  };

  const late = jobs.filter((j) => j.overdue).length;
  // The soonest enabled fire drives the header countdown, like the mock's
  // "next fires in 6m". Rows are pre-sorted by band, so scan them all.
  const soonest = jobs
    .filter((j) => j.enabled && j.nextRunAt)
    .map((j) => j.nextRunAt!)
    .sort()[0] ?? null;
  const countdown = untilLabel(soonest);

  return (
    <section className="mb-6">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          <Label count={jobs.length} rule>
            예약된 작업
          </Label>
        </div>
        {countdown && (
          <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10.5px] text-os-muted">
            <Clock className="h-3 w-3 text-os-dim" /> 다음 실행까지 {countdown}
          </span>
        )}
        {late > 0 && <span className="shrink-0 font-mono text-[11px] text-os-warn">지연 {late}</span>}
        <button
          onClick={() => setAdding((a) => !a)}
          className="pressable flex shrink-0 items-center gap-1 rounded-sm-t border border-os-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-os-muted hover:bg-os-surface2 hover:text-os-text"
        >
          {adding ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {adding ? '취소' : '새 작업'}
        </button>
      </div>

      {adding && (
        <div className="mb-3 rounded-lg border border-os-border-strong bg-os-surface p-3">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem]">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="무엇을 실행할까요? 예: 미결제 청구서 정리"
              className="rounded-sm-t border border-os-border bg-os-bg px-2.5 py-1.5 text-[12px] text-os-text outline-none focus:border-os-border-strong"
            />
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="rounded-sm-t border border-os-border bg-os-bg px-2 py-1.5 font-mono text-[11px] text-os-muted outline-none focus:border-os-border-strong"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.expr}
                onClick={() => setSchedule(p.expr)}
                className={`pressable rounded-sm-t border px-2 py-0.5 font-mono text-[9.5px] ${
 schedule === p.expr
 ? 'border-os-accent text-os-text'
 : 'border-os-border text-os-dim hover:text-os-text'
 }`}
              >
                {p.label}
              </button>
            ))}
            <input
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              spellCheck={false}
              className="ml-auto w-32 rounded-sm-t border border-os-border bg-os-bg px-2 py-1 text-right font-mono text-[10.5px] text-os-muted outline-none focus:border-os-border-strong"
            />
            <button
              onClick={add}
              disabled={busy === 'add' || pending}
              className="pressable flex items-center gap-1 rounded-sm-t border border-os-accent px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-os-text hover:bg-os-surface2 disabled:opacity-40"
            >
              <Check className="h-3 w-3" /> {busy === 'add' ? '추가 중' : '추가'}
            </button>
          </div>
          <p className="mt-2 font-mono text-[9.5px] text-os-dim">
            이 컴퓨터의 현지 시간 기준으로 실행됩니다. 실행기는 매분 확인하며, 재시작 후에는 놓친 실행을
            따라잡습니다.
          </p>
        </div>
      )}

      {error && (
        <p className="mb-2 flex items-center gap-1.5 font-mono text-[10.5px] text-os-err">
          <AlertTriangle className="h-3 w-3" /> {error}
        </p>
      )}
      {ranMsg && <p className="mb-2 font-mono text-[10.5px] text-os-muted">실행함: {ranMsg}</p>}

      <div className="rounded-lg border border-os-border bg-os-surface">
        {jobs.length === 0 ? (
          <p className="px-3 py-4 font-mono text-[11px] text-os-dim">
            아직 예약된 작업이 없습니다. <span className="text-os-muted">새 작업</span>을 눌러 추가하세요.
          </p>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-os-border px-3 py-2.5 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_8.5rem_5rem_7.5rem_5.5rem_auto] ${
                job.enabled ? '' : 'opacity-45'
              }`}
            >
              <Dot state={state(job)} />

              <div className="min-w-0">
                <div className="truncate text-[12px] font-medium text-os-text">{job.description}</div>
                <div className="truncate font-mono text-[10px] text-os-dim">
                  {job.agentName}
                  {job.unknownAgent && <span className="text-os-err"> · 존재하지 않는 에이전트</span>}
                </div>
              </div>

              <div className="font-mono text-[10.5px] text-os-muted">
                {job.scheduleLabel}
                <div className="text-[9.5px] text-os-dim">{job.schedule}</div>
              </div>

              <div className="font-mono text-[10.5px] text-os-muted">
                {untilLabel(job.nextRunAt) ? `${untilLabel(job.nextRunAt)} 후` : job.enabled ? '실행 예정' : '일시정지'}
              </div>

              <div className="min-w-0 font-mono text-[10.5px]">
                {job.overdue ? (
                  <span className="text-os-warn">지연됨</span>
                ) : job.lastOk === false ? (
                  <span className="block truncate text-os-err" title={job.lastSummary ?? undefined}>
                    실패 · {job.lastSummary ? job.lastSummary.slice(0, 32) : ago(job.lastRunAt)}
                  </span>
                ) : (
                  <span className="text-os-muted">{ago(job.lastRunAt)}</span>
                )}
              </div>

              <div className="justify-self-end">
                {job.history.length === 0 ? (
                  <span className="font-mono text-[10.5px] text-os-dim">·</span>
                ) : (
                  <div className="flex items-end gap-[2px]" title={`최근 ${job.history.length}회 실행`}>
                    {job.history.map((ok, i) => (
                      <span
                        key={i}
                        className="w-[4px]"
                        style={{
                          height: ok ? 10 : 12,
                          background: ok ? 'color-mix(in oklab, var(--ok) 70%, transparent)' : 'var(--err)',
                        }}
                      />
                    ))}
                  </div>
                )}
                {job.runs - job.ok > 0 && (
                  <div className="text-right font-mono text-[9.5px] text-os-err">실패 {job.runs - job.ok}</div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => runNow(job.id)}
                  disabled={busy === job.id || pending}
                  className="pressable whitespace-nowrap rounded-sm-t border border-os-border px-2 py-0.5 font-mono text-[9.5px] text-os-muted hover:border-os-border-strong hover:text-os-text disabled:opacity-40"
                >
                  ▸ 지금 실행
                </button>
                <button
                  onClick={() => toggle(job.id, !job.enabled)}
                  disabled={busy === job.id || pending}
                  title={job.enabled ? '일시정지' : '활성화'}
                  className={`pressable font-mono text-[9px] uppercase tracking-[0.1em] disabled:opacity-40 ${
 job.enabled ? 'text-os-dim hover:text-os-warn' : 'text-os-warn hover:text-os-ok'
 }`}
                >
                  {job.enabled ? '켜짐' : '꺼짐'}
                </button>
                <button
                  onClick={() => remove(job.id)}
                  disabled={busy === job.id || pending}
                  title="삭제"
                  className="pressable text-os-dim hover:text-os-err disabled:opacity-40"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
