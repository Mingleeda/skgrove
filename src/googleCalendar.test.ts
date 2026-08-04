import { describe, expect, it } from 'vitest';
import {
  MAX_PART_MEETING_ATTENDEES,
  buildPartByEmail,
  durationMinutes,
  isMeeting,
  isPartAttributable,
  meetingTypeOf,
  mergeMemories,
  partOf,
  toMemoryEvents,
  toMetricEvents,
} from './googleCalendar';
import type { ManagedAccount, RawCalendarEvent, TeamMemory } from './types';

const account = (patch: Partial<ManagedAccount>): ManagedAccount => ({
  id: 'USR-X',
  name: '아무개',
  email: 'a@sk.com',
  role: '팀원',
  part: 'TEST혁신파트',
  status: '활성',
  joinedAt: '2026-07-24',
  ...patch,
});

const event = (patch: Partial<RawCalendarEvent>): RawCalendarEvent => ({
  id: 'EV-1',
  title: '주간 싱크',
  startsAt: '2026-08-03T10:00:00+09:00',
  endsAt: '2026-08-03T11:00:00+09:00',
  isAllDay: false,
  isRecurring: false,
  attendeeEmails: ['a@sk.com', 'b@sk.com', 'c@sk.com'],
  ...patch,
});

const accounts = [
  account({ email: 'a@sk.com', part: 'TEST혁신파트' }),
  account({ email: 'b@sk.com', part: 'TEST혁신파트' }),
  account({ email: 'c@sk.com', part: 'ITS혁신파트' }),
];

describe('durationMinutes', () => {
  it('시작과 끝의 차이를 분으로 돌려준다', () => {
    expect(durationMinutes(event({}))).toBe(60);
  });

  it('90분도 정확히 센다', () => {
    expect(durationMinutes(event({ endsAt: '2026-08-03T11:30:00+09:00' }))).toBe(90);
  });

  it('날짜를 못 읽으면 0이다', () => {
    expect(durationMinutes(event({ endsAt: '언젠가' }))).toBe(0);
  });

  it('끝이 시작보다 앞서도 음수를 내지 않는다', () => {
    expect(durationMinutes(event({ endsAt: '2026-08-03T09:00:00+09:00' }))).toBe(0);
  });
});

describe('meetingTypeOf', () => {
  it('제목의 캔미팅·티미팅을 먼저 본다', () => {
    expect(meetingTypeOf(event({ title: '3분기 캔미팅' }))).toBe('캔미팅');
    expect(meetingTypeOf(event({ title: '8월 티미팅' }))).toBe('티미팅');
  });

  it('제목 규칙은 인원 규칙보다 우선한다', () => {
    // 2명이지만 캔미팅이라고 적혀 있으면 원온원이 아니다.
    expect(meetingTypeOf(event({ title: '캔미팅 사전 조율', attendeeEmails: ['a@sk.com', 'b@sk.com'] }))).toBe('캔미팅');
  });

  it('2명이면 원온원이다', () => {
    expect(meetingTypeOf(event({ attendeeEmails: ['a@sk.com', 'b@sk.com'] }))).toBe('원온원');
  });

  it('그 밖에는 파트회의다', () => {
    expect(meetingTypeOf(event({}))).toBe('파트회의');
  });
});

