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
  trait: string;
  style: string;
  color: 'green' | 'red' | 'blue' | 'yellow';
};

export type PartScore = {
  name: string;
  score: number;
  meetings: number;
};

export type CanStage = 'setup' | 'collect' | 'share' | 'select' | 'summary';
export type CanTopicSource = '직접 입력' | '자료 첨부';

export type CanSession = {
  id: string;
  quarter: string;
  topic: string;
  source: CanTopicSource;
  sourceRef: string;
  parts: TeamPart[];
  mode: '하이브리드';
  stage: CanStage;
  resultActions: ActionItem[];
};

export type CanOpinion = {
  id: string;
  sessionId: string;
  part: TeamPart;
  category: string;
  content: string;
  author: Identity;
  authorName: string;
  selected: boolean;
};
