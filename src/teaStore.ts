// 티미팅 세션 유형 영속화 (canStepsStore.ts와 동일한 localStorage 패턴).
// 세션(teaSessions)은 캔미팅처럼 인메모리 seed이며, 유형 목록만 저장한다.

const SESSION_TYPES_KEY = 'skgrove:teasessiontypes';

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

export function makeTeaSessionId() {
  return `TEA-${Date.now().toString(36).toUpperCase()}`;
}