describe('isMeeting', () => {
  it('시간이 잡힌 보통 일정은 회의다', () => {
    expect(isMeeting(event({}))).toBe(true);
  });

  it('종일 일정은 회의가 아니라 행사다', () => {
    expect(isMeeting(event({ isAllDay: true }))).toBe(false);
  });

  it('집중 시간·부재중·근무 위치는 회의가 아니다', () => {
    expect(isMeeting(event({ eventType: 'focusTime' }))).toBe(false);
    expect(isMeeting(event({ eventType: 'outOfOffice' }))).toBe(false);
    expect(isMeeting(event({ eventType: 'workingLocation' }))).toBe(false);
    expect(isMeeting(event({ eventType: 'birthday' }))).toBe(false);
  });

  it('eventType 이 default 면 회의다', () => {
    expect(isMeeting(event({ eventType: 'default' }))).toBe(true);
  });

  it('내가 거절한 초대는 회의 시간에 넣지 않는다', () => {
    expect(isMeeting(event({ selfResponse: 'declined' }))).toBe(false);
  });

  it('수락·미정·미응답은 회의로 센다', () => {
    expect(isMeeting(event({ selfResponse: 'accepted' }))).toBe(true);
    expect(isMeeting(event({ selfResponse: 'tentative' }))).toBe(true);
    expect(isMeeting(event({ selfResponse: 'needsAction' }))).toBe(true);
  });

  it("'한가함'으로 표시한 일정은 회의가 아니다", () => {
    expect(isMeeting(event({ showsAsBusy: false }))).toBe(false);
  });

  it('값이 없으면 회의 쪽으로 본다 — 예전에 저장된 데이터 호환', () => {
    expect(isMeeting(event({ eventType: undefined, selfResponse: undefined, showsAsBusy: undefined }))).toBe(true);
  });
});

describe('isPartAttributable', () => {
  const withAttendees = (count: number) =>
    event({ attendeeEmails: Array.from({ length: count }, (_, i) => `p${i}@sk.com`) });

  it('보통 규모 회의는 파트에 단다', () => {
    expect(isPartAttributable(withAttendees(8))).toBe(true);
  });

  it('임계값까지는 단다', () => {
    expect(isPartAttributable(withAttendees(MAX_PART_MEETING_ATTENDEES))).toBe(true);
  });

  it('전사 규모는 어느 파트의 회의량도 아니다', () => {
    expect(isPartAttributable(withAttendees(MAX_PART_MEETING_ATTENDEES + 1))).toBe(false);
  });
});

describe('buildPartByEmail', () => {
  it('메일을 소문자로 맞춰 담는다', () => {
    const map = buildPartByEmail([account({ email: 'A@SK.COM', part: 'ITS혁신파트' })]);
    expect(map.get('a@sk.com')).toBe('ITS혁신파트');
  });

  it('비활성 계정은 현재 조직이 아니므로 뺀다', () => {
    const map = buildPartByEmail([account({ email: 'a@sk.com', status: '비활성' })]);
    expect(map.size).toBe(0);
  });
});

describe('partOf', () => {
  const partByEmail = buildPartByEmail(accounts);

  it('참석자가 가장 많은 파트로 정한다', () => {
    expect(partOf(event({}), partByEmail)).toBe('TEST혁신파트');
  });

  it('메일 대소문자가 달라도 맞춘다', () => {
    expect(partOf(event({ attendeeEmails: ['A@SK.com'] }), partByEmail)).toBe('TEST혁신파트');
  });

  it('사내 계정이 하나도 없으면 null 이다', () => {
    expect(partOf(event({ attendeeEmails: ['x@other.com'] }), partByEmail)).toBeNull();
  });

  it('참석자가 없으면 null 이다', () => {
    expect(partOf(event({ attendeeEmails: [] }), partByEmail)).toBeNull();
  });
});

