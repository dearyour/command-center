import UsageBoard from '@/components/UsageBoard';
import { Slab, SlabTitle, PILL } from '@/components/slab';

export const dynamic = 'force-dynamic';

/** The token-burn board in the Brand Deals look (2026-09-24). The title row
    is static; every number below it is the live board's, polled every 10s. */
export default function UsagePage() {
  return (
    <Slab>
      <SlabTitle
        eyebrow="토큰 소모 · 제공자별 요금제"
        title="사용량"
        meta="Claude · ChatGPT / Codex · Ollama · 로컬 파일만 분석 · 유료 호출 없음 · 10초마다 새로고침"
        right={
          <a href="/api/usage" target="_blank" rel="noreferrer" className={PILL}>
            원본 데이터
          </a>
        }
      />
      <UsageBoard />
    </Slab>
  );
}
