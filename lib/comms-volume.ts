/**
 * /comms in the Brand Deals look (2026-09-24): the page's own numbers shaped
 * like Deal Volume. Pure and client-safe (no connector imports), so the page
 * stays a thin renderer and the shape is tested. Nothing here invents a
 * number: every meter is a real fraction of its own whole, and empty inputs
 * read as empty meters with copy that says so.
 */

export type CommsVolumeTone = 'ok' | 'warn' | 'err' | 'accent';
export type CommsMeter = { label: string; frac: number; display: string; hue: string };
export type CommsPoint = { label: string; count: number };

export type CommsVolumeInput = {
  lanes: Array<{
    name: string;
    source: 'email' | 'whatsapp';
    unread: number;
    items: Array<{ sender: string; ts: string; unread: number; priority?: 1 | 2 | 3 }>;
  }>;
  slackCards: Array<{ name: string; unread: number; waiting: 'you' | 'them' | 'none' }>;
  sources: Array<{ state: string }>;
  events: Array<{ start: string }>;
  recordings: Array<{ at: string }>;
  now?: Date;
  /** Days of message activity in the step line. */
  days?: number;
};

export type CommsVolume = {
  headline: number;
  chips: Array<{ tone: CommsVolumeTone; text: string }>;
  caption: string;
  meta: string;
  meters: CommsMeter[];
  foot: string;
  series: CommsPoint[];
  seriesTotal: number;
  meetings: CommsPoint[];
  meetingsTotal: number;
  insight: { value: number; headline: string; body: string; frac: number };
};

const frac = (n: number, d: number) => (d > 0 ? n / d : 0);

/** Local calendar day, the day Alex lived. */
function localKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function localMidnight(now: Date, offsetDays: number): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
}

function perDay(stamps: string[], start: Date, days: number, label: (d: Date) => string): CommsPoint[] {
  const counts = new Map<string, number>();
  for (const s of stamps) {
    const t = Date.parse(s);
    if (!Number.isFinite(t)) continue;
    const k = localKey(t);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { label: label(d), count: counts.get(localKey(d.getTime())) ?? 0 };
  });
}

export function commsVolume(x: CommsVolumeInput): CommsVolume {
  const now = x.now ?? new Date();
  const days = x.days ?? 14;
  const emailLanes = x.lanes.filter((l) => l.source === 'email');
  const emailUnread = emailLanes.reduce((n, l) => n + l.unread, 0);
  const waUnread = x.lanes.filter((l) => l.source === 'whatsapp').reduce((n, l) => n + l.unread, 0);
  const headline = emailUnread + waUnread;
  const items = x.lanes.flatMap((l) => l.items);
  const urgentItems = items.filter((i) => i.priority === 1 && i.unread > 0);
  const priorityItems = items.filter((i) => i.priority === 1).length;
  const slackUnread = x.slackCards.reduce((n, c) => n + c.unread, 0);
  const waitingCards = x.slackCards.filter((c) => c.waiting === 'you');
  const connected = x.sources.filter((s) => s.state === 'connected').length;
  const errored = x.sources.filter((s) => s.state === 'error').length;

  const chips: CommsVolume['chips'] = [];
  if (urgentItems.length > 0) chips.push({ tone: 'warn', text: `우선 안 읽음 ${urgentItems.length}` });
  if (slackUnread > 0) chips.push({ tone: 'accent', text: `Slack 안 읽음 ${slackUnread}` });
  if (errored > 0) chips.push({ tone: 'err', text: `소스 오류 ${errored}` });

  const caption =
    x.lanes.length === 0
      ? '아직 설정된 받은편지함이 없습니다'
      : `받은편지함 ${emailLanes.length}개${x.lanes.length > emailLanes.length ? ' + WhatsApp' : ''}의 안 읽은 메시지 · 스레드 ${items.length}개 표시 중`;

  const today = localMidnight(now, 0);
  const series = perDay(
    items.map((i) => i.ts).filter((ts) => Date.parse(ts) <= now.getTime()),
    localMidnight(now, -(days - 1)),
    days,
    (d) => d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
  );
  const meetings = perDay(
    x.events.map((e) => e.start),
    today,
    7,
    (d) => d.toLocaleDateString('ko-KR', { weekday: 'short' }),
  );
  const meetingsTotal = meetings.reduce((n, m) => n + m.count, 0);
  const recs = x.recordings.length;

  const meters: CommsMeter[] = [
    { label: `이메일 (${emailUnread})`, frac: frac(emailUnread, headline), display: `안 읽음 ${emailUnread}`, hue: 'var(--ramp-1)' },
    { label: `WhatsApp (${waUnread})`, frac: frac(waUnread, headline), display: `안 읽음 ${waUnread}`, hue: 'var(--ramp-3)' },
    {
      label: `답변을 기다리는 Slack 고객 (${waitingCards.length}/${x.slackCards.length})`,
      frac: frac(waitingCards.length, x.slackCards.length),
      display: x.slackCards.length ? `${x.slackCards.length}명 중 ${waitingCards.length}명` : '연결된 고객 없음',
      hue: 'var(--warn)',
    },
    {
      label: `연결된 소스 (${connected}/${x.sources.length})`,
      frac: frac(connected, x.sources.length),
      display: `${Math.round(frac(connected, x.sources.length) * 100)}%`,
      hue: 'var(--accent)',
    },
  ];

  const waitingNames = [...new Set([...waitingCards.map((c) => c.name), ...urgentItems.map((i) => i.sender)])];
  const value = waitingCards.length + urgentItems.length;

  return {
    headline,
    chips,
    caption,
    meta: `안 읽음 ${headline} · 소스 ${connected}/${x.sources.length} 연결됨 · 앞으로 7일간 회의 ${meetingsTotal}건 · 녹음 ${recs}건`,
    meters,
    foot: `앞으로 7일간 회의 ${meetingsTotal}건 · 최근 녹음 ${recs}건`,
    series,
    seriesTotal: series.reduce((n, s) => n + s.count, 0),
    meetings,
    meetingsTotal,
    insight: {
      value,
      headline: `답변을 기다리는 고객 스레드 ${waitingCards.length}개 · 우선 안 읽음 ${urgentItems.length}건.`,
      body: waitingNames.slice(0, 3).join(' · ') || '기다리는 사람이 없습니다. 중요한 스레드는 모두 답장했습니다.',
      frac: frac(value, x.slackCards.length + priorityItems),
    },
  };
}
