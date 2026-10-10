'use client';

import { useState, type ReactNode } from 'react';
import { Crown, Play,
  ArrowLeft, Boxes, ChevronDown, ChevronRight, CircleDot, ClipboardList, CornerDownLeft, Database,
  DollarSign, Download, FileText, FolderTree, GitBranch, HelpCircle, Layers, Link2 as LinkIcon, ListChecks, Loader2,
  Puzzle, Search, Server, Sparkles, StickyNote, User, UserCheck, UserCog, Wrench, X, type LucideIcon,
} from 'lucide-react';
import type { AgentWiki, ToolWiki } from '@/lib/agent-wiki';
import type { WikiRef } from '@/lib/brain-wiki';
import type { BrainSearchResult } from '@/lib/brain';
import type { Personnel } from '@/lib/personnel';
import type { MemoryGraph, MemoryNode } from '@/lib/memory-core';
import type { Person, RosterClient, SopTask } from '@/lib/schemas';
import {
  playbookFor, autonomyLabel, statusLabel, AUTONOMY_LEVELS,
  type AutonomyLevel, type PlaybookStatus,
} from '@/lib/sop-playbooks';
import { statusKo } from '@/lib/status-labels';

export type AgentLite = { id: string; name: string; role: string; model: string };
export type ToolLite = { id: string; slug: string; name: string; mcp: boolean };
export type DeptLite = { deptId: string; teamId: string; name: string; tagline: string; color: string };

/** [[wiki-link]] styled chip, optionally clickable. */
export function WikiLink({ label, mcp, onClick }: { label: string; mcp?: boolean; onClick?: () => void }) {
  const inner = (
    <>
      <span className="text-os-dim">[[</span>
      {label}
      <span className="text-os-dim">]]</span>
      {mcp && <span className="rounded-sm-t border border-[var(--accent-line)] px-1 text-[8px] uppercase tracking-wide text-os-accent">mcp</span>}
    </>
  );
  return onClick ? (
    <button onClick={onClick} className="pressable inline-flex items-center gap-1 font-mono text-[10.5px] text-os-accent transition-opacity hover:opacity-70">
      {inner}
    </button>
  ) : (
    <span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-os-accent">{inner}</span>
  );
}

