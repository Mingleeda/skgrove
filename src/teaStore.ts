// 티미팅 세션/유형 영속화 (localStorage). 세션도 저장해야 슬랙 링크로 새 탭에서 들어가도 보인다.
import { initialTeaSessions } from './data/mockData';
import type { TeaSession } from './types';

const SESSIONS_KEY = 'skgrove:teasessions';
const SESSION_TYPES_KEY = 'skgrove:teasessiontypes';

export function loadTeaSessions(): TeaSession[] {
  try {
    const saved = window.localStorage.getItem(SESSIONS_KEY);
    if (!saved) return initialTeaSessions;
    const parsed = JSON.parse(saved) as TeaSession[];
    return Array.isArray(parsed) ? parsed : initialTeaSessions;
  } catch {
    return initialTeaSessions;
  }
}

export function saveTeaSessions(sessions: TeaSession[]) {
  try {
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // 저장 실패는 무시 (메모리 상태는 유지)
  }
}

export const DEFAULT_TEA_SESSION_TYPES = ['기술세미나', '여행기', '팀워크샵', '팀내공유사항'];

export function loadTeaSessionTypes(): string[] {
  try {
    const saved = window.localStorage.getItem(SESSION_TYPES_KEY);
    if (!saved) return DEFAULT_TEA_SESSION_TYPES;
    const parsed = JSON.parse(saved) as string[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TEA_SESSION_TYPES;
  } catch {
    return DEFAULT_TEA_SESSION_TYPES;
  }
}

export function saveTeaSessionTypes(types: string[]) {
  try {
    window.localStorage.setItem(SESSION_TYPES_KEY, JSON.stringify(types));
  } catch {
    // 저장 실패는 무시 (메모리 상태는 유지)
  }
}

// 같은 밀리초에 세션이 여럿 만들어져도 id가 겹치지 않도록 세션 카운터를 덧붙인다.
let teaSessionSequence = 0;

export function makeTeaSessionId() {
  teaSessionSequence += 1;
  return `TEA-${Date.now().toString(36).toUpperCase()}-${teaSessionSequence.toString(36).toUpperCase()}`;
}
