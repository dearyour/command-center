import { describe, expect, test } from 'vitest';
import { skillsVolume, type SkillsVolumeInput } from '@/lib/skills-volume';

/**
 * /skills in the Brand Deals look (Alex, 2026-09-24). Skills carry no dates,
 * so there is no step line to draw honestly: the slab shows the catalog's
 * shape instead. Skill Volume headline + meters, skills per source group,
 * operator skills per category and per owner, and one "Drafts" insight card.
 * Fed with the page's own rows: ~/.claude skills and the operator skills table.
 */
const INPUT: SkillsVolumeInput = {
  claude: [
    { slug: 'codex', group: 'Engineering' },
    { slug: 'mcp-builder', group: 'Engineering' },
    { slug: 'build', group: 'Spec · build · review' },
    { slug: 'superpowers:brainstorming', group: 'Plugin · superpowers' },
    { slug: 'superpowers:tdd', group: 'Plugin · superpowers' },
    { slug: 'superpowers:debug', group: 'Plugin · superpowers' },
    { slug: 'slack:digest', group: 'Plugin · slack' },
  ],
  operator: [
    { name: 'Cold opener', category: 'Sales', status: 'live', ownerAgentId: 'closer', tools: ['gmail'] },
    { name: 'Objection map', category: 'Sales', status: 'learning', ownerAgentId: 'closer', tools: [] },
    { name: 'Hook writer', category: 'Content', status: 'live', ownerAgentId: 'scribe', tools: ['zernio', 'gmail'] },
    { name: 'Ops audit', category: 'Ops', status: 'planned', ownerAgentId: null, tools: [] },
  ],
  agentNames: { closer: 'Closer Agent', scribe: 'Scribe' },
};

describe('skillsVolume', () => {
  const v = skillsVolume(INPUT);

  test('headline is the whole catalog, split by source and status', () => {
    expect(v.headline).toBe(11);
    expect(v.counts).toEqual({ claude: 7, user: 3, plugin: 4, operator: 4, live: 9, learning: 1, planned: 1 });
    expect(v.caption).toBe('사용자 3 · 플러그인 4 · 운영자 4');
  });

  test('dot chips carry status in status colors, zero states left out', () => {
    expect(v.chips).toEqual([
      { tone: 'ok', text: '운영 중 9' },
      { tone: 'warn', text: '학습 중 1' },
      { text: '계획됨 1' },
    ]);
  });

  test('four meters, each a real fraction of its own whole', () => {
    expect(v.meters.map((m) => m.label)).toEqual([
      '운영 중 (9/11)',
      '디스크의 Claude Code (7/11)',
      '담당자가 있는 운영자 스킬 (3/4)',
      '도구가 연결된 운영자 스킬 (2/4)',
    ]);
    expect(v.meters[0].frac).toBeCloseTo(9 / 11);
    expect(v.meters[0]).toMatchObject({ display: '82%', hue: 'var(--ok)' });
    expect(v.meters[1]).toMatchObject({ display: '64%', hue: 'var(--ramp-1)' });
    expect(v.meters[2]).toMatchObject({ frac: 0.75, display: '75%', hue: 'var(--accent)' });
    expect(v.meters[3]).toMatchObject({ frac: 0.5, display: '50%', hue: 'var(--ramp-4)' });
    expect(v.foot).toBe('그룹 5개 · 플러그인 2개 · 연결된 도구 2개');
  });

  test('groups: skills per source group, biggest first, short labels', () => {
    expect(v.groups).toEqual([
      { label: 'superpowers', count: 3 },
      { label: 'Engineering', count: 2 },
      { label: '운영자', count: 4 },
      { label: 'Spec', count: 1 },
      { label: 'slack', count: 1 },
    ].sort((a, b) => b.count - a.count));
    expect(v.groupCount).toBe(5);
  });

  test('operator skills per category and per owner, unassigned counted apart', () => {
    expect(v.categories).toEqual([
      { label: 'Sales', count: 2 },
      { label: 'Content', count: 1 },
      { label: 'Ops', count: 1 },
    ]);
    expect(v.owners).toEqual([
      { label: 'Closer', count: 2 },
      { label: 'Scribe', count: 1 },
    ]);
    expect(v.unassigned).toBe(1);
  });

  test('the one insight card is the drafts still to finish', () => {
    expect(v.insight.value).toBe(2);
    expect(v.insight.headline).toBe('학습 중 1 · 계획됨 1.');
    expect(v.insight.body).toBe('Objection map · Ops audit');
    expect(v.insight.frac).toBeCloseTo(2 / 4);
  });
});

describe('skillsVolume with nothing to show', () => {
  const e = skillsVolume({ claude: [], operator: [], agentNames: {} });

  test('empty meters and honest copy, never a fake fill', () => {
    expect(e.headline).toBe(0);
    expect(e.chips).toEqual([]);
    expect(e.meters.every((m) => m.frac === 0)).toBe(true);
    expect(e.meters.map((m) => m.display)).toEqual(['아직 스킬 없음', '디스크에 없음', '운영자 스킬 없음', '운영자 스킬 없음']);
    expect(e.groups).toEqual([]);
    expect(e.insight).toMatchObject({ value: 0, frac: 0, headline: '모든 운영자 스킬이 운영 중입니다.', body: '아직 운영자 스킬이 없습니다.' });
  });

  test('all live reads as all live', () => {
    const g = skillsVolume({ claude: [], operator: [{ name: 'A', category: 'Ops', status: 'live', ownerAgentId: null, tools: [] }], agentNames: {} });
    expect(g.insight.body).toBe('운영자 스킬 1개, 모두 운영 중.');
    expect(g.unassigned).toBe(1);
  });
});
