'use client';

/**
 * API keys panel for the Connections board. Reads masked slot statuses,
 * writes new values to .env.local via the auth-gated admin API (live immediately).
 * Raw secrets are never displayed back.
 *
 * Mock 3f adds two controls per row:
 *
 * - reveal/hide, which toggles between a blank mask and the last-4 mask the
 *   server already sends. It never asks for more than that: the API has no
 *   endpoint that returns a raw secret and must not grow one, so "reveal" here
 *   means "show me enough to tell WHICH key this is", not "show me the key".
 * - test, which runs the slot's real connector check and reports the round
 *   trip in milliseconds. A rotated key that saves clean and then fails on
 *   first use is the exact failure this catches, so a red result stays red:
 *   the tick only appears over a check the far end actually answered.
 */
import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Check } from 'lucide-react';
import { AsyncButton } from '@/components/AsyncButton';
import type { KeyStatus } from '@/lib/keys';

/** What a press of "test" learned: the far end's verdict and how long it took. */
type TestResult = { ok: boolean; ms: number; detail?: string };

export function ApiKeys() {
  const [keys, setKeys] = useState<KeyStatus[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [savedVar, setSavedVar] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [tests, setTests] = useState<Record<string, TestResult>>({});

  const load = () =>
    fetch('/api/admin/keys')
      .then((r) => r.json())
      .then((b) => setKeys(b.keys ?? []))
      .catch(() => setError('키 상태를 불러올 수 없습니다'));

  useEffect(() => {
    load();
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, KeyStatus[]>();
    for (const k of keys) {
      if (!map.has(k.group)) map.set(k.group, []);
      map.get(k.group)!.push(k);
    }
    return [...map.entries()];
  }, [keys]);

  const save = async (envVar: string) => {
    if (!value.trim()) return;
    setError(null);
    const res = await fetch('/api/admin/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ envVar, value: value.trim() }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === 'string' ? body.error : '저장 실패');
      return;
    }
    setValue('');
    setEditing(null);
    setSavedVar(envVar);
    setTimeout(() => setSavedVar(null), 2500);
    load();
  };

  const test = async (envVar: string) => {
    setError(null);
    const started = Date.now();
    const res = await fetch('/api/admin/keys/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ envVar }),
    }).catch(() => null);
    const body = res ? ((await res.json().catch(() => ({}))) as Partial<TestResult> & { error?: string; state?: string }) : null;
    const result: TestResult = {
      ok: Boolean(res?.ok && body?.ok),
      ms: typeof body?.ms === 'number' ? body.ms : Date.now() - started,
      detail: body?.detail ?? body?.error ?? body?.state,
    };
    setTests((t) => ({ ...t, [envVar]: result }));
    if (!result.ok) setError(`${envVar}: ${result.detail ?? 'test failed'}`);
  };

  return (
    <section className="mt-10">
      <div className="mb-1 flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-os-muted" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-os-muted">API 키</h2>
      </div>
      <p className="mb-4 text-xs text-os-dim">
        <code>.env.local</code> (git 제외)에 저장되고 즉시 적용됩니다. 값은 가려서 표시하며 — OS는 비밀 값을
        다시 보여 주지 않습니다.
      </p>
      {error && <p className="mb-3 font-mono text-[11px] text-os-muted">✗ {error}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map(([group, slots]) => (
          <div key={group} data-lens="r" className="pressable is-row rounded-panel border border-os-border bg-os-surface p-4">
            <h3 className="mb-2 text-xs font-bold">{group}</h3>
            <ul className="space-y-1.5">
              {slots.map((slot) => (
                <li key={slot.envVar} className="text-[11px]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        slot.present ? 'bg-os-text' : 'border border-os-dim'
                      }`}
                    />
                    <span className="w-40 truncate font-mono text-os-muted" title={slot.envVar}>
                      {slot.envVar}
                    </span>
                    <span className="font-mono text-os-dim">
                      {slot.present ? (revealed[slot.envVar] ? slot.masked : '••••••••') : '설정 안 됨'}
                    </span>
                    {savedVar === slot.envVar && <Check className="h-3 w-3 text-os-text" />}
                    <span className="ml-auto flex items-center gap-2">
                      {slot.present && (
                        <button
                          data-lens="c"
                          onClick={() => setRevealed((r) => ({ ...r, [slot.envVar]: !r[slot.envVar] }))}
                          className="pressable text-[10px] text-os-dim"
                        >
                          {revealed[slot.envVar] ? '숨기기' : '보기'}
                        </button>
                      )}
                      {slot.present && slot.connectorId && (
                        <AsyncButton
                          run={() => test(slot.envVar)}
                          tone="secondary"
                          busyLabel="테스트 중"
                          doneLabel={
                            tests[slot.envVar]?.ok === false
                              ? '실패'
                              : `${tests[slot.envVar]?.ms ?? 0}ms`
                          }
                        >
                          테스트
                        </AsyncButton>
                      )}
                      <button
                        data-lens="c"
                        onClick={() => {
                          setEditing(editing === slot.envVar ? null : slot.envVar);
                          setValue('');
                          setError(null);
                        }}
                        className="pressable text-[10px] text-os-dim"
                      >
                        {editing === slot.envVar ? '취소' : slot.present ? '교체' : '설정'}
                      </button>
                    </span>
                  </div>
                  {editing === slot.envVar && (
                    <div className="mt-1.5 flex gap-1.5 pl-3.5">
                      <input
                        type="password"
                        autoFocus
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && save(slot.envVar)}
                        placeholder={slot.hint ?? '값 붙여넣기'}
                        className="flex-1 rounded-ctl border border-os-border bg-os-bg px-2 py-1 font-mono text-[11px] text-os-text placeholder:text-os-dim focus:border-os-border-bright focus:outline-none"
                      />
                      <button
                        onClick={() => save(slot.envVar)}
                        data-lens="c"
                        className="pressable is-primary rounded-ctl bg-os-text px-2.5 py-1 text-[10px] font-bold text-os-bg"
                      >
                        저장
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
