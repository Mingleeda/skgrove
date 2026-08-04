import { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  EyeOff,
  FileCheck2,
  Gavel,
  ListPlus,
  ThumbsDown,
  ThumbsUp,
  Timer,
} from 'lucide-react';
import {
  daysLeft,
  isOpen,
  participationRate,
  remainingVoters,
  voteTotal,
  votesShortOfQuorum,
} from '../../agendaRules';
import type { Agenda, VoteChoice } from '../../types';
import { approveRate } from './agendaSort';

type AgendaDetailProps = {
  agenda: Agenda;
  alreadyVoted: boolean;
  canClose: boolean;
  today: string;
  actionCount: number;
  onVote: (id: string, choice: VoteChoice) => void;
  onClose: (id: string) => void;
  onCreateActions: (agenda: Agenda) => void;
  onBack: () => void;
};

export function AgendaDetail({
  agenda,
  alreadyVoted,
  canClose,
  today,
  actionCount,
  onVote,
  onClose,
  onCreateActions,
  onBack,
}: AgendaDetailProps) {
  // 확정 전 임시 선택. 확정 버튼을 눌러야만 onVote가 호출된다.
  const [pendingChoice, setPendingChoice] = useState<VoteChoice | null>(null);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const total = voteTotal(agenda);
  const rate = approveRate(agenda);
  const remaining = daysLeft(agenda, today);
  const open = isOpen(agenda);
  const shortOfQuorum = votesShortOfQuorum(agenda);
  const notVotedYet = remainingVoters(agenda);

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
          {agenda.eligibleCount > 0 &&
            ` · 대상 ${agenda.eligibleCount}명 중 ${total}명 참여(${participationRate(agenda)}%)`}
        </p>
        {open && (
          <p className="agenda-detail-summary">
            {shortOfQuorum > 0
              ? `성립까지 ${shortOfQuorum}표 더 필요 · 아직 ${notVotedYet}명이 투표하지 않았습니다.`
              : `정족수를 채웠습니다. 남은 ${notVotedYet}명의 표로 결과가 바뀔 수 있습니다.`}
          </p>
        )}
      </div>

      {!open ? (
        <>
          <div className="passed-box">
            <FileCheck2 size={18} />
            {agenda.status === '통과'
              ? actionCount > 0
                ? `통과된 안건입니다. 액션아이템 ${actionCount}건이 만들어졌어요.`
                : '통과된 안건입니다. 액션아이템 생성 대상이에요.'
              : '부결된 안건입니다.'}
          </div>
          {agenda.status === '통과' && (
            <button className="primary-button" onClick={() => onCreateActions(agenda)}>
              <ListPlus size={18} />
              {actionCount > 0 ? '액션아이템 추가 생성' : '액션아이템 생성'}
            </button>
          )}
        </>
      ) : alreadyVoted ? (
        <div className="voted-box">
          <CheckCircle2 size={18} />
          이 안건에 이미 투표했습니다. 어떤 쪽을 골랐는지는 기록되지 않아 다시 확인할 수 없어요.
        </div>
      ) : (
        <>
          <div className="vote-actions">
            <button className={pendingChoice === 'approve' ? 'selected' : ''} onClick={() => setPendingChoice('approve')}>
              <ThumbsUp size={17} />
              찬성
            </button>
            <button className={pendingChoice === 'reject' ? 'selected' : ''} onClick={() => setPendingChoice('reject')}>
              <ThumbsDown size={17} />
              반대
            </button>
          </div>

          {/* 확정 경고는 확정 '전에' 보여야 한다.
              투표한 뒤에 "변경할 수 없다"고 알리는 건 안내가 아니라 통보다. */}
          {pendingChoice && (
            <div className="vote-confirm">
              <AlertTriangle size={18} />
              <p>
                <strong>{pendingChoice === 'approve' ? '찬성' : '반대'}</strong>으로 투표합니다. 확정하면 변경하거나 취소할 수
                없고, 어떤 쪽을 골랐는지는 기록되지 않아 나중에 다시 확인할 수도 없어요.
              </p>
              <div className="vote-confirm-actions">
                <button className="secondary-button" onClick={() => setPendingChoice(null)}>
                  다시 고르기
                </button>
                <button
                  className="primary-button"
                  onClick={() => {
                    onVote(agenda.id, pendingChoice);
                    setPendingChoice(null);
                  }}
                >
                  <CheckCircle2 size={17} />
                  투표 확정
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {open && canClose && (
        <div className="agenda-close-box">
          {closeConfirmOpen ? (
            <>
              <AlertTriangle size={18} />
              <p>
                지금 마감하면 남은 {notVotedYet}명은 투표할 수 없고, 현재 집계(찬성 {agenda.approve} · 반대 {agenda.reject})로
                결과가 확정됩니다. 되돌릴 수 없습니다.
              </p>
              <div className="vote-confirm-actions">
                <button className="secondary-button" onClick={() => setCloseConfirmOpen(false)}>
                  취소
                </button>
                <button
                  className="primary-button"
                  onClick={() => {
                    onClose(agenda.id);
                    setCloseConfirmOpen(false);
                  }}
                >
                  <Gavel size={17} />
                  마감 확정
                </button>
              </div>
            </>
          ) : (
            <button className="secondary-button" onClick={() => setCloseConfirmOpen(true)}>
              <Gavel size={17} />
              지금 마감하기
            </button>
          )}
        </div>
      )}
    </section>
  );
}
