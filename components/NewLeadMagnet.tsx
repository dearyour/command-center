'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { PILL, PILL_ACCENT } from '@/components/slab';

/**
 * Create a lead magnet from inside the OS (Alex, 2026-08-14). Deploy the
 * page wherever, then register it here so the row lives with everything else.
 * The Content Gen skill posts to the same route, so a page it ships lands in
 * this table without anyone typing.
 */
export function NewLeadMagnet() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const empty = {
    name: '',
    url: '',
    offer: '',
    source: '',
    destination: 'Beehiiv · 뉴스레터',
    captures: 'email',
    status: 'live',
    launchedAt: today,
    notes: '',
  };
  const [form, setForm] = useState(empty);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/lead-magnets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: unknown };
        setError(typeof body.error === 'string' ? body.error : '이름과 URL을 확인하세요.');
        return;
      }
      const body = (await res.json()) as { leadMagnet?: { name?: string } };
      setDone(body.leadMagnet?.name ?? form.name);
      setForm(empty);
      setOpen(false);
      router.refresh(); // the table is a server component; pull the new row
    } catch {
      setError('네트워크 오류입니다. 다시 시도하세요.');
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full rounded-[8px] border border-os-border bg-os-surface px-2.5 py-2 text-[12px] text-os-text outline-none placeholder:text-os-dim focus:border-os-border-strong';
  const label = 'mb-1 block font-mono text-[9.5px] uppercase tracking-[0.16em] text-os-dim';

  if (!open) {
    return (
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => {
            setDone(null);
            setOpen(true);
          }}
          className={`pressable ${PILL_ACCENT}`}
        >
          <Plus className="h-3.5 w-3.5" /> 새 리드 마그넷
        </button>
        {done && (
          <span className="font-mono text-[11px] text-os-ok">
            {done}을(를) 목록에 추가했습니다.
          </span>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mb-4 rounded-[10px] border border-os-border bg-os-bg p-5">
      <div className="mb-3 flex items-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-os-dim">페이지 등록</span>
        <button type="button" onClick={() => setOpen(false)} aria-label="닫기" className="pressable ml-auto text-os-dim hover:text-os-text">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="lm-name">이름</label>
          <input id="lm-name" className={field} value={form.name} onChange={set('name')} required placeholder="The Claude Trading Setup" />
        </div>
        <div>
          <label className={label} htmlFor="lm-url">공개 URL</label>
          <input id="lm-url" className={field} value={form.url} onChange={set('url')} required type="url" placeholder="https://…" />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="lm-offer">제공하는 것</label>
          <input id="lm-offer" className={field} value={form.offer} onChange={set('offer')} placeholder="세팅, 프롬프트, 안전장치" />
        </div>
        <div>
          <label className={label} htmlFor="lm-source">만든 목적인 캠페인</label>
          <input id="lm-source" className={field} value={form.source} onChange={set('source')} placeholder="IG 릴스 (댓글 TRADE)" />
        </div>
        <div>
          <label className={label} htmlFor="lm-dest">리드 도착지</label>
          <input id="lm-dest" className={field} value={form.destination} onChange={set('destination')} />
        </div>
        <div>
          <label className={label} htmlFor="lm-captures">수집 항목</label>
          <select id="lm-captures" className={field} value={form.captures} onChange={set('captures')}>
            <option value="email">이메일</option>
            <option value="booking">예약</option>
            <option value="none">아직 없음</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="lm-launched">출시일</label>
          <input id="lm-launched" className={field} type="date" value={form.launchedAt} onChange={set('launchedAt')} />
        </div>
        <div>
          <label className={label} htmlFor="lm-status">상태</label>
          <select id="lm-status" className={field} value={form.status} onChange={set('status')}>
            <option value="live">운영 중</option>
            <option value="draft">초안</option>
            <option value="paused">일시정지</option>
            <option value="archived">보관됨</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="lm-notes">메모</label>
          <textarea
            id="lm-notes"
            rows={2}
            className={`${field} resize-y`}
            value={form.notes}
            onChange={set('notes')}
            placeholder="나중에 알아야 할 것: 무엇이 잠겨 있는지, 아직 연결이 필요한 것, 어떤 자동화가 연결되는지"
          />
        </div>
      </div>
      {error && <p className="mt-2 font-mono text-[10.5px] text-os-err">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className={`${PILL} mt-4 disabled:opacity-40`}
      >
        {busy ? '저장 중…' : '목록에 추가'}
      </button>
    </form>
  );
}
