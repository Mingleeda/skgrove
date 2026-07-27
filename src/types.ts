export type Section =
  | 'dashboard'
  | 'intake'
  | 'leader'
  | 'agenda'
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

export type Issue = {
  id: string;
  title: string;
  category: string;
  author: Identity;
  target: string;
  status: IssueStatus;
  urgency: Urgency;
  leaderReply?: string;
  oneOnOneNote?: string;
  actionItem?: string;
  leaderMemo?: string;
};

export type Agenda = {
  title: string;
  source: string;
  approve: number;
  reject: number;
  status: AgendaStatus;
};

export type ActionItem = {
  title: string;
  owner: string;
  due: string;
  status: string;
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

// ===== 티미팅 =====
// 2주 주기로 세션(기술세미나·여행기·팀워크샵·팀내공유) 1개를 진행하는 문화.
// 팀원이 세션을 자발 제안하고, 리더(커넥셔너)가 이번 회차 세션 선정 + 파트 믹스 그룹 편성 + 슬랙 공지를 한다.
export type TeaSessionStatus = '제안' | '채택' | '완료' | '보류';

export type TeaSession = {
  id: string;
  title: string;
  type: string; // 세션 유형(teaStore가 관리): 기술세미나/여행기/팀워크샵/팀내공유사항
  presenter: string; // 발표자 = 제안자(실명)
  part: TeamPart;
  desc: string; // 간단 설명(선택)
  status: TeaSessionStatus;
  memo: string; // 세션 후기 메모 (SKSOOP-71)
};

// 파트를 섞어 편성한 티미팅 그룹 (SKSOOP-70)
// part는 실제 파트 구성(ITS혁신/TEST혁신/PM혁신) 문자열 — 앱의 TeamPart enum과 별개.
export type TeaGroup = {
  name: string;
  members: { name: string; part: string }[];
};