describe('toMetricEvents', () => {
  it('시간 일정을 회의로 옮긴다', () => {
    const [first] = toMetricEvents([event({})], accounts);
    expect(first).toEqual({
      id: 'EV-1',
      title: '주간 싱크',
      part: 'TEST혁신파트',
      type: '파트회의',
      startsAt: '2026-08-03T10:00:00+09:00',
      durationMinutes: 60,
      attendees: 3,
      isRecurring: false,
    });
  });

  it('종일 일정은 회의가 아니므로 뺀다', () => {
    const all = toMetricEvents([event({ isAllDay: true, startsAt: '2026-08-07', endsAt: '2026-08-08' })], accounts);
    expect(all).toEqual([]);
  });

  it('파트를 못 정한 일정은 뺀다', () => {
    // 잘못 붙이면 그 파트 지수를 조용히 망가뜨린다.
    expect(toMetricEvents([event({ attendeeEmails: ['x@other.com'] })], accounts)).toEqual([]);
  });

  it('길이를 못 읽은 일정은 뺀다', () => {
    expect(toMetricEvents([event({ endsAt: '언젠가' })], accounts)).toEqual([]);
  });

  it('집중 시간과 거절한 초대는 회의 시간에 들어가지 않는다', () => {
    const events = toMetricEvents(
      [
        event({ id: 'A' }),
        event({ id: 'B', eventType: 'focusTime' }),
        event({ id: 'C', selfResponse: 'declined' }),
        event({ id: 'D', showsAsBusy: false }),
      ],
      accounts,
    );
    expect(events.map((e) => e.id)).toEqual(['A']);
  });

  it('전사 규모 회의는 파트 집계에서 뺀다', () => {
    const many = Array.from({ length: MAX_PART_MEETING_ATTENDEES + 5 }, (_, i) => `p${i}@sk.com`);
    // 사내 계정도 섞여 있어 파트는 정해지지만, 규모 때문에 제외되어야 한다.
    const events = toMetricEvents([event({ attendeeEmails: [...many, 'a@sk.com'] })], accounts);
    expect(events).toEqual([]);
  });

  it('60분 이상 여부를 그대로 셀 수 있게 길이를 남긴다', () => {
    const events = toMetricEvents(
      [event({ id: 'A', endsAt: '2026-08-03T11:10:00+09:00' }), event({ id: 'B', endsAt: '2026-08-03T10:30:00+09:00' })],
      accounts,
    );
    expect(events.filter((e) => e.durationMinutes >= 60)).toHaveLength(1);
  });
});

describe('toMemoryEvents', () => {
  const allDay = event({
    id: 'EV-9',
    title: '여름 팀데이',
    isAllDay: true,
    startsAt: '2026-08-07',
    endsAt: '2026-08-08',
    location: '성수 오프사이트 라운지',
    organizerEmail: 'host@sk.com',
    description: '팀 전체 워크샵',
  });

  it('종일 일정만 행사로 옮긴다', () => {
    const memories = toMemoryEvents([allDay, event({})], 10, '이선민');
    expect(memories).toHaveLength(1);
    expect(memories[0].title).toBe('여름 팀데이');
  });

  it('시작 번호부터 id 를 매긴다', () => {
    const memories = toMemoryEvents([allDay, { ...allDay, id: 'EV-10', startsAt: '2026-09-01' }], 5, '이선민');
    expect(memories.map((m) => m.id)).toEqual([5, 6]);
  });

  it('날짜는 YYYY-MM-DD 로 남긴다', () => {
    expect(toMemoryEvents([allDay], 1, '이선민')[0].date).toBe('2026-08-07');
  });

  it('장소와 설명이 없으면 자리표시 문구를 넣는다', () => {
    const [memory] = toMemoryEvents([{ ...allDay, location: undefined, description: undefined }], 1, '이선민');
    expect(memory.place).toBe('장소 미정');
    expect(memory.summary).toContain('구글 캘린더');
  });
});

describe('mergeMemories', () => {
  const memory = (patch: Partial<TeamMemory>): TeamMemory => ({
    id: 1,
    title: '여름 팀데이',
    date: '2026-08-07',
    place: '성수',
    host: 'host',
    createdBy: '이선민',
    summary: '',
    tags: [],
    assets: [],
    comments: [],
    reactions: { 좋아요: 0, 웃겨요: 0, 또가요: 0 },
    ...patch,
  });

  it('같은 날짜의 행사는 다시 만들지 않는다', () => {
    const merged = mergeMemories([memory({})], [memory({ id: 99, title: '중복 행사' })]);
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe('여름 팀데이');
  });

  it('새 날짜의 행사는 뒤에 붙인다', () => {
    const merged = mergeMemories([memory({})], [memory({ id: 99, date: '2026-09-01', title: '가을 워크샵' })]);
    expect(merged.map((m) => m.title)).toEqual(['여름 팀데이', '가을 워크샵']);
  });

  it('여러 번 불러도 결과가 늘어나지 않는다', () => {
    const once = mergeMemories([memory({})], [memory({ id: 99, date: '2026-09-01' })]);
    const twice = mergeMemories(once, [memory({ id: 99, date: '2026-09-01' })]);
    expect(twice).toHaveLength(2);
  });
});
