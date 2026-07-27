import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  EyeOff,
  FileText,
  Megaphone,
  MessageSquarePlus,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { PanelHeader } from '../../components/PanelHeader';
import type { CurrentUser, Identity, Issue, Urgency } from '../../types';

type IntakeProps = {
  identity: Identity;
  currentUser: CurrentUser;
  issues: Issue[];
  onIdentityChange: (identity: Identity) => void;
  onIssueUpdate: (issue: Issue) => void;
  onSubmitIssue: (issue: Omit<Issue, 'id' | 'status'>) => Issue;
};

type IntakeStep = 'scope' | 'content' | 'review' | 'complete';
type Visibility = '리더만 보기' | '안건 후보로 공개 가능';
type Target = '팀리더' | '파트리더' | '리더 전체';
type MyIssueFilter = '전체' | '답변 대기' | '1on1' | '완료';

const categories = ['회의문화', '협업', '업무방식', '갈등', '성장/피드백', '복지/분위기', '기타'];
const steps: Array<{ id: IntakeStep; label: string }> = [
  { id: 'scope', label: '방식 선택' },
  { id: 'content', label: '내용 작성' },
  { id: 'review', label: '제출 확인' },
  { id: 'complete', label: '접수 완료' },
];

export function Intake({ identity, currentUser, issues, onIdentityChange, onIssueUpdate, onSubmitIssue }: IntakeProps) {
  const [step, setStep] = useState<IntakeStep>('scope');
  const [target, setTarget] = useState<Target>('팀리더');
  const [visibility, setVisibility] = useState<Visibility>('리더만 보기');
  const [category, setCategory] = useState(categories[0]);
  const [urgency, setUrgency] = useState<Urgency>('보통');
  const [title, setTitle] = useState('팀 티미팅 시간을 줄이고 싶어요');
  const [body, setBody] = useState('논의할 주제가 명확하지 않은 회의는 시간을 줄이고, 필요한 경우 안건함에서 먼저 투표하면 좋겠습니다.');
  const [expectedChange, setExpectedChange] = useState('회의 전 안건을 먼저 모으고, 꼭 필요한 주제만 짧게 논의하면 좋겠습니다.');
  const [receiptId, setReceiptId] = useState('SOOP-148');
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [myIssueFilter, setMyIssueFilter] = useState<MyIssueFilter>('전체');
  const [expandedIssueIds, setExpandedIssueIds] = useState<Record<string, boolean>>({});

  const currentStepIndex = steps.findIndex((item) => item.id === step);
  const myIssues = issues.filter(
    (issue) => issue.author === '실명' && issue.submitterEmail?.toLowerCase() === currentUser.email.toLowerCase(),
  );
  const visibleMyIssues = myIssues.filter((issue) => {
    if (myIssueFilter === '답변 대기') return !issue.leaderReply && !issue.oneOnOneNote && !issue.actionItem;
    if (myIssueFilter === '1on1') return Boolean(issue.oneOnOneNote);
    if (myIssueFilter === '완료') return issue.status === '종료' || issue.status === '답변완료' || issue.status === '액션아이템';
    return true;
  });

  const submit = () => {
    const createdIssue = onSubmitIssue({
      title,
      category,
      author: identity,
      submitterName: identity === '실명' ? currentUser.name : undefined,
      submitterEmail: identity === '실명' ? currentUser.email : undefined,
      submitterPart: identity === '실명' ? currentUser.part : undefined,
      target,
      urgency,
    });
    setReceiptId(createdIssue.id);
    setStep('complete');
  };

  const updateResponseDraft = (issueId: string, value: string) => {
    setResponseDrafts((drafts) => ({ ...drafts, [issueId]: value }));
  };

  const saveSubmitterResponse = (issue: Issue) => {
    const response = responseDrafts[issue.id]?.trim();
    if (!response) return;
    onIssueUpdate({ ...issue, submitterResponse: response });
    setResponseDrafts((drafts) => ({ ...drafts, [issue.id]: '' }));
  };

  const respondToOneOnOne = (issue: Issue, oneOnOneResponse: Issue['oneOnOneResponse']) => {
    const response = responseDrafts[issue.id]?.trim();
    onIssueUpdate({
      ...issue,
      oneOnOneResponse,
      submitterResponse: response || issue.submitterResponse,
    });
    if (response) {
      setResponseDrafts((drafts) => ({ ...drafts, [issue.id]: '' }));
    }
  };

  const toggleIssue = (issueId: string) => {
    setExpandedIssueIds((ids) => ({ ...ids, [issueId]: !ids[issueId] }));
  };

  return (
    <section className="screen intake-screen">
      <div className="intake-main">
        <div className="intake-stepper">
          {steps.map((item, index) => (
            <button className={index <= currentStepIndex ? 'active' : ''} key={item.id} onClick={() => setStep(item.id)}>
              <span>{index + 1}</span>
              {item.label}
            </button>
          ))}
        </div>

        {step === 'scope' && (
          <section className="panel intake-panel">
            <PanelHeader icon={MessageSquarePlus} title="어떤 방식으로 말할까요?" />
            <div className="intake-choice-grid">
              {(['익명', '실명'] as const).map((item) => (
                <button className={identity === item ? 'choice-card selected' : 'choice-card'} onClick={() => onIdentityChange(item)} key={item}>
                  {item === '익명' ? <EyeOff size={22} /> : <ShieldCheck size={22} />}
                  <strong>{item}</strong>
                  <span>{item === '익명' ? '작성자 정보는 리더 화면에서 분리됩니다.' : '이름과 사내메일이 리더에게 함께 전달됩니다.'}</span>
                </button>
              ))}
            </div>

            <div className="form-grid">
              <label>
                전달 대상
                <select value={target} onChange={(event) => setTarget(event.target.value as Target)}>
                  <option>팀리더</option>
                  <option>파트리더</option>
                  <option>리더 전체</option>
                </select>
              </label>
              <label>
                공개 범위
                <select value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)}>
                  <option>리더만 보기</option>
                  <option>안건 후보로 공개 가능</option>
                </select>
              </label>
            </div>

            <button className="primary-button wide" onClick={() => setStep('content')}>
              <FileText size={18} />
              내용 작성하기
            </button>
          </section>
        )}

        {step === 'content' && (
          <section className="panel intake-panel">
            <PanelHeader icon={FileText} title="어떤 이야기인가요?" />
            <div className="form-grid">
              <label>
                카테고리
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  {categories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                긴급도
                <select value={urgency} onChange={(event) => setUrgency(event.target.value as Urgency)}>
                  <option>낮음</option>
                  <option>보통</option>
                  <option>높음</option>
                </select>
              </label>
            </div>
            <label>
              제목
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              내용
              <textarea value={body} onChange={(event) => setBody(event.target.value)} />
            </label>
            <label>
              기대 변화
              <textarea value={expectedChange} onChange={(event) => setExpectedChange(event.target.value)} />
            </label>
            <div className="form-actions">
              <button className="secondary-button" onClick={() => setStep('scope')}>
                이전
              </button>
              <button className="primary-button" onClick={() => setStep('review')}>
                제출 전 확인
              </button>
            </div>
          </section>
        )}

        {step === 'review' && (
          <section className="panel intake-panel">
            <PanelHeader icon={ShieldCheck} title="제출 전 확인" />
            <div className="review-box">
              <span>{identity}</span>
              <h2>{title}</h2>
              <p>{body}</p>
              <dl>
                {identity === '실명' && (
                  <div><dt>작성자</dt><dd>{currentUser.name} · {currentUser.part} · {currentUser.email}</dd></div>
                )}
                <div><dt>전달 대상</dt><dd>{target}</dd></div>
                <div><dt>카테고리</dt><dd>{category}</dd></div>
                <div><dt>긴급도</dt><dd>{urgency}</dd></div>
                <div><dt>공개 범위</dt><dd>{visibility}</dd></div>
                <div><dt>기대 변화</dt><dd>{expectedChange}</dd></div>
              </dl>
            </div>
            <div className="notice-line">
              <AlertTriangle size={18} />
              개인정보, 실명 비방, 민감 정보가 포함되어 있지 않은지 한 번 더 확인해주세요.
            </div>
            <div className="form-actions">
              <button className="secondary-button" onClick={() => setStep('content')}>
                수정하기
              </button>
              <button className="primary-button" onClick={submit}>
                <Send size={18} />
                접수하기
              </button>
            </div>
          </section>
        )}

        {step === 'complete' && (
          <section className="panel intake-panel complete-panel">
            <CheckCircle2 size={42} />
            <p className="eyebrow">접수 완료</p>
            <h2>{receiptId}</h2>
            <p>의견이 리더 관리함으로 전달되었습니다. 접수 상태는 아래 목록에서 계속 확인할 수 있어요.</p>
            <button className="primary-button" onClick={() => setStep('scope')}>
              새 의견 접수
            </button>
          </section>
        )}

        <section className="panel intake-panel my-issues-panel">
          <div className="my-issues-header">
            <PanelHeader icon={Megaphone} title="내 접수 현황" />
            <div className="toolbar my-issues-toolbar">
              {(['전체', '답변 대기', '1on1', '완료'] as const).map((item) => (
                <button
                  className={myIssueFilter === item ? 'filter active' : 'filter'}
                  key={item}
                  onClick={() => setMyIssueFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="submission-list">
            {visibleMyIssues.length > 0 ? (
              visibleMyIssues.map((issue) => {
                const isExpanded = expandedIssueIds[issue.id] ?? visibleMyIssues.length === 1;
                return (
                  <article className="submission-card" key={issue.id}>
                    <button className="submission-summary" onClick={() => toggleIssue(issue.id)}>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <div>
                        <strong>{issue.title}</strong>
                        <span>{issue.id} · {issue.category} · {issue.target}</span>
                      </div>
                      <span className="status-pill">{issue.status}</span>
                    </button>

                    {isExpanded && (
                      <div className="submission-detail">
                        {issue.leaderReply && <p>답변: {issue.leaderReply}</p>}
                        {issue.oneOnOneNote && <p>1on1: {issue.oneOnOneNote}</p>}
                        {issue.actionItem && <p>액션아이템: {issue.actionItem}</p>}
                        {issue.submitterResponse && <p>내 응답: {issue.submitterResponse}</p>}
                        {issue.oneOnOneResponse && <p>1on1 응답: {issue.oneOnOneResponse}</p>}
                        {(issue.leaderReply || issue.oneOnOneNote || issue.actionItem) && (
                          <div className="submission-followup">
                            {issue.oneOnOneNote && (
                              <div className="submission-followup-actions">
                                <button className="secondary-button" onClick={() => respondToOneOnOne(issue, '수락')}>
                                  1on1 수락
                                </button>
                                <button className="secondary-button" onClick={() => respondToOneOnOne(issue, '일정 조율 요청')}>
                                  일정 조율 요청
                                </button>
                              </div>
                            )}
                            <textarea
                              value={responseDrafts[issue.id] ?? ''}
                              onChange={(event) => updateResponseDraft(issue.id, event.target.value)}
                              placeholder="리더 답변에 대한 확인, 추가 의견, 가능한 일정 등을 남겨주세요."
                            />
                            <button className="primary-button wide" onClick={() => saveSubmitterResponse(issue)}>
                              후속 응답 남기기
                            </button>
                          </div>
                        )}
                        {!issue.leaderReply && !issue.oneOnOneNote && !issue.actionItem && (
                          <p>아직 리더가 남긴 답변이나 후속 액션이 없습니다.</p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            ) : (
              <div className="submission-card empty-submission">
                <strong>표시할 접수 의견이 없습니다.</strong>
                <span>실명으로 접수한 의견은 이곳에서 상태와 리더 답변을 확인할 수 있어요.</span>
              </div>
            )}
          </div>
        </section>
      </div>

      <aside className="intake-aside">
        <section className="panel">
          <PanelHeader icon={ShieldCheck} title="익명성 안내" />
          <div className="privacy-list">
            <div><strong>익명 선택</strong><span>리더 화면에는 작성자 이름과 메일이 보이지 않습니다.</span></div>
            <div><strong>실명 선택</strong><span>후속 대화가 필요한 개선 제안에 적합합니다.</span></div>
            <div><strong>안건 후보</strong><span>공개 가능으로 제출하면 투표 안건 전환 후보가 됩니다.</span></div>
          </div>
        </section>

        <section className="panel">
          <PanelHeader icon={Megaphone} title="내 접수 현황" />
          <div className="privacy-list">
            <div><strong>실명 접수만 추적</strong><span>내 접수 현황은 사내메일 기준으로 실명 접수 건만 보여줍니다.</span></div>
            <div><strong>답변 후 후속 응답</strong><span>리더 답변이나 1on1 제안이 오면 메인 현황에서 바로 응답할 수 있습니다.</span></div>
          </div>
        </section>
      </aside>
    </section>
  );
}
