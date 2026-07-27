import type { Agenda, AgendaStatus } from './types';

/**
 * 안건이 성립하려면 대상 인원 중 이 비율 이상이 투표해야 한다.
 * 두세 명이 던진 표로 팀 규칙이 바뀌는 것을 막는 최소 정족수다.
 */
export const QUORUM_RATIO = 1 / 3;

export function quorumFor(eligibleCount: number) {
  return eligibleCount > 0 ? Math.ceil(eligibleCount * QUORUM_RATIO) : 0;
}

export function isOpen(agenda: Agenda) {
  return agenda.status === '투표중' && !agenda.closedAt;
}

export function isDeadlinePassed(agenda: Agenda, today: string) {
  return Boolean(agenda.deadline) && agenda.deadline < today;
}

export function voteTotal(agenda: Pick<Agenda, 'approve' | 'reject'>) {
  return agenda.approve + agenda.reject;
}

/** 아직 투표하지 않은 대상 인원. 집계가 대상 인원을 넘어도 음수가 되지 않게 막는다. */
export function remainingVoters(agenda: Pick<Agenda, 'approve' | 'reject' | 'eligibleCount'>) {
  return Math.max(0, agenda.eligibleCount - voteTotal(agenda));
}

export function participationRate(agenda: Pick<Agenda, 'approve' | 'reject' | 'eligibleCount'>) {
  return agenda.eligibleCount > 0 ? Math.round((voteTotal(agenda) / agenda.eligibleCount) * 100) : 0;
}

/**
 * 투표 중인 안건의 상태.
 *
 * 조기 확정은 **남은 사람이 전부 반대로 몰려도 결과가 뒤집히지 않을 때만** 한다.
 * 예전 구현은 '10표 이상 + 과반'이면 곧바로 통과시켰는데, 두 가지가 잘못됐다.
 *  - 10이 고정값이라 대상이 5명인 안건은 조기 판정에 영원히 도달하지 못했다.
 *  - 아직 투표할 수 있는 사람이 남았는데 안건을 닫아 투표권을 빼앗았다.
 */
export function liveStatus(agenda: Pick<Agenda, 'approve' | 'reject' | 'eligibleCount'>): AgendaStatus {
  const { approve, reject } = agenda;
  const remaining = remainingVoters(agenda);

  // 남은 전원이 반대해도 찬성이 많다 → 통과 확정
  if (approve > reject + remaining) return '통과';
  // 남은 전원이 찬성해도 찬성이 과반을 넘지 못한다 → 부결 확정
  if (approve + remaining <= reject) return '부결';

  return '투표중';
}

/**
 * 마감 시점의 최종 상태.
 * 정족수 미달이면 찬성이 많아도 성립하지 않은 것으로 본다.
 * 마감했는데 '투표중'으로 남는 안건은 없어야 하므로 통과가 아니면 전부 부결이다.
 */
export function finalStatus(agenda: Pick<Agenda, 'approve' | 'reject' | 'eligibleCount'>): AgendaStatus {
  const total = voteTotal(agenda);
  if (total < quorumFor(agenda.eligibleCount)) return '부결';
  return agenda.approve > agenda.reject ? '통과' : '부결';
}

/**
 * 열린 안건들의 상태를 현재 집계에 맞춰 확정한다. 로드 시점에 한 번 적용한다.
 *
 * 투표 이벤트에서만 상태를 갱신하면, 이미 결과가 확정된 안건이 '투표중'으로 남는다.
 * 마감일이 지났거나 남은 표로 뒤집을 수 없는 안건은 여기서 모두 닫힌다.
 */
export function settleAgendas(agendas: Agenda[], today: string) {
  let changed = false;

  const next = agendas.map((agenda) => {
    if (!isOpen(agenda)) return agenda;

    if (isDeadlinePassed(agenda, today)) {
      changed = true;
      return { ...agenda, status: finalStatus(agenda), closedAt: today };
    }

    const decided = liveStatus(agenda);
    if (decided === '투표중') return agenda;

    changed = true;
    return { ...agenda, status: decided, closedAt: today };
  });

  return changed ? next : agendas;
}

/** 남은 일수. 마감일이 없으면 null. */
export function daysLeft(agenda: Agenda, today: string) {
  if (!agenda.deadline) return null;
  const diff = Date.parse(agenda.deadline) - Date.parse(today);
  return Math.round(diff / 86400000);
}

/** 정족수까지 더 필요한 표. 이미 채웠으면 0. */
export function votesShortOfQuorum(agenda: Pick<Agenda, 'approve' | 'reject' | 'eligibleCount'>) {
  return Math.max(0, quorumFor(agenda.eligibleCount) - voteTotal(agenda));
}
