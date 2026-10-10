import { GATED, connected as gatedConnected } from '@/lib/connectors/demo-status';
import { CRED_FILES, resolveCred } from '@/lib/creds';
import type { ConnectorStatus } from '@/lib/connectors/types';

export async function arcadsStatus(): Promise<ConnectorStatus> {
  if (GATED) return gatedConnected('arcads', 'Arcads', 'creative', 'UGC generation · live');
  const auth = resolveCred('ARCADS_BASIC_AUTH', [CRED_FILES.arcads]);
  if (!auth) {
    return {
      id: 'arcads',
      name: 'Arcads (UGC 광고)',
      kind: 'creative',
      state: 'not_configured',
      detail: '환경 변수나 ~/projects/arcads-skills/.env 에서 ARCADS_BASIC_AUTH를 찾을 수 없습니다.',
    };
  }
  try {
    const res = await fetch('https://external-api.arcads.ai/v1/products', {
      cache: 'no-store',
      headers: { Authorization: auth.startsWith('Basic ') ? auth : `Basic ${auth}` },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}${res.status === 403 ? ' — rotate creds in Arcads dashboard' : ''}`);
    const body = (await res.json()) as unknown[] | { results?: unknown[] };
    const products = Array.isArray(body) ? body.length : (body.results?.length ?? 0);
    return {
      id: 'arcads',
      name: 'Arcads (UGC 광고)',
      kind: 'creative',
      state: 'connected',
      detail: `Vantage 워크스페이스 연결됨 · 제품 ${products}개`,
      meta: { products },
    };
  } catch (err) {
    return {
      id: 'arcads',
      name: 'Arcads (UGC 광고)',
      kind: 'creative',
      state: 'error',
      detail: `인증 정보는 있지만 API 확인 실패: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
