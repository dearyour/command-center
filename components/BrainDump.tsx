'use client';

/**
 * Voice/text capture straight into the brain-store. The mic uses the
 * browser's built-in speech recognition (Chrome/Safari — no API key);
 * Save writes a real markdown memory file AND embeds it into G-Brain immediately
 * (via `gbrain capture`) so agents can retrieve it — degrades to local-only if the
 * knowledgebase is unreachable.
 */
import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, BrainCircuit, Upload } from 'lucide-react';
import { AsyncButton } from '@/components/AsyncButton';
import { VENTURES } from '@/lib/ventures';

const FOLDERS = ['inbox', 'ideas', 'people', 'companies', 'meetings', 'projects', 'writing'];

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};

function getRecognizer(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

// documents we can honestly ingest: anything that reads as text
const TEXTY = /\.(md|markdown|txt|csv|json|ya?ml|html?|log)$/i;
const MAX_DOC_BYTES = 1_000_000; // embedding a monster helps nobody

export function BrainDump({ compact = false }: { compact?: boolean }) {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [folder, setFolder] = useState('inbox');
  const [tags, setTags] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<{
    kind: 'idle' | 'saving' | 'saved' | 'error';
    detail?: string;
    embedded?: boolean;
    slug?: string;
  }>({ kind: 'idle' });
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSupported(getRecognizer() !== null);
  }, []);

  const stopListening = () => {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
  };

  const startListening = () => {
    const rec = getRecognizer();
    if (!rec) return;
    baseTextRef.current = text ? `${text.trim()} ` : '';
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      setText(baseTextRef.current + transcript.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      setListening(false);
      setStatus({ kind: 'error', detail: `마이크: ${e.error}` });
    };
    recRef.current = rec;
    setStatus({ kind: 'idle' });
    setListening(true);
    rec.start();
  };

  const save = async () => {
    if (!text.trim()) return;
    stopListening();
    setStatus({ kind: 'saving' });
    try {
      const res = await fetch('/api/brain/dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title: title || undefined, folder, tags }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.toString() ?? 'save failed');
      setStatus({ kind: 'saved', detail: body.relPath, embedded: body.embedded, slug: body.slug });
      setText('');
      setTitle('');
    } catch (err) {
      setStatus({ kind: 'error', detail: err instanceof Error ? err.message : '저장 실패' });
    }
  };

  // dropped documents flow through the same dump pipeline, one note per file,
  // filename (sans extension) as the title so retrieval reads human
  const ingestFiles = async (files: File[]) => {
    const texty = files.filter((f) => TEXTY.test(f.name) || f.type.startsWith('text/'));
    const skipped = files.length - texty.length;
    if (texty.length === 0) {
      setStatus({ kind: 'error', detail: '지금은 텍스트 문서만 가능합니다 (.md .txt .csv .json …)' });
      return;
    }
    setStatus({ kind: 'saving' });
    let saved = 0;
    let embedded = 0;
    try {
      for (const f of texty) {
        if (f.size > MAX_DOC_BYTES) throw new Error(`${f.name} is over 1MB`);
        const content = await f.text();
        if (!content.trim()) continue;
        const res = await fetch('/api/brain/dump', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: content, title: f.name.replace(/\.[^.]+$/, ''), folder, tags }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.toString() ?? `saving ${f.name} failed`);
        saved += 1;
        if (body.embedded) embedded += 1;
      }
      setStatus({
        kind: 'saved',
        detail: `문서 ${saved}개${skipped ? ` · ${skipped}개 건너뜀 (텍스트 아님)` : ''}`,
        embedded: embedded === saved,
      });
    } catch (err) {
      setStatus({ kind: 'error', detail: err instanceof Error ? err.message : '수집 실패' });
    }
  };

  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(true);
    },
    onDragLeave: () => setDragOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      void ingestFiles([...e.dataTransfer.files]);
    },
  };

  if (compact) {
    // ONE untitled part (the operator): a wide, short capture bar tucked across the
    // top-right whitespace beside the title — type, talk, drop, or upload
    // documents into the brain. Horizontal, not tall: the graph owns the space
    // directly under the title.
    return (
      <div
        {...dropProps}
        data-lens="r"
        className={`pressable is-row w-full rounded-panel border bg-os-surface p-2 ${
          dragOver ? 'border-os-accent' : 'border-os-border'
        }`}
      >
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void save();
            }}
            rows={2}
            placeholder={dragOver ? '여기에 놓기 — 문서당 메모 하나' : '브레인에 쏟아내기… 또는 문서 끌어다 놓기'}
            className="w-full resize-none border-0 bg-transparent px-1.5 py-1 pr-9 font-mono text-[11.5px] leading-relaxed text-os-text placeholder:text-os-dim focus:outline-none"
          />
          {supported && (
            <button
              onClick={listening ? stopListening : startListening}
              title={listening ? '받아쓰기 중지' : '받아쓰기 시작'}
              data-lens="c"
              className={`pressable absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-ctl border ${
                listening
                  ? 'animate-pulse border-os-err bg-os-err text-black'
                  : 'is-dark border-os-border bg-os-surface text-os-muted'
              }`}
            >
              {listening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
            </button>
          )}
        </div>

        {/* native file picker — a real Upload button alongside drag-and-drop */}
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".md,.markdown,.txt,.csv,.json,.yaml,.yml,.html,.htm,.log,text/*"
          onChange={(e) => {
            void ingestFiles([...(e.target.files ?? [])]);
            e.currentTarget.value = '';
          }}
          className="hidden"
        />

        <div className="mt-1.5 flex items-center gap-1.5 border-t border-os-border px-1.5 pt-1.5">
          <span className="min-w-0 flex-1 truncate font-mono text-[9.5px] text-os-dim">
            {status.kind === 'saving'
              ? '저장 중…'
              : status.kind === 'saved'
                ? `✓ ${status.embedded ? '임베딩됨' : '저장됨'} · ${status.slug ?? status.detail}`
                : status.kind === 'error'
                  ? `✗ ${status.detail}`
                  : '텍스트 · 음성 · 끌어다 놓기 또는 업로드'}
          </span>
          <button
            onClick={() => fileRef.current?.click()}
            title="업로드할 문서 선택"
            data-lens="c"
            className="pressable is-dark flex shrink-0 items-center gap-1 rounded-ctl border border-os-border bg-os-surface px-2 py-0.5 font-mono text-[10px] text-os-muted"
          >
            <Upload className="h-3 w-3" />
            업로드
          </button>
          <AsyncButton
            run={save}
            tone="primary"
            busyLabel="저장 중"
            doneLabel="임베딩됨"
            failLabel="저장 실패"
            failed={status.kind === 'error'}
            disabled={!text.trim()}
            className="shrink-0 !h-[22px] !px-2.5 !text-[10px]"
          >
            저장
          </AsyncButton>
        </div>
      </div>
    );
  }

  return (
    <div
      {...dropProps}
      className={`state-fade rounded-panel border bg-os-surface p-4 ${dragOver ? 'border-os-accent' : 'border-os-border'}`}
    >
      <div className="flex items-center gap-2">
        <BrainCircuit className="h-4 w-4 text-os-muted" />
        <h3 className="text-sm font-bold">브레인 덤프</h3>
        <span className="text-[11px] text-os-dim">
          말하거나, 입력하거나, 문서를 놓으세요 → 브레인 저장소에 저장되고 G-Brain에 임베딩됩니다
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목 (선택 — 비우면 첫 단어로 자동 생성)"
            className="flex-1 rounded-lg border border-os-border bg-os-bg px-3 py-2 text-xs text-os-text placeholder:text-os-dim focus:border-os-border-bright focus:outline-none"
          />
          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="rounded-lg border border-os-border bg-os-bg px-2 py-2 text-xs text-os-muted focus:outline-none"
          >
            {FOLDERS.map((f) => (
              <option key={f} value={f}>{f}/</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={supported ? '여기에 쏟아내거나, 마이크를 누르고 그냥 말하세요…' : '내용을 입력하세요 (음성은 Chrome/Safari 필요)…'}
            className="w-full resize-y rounded-lg border border-os-border bg-os-bg px-3 py-2 pr-12 text-sm leading-relaxed text-os-text placeholder:text-os-dim focus:border-os-border-bright focus:outline-none"
          />
          {supported && (
            <button
              onClick={listening ? stopListening : startListening}
              title={listening ? '받아쓰기 중지' : '받아쓰기 시작'}
              className={`pressable absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-ctl border ${
 listening
 ? 'animate-pulse border-[#ef4444] bg-[#ef4444] text-black'
 : 'border-os-border bg-os-surface text-os-muted hover:text-os-text'
 }`}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-os-dim">사업 태그</span>
          {VENTURES.map((v) => {
            const on = tags.includes(v.brainTag);
            return (
              <button
                key={v.id}
                onClick={() => setTags((prev) => (on ? prev.filter((t) => t !== v.brainTag) : [...prev, v.brainTag]))}
                className={`pressable flex items-center gap-1 rounded-ctl border px-2 py-0.5 text-[10px] ${
 on ? 'text-black' : 'border-os-border text-os-muted hover:text-os-text'
 }`}
                style={on ? { background: v.color, borderColor: v.color } : undefined}
              >
                #{v.brainTag}
              </button>
            );
          })}

          <button
            onClick={save}
            disabled={!text.trim() || status.kind === 'saving'}
            className="pressable ml-auto rounded-ctl bg-os-text px-4 py-1.5 text-xs font-bold text-os-bg transition-opacity disabled:opacity-30"
          >
            {status.kind === 'saving' ? '저장 중…' : '브레인에 저장'}
          </button>
        </div>

        {status.kind === 'saved' && (
          <p className="animate-enter font-mono text-[11px] text-os-muted">
            <span className="animate-pop inline-block">✓</span>{' '}
            {status.embedded
              ? `저장 및 임베딩 완료 → ${status.slug ?? status.detail} — 이제 에이전트가 찾을 수 있습니다`
              : `저장됨 → brain-store/${status.detail} — 임베딩 대기 (G-Brain 연결 불가, 나중에 동기화)`}
          </p>
        )}
        {status.kind === 'error' && <p className="animate-enter font-mono text-[11px] text-os-muted">✗ {status.detail}</p>}
      </div>
    </div>
  );
}
