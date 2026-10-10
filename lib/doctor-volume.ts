import type { Meter, Tone } from '@/components/slab';
import type { SeriesPoint } from '@/components/slab-charts';
import type { BrainOverview } from '@/lib/connectors/gbrain';
import type { PillarAxis } from '@/lib/pillar-radar';

/** A storage layer no check covered on this read. */
const NOT_CHECKED = '확인 안 됨';

/**
 * /doctor in the Brand Deals look (Alex, 2026-09-24). One pure pass over
 * the page's own real reads (the gbrain doctor, the brain-store walk, the
 * pillar radar axes and the data-agent's run history) produces every number
 * the slab shows: the Health Volume headline, chips and meters, the brain-run
 * step line, the store dot matrix and the single "Needs you" insight. When the
 * doctor does not answer, the meters sit empty and the copy says so.
 */
export type DoctorVolumeInput = {
  doctor: BrainOverview['doctor'];
  store: BrainOverview['store'];
  axes: PillarAxis[];
  runs: { finishedAt: string; ok: boolean }[];
  now?: Date;
  days?: number;
};

export type StorageLayer = { name: string; sub: string; val: string; state: 'connected' | 'available' | 'error' };

export type DoctorVolume = {
  headline: number | null;
  counts: { ok: number; warn: number; fail: number; total: number };
  chips: Array<{ tone?: Tone; text: string }>;
  caption: string;
  meters: Meter[];
  foot: string;
  series: SeriesPoint[];
  runsInWindow: number;
  failedInWindow: number;
  store: { cols: SeriesPoint[]; total: number; top: { name: string; files: number } | null };
  insight: { value: number | null; headline: string; body: string; frac: number };
};

const frac = (n: number, d: number) => (d > 0 ? Math.max(0, Math.min(1, n / d)) : 0);
const pct = (f: number) => `${Math.round(f * 100)}%`;
const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayLabel = (d: Date) => d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
const clip = (s: string) => (s.length > 10 ? `${s.slice(0, 9)}…` : s);
const STORE_COLS = 7;

/**
 * The four storage layers the page lists, with the fallback rule it always
 * used: a failing Supabase/database check (or, with no such check, an
 * unreachable doctor) means searches are answered by local grep.
 */
export function doctorLayers(x: Pick<DoctorVolumeInput, 'doctor' | 'store'> & { storeShort: string }): {
  layers: StorageLayer[];
  fallbackActive: boolean;
} {
  const { doctor, store } = x;
  const supabaseCheck = doctor.checks.find((c) => /supabase|database/i.test(c.name));
  const embedCheck = doctor.checks.find((c) => /embed|ollama|zero/i.test(c.name));
  const fallbackActive = supabaseCheck ? supabaseCheck.status !== 'ok' : !doctor.connected;
  const layers: StorageLayer[] = [
    {
      name: 'gbrain CLI',
      sub: 'v0.47 · ~/.bun/bin/gbrain · doctor --fast',
      val: doctor.connected ? '가동 중' : '연결 불가',
      state: doctor.connected ? 'connected' : 'error',
    },
    {
      name: 'brain-store/',
      sub: `${x.storeShort} · 마크다운 지식`,
      val: `${store.totalFiles} 페이지`,
      state: store.totalFiles > 0 ? 'connected' : 'available',
    },
    {
      name: 'Ollama (bge-m3)',
      sub: '하이브리드 검색 임베딩 · 로컬, 1024차원',
      // `doctor --fast` runs no embeddings check (and an unreachable doctor
      // runs none), so without one the layer is unverified, not LIVE.
      val: embedCheck ? (embedCheck.status === 'ok' ? '가동 중' : embedCheck.status.toUpperCase()) : NOT_CHECKED,
      state: embedCheck && embedCheck.status === 'ok' ? 'connected' : 'available',
    },
    {
      name: 'Supabase 세컨드 브레인',
      sub: '918 페이지 / 11k 청크 · 무료 플랜 유휴 시 일시정지',
      val: fallbackActive ? '일시정지' : '가동 중',
      state: fallbackActive ? 'available' : 'connected',
    },
  ];
  return { layers, fallbackActive };
}

