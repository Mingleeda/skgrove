import type { Agenda, AgendaStatus } from './types';

// 투표가 유의미하다고 보는 최소 참여 수. 2~3표로 안건이 통과되는 것을 막는다.
export const MIN_VOTES_TO_PASS = 10;

export function isOpen(agenda: Agenda) {
  return agenda.status === '투표중' && !agenda.closedAt;
}

export function isDeadlinePassed(agenda: Agenda, today: string) {
  return Boolean(agenda.deadline) && agenda.deadline < today;
}

/**
 * 투표가 진행 중인 동안의 상태.
 * 충분히 모였고 과반이면 조기 통과시키되, 그 전에는 계속 열어둔다.
 */
export function liveStatus(approve: number, reject: number): AgendaStatus {
  const total = approve + reject;
  return total >= MIN_VOTES_TO_PASS && approve > total / 2 ? '통과' : '투표중';
}

/**
 * 마감 시점의 최종 상태. 참여 수와 무관하게 과반 찬성 여부로만 가른다.
 * 마감했는데 '투표중'으로 남는 안건이 없어야 하기 때문이다.
 */
export function finalStatus(approve: number, reject: number): AgendaStatus {
  const total = approve + reject;
  return total > 0 && approve > total / 2 ? '통과' : '부결';
}

/** 마감일이 지난 열린 안건을 닫는다. 로드 시점에 한 번 적용한다. */
export function closeExpiredAgendas(agendas: Agenda[], today: string) {
  let changed = false;

  const next = agendas.map((agenda) => {
    if (!isOpen(agenda) || !isDeadlinePassed(agenda, today)) return agenda;
    changed = true;
    return { ...agenda, status: finalStatus(agenda.approve, agenda.reject), closedAt: today };
  });

  return changed ? next : agendas;
}

/** 남은 일수. 마감일이 없으면 null. */
export function daysLeft(agenda: Agenda, today: string) {
  if (!agenda.deadline) return null;
  const diff = Date.parse(agenda.deadline) - Date.parse(today);
  return Math.round(diff / 86400000);
}
