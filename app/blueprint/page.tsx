import { getDb } from '@/lib/data';
import { compileBlueprint } from '@/lib/blueprint/compile';
import { BlueprintCanvasLazy } from '@/components/blueprint/BlueprintCanvasLazy';

export const dynamic = 'force-dynamic';

function relativeTime(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 5) return '방금';
  if (seconds < 60) return `${seconds}초 전`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.round(hours / 24)}일 전`;
}

/**
 * Blueprint: the system, drawn from itself. compileBlueprint assembles
 * the graph from the live registries on every request; the workspace reads
 * that graph as machines → groups → things, so the subline's counts and the
 * map itself genuinely change when the system does.
 */
export default async function BlueprintPage() {
  const graph = await compileBlueprint(getDb());
  const count = (kind: string) => graph.nodes.filter((n) => n.kind === kind).length;
  const subline = `구성 요소 ${graph.nodes.length}개 · 에이전트 ${count('agent')}개 · 데몬 ${count('daemon')}개 · 머신 ${count('host')}개 · ${relativeTime(graph.compiledAt)} 컴파일`;
  return <BlueprintCanvasLazy graph={graph} subline={subline} />;
}
