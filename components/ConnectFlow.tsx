'use client';

/**
 * The live footer of a connection tile: Connect opens an inline paste-a-key
 * form (one field per env key), Save posts to /api/connections/connect (which
 * writes .env.local only), and the page refreshes into the connector's real
 * status — connected is never faked, a stored key on a connector-less tile
 * reads "key saved". Guidance-only tools (WhatsApp needs Full Disk Access,
 * IMAP inboxes, CalDAV) show their setup hint instead of a form.
 *
 * Mock 3f: connecting is the one action here that reaches a far end, so it is
 * the three-state control — press, "OAuth…" with a spinner, then "✓ connected".
 * The done label reads off the error state rather than assuming success,
 * because a tick over a save that failed is the one lie this screen must not
 * tell. Status is a `.dot`, the same LED every other surface uses.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AsyncButton } from '@/components/AsyncButton';

/** What the board needs to pick an OAuth affordance, from lib/oauth/store. */
export type OAuthReadiness = {
  slug: string;
  name: string;
  redirectKind: 'any' | 'loopback' | 'https-public';
  consoleUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  appConfigured: boolean;
  connected: boolean;
  expired: boolean;
};

export function ConnectFlow({
  slug,
  connected,
  keySaved,
  keys,
  guidance,
  oauth,
}: {
  slug: string;
  connected: boolean;
  keySaved: boolean;
  keys: string[];
  /** Live connector detail for guidance-only tools (keys.length === 0). */
  guidance?: string;
  /** Present only for providers that run a real authorization-code flow. */
  oauth?: OAuthReadiness | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (keys.some((k) => !(values[k] ?? '').trim())) {
      setError('모든 항목을 입력해야 합니다');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/connections/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, values }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!body.ok) throw new Error(body.error ?? 'save failed');
      setOpen(false);
      setValues({});
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      await fetch('/api/connections/connect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const statusChip = connected ? (
    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-os-ok">
      <span className="dot ok" />
      연결됨
    </span>
  ) : keySaved ? (
    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-os-warn">
      <span className="dot warn" />
      키 저장됨
    </span>
  ) : (
    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-os-dim">연결 안 됨</span>
  );

  if (open) {
    return (
      <div className="mt-3">
        {keys.map((k) => (
          <input
            key={k}
            type="password"
            autoComplete="off"
            placeholder={k}
            value={values[k] ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
            className="mb-1.5 w-full rounded-ctl border border-os-border bg-os-surface2 px-2 py-1.5 font-mono text-[10.5px] text-os-text placeholder:text-os-dim focus:border-os-border-strong focus:outline-none"
          />
        ))}
        {error && <div className="mb-1.5 font-mono text-[9.5px] text-os-err">{error}</div>}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            data-lens="c"
            className="pressable rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-os-dim"
          >
            취소
          </button>
          <AsyncButton
            run={save}
            tone="primary"
            busyLabel="OAuth…"
            doneLabel={error ? '실패' : '연결됨'}
          >
            저장 &amp; 연결
          </AsyncButton>
        </div>
      </div>
    );
  }

  // The OAuth strip sits above the key row: it is the preferred path when the
  // provider supports it, and the key form stays as the fallback.
  const oauthStrip = oauth ? (
    <div className="mb-2 border-b border-os-border pb-2">
      {oauth.redirectKind === 'https-public' ? (
        // No button: this provider will not accept the http redirect this box
        // can offer, so offering one would be a button that cannot finish.
        <div className="font-mono text-[9.5px] leading-relaxed text-os-dim">
          OAuth에는 공개 https 리디렉션이 필요합니다 — 먼저 OS 앞에 도메인이나 터널을 두고,
          <span className="text-os-muted">/api/oauth/callback</span> 을 다음에 등록하세요:{' '}
          <a href={oauth.consoleUrl} target="_blank" rel="noreferrer" className="linky text-os-muted">
            {oauth.name} 콘솔
          </a>
          .
        </div>
      ) : oauth.appConfigured ? (
        <a
          href={`/api/oauth/${slug}/start`}
          data-lens="c"
          className="pressable is-dark inline-flex items-center gap-1.5 rounded-ctl border border-os-border-strong px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-os-text"
        >
          {oauth.connected ? (oauth.expired ? '다시 연결 · 만료됨' : '다시 연결') : 'OAuth로 연결'}
        </a>
      ) : (
        <div className="font-mono text-[9.5px] leading-relaxed text-os-dim">
          다음에서 앱을 등록하세요:{' '}
          <a href={oauth.consoleUrl} target="_blank" rel="noreferrer" className="linky text-os-muted">
            {oauth.name} 콘솔
          </a>{' '}
          (리디렉션 <span className="text-os-muted">/api/oauth/callback</span>), 그다음 아래에{' '}
          <span className="text-os-muted">{oauth.clientIdEnv}</span> 와{' '}
          <span className="text-os-muted">{oauth.clientSecretEnv}</span> 를 저장하세요.
          {oauth.redirectKind === 'loopback' && ' 이 제공자는 localhost에서만 http를 허용하므로, 해당 컴퓨터에서 직접 OS를 열어 마무리하세요.'}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="mt-3">
      {oauthStrip}
      <div className="flex items-center justify-between">
      {statusChip}
      {connected || keySaved ? (
        keySaved ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void disconnect()}
            data-lens="c"
            className="pressable rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-os-dim disabled:opacity-40"
          >
            연결 해제
          </button>
        ) : (
          <span
            title="커맨드 센터 밖에서 관리되는 인증 정보 (기기의 원본 파일)"
            className="cursor-default rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-os-dim/60"
          >
            외부 관리
          </span>
        )
      ) : keys.length > 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-lens="c" className="pressable rounded-full border border-os-border-strong px-3 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-os-text hover:bg-os-text hover:text-os-bg"
        >
          + 연결
        </button>
      ) : (
        <span
          title={guidance ?? '붙여넣는 키가 아니라 로컬 설정으로 연결합니다'}
          className="cursor-help rounded-full border border-os-border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-os-dim"
        >
          설정
        </span>
      )}
      </div>
    </div>
  );
}
