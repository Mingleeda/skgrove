import type { Agenda, AgendaStatus, TeamPart } from '../../types';

export type AgendaStatusFilter = '전체' | AgendaStatus;
export type AgendaSort = '최신순' | '참여순' | '찬성률순';

export const agendaStatusFilters: AgendaStatusFilter[] = ['전체', '투표중', '통과', '부결'];
export const agendaSorts: AgendaSort[] = ['최신순', '참여순', '찬성률순'];

export function voteTotal(agenda: Agenda) {
  return agenda.approve + agenda.reject;
}

export function approveRate(agenda: Agenda) {
  const total = voteTotal(agenda);
  return total === 0 ? 0 : Math.round((agenda.approve / total) * 100);
}

type AgendaFilters = {
  status: AgendaStatusFilter;
  part: TeamPart;
  keyword: string;
};

export function filterAgendas(agendas: Agenda[], { status, part, keyword }: AgendaFilters) {
  const query = keyword.trim().toLowerCase();

  return agendas.filter((agenda) => {
    if (status !== '전체' && agenda.status !== status) return false;
    // '전체' 대상 안건은 어느 파트를 골라도 보인다.
    if (part !== '전체' && agenda.part !== part && agenda.part !== '전체') return false;
    if (!query) return true;
    return `${agenda.title} ${agenda.description} ${agenda.category}`.toLowerCase().includes(query);
  });
}

// 정렬 정책: 아직 투표할 수 있는 안건이 항상 위로 온다.
// 이미 끝난 안건이 최신이라는 이유로 위를 차지하면 목록의 행동 유도가 죽는다.
export function sortAgendas(agendas: Agenda[], sort: AgendaSort) {
  const openFirst = (a: Agenda, b: Agenda) => Number(b.status === '투표중') - Number(a.status === '투표중');

  return [...agendas].sort((a, b) => {
    const byOpen = openFirst(a, b);
    if (byOpen !== 0) return byOpen;

    if (sort === '참여순') return voteTotal(b) - voteTotal(a);
    if (sort === '찬성률순') return approveRate(b) - approveRate(a);
    return b.createdAt.localeCompare(a.createdAt);
  });
}
