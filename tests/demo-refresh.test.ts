import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { Spotlight, PageSpotlight } from '@/components/Spotlight';
const read = (p: string) => readFileSync(p, 'utf8');
describe('public demo refresh', () => {
  test('no cursor glow is rendered anywhere', () => {
    expect(Spotlight()).toBeNull();
    expect(PageSpotlight()).toBeNull();
    expect(read('app/layout.tsx')).not.toContain('<PageSpotlight />');
  });
  test('home uses the current slab', () => {
    expect(read('app/page.tsx')).toContain('os-slab');
  });
  test('the layout appends nothing under each view and mounts no first-run pop-up', () => {
    const layout = read('app/layout.tsx');
    expect(layout).toMatch(/\{children\}\s*<\/div>/);
    expect(layout).not.toMatch(/Modal/);
  });
});
