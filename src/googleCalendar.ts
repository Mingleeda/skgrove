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

/**
 * 서버가 주기적으로 당겨둔 일정을 읽는다. 사용자 토큰이 필요 없다.
 *
 * '연결' 버튼을 누르는 흐름과 다른 점: 사람이 아무것도 하지 않아도 값이 있다.
 * 서버가 갱신 토큰으로 30분마다 조회해 담아둔 것을 그대로 가져온다.
 * syncedAt 이 있어야 "언제 기준인지"를 화면이 밝힐 수 있다 — 없으면 오래된 값을
 * 지금 값으로 착각한다.
 */
export type CalendarSnapshot = {
  ok: boolean;
  events?: RawCalendarEvent[];
  reason?: string;
  syncedAt?: string | null;
};

export async function fetchCalendarSnapshot(): Promise<CalendarSnapshot> {
  return callProxy<CalendarSnapshot>('?action=snapshot', { method: 'GET' });
}

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

/* ------------------------------------------------------------------ *
 * 제목 규칙 파싱
 *
 * 이 팀은 회의에 게스트를 초대하지 않는다. 공용 캘린더에 일정을 직접 등록하고
 * 소속을 제목 앞 대괄호에 적는다. 그래서 참석자 메일로는 파트를 알 수 없다
 * (실제 캘린더 14종 회의 중 참석자가 있는 건 0건이었다).
 *
 * 앞으로의 약속은 `[회의/참여자]` 형식이고, 참여자는 사람 이름 또는 파트명이다.
 * 다만 이미 쌓인 회의 13종은 그 형식이 아니므로(`[ITS혁신]파트 위클리` 등)
 * 새 형식만 읽으면 과거 데이터가 통째로 사라진다. 여러 단계로 훑어 최대한 살린다.
 * ------------------------------------------------------------------ */

/** 캘린더 제목의 짧은 파트 표기 → 앱의 TeamPart. '[팀전체]' 처럼 전사 성격도 여기서 받는다. */
const PART_ALIAS: Record<string, string> = {
  ITS혁신: 'ITS혁신파트',
  TEST혁신: 'TEST혁신파트',
  PM혁신: 'PM혁신파트',
  ITS혁신파트: 'ITS혁신파트',
  TEST혁신파트: 'TEST혁신파트',
  PM혁신파트: 'PM혁신파트',
  팀전체: '전체',
  전체: '전체',
};

/**
 * 제목 앞 대괄호를 뜯는다.
 * '[회의/심상준,박완배]조달청 사전미팅' → { tag: '회의/심상준,박완배', rest: '조달청 사전미팅' }
 * 대괄호가 없으면 tag 는 null 이다.
 */
export function parseTitleTag(title: string): { tag: string | null; rest: string } {
  const match = /^\s*\[([^\]]*)\]\s*(.*)$/.exec(title ?? '');
  if (!match) return { tag: null, rest: (title ?? '').trim() };
  return { tag: match[1].trim(), rest: match[2].trim() };
}

/** 이름 → 파트. 동명이인이 없다는 팀 약속에 기대므로 이름 하나에 파트 하나다. */
export function buildPartByName(accounts: ManagedAccount[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const account of accounts) {
    if (account.status !== '활성') continue;
    if (!account.name) continue;
    map.set(account.name.trim(), account.part);
  }
  return map;
}

/**
 * 대괄호 안의 토큰 하나를 파트로 옮긴다. 파트 표기가 우선이고, 아니면 사람 이름으로 본다.
 * 둘 다 아니면 null — 모르면 세지 않는 편이 잘못 붙이는 것보다 낫다.
 */
function partFromToken(token: string, partByName: Map<string, string>): string | null {
  const clean = token.trim();
  if (!clean) return null;
  return PART_ALIAS[clean] ?? partByName.get(clean) ?? null;
}

/**
 * 제목으로 파트를 판정한다.
 *   1) '[회의/심상준,박완배]'  → 참여자들의 파트 중 가장 많은 것
 *   2) '[ITS혁신]파트 위클리'  → 그 파트
 *   3) '[심상준]CAIO Weekly'  → 그 사람의 파트
 * 어느 것도 아니면 null. 회의 수에는 넣되 파트 집계에서는 뺀다.
 */
