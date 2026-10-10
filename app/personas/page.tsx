import { getDb } from '@/lib/data';
import { PageHeader } from '@/components/PageHeader';
import { PersonasViewer } from '@/components/PersonasViewer';
import { Badge } from '@/components/terminal';
import { Rise } from '@/components/motion';

export const dynamic = 'force-dynamic';

export default function PersonasPage() {
  const personas = getDb().personas.all();

  return (
    <div>
      <PageHeader
        eyebrow="플랫폼 변형"
        title="페르소나"
        right={<Badge tone="accent">템플릿 {personas.length}개</Badge>}
      />
      <Rise i={1}>
        <PersonasViewer personas={personas} />
      </Rise>
    </div>
  );
}
