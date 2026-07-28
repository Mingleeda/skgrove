// 알림 기준 정의 (SKSOOP-110). "어떤 이벤트가 → 누구에게 → 어떤 알림을" 을 한 곳에 명문화.
// 순수 함수만 두어 단위 테스트로 회귀 검증한다(팀 관례: *Rules.ts). React·상태 의존 없음.
import { daysLeft, isOpen } from './agendaRules';
import type { ActionItem, Agenda, AppNotification, Issue, ManagedAccount, TeaSession } from './types';

// 마감 며칠 전부터 "임박" 알림을 낼지.
export const DEADLINE_SOON_DAYS = 2;

// id는 발송 시점에 부여하므로 규칙 단계에선 나머지(draft)만 만든다.
export type NotificationDraft = Omit<AppNotification, 'id'>;

// 슬랙 전송 채널(1단계: 고정 채널). 개인 대상(action/message)은 null → 슬랙 미전송.
export type SlackChannel = 'team' | 'connector';

export function slackChannelForKind(kind: AppNotification['kind']): SlackChannel | null {
  if (kind === 'agenda' || kind === 'deadline') return 'team'; // 공지성 → 팀 전체
  if (kind === 'tea' || kind === 'issue') return 'connector'; // 제안·접수 → 커넥셔너
  return null; // action, message → 인앱만
}

// 같은 이벤트가 같은 수신자에게 중복 생성되는 것을 막는 키(특히 로드마다 계산되는 마감 임박).
export function dedupeKey(kind: AppNotification['kind'], sourceId: string, recipientName: string) {
  return `${kind}:${sourceId}:${recipientName}`;
}

// ── 수신자 해석 ─────────────────────────────────────────────
// 의견 접수(111): 접수 폼의 target에 맞는 활성 리더.
export function leadersFor(accounts: ManagedAccount[], target: string): ManagedAccount[] {
  const leaders = accounts.filter(
    (a) => a.status === '활성' && (a.role === '파트리더' || a.role === '팀리더'),
  );
  if (target === '팀리더') return leaders.filter((a) => a.role === '팀리더');
  if (target === '파트리더') return leaders.filter((a) => a.role === '파트리더');
  return leaders; // '리더 전체' 등
}

// 안건 등록(112)·마감 임박(113): 해당 파트의 투표 대상자(활성). 전체 소속(팀리더)도 포함.
export function agendaAudience(accounts: ManagedAccount[], part: Agenda['part']): ManagedAccount[] {
  return accounts.filter(
    (a) => a.status === '활성' && (part === '전체' || a.part === part || a.part === '전체'),
  );
}

// 액션 담당자(114): 이름으로 매칭되는 활성 계정. '미정'이면 대상 없음.
export function ownerAccount(accounts: ManagedAccount[], ownerName: string): ManagedAccount | null {
  if (!ownerName || ownerName === '미정') return null;
  return accounts.find((a) => a.status === '활성' && a.name === ownerName) ?? null;
}

// 마감 임박 판정: 열려 있고 마감까지 남은 일수가 [0, DEADLINE_SOON_DAYS].
export function isDeadlineSoon(agenda: Agenda, today: string): boolean {
  if (!isOpen(agenda)) return false;
  const left = daysLeft(agenda, today);
  return left !== null && left >= 0 && left <= DEADLINE_SOON_DAYS;
}

// ── 알림 draft 빌더 ─────────────────────────────────────────
export function issueDrafts(issue: Issue, leaders: ManagedAccount[], now: string): NotificationDraft[] {
  return leaders.map((leader): NotificationDraft => ({
    kind: 'issue',
    recipientName: leader.name,
    fromName: '시스템',
    title: `새 의견 접수 · ${issue.title}`,
    body: `${issue.author === '실명' ? '실명' : '익명'} 접수 · 대상 ${issue.target}`,
    section: 'leader',
    sourceId: issue.id,
    dedupeKey: dedupeKey('issue', issue.id, leader.name),
    createdAt: now,
    read: false,
  }));
}

export function agendaDrafts(agenda: Agenda, audience: ManagedAccount[], now: string): NotificationDraft[] {
  return audience.map((account): NotificationDraft => ({
    kind: 'agenda',
    recipientName: account.name,
    fromName: '시스템',
    title: `새 안건 · ${agenda.title}`,
    body: '투표에 참여해 주세요.',
    section: 'agenda',
    sourceId: agenda.id,
    dedupeKey: dedupeKey('agenda', agenda.id, account.name),
    createdAt: now,
    read: false,
  }));
}

export function deadlineDrafts(agenda: Agenda, audience: ManagedAccount[], now: string): NotificationDraft[] {
  return audience.map((account): NotificationDraft => ({
    kind: 'deadline',
    recipientName: account.name,
    fromName: '시스템',
    title: `투표 마감 임박 · ${agenda.title}`,
    body: '마감 전에 투표해 주세요.',
    section: 'agenda',
    sourceId: agenda.id,
    dedupeKey: dedupeKey('deadline', agenda.id, account.name),
    createdAt: now,
    read: false,
  }));
}

export function actionDraft(item: ActionItem, owner: ManagedAccount, now: string): NotificationDraft {
  return {
    kind: 'action',
    recipientName: owner.name,
    fromName: '시스템',
    title: `액션아이템 배정 · ${item.title}`,
    body: item.due ? `기한 ${item.due}` : '담당자로 지정되었어요.',
    section: 'actions',
    sourceId: item.id,
    dedupeKey: dedupeKey('action', item.id, owner.name),
    createdAt: now,
    read: false,
  };
}

// 티미팅 세션 제안(SKSOOP-21 확장): 커넥셔너 대행 리더에게 알림.
export function teaProposalDrafts(
  session: TeaSession,
  leaders: ManagedAccount[],
  now: string,
): NotificationDraft[] {
  const body = [
    `- 세션 제목: ${session.title}`,
    `- 세션 유형: ${session.type}`,
    `- 발표자: ${session.presenter}`,
    ...(session.desc.trim() ? [`- 설명: ${session.desc.trim()}`] : []),
  ].join('\n');
  return leaders.map((leader): NotificationDraft => ({
    kind: 'tea',
    recipientName: leader.name,
    fromName: '시스템',
    title: `새 티미팅 세션 제안 · ${session.title}`,
    body,
    section: 'meetings',
    sourceId: session.id,
    dedupeKey: dedupeKey('tea', session.id, leader.name),
    createdAt: now,
    read: false,
  }));
}

export function messageDraft(
  fromName: string,
  recipientName: string,
  body: string,
  now: string,
  messageId: string,
): NotificationDraft {
  return {
    kind: 'message',
    recipientName,
    fromName,
    title: `${fromName}님의 메시지`,
    body,
    section: 'notifications',
    sourceId: messageId,
    dedupeKey: dedupeKey('message', messageId, recipientName),
    createdAt: now,
    read: false,
  };
}
