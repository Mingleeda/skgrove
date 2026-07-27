import { ArrowLeft, CheckCircle2, EyeOff, FileCheck2, Gavel, ThumbsDown, ThumbsUp, Timer } from 'lucide-react';
import { daysLeft, isOpen, MIN_VOTES_TO_PASS } from '../../agendaRules';
import type { Agenda, VoteChoice } from '../../types';
import { approveRate, voteTotal } from './agendaSort';

type AgendaDetailProps = {
  agenda: Agenda;
  alreadyVoted: boolean;
  canClose: boolean;
  today: string;
  onVote: (id: string, choice: VoteChoice) => void;
  onClose: (id: string) => void;
  onBack: () => void;
};

export function AgendaDetail({
  agenda,
  alreadyVoted,
  canClose,
  today,
  onVote,
  onClose,
  onBack,
}: AgendaDetailProps) {
  const total = voteTotal(agenda);
  const rate = approveRate(agenda);
  const remaining = daysLeft(agenda, today);
  const open = isOpen(agenda);
  const shortOfQuorum = Math.max(0, MIN_VOTES_TO_PASS - total);

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

      {agenda.deadline && (
        <p className="agenda-deadline">
          <Timer size={15} />
          {open
            ? remaining !== null && remaining <= 0
              ? '오늘 마감'
              : `마감 ${agenda.deadline} · ${remaining}일 남음`
            : `${agenda.closedAt || agenda.deadline} 마감됨`}
        </p>
      )}

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
          {open && shortOfQuorum > 0 && ` · 통과까지 최소 ${shortOfQuorum}표 더 필요`}
        </p>
      </div>

      {!open ? (
        <div className="passed-box">
          <FileCheck2 size={18} />
          {agenda.status === '통과' ? '통과된 안건입니다. 액션아이템 생성 대상이에요.' : '부결된 안건입니다.'}
        </div>
      ) : alreadyVoted ? (
        <div className="voted-box">
          <CheckCircle2 size={18} />
          이 안건에 이미 투표했습니다. 어떤 쪽을 골랐는지는 기록되지 않아 다시 확인할 수 없어요.
        </div>
      ) : (
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
      )}

      {open && canClose && (
        <button className="secondary-button" onClick={() => onClose(agenda.id)}>
          <Gavel size={17} />
          지금 마감하기
        </button>
      )}
    </section>
  );
}
