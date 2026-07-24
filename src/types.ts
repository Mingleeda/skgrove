export type Section =
  | 'dashboard'
  | 'intake'
  | 'leader'
  | 'agenda'
  | 'meetings'
  | 'profiles'
  | 'connect'
  | 'memory'
  | 'metrics';

export type Identity = '익명' | '실명';
export type Urgency = '낮음' | '보통' | '높음';
export type AgendaStatus = '투표중' | '통과' | '부결';
export type UserRole = '팀원' | '파트리더' | '팀리더';
export type TeamPart = '플랫폼파트' | '경험파트' | '운영파트' | '문화파트';

export type CurrentUser = {
  name: string;
  email: string;
  role: UserRole;
  part: TeamPart;
};

export type Issue = {
  id: string;
  title: string;
  category: string;
  author: Identity;
  target: string;
  status: string;
  urgency: Urgency;
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
