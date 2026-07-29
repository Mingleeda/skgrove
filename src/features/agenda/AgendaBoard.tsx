import { CalendarClock, FileCheck2, PlusSquare, SquareCheckBig, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import type { Agenda } from '../../types';

type AgendaBoardProps = {
  agendas: Agenda[];
  canManage: boolean;
  onCloseVoting: (index: number) => void;
  onCreateAgenda: (agendaDraft: Omit<Agenda, 'approve' | 'reject' | 'status'>) => void;
  onUpdateDueDate: (index: number, dueDate: string) => void;
  onVote: (index: number, type: 'approve' | 'reject') => void;
};

export function AgendaBoard({ agendas, canManage, onCloseVoting, onCreateAgenda, onUpdateDueDate, onVote }: AgendaBoardProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(getDefaultDueDate);

  const submitAgenda = () => {
    if (!title.trim() || !dueDate) return;
    onCreateAgenda({
      title: title.trim(),
      description: description.trim(),
      dueDate,
      source: '관리자 직접 등록',
    });
    setTitle('');
    setDescription('');
    setDueDate(getDefaultDueDate());
  };

  return (
    <section className="screen">
      {canManage && (
        <section className="panel agenda-create-panel">
          <div className="panel-header">
            <div>
              <span>관리자 전용</span>
              <h2>투표 안건 직접 등록</h2>
            </div>
            <PlusSquare size={22} />
          </div>
          <div className="agenda-create-form">
            <label>
              안건 제목
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 티미팅 운영 방식 개선" />
            </label>
            <label>
              투표 기한
              <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </label>
            <label className="agenda-description-field">
              안건 설명
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="투표 전에 팀원이 이해해야 할 배경, 변경안, 기대 효과를 정리해주세요."
              />
            </label>
            <button className="primary-button" onClick={submitAgenda}>
              <PlusSquare size={18} />
              안건 등록
            </button>
          </div>
        </section>
      )}

      <div className="agenda-grid">
        {agendas.map((agenda, index) => {
          const total = agenda.approve + agenda.reject || 1;
          const approveRate = Math.round((agenda.approve / total) * 100);
          return (
            <article className="agenda-card" key={`${agenda.title}-${index}`}>
              <div className="agenda-top">
                <span className={`status-dot ${agenda.status}`}>{agenda.status}</span>
                <small>{agenda.source}</small>
              </div>
              <h2>{agenda.title}</h2>
              {agenda.description && <p className="agenda-description">{agenda.description}</p>}
              <div className="agenda-meta">
                <CalendarClock size={16} />
                <span>{agenda.dueDate ? `${formatDate(agenda.dueDate)}까지 투표` : '투표 기한 미설정'}</span>
              </div>
              {canManage && agenda.status === '투표중' && (
                <label className="agenda-deadline-control">
                  투표 종료 기한
                  <input
                    type="date"
                    value={agenda.dueDate ?? ''}
                    onChange={(event) => onUpdateDueDate(index, event.target.value)}
                  />
                </label>
              )}
              <div className="vote-bar">
                <span style={{ width: `${approveRate}%` }} />
              </div>
              <div className="vote-counts">
                <span>찬성 {agenda.approve}</span>
                <span>반대 {agenda.reject}</span>
              </div>
              {agenda.status === '투표중' ? (
                <>
                  <div className="vote-actions">
                    <button onClick={() => onVote(index, 'approve')}>
                      <ThumbsUp size={17} />
                      찬성
                    </button>
                    <button onClick={() => onVote(index, 'reject')}>
                      <ThumbsDown size={17} />
                      반대
                    </button>
                  </div>
                  {canManage && (
                    <button className="secondary-button wide" onClick={() => onCloseVoting(index)}>
                      <SquareCheckBig size={17} />
                      투표 종료 처리
                    </button>
                  )}
                </>
              ) : (
                <div className="passed-box">
                  <FileCheck2 size={18} />
                  {getClosedStatusLabel(agenda.status)}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function getDefaultDueDate() {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);
  return dueDate.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));
}

function getClosedStatusLabel(status: Agenda['status']) {
  if (status === '통과') return '액션아이템 생성 대상';
  if (status === '부결') return '부결된 안건';
  return '종료된 투표';
}
