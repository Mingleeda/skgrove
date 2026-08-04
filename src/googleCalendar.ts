// 구글 캘린더 읽기 이음새(seam).
//
// 프론트는 "어떤 OAuth 앱이냐"를 모르고 URL 규격에만 의존한다. client secret 은 프록시에만 있다.
// VITE_CALENDAR_ENDPOINT 가 없으면 disabled 를 돌려줘 호출부가 조용히 기존 동작을 유지한다.
// (api/review.ts 와 같은 방식 — '기능 없음'과 '호출 실패'를 구분해야 경고를 헛되이 띄우지 않는다.)
//
// 프록시는 원시 일정만 돌려준다. "이 회의가 어느 파트인가"는 계정 정보를 가진 프론트가 판정한다.
// 조직 구성을 외부로 나가는 요청에 싣지 않으려는 것이다.
import type {
  CalendarMeetingType,
  CalendarMetricEvent,
  ManagedAccount,
  RawCalendarEvent,
  TeamMemory,
} from './types';

export type CalendarFetchResult = {
  ok: boolean;
  events?: RawCalendarEvent[];
  reason?: string;
};

export type CalendarAuthResult = { ok: boolean; url?: string; reason?: string };

const TIMEOUT_MS = 10000;

// 모듈 로드 시점이 아니라 호출 시점에 읽는다. 테스트에서 환경변수를 갈아끼울 수 있어야 한다.
function endpoint(): string | undefined {
  return (import.meta.env as Record<string, string | undefined>).VITE_CALENDAR_ENDPOINT || undefined;
}

export function calendarConfigured(): boolean {
  return Boolean(endpoint());
}

