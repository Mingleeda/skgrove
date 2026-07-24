import type { CurrentUser, UserRole } from './types';

export const userRoles: UserRole[] = ['팀원', '파트리더', '팀리더'];

export const teamParts = ['플랫폼파트', '경험파트', '운영파트', '문화파트'] as const;

export function isLeader(user: CurrentUser) {
  return user.role === '파트리더' || user.role === '팀리더';
}

export function isCompanyEmail(email: string) {
  return /^[^\s@]+@sk\.com$/i.test(email.trim());
}
