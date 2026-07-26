import { CAN_STEPS, type CanStepConfig } from './canConfig';

const STEPS_KEY = 'skgrove:cansteps';

export function loadCanSteps(): CanStepConfig[] {
  try {
    const saved = window.localStorage.getItem(STEPS_KEY);
    if (!saved) return CAN_STEPS;
    const parsed = JSON.parse(saved) as CanStepConfig[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : CAN_STEPS;
  } catch {
    return CAN_STEPS;
  }
}

export function saveCanSteps(steps: CanStepConfig[]) {
  try {
    window.localStorage.setItem(STEPS_KEY, JSON.stringify(steps));
  } catch {
    // 저장 실패는 무시 (메모리 상태는 유지)
  }
}

export function makeStepId() {
  return `step-${Date.now().toString(36)}`;
}
