import type { CurrentUser, UserRole } from './types';

export const userRoles: UserRole[] = ['팀원', '파트리더', '팀리더'];

export const teamParts = ['TEST혁신파트', 'ITS혁신파트', '혁신도구파트'] as const;

// 커넥셔너 = 이 시스템을 구축하는 슈퍼관리자. 팀 역할(팀원/파트리더/팀리더)과 별개인
// 전권 플래그(accounts.is_connectioner). 리더/팀리더 게이트를 전부 통과시켜 모든 기능에 접근.
// 팀 역할·알림 라우팅은 그대로 두므로 기존 동작을 깨지 않는다. 계정 관리에서 토글한다.
export function isConnectioner(user: CurrentUser) {
  return user.connectioner === true;
}

export function isLeader(user: CurrentUser) {
  return isConnectioner(user) || user.role === '파트리더' || user.role === '팀리더';
}

export function isTeamLeader(user: CurrentUser) {
  return isConnectioner(user) || user.role === '팀리더';
}

// 커넥셔너 전권을 적용하지 않는 '순수 팀리더 역할' 체크.
// 캔미팅처럼 커넥셔너도 참여자로 의견을 내야 하는 화면에서 쓴다
// (전권으로 진행자 화면이 열리면 정작 본인 의견을 낼 수가 없다).
export function hasTeamLeaderRole(user: CurrentUser) {
  return user.role === '팀리더';
}

export function isCompanyEmail(email: string) {
  return /^[^\s@]+@sk\.com$/i.test(email.trim());
}