export function doctorVolume(x: DoctorVolumeInput): DoctorVolume {
  const now = x.now ?? new Date();
  const days = x.days ?? 14;
  const { doctor, store } = x;
  const live = doctor.connected;

  // Checks: ok, warn, and everything else (error, fail, unknown) as failing,
  // so the chips always add up to the checks run.
  const ok = doctor.checks.filter((c) => c.status === 'ok').length;
  const warn = doctor.checks.filter((c) => c.status === 'warn').length;
  const total = doctor.checks.length;
  const fail = total - ok - warn;
  const counts = { ok, warn, fail, total };

  const chips: DoctorVolume['chips'] = [];
  if (!live) chips.push({ tone: 'err', text: '연결 불가' });
  else {
    if (ok) chips.push({ tone: 'ok', text: `통과 ${ok}` });
    if (warn) chips.push({ tone: 'warn', text: `경고 ${warn}` });
    if (fail) chips.push({ tone: 'err', text: `실패 ${fail}` });
  }

  const score = live ? doctor.healthScore : null;
  const { layers } = doctorLayers({ doctor, store, storeShort: store.path });
  const layersLive = layers.filter((l) => l.state === 'connected').length;
  const layersChecked = layers.filter((l) => l.val !== NOT_CHECKED).length;
  const unchecked = layers.length - layersChecked;
  const pillarMean = x.axes.length ? Math.round(x.axes.reduce((n, a) => n + a.score, 0) / x.axes.length) : 0;

  const healthF = score == null ? 0 : frac(score, 100);
  const checksF = frac(ok, total);
  const layersF = frac(layersLive, layersChecked);
  const pillarF = frac(pillarMean, 100);
  const meters: Meter[] = [
    {
      label: `엔진 상태 (${score ?? ' - '}/100)`,
      frac: healthF,
      display: score == null ? (live ? '점수 없음' : '연결 불가') : pct(healthF),
      hue: 'var(--accent)',
    },
    {
      label: `통과한 진단 항목 (${ok}/${total})`,
      frac: checksF,
      display: total ? `정상 ${ok} · 표시됨 ${total - ok}` : '실행한 진단 없음',
      hue: total > 0 && ok === total ? 'var(--ok)' : 'var(--warn)',
    },
    {
      label: unchecked
        ? `가동 중인 저장 계층 (확인된 ${layersChecked}개 중 ${layersLive}개 · 미확인 ${unchecked}개)`
        : `가동 중인 저장 계층 (${layersLive}/${layers.length})`,
      frac: layersF,
      display: pct(layersF),
      hue: 'var(--ramp-1)',
    },
    {
      label: `축별 상태 (축 ${x.axes.length}개)`,
      frac: pillarF,
      display: x.axes.length ? `${pillarMean}/100` : '축 없음',
      hue: 'var(--ramp-4)',
    },
  ];

  // data-agent runs bucketed by local day over the window, oldest first.
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const buckets = new Map<string, number>();
  const labels: Array<[string, string]> = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    buckets.set(localDay(d), 0);
    labels.push([localDay(d), dayLabel(d)]);
  }
  let runsInWindow = 0;
  let failedInWindow = 0;
  for (const r of x.runs) {
    const t = new Date(r.finishedAt);
    if (!Number.isFinite(t.getTime()) || t < start || t > now) continue;
    const key = localDay(t);
    if (!buckets.has(key)) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
    runsInWindow += 1;
    if (!r.ok) failedInWindow += 1;
  }
  const series = labels.map(([key, label]) => ({ label, count: buckets.get(key) ?? 0 }));

  // The store: its biggest folders, largest first.
  const biggest = [...store.folders].sort((a, b) => b.files - a.files || a.name.localeCompare(b.name));
  const storeCols = biggest.slice(0, STORE_COLS).map((f) => ({ label: clip(f.name), count: f.files }));

  // The one gradient card: the checks asking for attention.
  const flagged = doctor.checks.filter((c) => c.status !== 'ok');
  const insight: DoctorVolume['insight'] = !live
    ? {
        value: null,
        headline: '진단에 연결할 수 없습니다.',
        body: 'gbrain doctor가 응답하지 않아 검색은 디스크의 브레인 저장소를 grep 하는 방식으로 대체됩니다.',
        frac: 0,
      }
    : {
        value: flagged.length,
        headline: flagged.length ? `경고 ${warn} · 실패 ${fail}.` : '모든 진단 항목을 통과했습니다.',
        body: flagged.length
          ? flagged
              .slice(0, 3)
              .map((c) => c.name)
              .join(' · ')
          : total
            ? `진단 항목 ${total}개 정상, 기다리는 일 없음.`
            : '진단이 응답했지만 실행한 항목이 없습니다.',
        frac: frac(flagged.length, total),
      };

  return {
    headline: score,
    counts,
    chips,
    caption: live ? `진단 항목 ${total}개 · 디스크의 페이지 ${store.totalFiles}개` : `gbrain 연결 불가 · 디스크의 페이지 ${store.totalFiles}개, 로컬 grep이 응답`,
    meters,
    foot: `폴더 ${store.folders.length}개 · 축 ${x.axes.length}개 · 가동 중인 계층 ${layersLive}/${layers.length}`,
    series,
    runsInWindow,
    failedInWindow,
    store: { cols: storeCols, total: store.totalFiles, top: biggest[0] ? { name: biggest[0].name, files: biggest[0].files } : null },
    insight,
  };
}
