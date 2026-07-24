import type { ElementType } from 'react';
import {
  BarChart3,
  CalendarDays,
  Home,
  Inbox,
  MessageSquarePlus,
  Shuffle,
  Sparkles,
  UserRound,
  UsersRound,
  Vote,
} from 'lucide-react';
import type { Section } from './types';

export type AppSection = {
  id: Section;
  label: string;
  icon: ElementType;
  owner: string;
};

export const sections: AppSection[] = [
  { id: 'dashboard', label: '홈', icon: Home, owner: '공통' },
  { id: 'intake', label: '대나무숲 접수', icon: MessageSquarePlus, owner: '이선민' },
  { id: 'leader', label: '리더 관리함', icon: Inbox, owner: '김승현' },
  { id: 'agenda', label: '안건함 / 투표', icon: Vote, owner: '이상협' },
  { id: 'meetings', label: '캔미팅 / 티미팅', icon: CalendarDays, owner: '김승현 · 이상협' },
  { id: 'profiles', label: '동료 성향', icon: UserRound, owner: '김수정' },
  { id: 'connect', label: '커피뽑기 / 조뽑기', icon: Shuffle, owner: '김수정' },
  { id: 'memory', label: '팀 추억', icon: Sparkles, owner: '김수정' },
  { id: 'metrics', label: '파트지수 / 리포트', icon: BarChart3, owner: '김수정' },
  { id: 'accounts', label: '계정 관리', icon: UsersRound, owner: '팀리더' },
];
