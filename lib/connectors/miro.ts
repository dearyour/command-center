import { GATED, connected as gatedConnected } from '@/lib/connectors/demo-status';
import { CRED_FILES, resolveCred } from '@/lib/creds';
import type { ConnectorStatus } from '@/lib/connectors/types';

export async function miroStatus(): Promise<ConnectorStatus> {
  if (GATED) return gatedConnected('miro', 'Miro', 'creative', 'boards · synced');
  const token = resolveCred('MIRO_ACCESS_TOKEN', [CRED_FILES.brainAgent]);
  if (!token) {
    return {
      id: 'miro',
      name: 'Miro',
      kind: 'creative',
      state: 'not_configured',
      detail: '환경 변수나 brain-agent/.env.agents에서 MIRO_ACCESS_TOKEN을 찾을 수 없습니다.',
    };
  }
  try {
    const res = await fetch('https://api.miro.com/v2/boards?limit=10', {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { data?: unknown[]; total?: number };
    return {
      id: 'miro',
      name: 'Miro',
      kind: 'creative',
      state: 'connected',
      detail: `Boards API 연결됨 · 보드 ${body.total ?? body.data?.length ?? 0}개`,
      meta: { boards: body.total ?? 0 },
    };
  } catch (err) {
    return {
      id: 'miro',
      name: 'Miro',
      kind: 'creative',
      state: 'error',
      detail: `토큰은 있지만 API 확인 실패: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
