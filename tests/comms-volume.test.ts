import { describe, expect, test } from 'vitest';
import { commsVolume } from '@/lib/comms-volume';

/**
 * /comms wears Brand Deals' Deal Volume card (Alex, 2026-09-24: "the
 * current metrics displayed on each page should be displayed very similarly
 * to how they are in the Brand Deals tab"). The view-model turns the page's
 * existing data (lanes, Slack client cards, source states, the week's
 * meetings, recordings) into a headline, chips, meters, a per-day series and
 * the one insight. Every meter is a real fraction of its own whole.
 */
const NOW = new Date('2026-09-24T15:00:00');
const day = (d: number, h = 10) => new Date(2026, 8, d, h).toISOString();

const lanes = [
  {
    name: 'Work',
    source: 'email' as const,
    unread: 3,
    items: [
      { sender: 'Acme', ts: day(24), unread: 2, priority: 1 as const },
      { sender: 'Beta', ts: day(23), unread: 1 },
      { sender: 'Gamma', ts: day(23), unread: 0, priority: 1 as const },
    ],
  },
  { name: 'Personal', source: 'email' as const, unread: 0, items: [{ sender: 'Mom', ts: day(20), unread: 0 }] },
  { name: 'WhatsApp', source: 'whatsapp' as const, unread: 1, items: [{ sender: 'Sam', ts: day(24, 9), unread: 1 }] },
];
const slackCards = [
  { name: 'Vantage', unread: 2, waiting: 'you' as const },
  { name: 'Zentra', unread: 0, waiting: 'them' as const },
  { name: 'Futurism', unread: 1, waiting: 'you' as const },
  { name: 'Quiet', unread: 0, waiting: 'none' as const },
];
const sources = [{ state: 'connected' }, { state: 'connected' }, { state: 'error' }, { state: 'not_configured' }, { state: 'connected' }];
const events = [{ start: day(24, 16) }, { start: day(25, 11) }, { start: day(25, 14) }, { start: day(30, 9) }];
const recordings = [{ at: day(22) }, { at: day(21) }];

const v = commsVolume({ lanes, slackCards, sources, events, recordings, now: NOW });

describe('commsVolume: the headline', () => {
  test('is unread across the email inboxes and WhatsApp, the same number the tabs count', () => {
    expect(v.headline).toBe(4);
  });

  test('chips carry priority unread, Slack unread and erroring sources in status colors', () => {
    expect(v.chips).toEqual([
      { tone: 'warn', text: '우선 안 읽음 1' },
      { tone: 'accent', text: 'Slack 안 읽음 3' },
      { tone: 'err', text: '소스 오류 1' },
    ]);
  });

  test('the caption names the inbox count and the threads in view', () => {
    expect(v.caption).toBe('받은편지함 2개 + WhatsApp의 안 읽은 메시지 · 스레드 5개 표시 중');
  });

  test('the meta line is real numbers only', () => {
    expect(v.meta).toBe('안 읽음 4 · 소스 3/5 연결됨 · 앞으로 7일간 회의 4건 · 녹음 2건');
  });
});

describe('commsVolume: the meters', () => {
  test('four meters, each a real fraction of its own whole', () => {
    expect(v.meters.map((m) => m.label)).toEqual(['이메일 (3)', 'WhatsApp (1)', '답변을 기다리는 Slack 고객 (2/4)', '연결된 소스 (3/5)']);
    expect(v.meters[0]).toMatchObject({ frac: 0.75, display: '안 읽음 3' });
    expect(v.meters[1]).toMatchObject({ frac: 0.25, display: '안 읽음 1' });
    expect(v.meters[2]).toMatchObject({ frac: 0.5, display: '4명 중 2명' });
    expect(v.meters[3]).toMatchObject({ frac: 0.6, display: '60%' });
  });

  test('one hue per domain, from the shared CSS vars only', () => {
    for (const m of v.meters) expect(m.hue).toMatch(/^var\(--(accent|ok|warn|err|ramp-[1-4]|send-activity)\)$/);
    expect(new Set(v.meters.map((m) => m.hue)).size).toBe(4);
  });

  test('the foot says what the week and the recorder hold', () => {
    expect(v.foot).toBe('앞으로 7일간 회의 4건 · 최근 녹음 2건');
  });
});

describe('commsVolume: the series and the insight', () => {
  test('messages per local day, oldest first, ending today', () => {
    expect(v.series).toHaveLength(14);
    expect(v.series.at(-1)).toEqual({ label: '9월 24일', count: 2 });
    expect(v.series.at(-2)).toEqual({ label: '9월 23일', count: 2 });
    expect(v.series.find((s) => s.label === '9월 20일')?.count).toBe(1);
    expect(v.seriesTotal).toBe(5);
  });

  test('meetings per day for the next 7 days, today first', () => {
    expect(v.meetings.map((m) => m.label)).toEqual(['목', '금', '토', '일', '월', '화', '수']);
    expect(v.meetings.map((m) => m.count)).toEqual([1, 2, 0, 0, 0, 0, 1]);
    expect(v.meetingsTotal).toBe(4);
  });

  test('the insight is who is waiting on Alex: Slack clients plus priority unread', () => {
    expect(v.insight.value).toBe(3);
    expect(v.insight.headline).toBe('답변을 기다리는 고객 스레드 2개 · 우선 안 읽음 1건.');
    expect(v.insight.body).toBe('Vantage · Futurism · Acme');
    // 3 of the 6 things that could need him (4 client cards + 2 priority threads)
    expect(v.insight.frac).toBeCloseTo(0.5);
  });
});

describe('commsVolume: nothing to show', () => {
  const e = commsVolume({ lanes: [], slackCards: [], sources: [], events: [], recordings: [], now: NOW });

  test('empty data gives empty meters and honest copy, never fabricated numbers', () => {
    expect(e.headline).toBe(0);
    expect(e.chips).toEqual([]);
    expect(e.meters.every((m) => m.frac === 0)).toBe(true);
    expect(e.meters[2].display).toBe('연결된 고객 없음');
    expect(e.caption).toBe('아직 설정된 받은편지함이 없습니다');
    expect(e.seriesTotal).toBe(0);
    expect(e.meetingsTotal).toBe(0);
    expect(e.insight).toMatchObject({ value: 0, frac: 0 });
    expect(e.insight.body).toMatch(/기다리는 사람이 없습니다/);
  });
});
