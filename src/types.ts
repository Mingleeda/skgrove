export type Section =
  | 'dashboard'
  | 'intake'
  | 'leader'
  | 'agenda'
  | 'actions'
  | 'meetings'
  | 'profiles'
  | 'connect'
  | 'memory'
  | 'metrics'
  | 'accounts';

export type Identity = '익명' | '실명';
export type Urgency = '낮음' | '보통' | '높음';
export type AgendaStatus = '투표중' | '통과' | '부결';
export type UserRole = '팀원' | '파트리더' | '팀리더';
export type TeamPart = '전체' | 'TEST혁신파트' | 'ITS혁신파트' | '혁신도구파트';
export type AccountStatus = '승인 대기' | '활성' | '비활성';
export type IssueStatus = '접수' | '검토중' | '답변완료' | '1on1 제안' | '액션아이템' | '안건화' | '보류' | '종료';

export type CurrentUser = {
  name: string;
  email: string;
  role: UserRole;
  part: TeamPart;
};

export type ManagedAccount = CurrentUser & {
  id: string;
  status: AccountStatus;
  joinedAt: string;
};

// 접수자가 고른 공개 범위. '리더만 보기'는 안건 전환을 막는 약속이므로 저장해야 한다.
export type IssueVisibility = '리더만 보기' | '안건 후보로 공개 가능';

export type Issue = {
  id: string;
  title: string;
  category: string;
  author: Identity;
  target: string;
  status: IssueStatus;
  urgency: Urgency;
  // 접수자가 작성한 본문과 기대 변화. 예전에는 화면 state에만 있다가 폐기돼
  // 리더가 읽을 수도, 안건 배경 설명으로 승계할 수도 없었다.
  body: string;
  expectedChange: string;
  visibility: IssueVisibility;
  leaderReply?: string;
  oneOnOneNote?: string;
  actionItem?: string;
  leaderMemo?: string;
};

export type Agenda = {
  id: string;
  title: string;
  description: string;
  category: string;
  // 안건이 어디서 왔는지(대나무숲 SOOP-142 / 캔미팅 · 주제 / 직접 등록)
  source: string;
  part: TeamPart;
  author: Identity;
  // 익명 안건이면 빈 문자열. 상세 화면은 author를 보고 노출 여부를 정한다.
  authorName: string;
  approve: number;
  reject: number;
  status: AgendaStatus;
  createdAt: string;
  // 등록 시점의 투표 대상 인원 스냅샷.
  // 계정이 늘거나 줄어도 과거 안건의 정족수와 참여율이 소급해 흔들리지 않도록 값으로 박아둔다.
  eligibleCount: number;
  // 'YYYY-MM-DD'. 빈 문자열이면 마감일 없이 수동 마감만 가능하다.
  deadline: string;
  // 마감 처리된 날짜. 빈 문자열이면 아직 열려 있다.
  closedAt: string;
};

export type VoteChoice = 'approve' | 'reject';

// 익명성 유지를 위해 "누가 투표했는가"와 "무엇을 골랐는가"를 분리한다.
// 투표용지(ballot)는 선택을 담지 않고, 선택은 Agenda의 approve/reject 카운터로만 남는다.
// 따라서 어떤 행 하나도 사람과 선택을 이어주지 못한다.
export type AgendaBallot = {
  agendaId: string;
  // 안건마다 다른 값이 나오는 단방향 해시. 안건 간 투표 이력 연결을 막는다.
  voterKey: string;
  createdAt: string;
};

// 재검토는 '보류'가 아니라 별도 상태다. 적용해봤는데 효과가 없어 되돌아온 것과
// 아직 시작하지 않은 것은 리더가 다르게 다뤄야 한다.
export type ActionStatus = '대기' | '진행중' | '완료' | '재검토';

export type ActionSourceKind = '안건' | '캔미팅' | '직접';

export type ActionItem = {
  id: string;
  title: string;
  // '미정'을 허용한다. 담당자 없이 먼저 만들어두고 나중에 지정하는 흐름이 실제로 있다.
  owner: string;
  // 'YYYY-MM-DD'. 빈 문자열이면 목표일 미정.
  // 예전에는 'D-3' 같은 상대 문자열이라 지연 여부를 계산할 수 없었다.
  due: string;
  status: ActionStatus;
  sourceKind: ActionSourceKind;
  // 출처 식별자(안건 id 등). 어디서 비롯됐는지 되짚기 위한 값이라 없을 수 있다.
  sourceId: string;
  sourceLabel: string;
  createdAt: string;
  // 적용 결과 기록(SKSOOP-57). 완료 처리할 때 무엇이 어떻게 바뀌었는지 남긴다.
  outcome: string;
  // 재검토 사유(SKSOOP-58). 왜 다시 봐야 하는지 없으면 재검토가 방치로 끝난다.
  reviewReason: string;
};

export type Profile = {
  name: string;
  part: string;
  role: string;
  englishName: string;
  birthYear: string;
  birthday: string;
  character: string;
  trait: string;
  style: string;
  collaboration: string;
  feedback: string;
  guide: string;
  color: 'green' | 'red' | 'blue' | 'yellow';
};

export type PartScore = {
  name: string;
  score: number;
  meetings: number;
};

export type CanStage = 'setup' | 'collect' | 'share' | 'select' | 'summary';
// 단계 정의는 canConfig.ts의 CAN_STEPS가 단일 소스. step에는 그 id(문자열)를 저장.
export type CanStep = string;
export type CanMethod = '온라인' | '오프라인';
export type CanFollowRoute = 'agenda' | 'action' | 'skip';
// 후속 라우팅은 opinion id 기준으로 저장(내용 중복에도 정확)
export type CanFollowUp = {
  routes: Record<string, CanFollowRoute>;
  actionMeta: Record<string, { owner: string; due: string }>;
};

export type CanSession = {
  id: string;
  topic: string;
  teamName: string;
  heldAt: string;
  method: CanMethod;
  parts: TeamPart[];
  stage: CanStage;
  resultSummary: string;
  followUp: CanFollowUp | null;
};

export type CanOpinion = {
  id: string;
  sessionId: string;
  part: TeamPart;
  step: CanStep;
  content: string;
  author: Identity;
  authorName: string;
  selected: boolean;
};
