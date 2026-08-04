import { describe, expect, it } from 'vitest';
import {
  DEADLINE_SOON_DAYS,
  actionDraft,
  agendaAudience,
  agendaDrafts,
  deadlineDrafts,
  dedupeKey,
  isDeadlineSoon,
  issueDrafts,
  leadersFor,
  messageDraft,
  ownerAccount,
  slackChannelForKind,
  teaProposalDrafts,
} from './notificationRules';
import type { ActionItem, Agenda, Issue, ManagedAccount, TeaSession } from './types';

const TODAY = '2026-07-28';

const account = (patch: Partial<ManagedAccount> = {}): ManagedAccount => ({
  id: 'USR-T', name: '홍길동', email: 't@sk.com', role: '팀원', part: 'ITS혁신파트',
  status: '활성', joinedAt: '2026-01-01', ...patch,
});

const agenda = (patch: Partial<Agenda> = {}): Agenda => ({
  id: 'AGD-T', title: '테스트 안건', description: '', category: '회의문화', source: '직접 등록',
  part: '전체', author: '익명', authorName: '', approve: 0, reject: 0, status: '투표중',
  createdAt: '2026-07-20', eligibleCount: 4, deadline: '', closedAt: '', ...patch,
});

const issue = (patch: Partial<Issue> = {}): Issue => ({
  id: 'SOOP-T', title: '테스트 의견', category: '회의문화', author: '익명', target: '리더 전체',
  status: '접수', urgency: '보통', body: '본문', expectedChange: '', visibility: '리더만 보기',
  createdAt: '2026-07-20', ...patch,
});

const action = (patch: Partial<ActionItem> = {}): ActionItem => ({
  id: 'ACT-T', title: '테스트 액션', owner: '홍길동', due: '', status: '대기', sourceKind: '안건',
  sourceId: '', sourceLabel: '', createdAt: '2026-07-20', outcome: '', reviewReason: '', ...patch,
});

const accounts: ManagedAccount[] = [
  account({ id: 'A', name: '이선민', role: '팀리더', part: '전체' }),
  account({ id: 'B', name: '김승현', role: '파트리더', part: 'ITS혁신파트' }),
  account({ id: 'C', name: '김수정', role: '팀원', part: '혁신도구파트' }),
  account({ id: 'D', name: '이두민', role: '팀원', part: 'TEST혁신파트' }),
  account({ id: 'E', name: '비활성', role: '팀원', part: 'ITS혁신파트', status: '비활성' }),
];

describe('수신자 해석', () => {
  it('팀리더 대상은 팀리더만 고른다', () => {
    expect(leadersFor(accounts, '팀리더').map((a) => a.name)).toEqual(['이선민']);
  });
  it('파트리더 대상은 파트리더만 고른다', () => {
    expect(leadersFor(accounts, '파트리더').map((a) => a.name)).toEqual(['김승현']);
  });
  it('리더 전체는 활성 리더 모두', () => {
    expect(leadersFor(accounts, '리더 전체').map((a) => a.name).sort()).toEqual(['김승현', '이선민']);
  });
  it('파트 한정 안건은 해당 파트 + 전체 소속만, 비활성 제외', () => {
    const names = agendaAudience(accounts, 'ITS혁신파트').map((a) => a.name);
    expect(names).toContain('김승현'); // ITS
    expect(names).toContain('이선민'); // 전체 소속
    expect(names).not.toContain('김수정'); // 다른 파트
    expect(names).not.toContain('비활성');
  });
  it('전체 안건은 활성 전원', () => {
    expect(agendaAudience(accounts, '전체').map((a) => a.name)).toEqual(['이선민', '김승현', '김수정', '이두민']);
  });
  it('담당자는 이름으로 활성 계정 매칭, 미정/없는이름은 null', () => {
    expect(ownerAccount(accounts, '김수정')?.name).toBe('김수정');
    expect(ownerAccount(accounts, '미정')).toBeNull();
    expect(ownerAccount(accounts, '없는이름')).toBeNull();
  });
});

