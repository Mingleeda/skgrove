import { CalendarPlus, FileCheck2, MessageSquareText, PenLine, Send, ShieldCheck, UserRoundCheck, Vote } from 'lucide-react';
import { useState } from 'react';
import { teamParts } from '../../auth';
import type { Agenda, Identity, Issue, IssueStatus, TeamPart } from '../../types';

type LeaderInboxProps = {
  issues: Issue[];
  onIssueUpdate: (issue: Issue) => void;
  onPromoteToAgenda: (
    issue: Issue,
    draft: Pick<Agenda, 'title' | 'description' | 'category' | 'part' | 'author' | 'deadline'>,
  ) => void;
};

type AgendaDraft = Pick<Agenda, 'title' | 'description' | 'category' | 'part' | 'author' | 'deadline'>;
type LeaderAction = 'reply' | 'oneOnOne' | 'actionItem' | 'agenda' | 'memo';

const filters: Array<'전체' | IssueStatus> = ['전체', '접수', '검토중', '답변완료', '1on1 제안', '액션아이템', '안건화', '보류', '회수', '종료'];
const agendaParts: TeamPart[] = ['전체', ...teamParts];
const DEFAULT_VOTING_DAYS = 7;
const addDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

export function LeaderInbox({ issues, onIssueUpdate, onPromoteToAgenda }: LeaderInboxProps) {
  const [filter, setFilter] = useState<'전체' | IssueStatus>('전체');
  const [selectedIssueId, setSelectedIssueId] = useState(issues[0]?.id ?? '');
  const [activeAction, setActiveAction] = useState<LeaderAction>('reply');
  const [draft, setDraft] = useState('');
  const [agendaDrafts, setAgendaDrafts] = useState<Record<string, AgendaDraft>>({});

  const visibleIssues =
    filter === '전체'
      ? issues.filter((issue) => issue.status !== '회수' && issue.status !== '종료')
      : issues.filter((issue) => issue.status === filter);
  const selectedIssue = visibleIssues.find((issue) => issue.id === selectedIssueId) ?? visibleIssues[0];
  const agendaDraft = selectedIssue ? agendaDrafts[selectedIssue.id] ?? makeAgendaDraft(selectedIssue) : null;
  const waitingCount = issues.filter((issue) => issue.status === '접수' || issue.status === '검토중').length;
  const answeredCount = issues.filter((issue) => issue.leaderReply).length;
  const followUpCount = issues.filter((issue) => issue.oneOnOneNote || issue.actionItem).length;

  const chooseIssue = (issue: Issue) => {
    setSelectedIssueId(issue.id);
    setDraft('');
    setAgendaDrafts((current) => ({ ...current, [issue.id]: current[issue.id] ?? makeAgendaDraft(issue) }));
  };

  const changeStatus = (issue: Issue, status: IssueStatus) => {
    onIssueUpdate({ ...issue, status });
  };

  const updateAgendaDraft = (patch: Partial<AgendaDraft>) => {
    if (!selectedIssue || !agendaDraft) return;

    setAgendaDrafts((current) => ({
      ...current,
      [selectedIssue.id]: { ...agendaDraft, ...patch },
    }));
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

  const submitAgendaDraft = () => {
    if (!selectedIssue || !agendaDraft) return;

    const nextDraft: AgendaDraft = {
      ...agendaDraft,
      title: agendaDraft.title.trim(),
      description: agendaDraft.description.trim(),
      category: agendaDraft.category.trim() || selectedIssue.category,
      author: selectedIssue.visibility === '리더만 보기' ? '익명' : agendaDraft.author,
      deadline: agendaDraft.deadline || addDays(DEFAULT_VOTING_DAYS),
    };

    if (!nextDraft.title || !nextDraft.description) return;

    onPromoteToAgenda(selectedIssue, nextDraft);
    setAgendaDrafts((current) => {
      const next = { ...current };
      delete next[selectedIssue.id];
      return next;
    });
    setActiveAction('reply');
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
                  <button
                    className="secondary-button"
                    disabled={issue.status === '회수'}
                    onClick={() => {
                      chooseIssue(issue);
                      setActiveAction('agenda');
                    }}
                    title={
                      issue.visibility === '리더만 보기'
                        ? '원문과 작성자 정보는 공개하지 않고 정제한 익명 안건을 만듭니다.'
                        : '접수 의견을 정제해 안건 후보로 전환합니다.'
                    }
                  >
                    {issue.visibility === '리더만 보기' ? <ShieldCheck size={17} /> : <Vote size={17} />}
                    {issue.visibility === '리더만 보기' ? '정제 후 안건화' : '안건화'}
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
                  {selectedIssue.id} · {selectedIssue.category} · {getAuthorLabel(selectedIssue)} · {selectedIssue.target} ·{' '}
                  {selectedIssue.visibility}
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

              {selectedIssue.visibility === '리더만 보기' && (
                <div className="privacy-promotion-note">
                  <ShieldCheck size={18} />
                  <span>이 접수 건은 원문 작성자 정보를 공개하지 않고, 리더가 정제한 익명 안건으로만 전환됩니다.</span>
                </div>
              )}

              {/* 리더가 답변하려면 접수자가 무엇을 썼는지 읽을 수 있어야 한다. */}
              <div className="issue-body-box">
                <strong>접수 내용</strong>
                <p>{selectedIssue.body || '작성된 내용이 없습니다.'}</p>
                {selectedIssue.expectedChange && (
                  <>
                    <strong>기대 변화</strong>
                    <p>{selectedIssue.expectedChange}</p>
                  </>
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
                <button className={activeAction === 'agenda' ? 'selected' : ''} onClick={() => setActiveAction('agenda')}>
                  <Vote size={17} />
                  안건
                </button>
                <button className={activeAction === 'memo' ? 'selected' : ''} onClick={() => setActiveAction('memo')}>
                  <PenLine size={17} />
                  메모
                </button>
              </div>

              {activeAction === 'agenda' && agendaDraft ? (
                <div className="agenda-refine-form">
                  <label>
                    안건 제목
                    <input
                      value={agendaDraft.title}
                      onChange={(event) => updateAgendaDraft({ title: event.target.value })}
                      placeholder="팀원이 투표할 수 있는 안건 제목으로 정리해주세요."
                    />
                  </label>

                  <label>
                    안건 설명
                    <textarea
                      value={agendaDraft.description}
                      onChange={(event) => updateAgendaDraft({ description: event.target.value })}
                      placeholder="원문을 그대로 옮기지 말고, 투표 가능한 배경과 기대 변화를 정제해주세요."
                    />
                  </label>

                  {/* 원문 옮기기는 리더가 의도적으로 눌러야만 일어난다.
                      '리더만 보기'로 접수된 건은 이 경로 자체를 열지 않는다. */}
                  {selectedIssue.visibility !== '리더만 보기' && (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() =>
                        updateAgendaDraft({
                          title: agendaDraft.title || selectedIssue.title,
                          description: issueSourceText(selectedIssue),
                        })
                      }
                    >
                      <PenLine size={17} />
                      접수 원문 불러와서 다듬기
                    </button>
                  )}

                  <div className="agenda-refine-grid">
                    <label>
                      카테고리
                      <input value={agendaDraft.category} onChange={(event) => updateAgendaDraft({ category: event.target.value })} />
                    </label>
                    <label>
                      투표 대상
                      <select value={agendaDraft.part} onChange={(event) => updateAgendaDraft({ part: event.target.value as TeamPart })}>
                        {agendaParts.map((part) => (
                          <option key={part}>{part}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="agenda-refine-grid">
                    <label>
                      공개 방식
                      <select
                        value={selectedIssue.visibility === '리더만 보기' ? '익명' : agendaDraft.author}
                        disabled={selectedIssue.visibility === '리더만 보기'}
                        onChange={(event) => updateAgendaDraft({ author: event.target.value as Identity })}
                      >
                        <option>익명</option>
                        <option>실명</option>
                      </select>
                    </label>
                    <label>
                      투표 마감일
                      <input
                        type="date"
                        min={addDays(1)}
                        value={agendaDraft.deadline}
                        onChange={(event) => updateAgendaDraft({ deadline: event.target.value })}
                      />
                    </label>
                  </div>

                  {selectedIssue.visibility === '리더만 보기' && (
                    <div className="privacy-promotion-note">
                      <ShieldCheck size={18} />
                      <span>원문과 작성자 정보는 공개되지 않습니다. 리더가 정제한 별도 안건만 안건함에 올라갑니다.</span>
                    </div>
                  )}

                  {/* 무엇이 팀 전체에 공개되는지 확정 직전에 보여준다.
                      원문이 섞여 들어갔는지 리더가 눈으로 확인할 수 있는 마지막 지점이다. */}
                  <div className="agenda-publish-preview">
                    <strong>팀원에게 공개될 내용</strong>
                    <p className="agenda-publish-preview-title">{agendaDraft.title.trim() || '(제목을 입력해주세요)'}</p>
                    <p className="agenda-publish-preview-body">
                      {agendaDraft.description.trim() || '(설명을 입력해주세요)'}
                    </p>
                    <small>
                      작성자 표기: {selectedIssue.visibility === '리더만 보기' ? '익명' : agendaDraft.author} · 투표 대상:{' '}
                      {agendaDraft.part}
                    </small>
                  </div>

                  <button
                    className="primary-button wide"
                    disabled={!agendaDraft.title.trim() || !agendaDraft.description.trim()}
                    onClick={submitAgendaDraft}
                  >
                    <ShieldCheck size={18} />
                    {selectedIssue.visibility === '리더만 보기' ? '익명화해 안건 후보로 만들기' : '정제한 안건 후보로 만들기'}
                  </button>
                </div>
              ) : (
                <>
                  <label>
                    {getActionLabel(activeAction)}
                    <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={getActionPlaceholder(activeAction)} />
                  </label>

                  <button className="primary-button wide" onClick={saveAction}>
                    <UserRoundCheck size={18} />
                    처리 기록 남기기
                  </button>
                </>
              )}

              {selectedIssue.status !== '종료' && selectedIssue.status !== '회수' && (
                <button className="secondary-button wide" onClick={() => onIssueUpdate({ ...selectedIssue, status: '종료' })}>
                  종료 처리
                </button>
              )}

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

// 안건 초안은 비워둔 채로 시작한다.
// 접수 원문을 기본값으로 깔면 리더가 아무것도 하지 않아도 원문이 그대로 공개된다.
// 소규모 팀에서는 문체와 사례만으로 작성자가 특정되므로, 원문을 옮기는 것은
// 반드시 리더의 명시적인 행동(원문 불러오기)이어야 한다.
function makeAgendaDraft(issue: Issue): AgendaDraft {
  return {
    title: '',
    description: '',
    category: issue.category,
    part: '전체',
    author: issue.visibility === '리더만 보기' ? '익명' : issue.author,
    deadline: addDays(DEFAULT_VOTING_DAYS),
  };
}

// '원문 불러오기'를 눌렀을 때만 쓰이는 값. 공개 가능으로 접수된 건에서만 노출한다.
function issueSourceText(issue: Issue) {
  return [issue.body, issue.expectedChange ? `기대 변화\n${issue.expectedChange}` : '']
    .filter(Boolean)
    .join('\n\n');
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
