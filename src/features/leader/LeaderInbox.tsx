import { CalendarPlus, FileCheck2, MessageSquareText, PenLine, Send, UserRoundCheck, Vote } from 'lucide-react';
import { useState } from 'react';
import type { Issue, IssueStatus } from '../../types';

type LeaderInboxProps = {
  issues: Issue[];
  onIssueUpdate: (issue: Issue) => void;
  onPromoteToAgenda: (issue: Issue) => void;
};

type LeaderAction = 'reply' | 'oneOnOne' | 'actionItem' | 'memo';

const filters: Array<'전체' | IssueStatus> = ['전체', '접수', '검토중', '답변완료', '1on1 제안', '액션아이템', '안건화', '보류', '회수', '종료'];

export function LeaderInbox({ issues, onIssueUpdate, onPromoteToAgenda }: LeaderInboxProps) {
  const [filter, setFilter] = useState<'전체' | IssueStatus>('전체');
  const [selectedIssueId, setSelectedIssueId] = useState(issues[0]?.id ?? '');
  const [activeAction, setActiveAction] = useState<LeaderAction>('reply');
  const [draft, setDraft] = useState('');

  const visibleIssues =
    filter === '전체' ? issues.filter((issue) => issue.status !== '회수') : issues.filter((issue) => issue.status === filter);
  const selectedIssue = visibleIssues.find((issue) => issue.id === selectedIssueId) ?? visibleIssues[0];
  const waitingCount = issues.filter((issue) => issue.status === '접수' || issue.status === '검토중').length;
  const answeredCount = issues.filter((issue) => issue.leaderReply).length;
  const followUpCount = issues.filter((issue) => issue.oneOnOneNote || issue.actionItem).length;

  const chooseIssue = (issue: Issue) => {
    setSelectedIssueId(issue.id);
    setDraft('');
  };

  const changeStatus = (issue: Issue, status: IssueStatus) => {
    onIssueUpdate({ ...issue, status });
  };

  const saveAction = () => {
    if (!selectedIssue || !draft.trim()) return;

    if (activeAction === 'reply') {
      onIssueUpdate({ ...selectedIssue, leaderReply: draft.trim(), status: '답변완료' });
    }

    if (activeAction === 'oneOnOne') {
      onIssueUpdate({ ...selectedIssue, oneOnOneNote: draft.trim(), status: '1on1 제안' });
    }

    if (activeAction === 'actionItem') {
      onIssueUpdate({ ...selectedIssue, actionItem: draft.trim(), status: '액션아이템' });
    }

    if (activeAction === 'memo') {
      onIssueUpdate({ ...selectedIssue, leaderMemo: draft.trim(), status: '검토중' });
    }

    setDraft('');
  };

  return (
    <section className="screen leader-screen">
      <div className="leader-summary">
        <div>
          <MessageSquareText size={22} />
          <span>처리 대기</span>
          <strong>{waitingCount}</strong>
        </div>
        <div>
          <Send size={22} />
          <span>답변 완료</span>
          <strong>{answeredCount}</strong>
        </div>
        <div>
          <FileCheck2 size={22} />
          <span>후속 액션</span>
          <strong>{followUpCount}</strong>
        </div>
      </div>

      <div className="leader-layout">
        <section className="leader-inbox-list">
          <div className="toolbar leader-toolbar">
            {filters.map((item) => (
              <button className={filter === item ? 'filter active' : 'filter'} key={item} onClick={() => setFilter(item)}>
                {item}
              </button>
            ))}
          </div>

          <div className="issue-list">
            {visibleIssues.map((issue) => (
              <article className={selectedIssue?.id === issue.id ? 'issue-card selected' : 'issue-card'} key={issue.id}>
                <button className="issue-select" onClick={() => chooseIssue(issue)}>
                  <span className={`priority ${issue.urgency}`}>{issue.urgency}</span>
                  <h2>{issue.title}</h2>
                  <p>
                    {issue.id} · {issue.category} · {getAuthorLabel(issue)} · {issue.target}
                  </p>
                  {issue.author === '실명' && issue.submitterName && (
                    <div className="author-card">
                      <strong>{issue.submitterName}</strong>
                      <span>
                        {issue.submitterPart} · {issue.submitterEmail}
                      </span>
                    </div>
                  )}
                  <div className="issue-flags">
                    {issue.leaderReply && <span>답변 있음</span>}
                    {issue.oneOnOneNote && <span>1on1 제안</span>}
                    {issue.actionItem && <span>액션아이템</span>}
                  </div>
                </button>
                <div className="issue-actions">
                  <span className="status-pill">{issue.status}</span>
                  <select value={issue.status} onChange={(event) => changeStatus(issue, event.target.value as IssueStatus)}>
                    {filters
                      .filter((item): item is IssueStatus => item !== '전체')
                      .map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                  </select>
                  <button className="secondary-button" disabled={issue.status === '회수'} onClick={() => onPromoteToAgenda(issue)}>
                    <Vote size={17} />
                    안건화
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="panel leader-workbench">
          {selectedIssue ? (
            <>
              <div className="leader-workbench-head">
                <span className="status-pill">{selectedIssue.status}</span>
                <h2>{selectedIssue.title}</h2>
                <p>
                  {selectedIssue.id} · {selectedIssue.category} · {getAuthorLabel(selectedIssue)} · {selectedIssue.target}
                </p>
                {selectedIssue.author === '실명' && selectedIssue.submitterName && (
                  <div className="author-card prominent">
                    <strong>{selectedIssue.submitterName}</strong>
                    <span>
                      {selectedIssue.submitterPart} · {selectedIssue.submitterEmail}
                    </span>
                  </div>
                )}
              </div>

              <div className="leader-action-tabs">
                <button className={activeAction === 'reply' ? 'selected' : ''} onClick={() => setActiveAction('reply')}>
                  <MessageSquareText size={17} />
                  답변
                </button>
                <button className={activeAction === 'oneOnOne' ? 'selected' : ''} onClick={() => setActiveAction('oneOnOne')}>
                  <CalendarPlus size={17} />
                  1on1
                </button>
                <button className={activeAction === 'actionItem' ? 'selected' : ''} onClick={() => setActiveAction('actionItem')}>
                  <FileCheck2 size={17} />
                  액션
                </button>
                <button className={activeAction === 'memo' ? 'selected' : ''} onClick={() => setActiveAction('memo')}>
                  <PenLine size={17} />
                  메모
                </button>
              </div>

              <label>
                {getActionLabel(activeAction)}
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={getActionPlaceholder(activeAction)} />
              </label>

              <button className="primary-button wide" onClick={saveAction}>
                <UserRoundCheck size={18} />
                처리 기록 남기기
              </button>

              <div className="leader-history">
                <strong>처리 기록</strong>
                {selectedIssue.leaderReply && <p>답변: {selectedIssue.leaderReply}</p>}
                {selectedIssue.oneOnOneNote && <p>1on1: {selectedIssue.oneOnOneNote}</p>}
                {selectedIssue.actionItem && <p>액션아이템: {selectedIssue.actionItem}</p>}
                {selectedIssue.leaderMemo && <p>리더 메모: {selectedIssue.leaderMemo}</p>}
                {selectedIssue.oneOnOneResponse && (
                  <p>
                    팀원 1on1 응답: {selectedIssue.oneOnOneResponse}
                    {selectedIssue.submitterResponse ? ` · ${selectedIssue.submitterResponse}` : ''}
                  </p>
                )}
                {!selectedIssue.oneOnOneResponse && selectedIssue.submitterResponse && (
                  <p>팀원 후속 응답: {selectedIssue.submitterResponse}</p>
                )}
                {!selectedIssue.leaderReply &&
                  !selectedIssue.oneOnOneNote &&
                  !selectedIssue.actionItem &&
                  !selectedIssue.leaderMemo &&
                  !selectedIssue.oneOnOneResponse &&
                  !selectedIssue.submitterResponse && (
                  <p>아직 남긴 처리 기록이 없습니다.</p>
                )}
              </div>
            </>
          ) : (
            <div className="empty-panel">
              <strong>선택할 접수 건이 없습니다.</strong>
              <span>필터를 전체로 바꾸거나 새 의견이 접수되면 여기에서 처리할 수 있어요.</span>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function getActionLabel(action: LeaderAction) {
  if (action === 'reply') return '작성자에게 남길 답변';
  if (action === 'oneOnOne') return '1on1 제안 내용';
  if (action === 'actionItem') return '액션아이템';
  return '리더 내부 메모';
}

function getActionPlaceholder(action: LeaderAction) {
  if (action === 'reply') return '검토 결과와 다음 조치를 작성해주세요.';
  if (action === 'oneOnOne') return '대화 목적, 제안 일정, 참여 대상을 적어주세요.';
  if (action === 'actionItem') return '담당자, 완료 기준, 희망 일정을 포함해 적어주세요.';
  return '리더끼리 공유할 판단 근거를 남겨주세요.';
}

function getAuthorLabel(issue: Issue) {
  if (issue.author === '익명') return '익명';
  return issue.submitterName ? `실명 ${issue.submitterName}` : '실명';
}