function PanelHeader({
  title, sub, color, onBack, onClose,
}: {
  title: string; sub?: string; color?: string; onBack?: () => void; onClose?: () => void;
}) {
  return (
    <div className="flex items-start gap-2 border-b border-os-border px-3 py-2">
      {onBack && (
        <button onClick={onBack} aria-label="뒤로" className="pressable mt-0.5 shrink-0 text-os-dim hover:text-os-text">
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-bold" style={color ? { color } : undefined}>{title}</div>
        {sub && <div className="truncate font-mono text-[9.5px] text-os-dim">{sub}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} aria-label="닫기" className="pressable shrink-0 text-os-dim hover:text-os-text">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function SectionLabel({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-os-dim">
      <Icon className="h-3 w-3" /> {children}
    </div>
  );
}

/** A clickable row used for agents + people. */
function Row({
  color, title, sub, badge, onClick,
}: {
  color: string; title: string; sub?: string; badge?: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`pressable group flex w-full items-center gap-2 rounded-md-t border border-os-border bg-os-surface px-2.5 py-1.5 text-left ${
 onClick ? 'hover:border-os-border-strong' : 'cursor-default'
 }`}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11.5px] font-semibold">{title}</span>
        {sub && <span className="block truncate font-mono text-[9.5px] text-os-dim">{sub}</span>}
      </span>
      {badge && <span className="shrink-0 font-mono text-[9px] uppercase tracking-wide text-os-dim">{badge}</span>}
      {onClick && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-os-dim opacity-0 transition-opacity group-hover:opacity-100" />}
    </button>
  );
}

/** Department overview: human lead, agents, tools. */
export function DeptOverviewCard({
  dept, head, agents, tools, onAgent, onTool, onPerson,
}: {
  dept: DeptLite;
  head: Personnel | null;
  agents: AgentLite[];
  tools: ToolLite[];
  onAgent: (id: string) => void;
  onTool: (id: string) => void;
  onPerson: (deptId: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title={dept.name} sub={dept.tagline} color={dept.color} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2.5">
        <SectionLabel icon={UserCog}>사람 담당자</SectionLabel>
        {head ? (
          <Row color={dept.color} title={head.name} sub={head.role} badge="리드" onClick={() => onPerson(dept.deptId)} />
        ) : (
          <p className="rounded-md-t border border-dashed border-os-border px-3 py-2 font-mono text-[10.5px] text-os-dim">
            아직 사람 리드가 없습니다 — 이 팀은 에이전트로 운영됩니다.
          </p>
        )}

        <div className="mt-4">
          <SectionLabel icon={User}>에이전트 ({agents.length})</SectionLabel>
          <div className="flex flex-col gap-1.5">
            {agents.map((a) => (
              <Row key={a.id} color="var(--accent)" title={a.name} sub={`${a.role} · ${a.model}`} onClick={() => onAgent(a.id)} />
            ))}
          </div>
        </div>

        <div className="mt-4">
          <SectionLabel icon={Wrench}>도구 ({tools.length})</SectionLabel>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {tools.map((t) => (
              <WikiLink key={t.id} label={t.name} mcp={t.mcp} onClick={() => onTool(t.id)} />
            ))}
            {tools.length === 0 && <span className="font-mono text-[10.5px] text-os-dim">연결된 도구 없음</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Agent harness card: the real picture of one agent — its charter, the SOP it
 * executes (the actual instructions), where it sits in the harness (tier,
 * instance, reports-to, sub-agents), the tools it holds, and its last run.
 */
export function AgentHarnessCard({
  agent, task, parentName, parentAgentId, subAgents, lastRun, headName, runLabel,
  onBack, onClose, onTool, onAgent, onTask,
}: {
  agent: { name: string; role: string; model: string; tier: string; instance: string; description: string; tools: string[] };
  task: SopTask | null;
  parentName: string | null;
  parentAgentId: string | null;
  subAgents: { id: string; name: string }[];
  lastRun: { ok: boolean; summary: string } | null;
  /** relative time of the last run, precomputed by the caller */
  runLabel?: string | null;
  headName?: string | null;
  onBack?: () => void;
  onClose?: () => void;
  onTool?: (slug: string) => void;
  onAgent?: (agentId: string) => void;
  onTask?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title={agent.name} sub={`${agent.role} · AI 에이전트`} onBack={onBack} onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2.5">
        <p className="mb-3 text-[11px] leading-relaxed text-os-muted">{agent.description}</p>

        <SectionLabel icon={ListChecks}>지시사항{task ? '' : ' · 배정된 SOP 없음'}</SectionLabel>
        {task ? (
          <button onClick={onTask} disabled={!onTask} className={`pressable mb-1 text-left ${onTask ? 'hover:opacity-80' : ''}`}>
            <span className="font-mono text-[10.5px] text-os-accent">[[{task.title}]]</span>
          </button>
        ) : null}
        <ol className="mb-4 flex flex-col gap-1.5">
          {(task?.steps ?? []).map((s, i) => (
            <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-os-muted">
              <span className="shrink-0 font-mono text-[10px] text-os-dim">{String(i + 1).padStart(2, '0')}</span>
              {s}
            </li>
          ))}
        </ol>

        <SectionLabel icon={Server}>실행 환경</SectionLabel>
        <div className="mb-4 flex flex-col gap-1 font-mono text-[10.5px] text-os-muted">
          <span>
            <span className="text-os-dim">등급</span> {statusKo(agent.tier)} · <span className="text-os-dim">실행 위치</span>{' '}
            {agent.instance} · {agent.model}
          </span>
          {parentName && (
            <span>
              <span className="text-os-dim">보고 대상</span>{' '}
              {parentAgentId && onAgent ? (
                <button onClick={() => onAgent(parentAgentId)} className="pressable text-os-accent hover:opacity-80">
                  {parentName}
                </button>
              ) : (
                parentName
              )}
            </span>
          )}
          {headName && (
            <span>
              <span className="text-os-dim">사람 리드</span> {headName}
            </span>
          )}
          {subAgents.length > 0 && (
            <span className="flex flex-wrap items-center gap-x-2">
              <span className="text-os-dim">하위 에이전트</span>
              {subAgents.map((s) =>
                onAgent ? (
                  <button key={s.id} onClick={() => onAgent(s.id)} className="pressable text-os-accent hover:opacity-80">
                    {s.name}
                  </button>
                ) : (
                  <span key={s.id}>{s.name}</span>
                ),
              )}
            </span>
          )}
        </div>

        <SectionLabel icon={Wrench}>도구 ({agent.tools.length})</SectionLabel>
        <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1.5">
          {agent.tools.map((slug) => (
            <WikiLink
              key={slug}
              label={slug.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              onClick={onTool ? () => onTool(slug) : undefined}
            />
          ))}
          {agent.tools.length === 0 && <span className="font-mono text-[10.5px] text-os-dim">연결된 도구 없음</span>}
        </div>

        <SectionLabel icon={FileText}>마지막 실행</SectionLabel>
        {lastRun ? (
          <div className="flex items-start gap-2">
            <span
              className="mt-1 h-2 w-2 shrink-0 rounded-full"
              style={{ background: lastRun.ok ? 'var(--ok, #3df08c)' : 'var(--err, #ff6259)' }}
            />
            <p className="text-[11px] leading-relaxed text-os-muted">
              {lastRun.summary}
              {runLabel && <span className="font-mono text-[9.5px] text-os-dim"> · {runLabel}</span>}
            </p>
          </div>
        ) : (
          <p className="font-mono text-[10.5px] text-os-dim">실행한 적 없음 — /agents 에서 실행하세요</p>
        )}
      </div>
    </div>
  );
}

/**
 * The links in and out of a brain-store page, rendered the way the store
 * writes them. A link that resolves is a chip you can read; a link that
 * points at nothing is shown struck through rather than hidden, because a
 * wiki that quietly drops its dead ends is how `Links: 0` survived a
 * thousand pages unnoticed.
 */
export function WikiLinks({
  label, refs, icon,
}: {
  label: string;
  refs: WikiRef[];
  icon: LucideIcon;
}) {
  if (refs.length === 0) return null;
  return (
    <>
      <SectionLabel icon={icon}>{label} ({refs.length})</SectionLabel>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {refs.map((r, i) => (
          <span key={`${r.target}-${i}`} className={r.slug ? undefined : 'line-through opacity-50'}>
            <WikiLink label={r.slug ? r.title : r.target} />
          </span>
        ))}
      </div>
    </>
  );
}

/** The `- Key: Value` facts a page states about itself. */
function WikiFields({ fields }: { fields: Record<string, string> }) {
  const entries = Object.entries(fields);
  if (entries.length === 0) return null;
  return (
    <div className="mb-3 flex flex-col gap-0.5">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-2 font-mono text-[10.5px]">
          <span className="shrink-0 text-os-dim">{k}</span>
          <span className="text-os-muted">{v}</span>
        </div>
      ))}
    </div>
  );
}

/** Tool wiki: what its page says, how it's wired, and who links to it. */
export function ToolDetailCard({
  wiki, onBack, onClose,
}: {
  wiki: ToolWiki;
  onBack?: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title={wiki.name} sub={wiki.kind} onBack={onBack} onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2.5">
        {wiki.summary ? (
          <p className="mb-3 text-[11px] leading-relaxed text-os-muted">{wiki.summary}</p>
        ) : null}
        <WikiFields fields={wiki.fields} />

        <SectionLabel icon={FileText}>페이지{wiki.hasPage ? ` · ${wiki.path}` : ''}</SectionLabel>
        <div className="mb-4 flex items-center gap-2">
          {wiki.hasPage ? (
            <WikiLink label={`${wiki.slug}.md`} mcp={wiki.mcp} />
          ) : (
            // Honest: the store has no page for this tool. Saying so is what
            // turns the panel from decoration into an audit surface.
            <span className="font-mono text-[10.5px] text-os-dim">
              브레인 저장소에 아직 페이지가 없습니다 — `npm run brain:docs` 를 실행하세요
            </span>
          )}
        </div>

        <WikiLinks label="링크 대상" refs={wiki.links} icon={LinkIcon} />
        <WikiLinks label="링크된 곳" refs={wiki.backlinks} icon={LinkIcon} />

        <SectionLabel icon={User}>사용하는 곳 ({wiki.usedBy.length})</SectionLabel>
        {wiki.usedBy.length === 0 ? (
          <p className="font-mono text-[10.5px] text-os-dim">표시할 에이전트 없음</p>
        ) : (
          <div className="flex flex-col gap-1">
            {wiki.usedBy.map((n) => (
              <span key={n} className="font-mono text-[11px] text-os-muted">{n}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export type ClientLite = RosterClient;

// stages that count as "this is a client", across funnel and Attio wording
const ACTIVE_STAGES = new Set(['converted', 'won', 'closed won', 'closed-won', 'active']);
const isActiveClient = (status: string) => ACTIVE_STAGES.has(status.toLowerCase());

/** The Clients pillar roster: every client by venture, pipeline underneath. */
export function ClientRosterCard({
  clients, color, onClose,
}: {
  clients: ClientLite[];
  color: string;
  onClose?: () => void;
}) {
  const source = clients[0]?.source ?? 'funnel';
  const isLost = (status: string) => status.toLowerCase().includes('lost');
  const converted = clients.filter((c) => isActiveClient(c.status));
  const pipeline = clients.filter((c) => !isActiveClient(c.status) && !isLost(c.status));
  const lost = clients.filter((c) => !isActiveClient(c.status) && isLost(c.status)).length;
  const ventures = [...new Set(converted.map((c) => c.venture).filter(Boolean))].sort();
  const unventured = converted.filter((c) => !c.venture);
  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title="고객 명단"
        sub={`활성 ${converted.length} · 파이프라인 ${pipeline.length}${lost > 0 ? ` · 무산 ${lost}` : ''} · ${source === 'attio' ? '실시간 · Attio' : '샘플 · 퍼널'}`}
        color={color}
        onClose={onClose}
      />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2.5">
        {ventures.map((v) => (
          <div key={v} className="mb-4">
            <SectionLabel icon={UserCog}>{v.replace(/-/g, ' ')}</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {converted
                .filter((c) => c.venture === v)
                .map((c) => (
                  <Row
                    key={c.id}
                    color={color}
                    title={c.name}
                    sub={c.amountUsd ? `$${c.amountUsd.toLocaleString('en-US')}` : '활성 고객'}
                  />
                ))}
            </div>
          </div>
        ))}
        {unventured.length > 0 && (
          <div className="mb-4">
            <SectionLabel icon={UserCog}>고객</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {unventured.map((c) => (
                <Row
                  key={c.id}
                  color={color}
                  title={c.name}
                  sub={c.amountUsd ? `$${c.amountUsd.toLocaleString('en-US')}` : c.status}
                />
              ))}
            </div>
          </div>
        )}
        {converted.length === 0 && (
          <p className="mb-4 font-mono text-[10.5px] text-os-dim">아직 활성 고객이 없습니다.</p>
        )}
        {pipeline.length > 0 && (
          <div>
            <SectionLabel icon={ClipboardList}>파이프라인 ({pipeline.length})</SectionLabel>
            <div className="flex flex-col gap-1">
              {pipeline.map((c) => (
                <span key={c.id} className="truncate font-mono text-[10.5px] text-os-dim">
                  {c.name} · {c.status.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Memory note detail: one page from the operator's brain-store constellation. */
export function MemoryNoteCard({
  note, color, onBack, onClose,
}: {
  note: MemoryNode;
  color: string;
  onBack?: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title={note.label} sub="기억 · 브레인 저장소" color={color} onBack={onBack} onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2.5">
        <div className="mb-3 flex items-center gap-2">
          <span
            className="rounded-sm-t border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide"
            style={{ borderColor: color, color }}
          >
            {note.folder}
          </span>
          <span className="font-mono text-[9.5px] text-os-dim">
            단어 {note.wordCount}개 · 청크 {note.chunks}개
          </span>
        </div>
        {note.excerpt ? (
          <p className="mb-3 text-[11px] leading-relaxed text-os-muted">{note.excerpt}</p>
        ) : (
          <p className="mb-3 font-mono text-[10.5px] text-os-dim">발췌 없음</p>
        )}
        <SectionLabel icon={FileText}>출처</SectionLabel>
        <WikiLink label={`${note.id}.md`} />
      </div>
    </div>
  );
}

// A single stat tile for the knowledge-brain overview.
function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-md-t border border-os-border bg-os-surface px-2.5 py-2">
      <div className="text-[17px] font-bold leading-none" style={{ color }}>{value}</div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-os-dim">{label}</div>
    </div>
  );
}

const fmt = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n));

/** The Obsidian core detail: the whole company knowledge brain at a glance —
 *  its size, its knowledge domains, and where it comes from. Opens on the left
 *  when the middle Obsidian constellation is clicked. */
export function MemoryCoreCard({
  memory, color, onBack, onClose,
}: {
  memory: MemoryGraph | undefined;
  color: string;
  onBack?: () => void;
  onClose?: () => void;
}) {
  const pages = memory ? memory.nodes.filter((n) => n.type === 'page') : [];
  const folders = memory ? memory.nodes.filter((n) => n.type === 'folder') : [];
  const links = memory ? memory.edges.filter((e) => e.type === 'wikilink').length : 0;
  const words = pages.reduce((s, p) => s + p.wordCount, 0);
  const clusters = new Set(pages.filter((p) => p.links > 0).map((p) => p.cluster)).size;

  const byFolder = new Map<string, number>();
  for (const p of pages) byFolder.set(p.folder, (byFolder.get(p.folder) ?? 0) + 1);
  const topFolders = [...byFolder.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);
  const maxFolder = topFolders[0]?.[1] ?? 1;
  // browsable notes: the most-linked pages
  const topNotes = [...pages].sort((a, b) => b.links - a.links || b.wordCount - a.wordCount).slice(0, 12);
  // query suggestions from the real knowledge domains
  const suggestions = topFolders.slice(0, 5).map(([f]) => f);

  // ── live search against the real brain (GET /api/brain?q=) ──────────────────
  const [q, setQ] = useState('');
  const [results, setResults] = useState<BrainSearchResult[] | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async (term: string) => {
    const t = term.trim();
    if (!t) return;
    setQ(t);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/brain?q=${encodeURIComponent(t)}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { provider?: string; results?: BrainSearchResult[] };
      setResults(data.results ?? []);
      setProvider(data.provider ?? null);
    } catch {
      setError('검색 실패 — 브레인 제공자가 오프라인일 수 있습니다');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Obsidian" sub="회사 지식 브레인" color={color} onBack={onBack} onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2.5">
        {/* query bar — search the whole brain */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(q);
          }}
          className="mb-2"
        >
          <div className="flex items-center gap-1.5 rounded-md-t border border-os-border bg-os-surface px-2.5 py-2 focus-within:border-os-border-strong">
            <Search className="h-3.5 w-3.5 shrink-0 text-os-dim" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="브레인 전체 검색…"
              aria-label="지식 베이스 검색"
              className="min-w-0 flex-1 bg-transparent text-[12px] text-os-text placeholder:text-os-dim focus:outline-none"
            />
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-os-dim" />
            ) : (
              <button type="submit" aria-label="검색" className="pressable shrink-0 text-os-dim hover:text-os-accent">
                <CornerDownLeft className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </form>
        {suggestions.length > 0 && results === null && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-os-dim">추천</span>
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => runSearch(s)}
                className="pressable rounded-sm-t border border-os-border px-2 py-0.5 font-mono text-[10px] text-os-muted hover:border-os-border-strong hover:text-os-text"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* search results */}
        {results !== null && (
          <div className="mb-4">
            <SectionLabel icon={Search}>
              {loading ? '검색 중…' : `결과 ${results.length}개`}
              {provider && !loading ? ` · ${provider}` : ''}
              {' · '}
              <button onClick={() => { setResults(null); setError(null); setQ(''); }} className="pressable text-os-dim hover:text-os-text">
                지우기
              </button>
            </SectionLabel>
            {error && <p className="mb-2 text-[10.5px] text-os-warn">{error}</p>}
            {!loading && results.length === 0 && !error && (
              <p className="font-mono text-[10.5px] text-os-dim">일치하는 결과가 없습니다. 다른 표현으로 검색해 보세요.</p>
            )}
            <div className="flex flex-col gap-1.5">
              {results.map((r, i) => (
                <div key={i} className="rounded-md-t border border-os-border bg-os-surface px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-[11.5px] font-semibold" style={{ color }} title={r.title}>{r.title}</span>
                    <span className="shrink-0 font-mono text-[8.5px] uppercase tracking-wide text-os-dim">{r.source}</span>
                  </div>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-os-muted [text-wrap:pretty]">{r.snippet}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!memory ? (
          <p className="font-mono text-[10.5px] text-os-dim">
            이 컴퓨터에는 브레인이 불러와지지 않았습니다 (저장소를 읽을 수 없음). 브레인 저장소와
            보관소를 읽을 수 있게 되면 숫자가 표시됩니다.
          </p>
        ) : (
          <>
            <p className="mb-4 text-[11px] leading-relaxed text-os-muted">
              운영자의 세컨드 브레인 전체를 정리한 것: 브레인 저장소와 Obsidian 보관소의 모든 메모, 폴더, 링크를
              OS 전체가 판단에 쓰는 영역별로 묶었습니다.
            </p>

            <SectionLabel icon={Boxes}>숫자로 보는 브레인</SectionLabel>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <Stat label="메모" value={fmt(pages.length)} color={color} />
              <Stat label="폴더" value={fmt(folders.length)} color={color} />
              <Stat label="위키 링크" value={fmt(links)} color={color} />
              <Stat label="묶음" value={fmt(clusters)} color={color} />
            </div>
            <p className="mb-4 font-mono text-[9.5px] text-os-dim">
              정리된 메모 {fmt(pages.length)}개, 약 {fmt(words)}단어
            </p>

            <SectionLabel icon={FolderTree}>지식 영역</SectionLabel>
            <div className="mb-4 flex flex-col gap-1.5">
              {topFolders.map(([folder, count]) => (
                <button
                  key={folder}
                  onClick={() => runSearch(folder)}
                  className="pressable group flex w-full items-center gap-2 text-left"
                  title={`"${folder}" 검색`}
                >
                  <span className="w-28 shrink-0 truncate text-[10.5px] text-os-muted group-hover:text-os-text" title={folder}>{folder}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-os-surface">
                    <span className="block h-full rounded-full" style={{ width: `${(count / maxFolder) * 100}%`, background: color }} />
                  </span>
                  <span className="w-6 shrink-0 text-right font-mono text-[9.5px] text-os-dim">{count}</span>
                </button>
              ))}
              {topFolders.length === 0 && <span className="font-mono text-[10px] text-os-dim">폴더 없음</span>}
            </div>

            {topNotes.length > 0 && (
              <>
                <SectionLabel icon={FileText}>가장 많이 연결된 메모</SectionLabel>
                <div className="mb-4 flex flex-col gap-1">
                  {topNotes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => runSearch(note.label)}
                      className="pressable group flex w-full items-center gap-2 rounded-md-t border border-os-border bg-os-surface px-2.5 py-1.5 text-left hover:border-os-border-strong"
                      title={`"${note.label}" 검색`}
                    >
                      <span className="min-w-0 flex-1 truncate text-[11px] text-os-muted group-hover:text-os-text">{note.label}</span>
                      <span className="shrink-0 font-mono text-[8.5px] uppercase tracking-wide text-os-dim">{note.folder}</span>
                      <span className="shrink-0 font-mono text-[8.5px] text-os-dim">{note.links}↔</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <SectionLabel icon={Database}>데이터 출처</SectionLabel>
            <p className="text-[11px] leading-relaxed text-os-muted">
              브레인 저장소의 마크다운과 Obsidian 보관소(대부분은 Claude Archive)를 GBrain으로
              Supabase pgvector에 임베딩했습니다. 모든 에이전트는 같은 메모를 근거로, 출처를 밝혀 답하며
              지어내지 않습니다. 위에서 검색하거나 그래프의 노드를 눌러 출처를 열어 보세요.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// A breakdown chip: solid = a sub-skill this SOP breaks into; dashed = an
// upstream dependency it builds on.
function Chip({ label, dashed }: { label: string; dashed?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm-t border px-2 py-0.5 font-mono text-[10px] ${
        dashed ? 'border-dashed border-os-border text-os-muted' : 'border-os-border-strong text-os-text'
      }`}
    >
      {label}
    </span>
  );
}

const AUTONOMY_TONE: Record<AutonomyLevel, string> = {
  'human-led': 'var(--warn)',
  'human-assisted': 'var(--text)',
  'fully-autonomous': 'var(--accent)',
};
const STATUS_TONE: Record<PlaybookStatus, string> = {
  'ready-to-run': 'var(--ok)',
  'in-development': 'var(--warn)',
  'not-started': 'var(--dim)',
};

// One rung of the autonomy ladder. The rung matching the SOP's current level is
// lit; the others sit back so you can read where it stands.
function LadderRung({ label, text, active }: { label: string; text: string; active: boolean }) {
  return (
    <div
      className="flex gap-2.5 border-l-2 py-1 pl-2.5"
      style={{ borderColor: active ? 'var(--accent)' : 'var(--hairline)' }}
    >
      <span
        className={`w-[104px] shrink-0 font-mono text-[9px] uppercase leading-relaxed tracking-[0.12em] ${
          active ? 'text-os-accent' : 'text-os-dim'
        }`}
      >
        {label}
      </span>
      <span className={`flex-1 text-[10.5px] leading-relaxed ${active ? 'text-os-text' : 'text-os-dim'}`}>{text}</span>
    </div>
  );
}

/** SOP detail: the full playbook behind one SOP — how it breaks down, what it
 *  builds on and replaces, the autonomy ladder, the human's role, the written
 *  SOP steps, its tools, the runnable skill file, and its build status. */
export function SopTaskDetailCard({
  task, assigneeName, assigneeKindLabel, assigneeColor, runtime, tools, onBack, onClose, onAssignee, onTool,
}: {
  task: SopTask;
  assigneeName: string;
  assigneeKindLabel: string; // 'human' | 'AI agent'
  assigneeColor: string;
  /** what executes this SOP, e.g. 'builtin · imapflow' or 'human · judgment call' */
  runtime?: string | null;
  tools: { slug: string; name: string; mcp: boolean }[];
  onBack?: () => void;
  onClose?: () => void;
  onAssignee?: () => void;
  onTool?: (slug: string) => void;
}) {
  const pb = playbookFor(task);
  const [skillOpen, setSkillOpen] = useState(false);

  const downloadSkill = () => {
    const blob = new Blob([pb.skillMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pb.skill.slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col">
      <PanelHeader title={task.title} sub={pb.categoryPath} onBack={onBack} onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2.5">
        {/* autonomy + status eyebrow */}
        <div className="mb-2 flex items-center gap-2">
          <span
            className="font-mono text-[9px] font-bold uppercase tracking-[0.18em]"
            style={{ color: AUTONOMY_TONE[pb.autonomy] }}
          >
            {autonomyLabel(pb.autonomy)}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: STATUS_TONE[pb.status] }}>
            <CircleDot className="h-2.5 w-2.5" /> {statusLabel(pb.status)}
          </span>
        </div>

        <p className="mb-3 text-[11px] leading-relaxed text-os-muted">{pb.description}</p>

        {/* runnable skill file — yours to download */}
        <button
          onClick={downloadSkill}
          className="pressable mb-4 flex w-full items-center gap-2 rounded-md-t border border-os-border bg-os-surface px-2.5 py-2 text-left hover:border-os-border-strong"
        >
          <Download className="h-3.5 w-3.5 shrink-0 text-os-accent" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-os-text">실행 가능한 스킬 파일 1개</span>
            <span className="block font-mono text-[9px] text-os-dim">다운로드해서 쓰세요</span>
          </span>
        </button>

        <SectionLabel icon={Puzzle}>세부 구성</SectionLabel>
        <div className="mb-3.5 flex flex-wrap gap-1.5">
          {pb.breaksInto.map((s) => (
            <Chip key={s} label={s} />
          ))}
        </div>

        <SectionLabel icon={Layers}>기반</SectionLabel>
        <div className="mb-3.5 flex flex-wrap gap-1.5">
          {pb.buildsOn.length ? (
            pb.buildsOn.map((s) => <Chip key={s} label={s} dashed />)
          ) : (
            <span className="font-mono text-[10px] text-os-dim">선행 항목 없음</span>
          )}
        </div>

        <SectionLabel icon={DollarSign}>대체하는 것</SectionLabel>
        <p className="mb-4 rounded-md-t border border-os-border bg-os-surface px-2.5 py-2 text-[11px] leading-relaxed text-os-muted">
          {pb.replaces}
        </p>

        <SectionLabel icon={GitBranch}>자동화 단계</SectionLabel>
        <div className="mb-4 flex flex-col gap-1">
          {AUTONOMY_LEVELS.map((lvl) => (
            <LadderRung
              key={lvl}
              label={autonomyLabel(lvl)}
              text={lvl === 'human-led' ? pb.ladder.humanLed : lvl === 'human-assisted' ? pb.ladder.humanAssisted : pb.ladder.fullyAutonomous}
              active={lvl === pb.autonomy}
            />
          ))}
        </div>

        <SectionLabel icon={UserCheck}>사람의 역할</SectionLabel>
        <p className="mb-4 text-[11px] leading-relaxed text-os-muted">{pb.theHuman}</p>

        <SectionLabel icon={UserCog}>담당</SectionLabel>
        <div className="mb-4">
          <Row color={assigneeColor} title={assigneeName} sub={assigneeKindLabel} badge="1:1" onClick={onAssignee} />
          {runtime && (
            <p className="mt-1 font-mono text-[9.5px] text-os-dim">
              실행 위치 <span className="text-os-muted">{runtime}</span>
            </p>
          )}
        </div>

        <SectionLabel icon={ListChecks}>SOP 전체 내용</SectionLabel>
        <ol className="mb-4 flex flex-col gap-1.5">
          {task.steps.map((s, i) => (
            <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-os-muted">
              <span className="shrink-0 font-mono text-[10px] text-os-dim">{String(i + 1).padStart(2, '0')}</span>
              {s}
            </li>
          ))}
        </ol>

        <SectionLabel icon={Wrench}>최종적으로 쓰는 도구 ({tools.length})</SectionLabel>
        <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1.5">
          {tools.map((t) => (
            <WikiLink key={t.slug} label={t.name} mcp={t.mcp} onClick={onTool ? () => onTool(t.slug) : undefined} />
          ))}
          {tools.length === 0 && <span className="font-mono text-[10.5px] text-os-dim">연결된 도구 없음</span>}
        </div>

        <SectionLabel icon={StickyNote}>구축 메모</SectionLabel>
        <p className="mb-4 text-[11px] leading-relaxed text-os-muted">{pb.buildNotes}</p>

        <SectionLabel icon={Sparkles}>스킬 가져가기</SectionLabel>
        <div className="mb-2 rounded-md-t border border-os-border bg-os-surface">
          <button
            onClick={() => setSkillOpen((v) => !v)}
            className="pressable flex w-full items-center gap-2 px-2.5 py-2 text-left"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-os-accent" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-semibold text-os-text">{pb.skill.name}</span>
              <span className="block truncate font-mono text-[9px] text-os-dim">{pb.skill.slug}.md</span>
            </span>
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-os-dim transition-transform ${skillOpen ? 'rotate-180' : ''}`} />
          </button>
          <p className="border-t border-os-border px-2.5 py-1.5 text-[10.5px] leading-relaxed text-os-muted">{pb.skill.blurb}</p>
          {skillOpen && (
            <div className="border-t border-os-border">
              <pre className="max-h-64 overflow-auto px-2.5 py-2 font-mono text-[9.5px] leading-relaxed text-os-muted">{pb.skillMarkdown}</pre>
              <button
                onClick={downloadSkill}
                className="pressable flex w-full items-center justify-center gap-1.5 border-t border-os-border px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-os-dim hover:text-os-accent"
              >
                <Download className="h-3 w-3" /> {pb.skill.slug}.md 다운로드
              </button>
            </div>
          )}
        </div>

        <button className="pressable mt-1 flex w-full items-center justify-center gap-1.5 rounded-md-t border border-dashed border-os-border px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-os-dim hover:border-os-border-strong hover:text-os-text">
          <HelpCircle className="h-3.5 w-3.5" /> 구축하는 데 도움이 필요하세요?
        </button>
      </div>
    </div>
  );
}

/** Graph human detail: a person in the process — their one job and tools. */
export function GraphHumanDetailCard({
  person, deptName, color, task, tools, onBack, onClose, onTask, onTool,
}: {
  person: Person;
  deptName: string;
  color: string;
  task: SopTask | null;
  tools: { slug: string; name: string; mcp: boolean }[];
  onBack?: () => void;
  onClose?: () => void;
  onTask?: () => void;
  onTool?: (slug: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title={person.name} sub={`${person.role} · 사람`} color={color} onBack={onBack} onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2.5">
        <p className="mb-3 text-[11px] leading-relaxed text-os-muted">
          <span className="font-semibold">{deptName}</span>의 사람 직원 — 이 사람만 하는 한 가지 일.
        </p>
        <SectionLabel icon={ClipboardList}>맡은 일</SectionLabel>
        <div className="mb-4">
          {task ? (
            <Row color={color} title={task.title} sub={task.summary} badge="sop" onClick={onTask} />
          ) : (
            <p className="font-mono text-[10.5px] text-os-dim">배정된 작업 없음</p>
          )}
        </div>
        <SectionLabel icon={Wrench}>함께 쓰는 도구 ({tools.length})</SectionLabel>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {tools.map((t) => (
            <WikiLink key={t.slug} label={t.name} mcp={t.mcp} onClick={onTool ? () => onTool(t.slug) : undefined} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Person detail: who they are and the agents they manage. */
export function PersonDetailCard({
  person, deptName, color, agents, onBack, onClose,
}: {
  person: Personnel;
  deptName: string;
  color: string;
  agents: AgentLite[];
  onBack?: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title={person.name} sub={person.role} color={color} onBack={onBack} onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2.5">
        <p className="mb-3 text-[11px] leading-relaxed text-os-muted">
          <span className="font-semibold" style={{ color }}>{deptName}</span> 리드 — 에이전트 {agents.length}개를 관리합니다.
        </p>
        <SectionLabel icon={FileText}>맥락 · brain-store/people/{person.name.toLowerCase()}.md</SectionLabel>
        <div className="mb-4"><WikiLink label={`${person.name.toLowerCase()}.md`} /></div>
        <SectionLabel icon={User}>관리 대상</SectionLabel>
        <div className="flex flex-col gap-1">
          {agents.map((a) => (
            <span key={a.id} className="font-mono text-[11px] text-os-muted">{a.name}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Department-head card — the crown node: its board seat, a real Run, and the
 * department's SOP skills it presides over. */
export function HeadDetailCard({
  title, deptName, color, boardLead, sops, roleLabel = '부서장', blurb, showSops = true, embed = null, onBack, onClose, onTask,
}: {
  title: string;
  deptName: string;
  color: string;
  /** the matching live Paperclip lead, when the board knows this seat */
  boardLead: { id: string; name: string; status: string; model: string | null } | null;
  sops: { id: string; title: string; skillName: string }[];
  /** sub-line role — the graph's board-agent cards override the default */
  roleLabel?: string;
  /** intro paragraph override (defaults to the executive-seat line) */
  blurb?: ReactNode;
  /** board agents own no department SOPs, so their card hides that block */
  showSops?: boolean;
  /** live dashboard embedded under the Run button (the Hermes seat's worker pool) */
  embed?: { url: string; title: string } | null;
  onBack?: () => void;
  onClose?: () => void;
  onTask?: (taskId: string) => void;
}) {
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState<string | null>(null);

  const run = async () => {
    if (!boardLead || running) return;
    setRunning(true);
    setRunMsg(null);
    try {
      const res = await fetch(`/api/board/agents/${boardLead.id}/run`, { method: 'POST' });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setRunMsg('보드에서 실행을 시작했습니다 — 칩이 초록색으로 바뀌는지 보세요.');
    } catch (err) {
      setRunMsg(`실행 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PanelHeader title={title} sub={`${deptName} · ${roleLabel}`} color={color} onBack={onBack} onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2.5">
        <p className="mb-3 text-[11px] leading-relaxed text-os-muted">
          {blurb ?? (
            <>
              <span className="font-semibold">{deptName}</span>의 임원 자리 — 아래 모든 SOP가 이 자리를 거쳐 보고됩니다.
            </>
          )}
        </p>

        <SectionLabel icon={Crown}>보드 자리</SectionLabel>
        <div className="mb-3">
          {boardLead ? (
            <div className="flex items-center gap-2 rounded border border-os-border bg-os-bg px-2.5 py-1.5">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  boardLead.status === 'running' ? 'animate-pulse bg-os-ok' : boardLead.status === 'error' ? 'bg-os-err' : boardLead.status === 'paused' ? 'bg-os-warn' : 'bg-os-muted'
                }`}
              />
              <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold">{boardLead.name}</span>
              <span className="font-mono text-[9.5px] uppercase tracking-wider text-os-dim">{statusKo(boardLead.status)}</span>
              {boardLead.model && <span className="font-mono text-[9px] text-os-dim">{boardLead.model}</span>}
            </div>
          ) : (
            <p className="font-mono text-[10.5px] text-os-dim">아직 보드 자리가 없습니다 — Paperclip 보드에서 이 부서장을 채용하세요</p>
          )}
        </div>

        <button
          onClick={run}
          disabled={!boardLead || running}
          className="pressable mb-1.5 flex w-full items-center justify-center gap-1.5 rounded border border-os-border-strong bg-os-surface2 px-3 py-1.5 text-[11.5px] font-semibold text-os-text hover:border-os-dim disabled:opacity-40"
        >
          <Play className="h-3 w-3" /> {running ? '실행 시작 중…' : '보드에서 하트비트 실행'}
        </button>
        {runMsg && <p className="mb-3 font-mono text-[9.5px] leading-snug text-os-dim">{runMsg}</p>}

        {embed && (
          <>
            <SectionLabel icon={Server}>{embed.title} — 실시간</SectionLabel>
            <div className="mb-1.5 overflow-hidden rounded border border-os-border bg-os-bg">
              <iframe src={embed.url} title={embed.title} className="h-80 w-full" style={{ border: 0 }} />
            </div>
            <a
              href={embed.url}
              target="_blank"
              rel="noreferrer"
              className="mb-3 block font-mono text-[9.5px] text-os-dim underline-offset-2 hover:underline"
            >
              전체 대시보드 열기 ↗
            </a>
          </>
        )}

        {showSops && (
          <>
            <SectionLabel icon={ClipboardList}>총괄 (스킬 {sops.length}개)</SectionLabel>
            <div className="space-y-1">
              {sops.map((s) => (
                <Row key={s.id} color={color} title={s.title} sub={s.skillName} badge="스킬" onClick={onTask ? () => onTask(s.id) : undefined} />
              ))}
              {sops.length === 0 && <p className="font-mono text-[10.5px] text-os-dim">이 부서에는 아직 SOP가 없습니다</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
