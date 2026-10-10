'use client';

import { forwardRef, useImperativeHandle, useRef, useState, type CSSProperties } from 'react';
import { Send, X } from 'lucide-react';
import type { HAny, HKind } from '@/lib/blueprint/hierarchy';

export interface AskHandle {
  focus: () => void;
  isFocused: () => boolean;
}

const SUGGEST: Partial<Record<HKind | '_general' | 'container' | 'group' | 'default', string[]>> = {
  _general: ['아직 연결 안 된 것은?', '실제로 돌아가는 에이전트는 뭐고, 무엇 위에서 돌아가?', 'OS가 한 가지에만 의존하는 곳은 어디야?'],
  agent: ['{n}은(는) 무슨 일을 하고, 연결되어 있어?', '{n}은(는) 어떤 커넥터와 모델에 의존해?', '{n}이(가) 왜 이렇게 표시돼 있어?'],
  daemon: ['{n}이(가) 멈추면 뭐가 고장 나?', '{n}은(는) 무엇을 읽고 써?', '{n}이(가) 보내는 것은 누가 승인해?'],
  skill: ['{n}을(를) 불러오는 에이전트는?', '{n}을(를) 개선하려면?'],
  connector: ['{n}은(는) 여기 설정되어 있어?', '{n}을(를) 쓰는 에이전트는?', '{n}을(를) 실제로 연결하려면 뭐가 필요해?'],
  model: ['{n}(으)로 라우팅되는 것은?', '{n}이(가) 유일한 경로야, 아니면 대체 경로가 있어?'],
  store: ['{n}을(를) 누가 읽고 써?', '{n}을(를) 보여 주는 페이지는?'],
  department: ['{n}에서 실제로 돌아가는 에이전트는?', '{n}에 빠진 것은?'],
  group: ['{n}을(를) 세 줄로 요약해 줘.', '{n} 중 설정 안 된 것은?'],
  container: ['{n}에서 돌아가는 것을 요약해 줘.', '{n}의 가장 큰 위험은?'],
  machine: ['{n}에서 돌아가는 것을 요약해 줘.', '{n}의 가장 큰 위험은?'],
  operator: ['내가 직접 손대는 것과 나 없이 돌아가는 것은?', '내가 단일 장애 지점인 곳은 어디야?'],
  command: ['{n} 위에서 돌아가는 것은?', '{n}이(가) 없으면 어떻게 돼?'],
  app: ['OS를 세 줄로 요약해 줘.', 'OS에서 설계만 되고 연결 안 된 것은?'],
  router: ['{n}은(는) 무엇을 결정해?', '{n}의 양쪽에는 각각 무엇이 오가?'],
  surface: ['{n}은(는) 무엇을 읽어?', '{n}에 데이터를 주는 에이전트는?'],
  person: ['{n}이(가) 맡은 것은?', '{n}과(와) 함께 일하는 에이전트는?'],
  cloud: ['{n}에 의존하는 것은?', '{n}을(를) 쓸 수 없으면 어떻게 돼?'],
  default: ['{n}은(는) 무엇이고 무엇과 연결되어 있어?', '{n}의 문제는?'],
};

type Answer = { state: 'thinking'; text: string } | { state: 'ok'; text: string; model: string | null; scope: string } | { state: 'error'; text: string };

/**
 * The ask bar: AdPilot's frosted glass with the orbiting light, docked at
 * the bottom of the map. It knows what is selected: the scope chip takes
 * the selection's kind colour, the suggested questions change with it -
 * and the answer is grounded server-side in that scope's chain, members
 * and relations. `/` focuses it.
 */
export const AskBar = forwardRef<AskHandle, { scope: HAny | null; onClearScope: () => void }>(function AskBar({ scope, onClearScope }, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus(), isFocused: () => document.activeElement === inputRef.current }), []);

  const kindKey: keyof typeof SUGGEST = scope ? (scope.type === 'container' ? (scope.kind === 'machine' ? 'machine' : 'container') : scope.type === 'group' ? (scope.kind === 'department' ? 'department' : 'group') : scope.kind) : '_general';
  const chips = (SUGGEST[kindKey] ?? SUGGEST.default ?? []).map((q) => q.replace('{n}', scope ? scope.name : ''));
  const style = scope ? ({ '--sc': `var(--bh-k-${scope.kind}, var(--accent))` } as CSSProperties) : undefined;

  async function ask(question?: string) {
    const q = (question ?? value).trim();
    if (q.length < 3 || busy) return;
    setBusy(true);
    setAnswer({ state: 'thinking', text: scope ? `${scope.name}과(와) 구성원, 연결 관계를 살펴보는 중…` : '전체 지도를 살펴보는 중…' });
    try {
      const r = await fetch('/api/blueprint/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: q, selected: scope?.id ?? null }) });
      const j = (await r.json()) as { ok: boolean; text?: string; model?: string | null; scope?: string; error?: string };
      if (!j.ok) setAnswer({ state: 'error', text: j.error || '답변이 없습니다.' });
      else setAnswer({ state: 'ok', text: j.text ?? '', model: j.model ?? null, scope: j.scope ?? (scope ? scope.name : '시스템 전체') });
    } catch (e) {
      setAnswer({ state: 'error', text: `분석가에 연결할 수 없습니다: ${(e as Error).message}` });
    }
    setBusy(false);
    setValue('');
  }

  return (
    <div className={`bh-ask ${scope ? 'has-scope' : 'has-chips'} ${busy ? 'is-busy' : ''}`} style={style}>
      <div className="bh-ask-orbit" aria-hidden="true" />
      <div className="bh-ask-glass" />
      <div className="bh-ask-inner">
        <div className="bh-ask-row">
          <button type="button" className="pressable bh-ask-scope" title={scope ? '선택 해제 (esc)' : '시스템 전체에 대해 묻기'} onClick={() => (scope ? onClearScope() : inputRef.current?.focus())}>
            <i className="sw" />
            <span>{scope ? `${scope.name}에 대해 묻기` : '커맨드 센터에 묻기'}</span>
          </button>
          <input
            ref={inputRef}
            type="text"
            value={value}
            placeholder={scope ? `${scope.name}에 대해 물어보세요…` : '시스템에 대해 무엇이든 물어보세요…'}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void ask();
              if (e.key === 'Escape') inputRef.current?.blur();
            }}
          />
          <button type="button" className="pressable bh-ask-send" aria-label="묻기" onClick={() => void ask()}>
            <Send />
          </button>
        </div>
        <div className="bh-ask-chips">
          {chips.map((q) => (
            <button key={q} type="button" className="pressable bh-ask-chip" onClick={() => void ask(q)}>
              {q}
            </button>
          ))}
        </div>
        {answer && (
          <div className={`bh-ask-answer is-on ${answer.state === 'thinking' ? 'is-thinking' : answer.state === 'error' ? 'is-error' : ''}`}>
            <div>{answer.text}</div>
            {answer.state === 'ok' && (
              <div className="meta">
                <span>
                  범위: {answer.scope}
                  {answer.model ? ` · ${answer.model}` : ''}
                </span>
                <button className="pressable" type="button" onClick={() => setAnswer(null)}>
                  <X /> 지우기
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