export function partFromTitle(title: string, partByName: Map<string, string>): string | null {
  const { tag } = parseTitleTag(title);
  if (!tag) return null;

  // '회의/' 접두는 벗기고 뒤의 참여자 목록만 본다.
  const body = tag.startsWith('회의/') ? tag.slice('회의/'.length) : tag;

  // 쉼표로 여러 명을 적는다. '팀장/파트장' 처럼 슬래시가 든 표기는 토큰으로 안 잡혀 null 이 된다.
  const counts = new Map<string, number>();
  for (const token of body.split(',')) {
    const part = partFromToken(token, partByName);
    if (!part) continue;
    counts.set(part, (counts.get(part) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  let best: string | null = null;
  let bestCount = 0;
  for (const [part, count] of counts) {
    // 동수면 먼저 나온 것을 쓴다. Map 이 삽입 순서를 지켜 결과가 흔들리지 않는다.
    if (count > bestCount) {
      best = part;
      bestCount = count;
    }
  }
  return best;
}

/**
 * 제목에 이름이 적힌 사람들. 이 팀은 참석자를 초대하지 않고 제목에 적으므로
 * 실제 참석자 목록을 얻을 다른 길이 없다(실측: 250건 중 참석자가 붙은 건 2건).
 *
 * 주의 — 이것은 '참석한 회의'가 아니라 '이름이 걸린 회의'다.
 * '[ITS혁신]파트 위클리' 처럼 이름 없는 회의에 매주 들어가는 사람은 여기 안 잡힌다.
 * 그래서 이 값을 '회의가 많은 사람'으로 부르면 안 된다 — 주최·주관하는 사람만
 * 많아 보이고 묵묵히 참석하는 사람은 0으로 보인다. 화면 라벨이 그 차이를 밝혀야 한다.
 */
export function namesFromTitle(title: string, knownNames: Iterable<string>): string[] {
  const text = title ?? '';
  const found: string[] = [];
  for (const name of knownNames) {
    // 동명이인이 없다는 팀 약속에 기대 단순 포함으로 본다.
    if (name && text.includes(name)) found.push(name);
  }
  return found;
}

/**
 * 사람별 '이름이 걸린 회의' 수. 많은 순으로 돌려준다.
 * 근태와 종일 일정은 회의가 아니므로 세지 않는다.
 */
export function countMeetingsByName(
  events: RawCalendarEvent[],
  accounts: ManagedAccount[],
): Array<{ name: string; count: number }> {
  const names = accounts.filter((a) => a.status === '활성').map((a) => a.name);
  const tally = new Map<string, number>();

  for (const event of events) {
    if (!isMeeting(event)) continue;
    if (isAttendanceEvent(event)) continue;
    for (const name of namesFromTitle(event.title, names)) {
      tally.set(name, (tally.get(name) ?? 0) + 1);
    }
  }

  return [...tally.entries()]
    .map(([name, count]) => ({ name, count }))
    // 동수면 이름 순. 새로고침마다 순서가 흔들리면 순위로 안 읽힌다.
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * 근태 일정인가. 휴가·출장·건강검진·반차는 회의가 아니고 팀 추억도 아니다.
 *
 * 이 판정이 없으면 toMemoryEvents 가 종일 일정을 전부 행사로 만들어
 * **동료의 휴가와 건강검진이 팀 추억 게시판에 올라간다.** 기능 오류를 넘어
 * 개인정보 문제라, 종일 일정을 다루는 모든 길목에서 먼저 걸러야 한다.
 */
/**
 * 팀 추억에 올릴 행사인가. 제목에 '팀행사'가 있어야 한다.
 *
 * 허용 목록이다. 캘린더에는 개인 일정이 섞여 있고 그 목록은 앞으로도 늘어난다.
 * 무엇을 뺄지 세는 대신 무엇을 넣을지만 정하면, 규칙에서 빠진 것은 조용히
 * 게시판에 뜨는 게 아니라 조용히 안 뜬다.
 */
export function isTeamEventTitle(title: string): boolean {
  return (title ?? '').includes('팀행사');
}

const ATTENDANCE_WORDS = ['휴가', '출장', '건강검진', '반차', '연차', '재택', '교육', '경조'];

export function isAttendanceEvent(event: RawCalendarEvent): boolean {
  const title = event.title ?? '';
  return ATTENDANCE_WORDS.some((word) => title.includes(word));
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
  const partByName = buildPartByName(accounts);
  const result: CalendarMetricEvent[] = [];

  for (const event of events) {
    if (!isMeeting(event)) continue;
    // 근태(휴가·출장·건강검진)는 시간이 잡혀 있어도 회의가 아니다.
    if (isAttendanceEvent(event)) continue;
    // 전사 회의는 회의이긴 하나 한 파트의 회의량은 아니다.
    if (!isPartAttributable(event)) continue;
    /*
      제목을 먼저 본다. 이 팀은 게스트를 초대하지 않고 제목 대괄호에 소속을 적는다.
      참석자로 판정하는 길은 남겨둔다 — 초대 기반으로 운영이 바뀌어도 그대로 동작한다.
    */
    const part = partFromTitle(event.title, partByName) ?? partOf(event, partByEmail);
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
    /*
      제목에 '팀행사'가 있는 것만 올린다.

      처음에는 근태(휴가·출장·건강검진)를 빼는 방식으로 짰는데, 그건 차단 목록이라
      새로운 종류의 개인 일정(병가·육아휴직·경조사…)이 생기면 그대로 새어 나간다.
      빠뜨린 낱말 하나가 곧 동료의 사생활이 게시판에 뜨는 것이라 대가가 너무 크다.

      '표시한 것만 올린다'로 뒤집으면 실수의 방향이 바뀐다 — 빠뜨려도 안 올라올 뿐이다.
      기본값이 '안전'인 쪽을 고른다.
    */
    .filter((event) => isTeamEventTitle(event.title))
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