async function callProxy<T>(path: string, init: RequestInit): Promise<T | { ok: false; reason: string }> {
  const base = endpoint();
  if (!base) return { ok: false, reason: 'disabled' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${base}${path}`, { ...init, signal: controller.signal });
    const data = (await response.json().catch(() => null)) as T | null;
    if (!data) return { ok: false, reason: `bad json (${response.status})` };
    return data;
  } catch (error) {
    return { ok: false, reason: String(error) };
  } finally {
    clearTimeout(timer);
  }
}

/** 구글 동의 화면 주소를 프록시에서 받아온다. client_id 는 서버에만 있다. */
export async function requestAuthUrl(): Promise<CalendarAuthResult> {
  return callProxy<CalendarAuthResult>('?action=auth', { method: 'GET' });
}

/** 프록시를 거쳐 캘린더 일정을 읽는다. accessToken 은 팝업 콜백에서 받은 단기 토큰이다. */
export async function fetchCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
): Promise<CalendarFetchResult> {
  return callProxy<CalendarFetchResult>('?action=events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, timeMin, timeMax }),
  });
}

export type CalendarConnectResult = { ok: boolean; accessToken?: string; reason?: string };

const POPUP_TIMEOUT_MS = 120000;

/**
 * 구글 동의 팝업을 띄우고 액세스 토큰을 받아온다.
 * 토큰은 저장하지 않는다. 호출부가 메모리에 들고 있다가 조회에 한 번 쓰고 버린다.
 */
export function connectGoogleCalendar(): Promise<CalendarConnectResult> {
  return new Promise((resolve) => {
    const base = endpoint();
    if (!base) {
      resolve({ ok: false, reason: 'disabled' });
      return;
    }

    // 콜백 페이지는 프록시가 띄운다. 그 오리진에서 온 메시지만 받는다.
    let proxyOrigin: string;
    try {
      proxyOrigin = new URL(base, window.location.href).origin;
    } catch {
      resolve({ ok: false, reason: 'bad endpoint' });
      return;
    }

    let settled = false;
    let popup: Window | null = null;
    const finish = (result: CalendarConnectResult) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      try {
        popup?.close();
      } catch {
        /* 이미 닫혔으면 그만이다. */
      }
      resolve(result);
    };

    function onMessage(event: MessageEvent) {
      // 오리진을 확인하지 않으면 아무 창이나 토큰을 흘려보낼 수 있다.
      if (event.origin !== proxyOrigin) return;
      const data = event.data as { type?: string; accessToken?: string; error?: string } | null;
      if (!data || data.type !== 'skgrove:calendar') return;
      if (data.error) {
        finish({ ok: false, reason: data.error });
        return;
      }
      if (data.accessToken) {
        finish({ ok: true, accessToken: data.accessToken });
      }
    }

    const timer = setTimeout(() => finish({ ok: false, reason: '시간이 초과되었어요' }), POPUP_TIMEOUT_MS);
    window.addEventListener('message', onMessage);

    void requestAuthUrl().then((auth) => {
      if (!auth.ok || !auth.url) {
        finish({ ok: false, reason: auth.reason ?? 'auth url 없음' });
        return;
      }
      popup = window.open(auth.url, 'skgrove-google-calendar', 'width=520,height=640');
      if (!popup) finish({ ok: false, reason: '팝업이 차단되었어요. 브라우저에서 허용해주세요.' });
    });
  });
}

/* ------------------------------------------------------------------ *
 * 아래는 순수 함수다. 판정 규칙이 여기 모여 있고 테스트도 여기에 붙는다.
 * ------------------------------------------------------------------ */

/**
 * 참석자가 이 수를 넘으면 전사·본부 성격으로 보고 파트 집계에서 뺀다.
 * 100명짜리 전체 회의를 참석자 최다 파트에 통째로 달면 그 파트 지수가 혼자 무너진다.
 */
export const MAX_PART_MEETING_ATTENDEES = 30;

/**
 * 회의인지 아닌지.
 * '시간이 잡혀 있다'만으로는 부족하다 — 집중 시간, 부재중, 내가 거절한 초대,
 * '한가함'으로 표시한 일정이 전부 회의로 잡혔다.
 * 구글이 이미 붙여둔 분류를 쓰고, 값이 없으면 회의 쪽으로 본다(예전 데이터 호환).
 */
export function isMeeting(event: RawCalendarEvent): boolean {
  // 종일 일정은 회의가 아니라 행사(팀데이·워크샵)다.
  if (event.isAllDay) return false;
  // focusTime · outOfOffice · workingLocation · birthday 는 회의가 아니다.
  if (event.eventType && event.eventType !== 'default') return false;
  // 거절한 초대는 참석하지 않았다.
  if (event.selfResponse === 'declined') return false;
  // '한가함'으로 표시한 일정은 보통 회의가 아니다.
  if (event.showsAsBusy === false) return false;
  return true;
}

/** 특정 파트에 달아도 되는 회의인지. 전사 규모는 어느 한 파트의 회의량이 아니다. */
export function isPartAttributable(event: RawCalendarEvent): boolean {
  return event.attendeeEmails.length <= MAX_PART_MEETING_ATTENDEES;
}

export function durationMinutes(event: RawCalendarEvent): number {
  const start = Date.parse(event.startsAt);
  const end = Date.parse(event.endsAt);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 60000));
}

// 제목에 캔미팅·티미팅이 적혀 있으면 그것으로 본다. 아니면 인원으로 가른다.
// 2명짜리 회의는 원온원이다.
export function meetingTypeOf(event: RawCalendarEvent): CalendarMeetingType {
  const title = event.title ?? '';
  if (title.includes('캔미팅')) return '캔미팅';
  if (title.includes('티미팅')) return '티미팅';
  if (event.attendeeEmails.length === 2) return '원온원';
  return '파트회의';
}

/**
 * 참석자 메일을 계정에 맞춰보고 가장 많은 파트를 그 회의의 파트로 본다.
 * 사내 계정이 한 명도 없으면 우리 팀 회의가 아니므로 null 을 돌려주고 집계에서 뺀다.
 * 잘못 붙인 파트는 그 파트의 지수를 조용히 망가뜨리므로, 모르면 세지 않는 편이 낫다.
 */
export function partOf(event: RawCalendarEvent, partByEmail: Map<string, string>): string | null {
  const counts = new Map<string, number>();
  for (const email of event.attendeeEmails) {
    const part = partByEmail.get(email.trim().toLowerCase());
    if (!part) continue;
    counts.set(part, (counts.get(part) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  let best: string | null = null;
  let bestCount = 0;
  for (const [part, count] of counts) {
    // 동수면 먼저 나온 파트를 쓴다. Map 은 삽입 순서를 지키므로 결과가 흔들리지 않는다.
    if (count > bestCount) {
      best = part;
      bestCount = count;
    }
  }
  return best;
}

export function buildPartByEmail(accounts: ManagedAccount[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const account of accounts) {
    // 비활성·탈퇴 계정은 현재 조직 구성이 아니다.
    if (account.status !== '활성') continue;
    if (!account.email) continue;
    map.set(account.email.trim().toLowerCase(), account.part);
  }
  return map;
}

/** 원시 일정 → 파트지수가 먹는 회의 목록. 파트를 못 정한 일정과 종일 일정은 빠진다. */
export function toMetricEvents(
  events: RawCalendarEvent[],
  accounts: ManagedAccount[],
): CalendarMetricEvent[] {
  const partByEmail = buildPartByEmail(accounts);
  const result: CalendarMetricEvent[] = [];

  for (const event of events) {
    if (!isMeeting(event)) continue;
    // 전사 회의는 회의이긴 하나 한 파트의 회의량은 아니다.
    if (!isPartAttributable(event)) continue;
    const part = partOf(event, partByEmail);
    if (!part) continue;
    const minutes = durationMinutes(event);
    // 길이를 못 읽은 일정은 회의 길이 지표를 왜곡한다. 세지 않는다.
    if (minutes <= 0) continue;

    result.push({
      id: event.id,
      title: event.title,
      part,
      type: meetingTypeOf(event),
      startsAt: event.startsAt,
      durationMinutes: minutes,
      attendees: event.attendeeEmails.length,
      isRecurring: event.isRecurring,
    });
  }

  return result;
}

/**
 * 원시 일정 → 팀 추억 행사.
 * 종일 일정만 행사로 본다. 회의까지 추억 캘린더에 올리면 행사가 묻힌다.
 * id 는 기존 추억과 부딪히지 않게 호출부에서 시작 번호를 준다.
 */
export function toMemoryEvents(
  events: RawCalendarEvent[],
  startId: number,
  createdBy: string,
): TeamMemory[] {
  return events
    .filter((event) => event.isAllDay)
    .map((event, index) => ({
      id: startId + index,
      title: event.title,
      // 종일 일정의 startsAt 은 이미 'YYYY-MM-DD' 다.
      date: event.startsAt.slice(0, 10),
      place: event.location ?? '장소 미정',
      host: event.organizerEmail ?? '주최자 미상',
      createdBy,
      summary: event.description ?? '구글 캘린더에서 가져온 행사입니다.',
      tags: ['캘린더'],
      assets: [],
      comments: [],
      reactions: { 좋아요: 0, 웃겨요: 0, 또가요: 0 },
    }));
}

/** 이미 있는 추억과 같은 날짜의 행사는 다시 만들지 않는다. */
export function mergeMemories(existing: TeamMemory[], incoming: TeamMemory[]): TeamMemory[] {
  const takenDates = new Set(existing.map((memory) => memory.date));
  const fresh = incoming.filter((memory) => !takenDates.has(memory.date));
  return [...existing, ...fresh];
}
