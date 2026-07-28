// 알림/메시지 영속화 (canStepsStore·teaStore와 동일한 localStorage 패턴).
// 백엔드 없는 목업이라 동기 localStorage만 사용. 저장된 배열 자체가 "발송 이력"(SKSOOP-116)이 된다.
import { initialNotifications } from './data/mockData';
import type { AppNotification } from './types';

const NOTIFICATION_STORAGE_KEY = 'skgrove:notifications';

export function loadNotifications(): AppNotification[] {
  try {
    const saved = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!saved) return initialNotifications;
    const parsed = JSON.parse(saved) as AppNotification[];
    // 사용자가 모두 비운 상태(빈 배열)는 존중한다 — 시드로 되돌리지 않음.
    return Array.isArray(parsed) ? parsed : initialNotifications;
  } catch {
    return initialNotifications;
  }
}

export function saveNotifications(items: AppNotification[]) {
  try {
    window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // 저장 실패는 무시 (메모리 상태는 유지)
  }
}

// 한 이벤트가 여러 수신자에게 fan-out될 때 같은 밀리초 충돌을 막는 세션 카운터.
let notificationSequence = 0;

export function makeNotificationId() {
  notificationSequence += 1;
  return `NTF-${Date.now().toString(36).toUpperCase()}-${notificationSequence.toString(36).toUpperCase()}`;
}
