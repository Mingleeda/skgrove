import { ArrowLeft, EyeOff, FileCheck2, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { Agenda } from '../../types';
import { approveRate, voteTotal } from './agendaSort';

type AgendaDetailProps = {
  agenda: Agenda;
  onVote: (id: string, type: 'approve' | 'reject') => void;
  onBack: () => void;
};

export function AgendaDetail({ agenda, onVote, onBack }: AgendaDetailProps) {
  const total = voteTotal(agenda);
  const rate = approveRate(agenda);

  return (
    <section className="panel agenda-detail-panel">
      <button className="can-back" onClick={onBack}>
        <ArrowLeft size={16} />
        안건 목록
      </button>

      <div className="agenda-detail-head">
        <span className={`status-dot ${agenda.status}`}>{agenda.status}</span>
        <h2>{agenda.title}</h2>
        <p className="agenda-detail-meta">
          {agenda.id} · {agenda.category} · {agenda.part} · {agenda.source} · {agenda.createdAt}
        </p>
        <p className="agenda-detail-author">
          {agenda.author === '익명' ? (
            <>
              <EyeOff size={15} />
              익명 등록
            </>
          ) : (
            <>작성자 {agenda.authorName || '이름 없음'}</>
          )}
        </p>
      </div>

      <p className="agenda-detail-body">{agenda.description || '등록된 배경 설명이 없습니다.'}</p>

      <div className="agenda-detail-vote">
        <div className="vote-bar">
          <span style={{ width: `${rate}%` }} />
        </div>
        <div className="vote-counts">
          <span>찬성 {agenda.approve}</span>
          <span>반대 {agenda.reject}</span>
        </div>
        <p className="agenda-detail-summary">
          {total === 0 ? '아직 투표가 없습니다.' : `총 ${total}표 · 찬성률 ${rate}%`}
        </p>
      </div>

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
          {agenda.status === '통과' ? '통과된 안건입니다. 액션아이템 생성 대상이에요.' : '부결된 안건입니다.'}
        </div>
      )}
    </section>
  );
}
