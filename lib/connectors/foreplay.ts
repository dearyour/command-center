/**
 * Foreplay connector: Adscout's data source: Spyder competitor tracking,
 * the ~100M-ad Discovery database, and the operator's swipe file. Status is
 * key-presence plus the store's last-synced credit meter; it never spends
 * API credits just to render the Connections board.
 */
import { CRED_FILES, resolveCred } from '@/lib/creds';
import { FOREPLAY_KEY } from '@/lib/foreplay/client';
import { adStore } from '@/lib/foreplay/store';
import type { ConnectorStatus } from '@/lib/connectors/types';

export async function foreplayStatus(): Promise<ConnectorStatus> {
  const base = { id: 'foreplay', name: 'Foreplay', kind: 'creative' } as const;
  const key = resolveCred(FOREPLAY_KEY, [CRED_FILES.socialMedia, CRED_FILES.brainAgent]);
  if (!key) {
    return {
      ...base,
      state: 'not_configured',
      detail: 'Adscout용 광고 인텔리전스 (Spyder 관심 목록, Discovery 검색, 스폰서 자료). .env.local에 FOREPLAY_API_KEY를 설정하세요.',
    };
  }
  const usage = adStore.readUsage();
  const meta = adStore.readMeta();
  const credits = usage ? `크레딧 ${usage.remaining_credits.toLocaleString('en-US')}/${usage.total_credits.toLocaleString('en-US')}` : '첫 동기화 전까지 크레딧 알 수 없음';
  const synced = meta.lastSyncAt ? `마지막 동기화 ${meta.lastSyncAt.slice(0, 16).replace('T', ' ')}` : '동기화한 적 없음';
  return {
    ...base,
    state: 'connected',
    detail: `${credits} · ${synced}`,
    meta: usage ? { remaining: usage.remaining_credits, total: usage.total_credits } : undefined,
  };
}
