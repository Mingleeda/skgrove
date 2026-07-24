import { FileCheck2, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { Agenda } from '../../types';

type AgendaBoardProps = {
  agendas: Agenda[];
  onVote: (index: number, type: 'approve' | 'reject') => void;
};

export function AgendaBoard({ agendas, onVote }: AgendaBoardProps) {
  return (
    <section className="screen">
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
              <div className="vote-bar">
                <span style={{ width: `${approveRate}%` }} />
              </div>
              <div className="vote-counts">
                <span>찬성 {agenda.approve}</span>
                <span>반대 {agenda.reject}</span>
              </div>
              {agenda.status === '통과' ? (
                <div className="passed-box">
                  <FileCheck2 size={18} />
                  액션아이템 생성 대상
                </div>
              ) : (
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
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