describe('마감 임박', () => {
  it('열려있고 D-2 이내면 임박', () => {
    expect(isDeadlineSoon(agenda({ deadline: '2026-07-30' }), TODAY)).toBe(true); // D-2
    expect(isDeadlineSoon(agenda({ deadline: '2026-07-28' }), TODAY)).toBe(true); // D-0
  });
  it('D-3 이상이면 아니다', () => {
    expect(isDeadlineSoon(agenda({ deadline: '2026-07-31' }), TODAY)).toBe(false);
  });
  it('마감일 없으면 아니다', () => {
    expect(isDeadlineSoon(agenda({ deadline: '' }), TODAY)).toBe(false);
  });
  it('닫힌 안건은 아니다', () => {
    expect(isDeadlineSoon(agenda({ deadline: '2026-07-29', status: '통과', closedAt: TODAY }), TODAY)).toBe(false);
  });
});

describe('draft 빌더 & dedupe', () => {
  it('dedupeKey는 종류·출처·수신자로 유일', () => {
    expect(dedupeKey('agenda', 'AGD-1', '김승현')).toBe('agenda:AGD-1:김승현');
  });
  it('의견 draft는 리더 수만큼 leader 화면으로', () => {
    const drafts = issueDrafts(issue({ id: 'SOOP-9' }), leadersFor(accounts, '리더 전체'), TODAY);
    expect(drafts).toHaveLength(2);
    expect(drafts[0].kind).toBe('issue');
    expect(drafts[0].section).toBe('leader');
    expect(drafts.every((d) => d.dedupeKey.startsWith('issue:SOOP-9:'))).toBe(true);
  });
  it('안건 draft는 수신자 수만큼 agenda 화면으로', () => {
    const drafts = agendaDrafts(agenda({ id: 'AGD-9', part: '전체' }), agendaAudience(accounts, '전체'), TODAY);
    expect(drafts).toHaveLength(4);
    expect(drafts[0].section).toBe('agenda');
  });
  it('마감 draft kind는 deadline', () => {
    const [draft] = deadlineDrafts(agenda({ id: 'AGD-9' }), [account({ name: '김승현' })], TODAY);
    expect(draft.kind).toBe('deadline');
  });
  it('액션 draft는 담당자 수신 + 기한 표시', () => {
    const draft = actionDraft(action({ id: 'ACT-9', due: '2026-08-01' }), account({ name: '김수정' }), TODAY);
    expect(draft.recipientName).toBe('김수정');
    expect(draft.section).toBe('actions');
    expect(draft.body).toContain('2026-08-01');
  });
  it('메시지 draft는 message id로 dedupe되어 항상 유일', () => {
    const a = messageDraft('이선민', '김승현', '안녕', TODAY, 'MSG-1');
    const b = messageDraft('이선민', '김승현', '안녕', TODAY, 'MSG-2');
    expect(a.dedupeKey).not.toBe(b.dedupeKey);
    expect(a.kind).toBe('message');
  });
  it('DEADLINE_SOON_DAYS 기본 2', () => {
    expect(DEADLINE_SOON_DAYS).toBe(2);
  });
});

describe('슬랙 채널 라우팅', () => {
  it('공지성(안건·마감)은 팀 전체 채널', () => {
    expect(slackChannelForKind('agenda')).toBe('team');
    expect(slackChannelForKind('deadline')).toBe('team');
  });
  it('제안·접수(티미팅·의견)는 커넥셔너 채널', () => {
    expect(slackChannelForKind('tea')).toBe('connector');
    expect(slackChannelForKind('issue')).toBe('connector');
  });
  it('개인 대상(액션·메시지)은 슬랙 미전송(null)', () => {
    expect(slackChannelForKind('action')).toBeNull();
    expect(slackChannelForKind('message')).toBeNull();
  });
});

describe('티미팅 제안 알림', () => {
  const session: TeaSession = {
    id: 'TEA-9', title: 'LLM 활용 사례', type: '기술세미나', presenter: '김승현',
    part: 'ITS혁신파트', desc: '', status: '제안', memo: '',
  };
  it('리더 수만큼, kind=tea, meetings 화면으로', () => {
    const leaders = leadersFor(accounts, '리더 전체');
    const drafts = teaProposalDrafts(session, leaders, TODAY);
    expect(drafts).toHaveLength(leaders.length);
    expect(drafts[0].kind).toBe('tea');
    expect(drafts[0].section).toBe('meetings');
    expect(drafts.every((d) => d.dedupeKey.startsWith('tea:TEA-9:'))).toBe(true);
  });
});
