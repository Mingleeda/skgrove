import { useState } from 'react';
import { FileCheck2, FilePlus2, Search, ThumbsDown, ThumbsUp } from 'lucide-react';
import { teamParts } from '../../auth';
import type { Agenda, CurrentUser, TeamPart } from '../../types';
import { AgendaDetail } from './AgendaDetail';
import { AgendaForm, type AgendaDraft } from './AgendaForm';
import {
  agendaSorts,
  agendaStatusFilters,
  approveRate,
  filterAgendas,
  sortAgendas,
  voteTotal,
  type AgendaSort,
  type AgendaStatusFilter,
} from './agendaSort';

type AgendaBoardProps = {
  agendas: Agenda[];
  currentUser: CurrentUser;
  onVote: (id: string, type: 'approve' | 'reject') => void;
  onCreateAgenda: (draft: AgendaDraft) => Agenda;
};

type BoardView = 'list' | 'create' | 'detail';

const partFilters: TeamPart[] = ['전체', ...teamParts];

export function AgendaBoard({ agendas, currentUser, onVote, onCreateAgenda }: AgendaBoardProps) {
  const [view, setView] = useState<BoardView>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<AgendaStatusFilter>('전체');
  const [part, setPart] = useState<TeamPart>(currentUser.part);
  const [sort, setSort] = useState<AgendaSort>('최신순');
  const [keyword, setKeyword] = useState('');

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
        <AgendaDetail agenda={selectedAgenda} onVote={onVote} onBack={() => setView('list')} />
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
        <div className="panel empty-panel">
          <strong>조건에 맞는 안건이 없습니다.</strong>
          <span>필터를 바꾸거나 새 안건을 등록해보세요.</span>
        </div>
      ) : (
        <div className="agenda-grid">
          {visibleAgendas.map((agenda) => {
            const rate = approveRate(agenda);
            return (
              <article className="agenda-card" key={agenda.id}>
                <button className="agenda-open" onClick={() => openDetail(agenda.id)}>
                  <div className="agenda-top">
                    <span className={`status-dot ${agenda.status}`}>{agenda.status}</span>
                    <small>{agenda.source}</small>
                  </div>
                  <h2>{agenda.title}</h2>
                  <p className="agenda-card-meta">
                    {agenda.category} · {agenda.part} · {agenda.createdAt} · {voteTotal(agenda)}표
                  </p>
                  <div className="vote-bar">
                    <span style={{ width: `${rate}%` }} />
                  </div>
                  <div className="vote-counts">
                    <span>찬성 {agenda.approve}</span>
                    <span>반대 {agenda.reject}</span>
                  </div>
                </button>
                {agenda.status === '투표중' ? (
                  <div className="vote-actions">
                    <button onClick={() => onVote(agenda.id, 'approve')}>
                      <ThumbsUp size={17} />
                      찬성
                    </button>
                    <button onClick={() => onVote(agenda.id, 'reject')}>
                      <ThumbsDown size={17} />
                      반대
                    </button>
                  </div>
                ) : (
                  <div className="passed-box">
                    <FileCheck2 size={18} />
                    {agenda.status === '통과' ? '액션아이템 생성 대상' : '부결된 안건'}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
