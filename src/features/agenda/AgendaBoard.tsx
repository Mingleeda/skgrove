import { useState } from 'react';
import { FilePlus2, Search, Vote } from 'lucide-react';
import { daysLeft, isOpen, voteTotal } from '../../agendaRules';
import { teamParts } from '../../auth';
import type { Agenda, CurrentUser, TeamPart, VoteChoice } from '../../types';
import { EmptyState } from '../../components/EmptyState';
import { AgendaDetail } from './AgendaDetail';
import { AgendaForm, type AgendaDraft } from './AgendaForm';
import {
  agendaSorts,
  agendaStatusFilters,
  approveRate,
  filterAgendas,
  sortAgendas,
  type AgendaSort,
  type AgendaStatusFilter,
} from './agendaSort';

type AgendaBoardProps = {
  agendas: Agenda[];
  currentUser: CurrentUser;
  votedAgendaIds: string[];
  canClose: boolean;
  today: string;
  onVote: (id: string, choice: VoteChoice) => void;
  onCloseAgenda: (id: string) => void;
  onCreateAgenda: (draft: AgendaDraft) => Agenda;
  // 안건별로 이미 만들어진 액션아이템 수. 중복 생성 여부를 사용자가 판단할 근거가 된다.
  actionCountByAgenda: Record<string, number>;
  onCreateActions: (agenda: Agenda) => void;
};

type BoardView = 'list' | 'create' | 'detail';

const partFilters: TeamPart[] = ['전체', ...teamParts];

export function AgendaBoard({
  agendas,
  currentUser,
  votedAgendaIds,
  canClose,
  today,
  onVote,
  onCloseAgenda,
  onCreateAgenda,
  actionCountByAgenda,
  onCreateActions,
}: AgendaBoardProps) {
  const [view, setView] = useState<BoardView>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<AgendaStatusFilter>('전체');
  const [part, setPart] = useState<TeamPart>(currentUser.part);
  const [sort, setSort] = useState<AgendaSort>('최신순');
  const [keyword, setKeyword] = useState('');

  const voted = new Set(votedAgendaIds);
  const visibleAgendas = sortAgendas(filterAgendas(agendas, { status, part, keyword }), sort);
  // 목록 필터에서 빠졌더라도 열어둔 상세는 유지되어야 하므로 전체 목록에서 찾는다.
  const selectedAgenda = agendas.find((agenda) => agenda.id === selectedId) ?? null;

  const openDetail = (id: string) => {
    setSelectedId(id);
    setView('detail');
  };

  const createAgenda = (draft: AgendaDraft) => {
    const created = onCreateAgenda(draft);
    setSelectedId(created.id);
    setView('detail');
  };

  if (view === 'create') {
    return (
      <section className="screen">
        <AgendaForm onSubmit={createAgenda} onCancel={() => setView('list')} />
      </section>
    );
  }

  if (view === 'detail' && selectedAgenda) {
    return (
      <section className="screen">
        <AgendaDetail
          agenda={selectedAgenda}
          alreadyVoted={voted.has(selectedAgenda.id)}
          canClose={canClose}
          today={today}
          actionCount={actionCountByAgenda[selectedAgenda.id] ?? 0}
          onVote={onVote}
          onClose={onCloseAgenda}
          onCreateActions={onCreateActions}
          onBack={() => setView('list')}
        />
      </section>
    );
  }

  return (
    <section className="screen">
      <div className="agenda-toolbar">
        <div className="toolbar leader-toolbar">
          {agendaStatusFilters.map((item) => (
            <button className={status === item ? 'filter active' : 'filter'} key={item} onClick={() => setStatus(item)}>
              {item}
            </button>
          ))}
        </div>

        <div className="agenda-toolbar-right">
          <label className="agenda-search">
            <Search size={16} />
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="안건 검색" />
          </label>
          <select value={part} onChange={(event) => setPart(event.target.value as TeamPart)}>
            {partFilters.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value as AgendaSort)}>
            {agendaSorts.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <button className="primary-button" onClick={() => setView('create')}>
            <FilePlus2 size={18} />
            안건 등록
          </button>
        </div>
      </div>

      {visibleAgendas.length === 0 ? (
        <EmptyState
          icon={Vote}
          title="조건에 맞는 안건이 없어요"
          description="필터를 바꾸거나 새 안건을 등록하면 여기에서 바로 투표할 수 있습니다."
          action={{ label: '안건 등록', onClick: () => setView('create') }}
        />
      ) : (
        // 카드 그리드는 1280px 에 3건만 담겼다. 행이면 같은 자리에 12건이 들어간다.
        // 투표는 되돌릴 수 없으므로 행에서는 확정하지 않고 상세로만 보낸다.
        <div className="work-list">
          {visibleAgendas.map((agenda) => {
            const rate = approveRate(agenda);
            const open = isOpen(agenda);
            const remaining = daysLeft(agenda, today);
            const tone =
              agenda.status === '통과' ? 'moss' : agenda.status === '부결' ? 'danger' : 'pending';

            return (
              <button
                type="button"
                className="work-row"
                key={agenda.id}
                onClick={() => openDetail(agenda.id)}
                title={`${agenda.title} — ${agenda.category} · ${agenda.part} · ${agenda.createdAt} · ${voteTotal(agenda)}표`}
              >
                <span className="work-row-dot" style={{ background: `var(--color-${tone})` }} />
                <span className="work-row-title">{agenda.title}</span>
                <span className="work-row-sub">
                  {agenda.category} · {voteTotal(agenda)}표
                </span>
                <span className="work-row-bar">
                  <span style={{ width: `${rate}%`, background: `var(--color-${tone})` }} />
                </span>
                <span className="work-row-pct">{rate}%</span>
                <span className="work-row-meta">
                  {open
                    ? voted.has(agenda.id)
                      ? '투표 완료'
                      : remaining !== null && remaining <= 0
                        ? '오늘 마감'
                        : remaining !== null
                          ? `${remaining}일 남음`
                          : '투표중'
                    : agenda.createdAt.slice(5)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
