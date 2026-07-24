import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Clock,
  Coffee,
  FileText,
  ListChecks,
  Plus,
  Send,
  Share2,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { isLeader, teamParts } from '../../auth';
import { CAN_STEPS, DEFAULT_STEP, stepLabelOf } from '../../canConfig';
import { PanelHeader } from '../../components/PanelHeader';
import type {
  ActionItem,
  CanMethod,
  CanOpinion,
  CanSession,
  CanStage,
  CanStep,
  CurrentUser,
  Identity,
  TeamPart,
} from '../../types';

const allParts: readonly TeamPart[] = teamParts;
const canMethods: CanMethod[] = ['온라인', '오프라인'];

const stageFlow: { id: CanStage; label: string }[] = [
  { id: 'setup', label: '세션 준비' },
  { id: 'collect', label: '의견 수집' },
  { id: 'share', label: '의견 공유' },
  { id: 'select', label: '선정' },
  { id: 'summary', label: '결과' },
];

const stageLabelOf = (session: CanSession) => {
  if (session.stage === 'summary' && session.resultActions.length > 0) return '완료';
  return stageFlow.find((item) => item.id === session.stage)?.label ?? '진행 중';
};

const teaMeetingCategories = ['필요성', '회의문화', '파트섞기', '자발 제안', '결과 메모', '액션 연결'];

type MeetingsProps = {
  sessions: CanSession[];
  opinions: CanOpinion[];
  selectedId: string | null;
  currentUser: CurrentUser;
  onSelectSession: (id: string | null) => void;
  onStartSession: () => void;
  onUpdateSession: (session: CanSession) => void;
  onAddOpinion: (opinion: Omit<CanOpinion, 'id' | 'selected'>) => void;
  onToggleOpinion: (id: string) => void;
  onConfirmResult: (sessionId: string, summary: string, actions: ActionItem[]) => void;
};

type Draft = {
  step: CanStep;
  author: Identity;
  content: string;
};

export function Meetings({
  sessions,
  opinions,
  selectedId,
  currentUser,
  onSelectSession,
  onStartSession,
  onUpdateSession,
  onAddOpinion,
  onToggleOpinion,
  onConfirmResult,
}: MeetingsProps) {
  const [tab, setTab] = useState<'can' | 'tea'>('can');
  const [draft, setDraft] = useState<Draft>({
    step: DEFAULT_STEP,
    author: '익명',
    content: '',
  });
  const [actionDrafts, setActionDrafts] = useState<Record<string, { owner: string; due: string }>>({});
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const isHost = isLeader(currentUser);
  const session = sessions.find((item) => item.id === selectedId) ?? null;

  const authorLabel = (opinion: CanOpinion) =>
    opinion.author === '실명' && opinion.authorName ? opinion.authorName : '익명';

  return (
    <section className="screen can-screen">
      <div className="can-tabs">
        <button className={tab === 'can' ? 'selected' : ''} onClick={() => setTab('can')}>
          <UsersRound size={16} />
          캔미팅
        </button>
        <button className={tab === 'tea' ? 'selected' : ''} onClick={() => setTab('tea')}>
          <Coffee size={16} />
          티미팅
        </button>
      </div>

      {tab === 'can' && (
        <div className="can-flow">
          {/* ===== 세션 목록 ===== */}
          {!session && (
            <>
              <div className="can-session-head">
                <div>
                  <h2>캔미팅 세션</h2>
                  <p className="can-hint">분기마다 진행되는 캔미팅을 모아봅니다.</p>
                </div>
                {isHost && (
                  <button className="primary-button" onClick={onStartSession}>
                    <Plus size={18} />
                    신규 캔미팅 시작
                  </button>
                )}
              </div>
              <div className="can-session-list">
                {sessions.length === 0 && <p className="can-empty">아직 진행된 캔미팅이 없습니다.</p>}
                {sessions.map((item) => {
                  const count = opinions.filter((opinion) => opinion.sessionId === item.id).length;
                  const picked = opinions.filter(
                    (opinion) => opinion.sessionId === item.id && opinion.selected,
                  ).length;
                  const done = item.stage === 'summary' && item.resultActions.length > 0;
                  return (
                    <button className="can-session-card" key={item.id} onClick={() => onSelectSession(item.id)}>
                      <div className="can-session-top">
                        <span className="can-badge">{item.teamName || '팀 미정'}</span>
                        <span className={`can-stage-badge ${done ? 'done' : ''}`}>{stageLabelOf(item)}</span>
                      </div>
                      <h3>{item.topic || '(제목 미정)'}</h3>
                      <div className="can-session-meta">
                        <span>{item.heldAt ? item.heldAt.replace('T', ' ') : '일시 미정'}</span>
                        <span>의견 {count}</span>
                        <span>선정 {picked}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ===== 세션 상세 ===== */}
          {session &&
            (() => {
              const stage = session.stage;
              const stageIndex = stageFlow.findIndex((item) => item.id === stage);
              const sessionOpinions = opinions.filter((opinion) => opinion.sessionId === session.id);
              const selectedOpinions = sessionOpinions.filter((opinion) => opinion.selected);
              const resultActions = session.resultActions;
              const confirmed = resultActions.length > 0;

              const setStage = (next: CanStage) => onUpdateSession({ ...session, stage: next });

              const togglePart = (part: TeamPart) => {
                const has = session.parts.includes(part);
                const nextParts = has
                  ? session.parts.filter((item) => item !== part)
                  : [...session.parts, part];
                onUpdateSession({ ...session, parts: nextParts });
              };

              const submitOpinion = () => {
                if (!draft.content.trim()) return;
                onAddOpinion({
                  sessionId: session.id,
                  part: currentUser.part,
                  step: draft.step,
                  content: draft.content.trim(),
                  author: draft.author,
                  authorName: draft.author === '실명' ? currentUser.name : '',
                });
                setDraft({ ...draft, content: '' });
              };

              const actionDraftOf = (id: string) => actionDrafts[id] ?? { owner: '미정', due: 'D-7' };
              const setActionDraft = (id: string, patch: Partial<{ owner: string; due: string }>) => {
                setActionDrafts((prev) => ({ ...prev, [id]: { ...actionDraftOf(id), ...patch } }));
              };
              const confirmResult = () => {
                const actions: ActionItem[] = selectedOpinions.map((opinion) => {
                  const draftAction = actionDraftOf(opinion.id);
                  return {
                    title: opinion.content,
                    owner: draftAction.owner.trim() || '미정',
                    due: draftAction.due.trim() || 'D-7',
                    status: '대기',
                  };
                });
                onConfirmResult(session.id, aiSummary ?? session.resultSummary, actions);
              };

              // AI 취합 (자리표시): 선정 의견을 3-Step 템플릿으로 정리. 실제 LLM 연동은 예정.
              const runAiAggregate = () => {
                const grouped = CAN_STEPS
                  .map((step) => {
                    const items = selectedOpinions.filter((opinion) => opinion.step === step.id);
                    if (items.length === 0) return null;
                    return `[${step.label}]\n` + items.map((opinion) => `· ${opinion.content}`).join('\n');
                  })
                  .filter(Boolean)
                  .join('\n\n');
                setAiSummary(grouped || '선정된 의견이 없습니다.');
              };

              const waitingCard = (title: string, desc: string) => (
                <div className="panel can-waiting">
                  <Clock size={26} />
                  <strong>{title}</strong>
                  <p>{desc}</p>
                  <div className="can-topic-preview">
                    <span className="can-badge">안건</span>
                    {session.topic || '(안건 미정)'}
                  </div>
                </div>
              );

              const partColumns = () => (
                <div className="can-part-columns">
                  {session.parts.map((part) => {
                    const partOpinions = sessionOpinions.filter((opinion) => opinion.part === part);
                    return (
                      <div className="can-part-column" key={part}>
                        <h3>
                          {part} <span>{partOpinions.length}</span>
                        </h3>
                        {partOpinions.length === 0 && <p className="can-empty">해당 의견 없음</p>}
                        {partOpinions.map((opinion) => (
                          <article className="can-opinion" key={opinion.id}>
                            <div className="can-opinion-top">
                              <span className="can-badge">{stepLabelOf(opinion.step)}</span>
                              <small>{authorLabel(opinion)}</small>
                            </div>
                            <p>{opinion.content}</p>
                          </article>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );

              const confirmedActions = () => (
                <div className="can-action-result">
                  {resultActions.map((action, index) => (
                    <div className="action-row" key={`${action.title}-${index}`}>
                      <CheckCircle2 size={18} />
                      <div>
                        <strong>{action.title}</strong>
                        <span>
                          {action.owner} · {action.due}
                        </span>
                      </div>
                      <em>{action.status}</em>
                    </div>
                  ))}
                  <p className="can-hint">대시보드 액션아이템 목록에 반영되었습니다.</p>
                </div>
              );

              return (
                <>
                  <div className="can-detail-bar">
                    <button className="can-back" onClick={() => onSelectSession(null)}>
                      <ChevronLeft size={16} />
                      세션 목록
                    </button>
                    <span className="can-badge">{session.teamName || '팀 미정'}</span>
                    <strong className="can-detail-topic">{session.topic || '새 캔미팅'}</strong>
                  </div>

                  <ol className="can-stepper">
                    {stageFlow.map((item, index) => (
                      <li key={item.id}>
                        <div
                          className={`can-step ${index === stageIndex ? 'active' : ''} ${
                            index < stageIndex ? 'done' : ''
                          }`}
                        >
                          <span>{index + 1}</span>
                          <strong>{item.label}</strong>
                        </div>
                      </li>
                    ))}
                  </ol>

                  {/* 진행자 뷰 */}
                  {isHost && stage === 'setup' && (
                    <div className="panel form-panel">
                      <PanelHeader icon={FileText} title="① 세션 준비 (진행자)" />
                      <p className="can-hint">
                        캔미팅 결과 정리용 템플릿 헤더를 입력합니다. (팀장 Talk로 조직 목표·현황 공유 후 진행)
                      </p>
                      <div className="can-header-grid">
                        <label>
                          팀명
                          <input
                            value={session.teamName}
                            placeholder="예: 혁신 Tribe"
                            onChange={(event) => onUpdateSession({ ...session, teamName: event.target.value })}
                          />
                        </label>
                        <label>
                          시행일시
                          <input
                            type="datetime-local"
                            value={session.heldAt}
                            onChange={(event) => onUpdateSession({ ...session, heldAt: event.target.value })}
                          />
                        </label>
                        <label>
                          방법
                          <div className="segmented">
                            {canMethods.map((method) => (
                              <button
                                key={method}
                                className={session.method === method ? 'selected' : ''}
                                onClick={() => onUpdateSession({ ...session, method })}
                              >
                                {method}
                              </button>
                            ))}
                          </div>
                        </label>
                      </div>
                      <label>
                        주제 (Being AX 장애요인 · 실천방안)
                        <textarea
                          value={session.topic}
                          placeholder="예) 팀 목표-개인 목표 간 Alignment 저해 요인 도출"
                          onChange={(event) => onUpdateSession({ ...session, topic: event.target.value })}
                        />
                      </label>
                      <label>
                        참여 파트
                        <div className="can-part-picker">
                          {allParts.map((part) => (
                            <button
                              key={part}
                              className={session.parts.includes(part) ? 'selected' : ''}
                              onClick={() => togglePart(part)}
                            >
                              {part}
                            </button>
                          ))}
                        </div>
                      </label>
                      <div className="can-meta">3-Step 진행 · Speak-out → Ideation → Quick-win</div>
                      <button
                        className="primary-button wide"
                        disabled={!session.topic.trim() || session.parts.length === 0}
                        onClick={() => setStage('collect')}
                      >
                        의견 수집 시작
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  )}

                  {isHost && stage === 'collect' && (
                    <div className="panel">
                      <PanelHeader icon={UsersRound} title={`② 수집 현황 (진행자) · 총 ${sessionOpinions.length}건`} />
                      <div className="can-count-row can-count-inline">
                        {session.parts.map((part) => (
                          <div className="can-count-chip" key={part}>
                            <strong>{part}</strong>
                            <span>{sessionOpinions.filter((opinion) => opinion.part === part).length}건</span>
                          </div>
                        ))}
                      </div>
                      {partColumns()}
                      <button className="primary-button wide" onClick={() => setStage('share')}>
                        수집 마감하고 공유
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  )}

                  {isHost && stage === 'share' && (
                    <div className="panel">
                      <PanelHeader icon={Share2} title="③ 파트별 의견 공유 (진행자)" />
                      {partColumns()}
                      <button className="primary-button wide" onClick={() => setStage('select')}>
                        선정 시작
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  )}

                  {isHost && stage === 'select' && (
                    <div className="panel">
                      <PanelHeader icon={ListChecks} title={`④ 진행자 선정 · ${selectedOpinions.length}건 선택됨`} />
                      <p className="can-hint">종합 의견에 포함할 핵심 의견을 진행자가 선정합니다.</p>
                      <div className="can-select-list">
                        {sessionOpinions.map((opinion) => (
                          <button
                            key={opinion.id}
                            className={`can-select-item ${opinion.selected ? 'picked' : ''}`}
                            onClick={() => onToggleOpinion(opinion.id)}
                          >
                            <span className="can-check">{opinion.selected ? '✓' : ''}</span>
                            <span className="can-select-body">
                              <span className="can-opinion-top">
                                <span className="can-badge">{stepLabelOf(opinion.step)}</span>
                                <span className="can-badge subtle">{opinion.part}</span>
                                <small>{authorLabel(opinion)}</small>
                              </span>
                              <span>{opinion.content}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                      <button
                        className="primary-button wide"
                        disabled={selectedOpinions.length === 0}
                        onClick={() => setStage('summary')}
                      >
                        결과 정리
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  )}

                  {isHost && stage === 'summary' && (
                    <div className="panel">
                      <PanelHeader icon={Sparkles} title="⑤ 캔미팅 결과 (진행자)" />
                      <div className="can-summary-head">
                        <strong>{session.topic}</strong>
                        <small>선정 {selectedOpinions.length}건 · 자동 취합</small>
                        {confirmed && (
                          <span className="can-confirmed-tag">
                            <CheckCircle2 size={14} />
                            결과 확정됨
                          </span>
                        )}
                      </div>

                      {selectedOpinions.length === 0 ? (
                        <p className="can-empty">선정된 의견이 없습니다. 선정 단계에서 핵심 의견을 골라주세요.</p>
                      ) : (
                        <>
                          <h4 className="can-result-title">
                            <Sparkles size={16} />
                            종합 의견 (AI 취합)
                          </h4>
                          {confirmed ? (
                            <pre className="can-ai-result">{session.resultSummary}</pre>
                          ) : (
                            <div className="can-ai">
                              <div className="can-ai-head">
                                <button className="ghost-button" onClick={runAiAggregate}>
                                  <Sparkles size={16} />
                                  AI로 취합·정리
                                </button>
                                <span className="can-ai-note">* 실제 LLM 연동 예정 — 현재는 자리표시(로컬 취합)</span>
                              </div>
                              {aiSummary ? (
                                <pre className="can-ai-result">{aiSummary}</pre>
                              ) : (
                                <p className="can-empty">‘AI로 취합·정리’를 누르면 선정 의견이 파트별로 종합됩니다.</p>
                              )}
                            </div>
                          )}

                          <h4 className="can-result-title">
                            <ClipboardCheck size={16} />
                            액션아이템
                          </h4>

                          {confirmed ? (
                            confirmedActions()
                          ) : (
                            <>
                              <div className="can-action-editor">
                                {selectedOpinions.map((opinion) => {
                                  const draftAction = actionDraftOf(opinion.id);
                                  return (
                                    <div className="can-action-draft" key={opinion.id}>
                                      <p>{opinion.content}</p>
                                      <div className="can-action-fields">
                                        <label>
                                          담당
                                          <input
                                            value={draftAction.owner === '미정' ? '' : draftAction.owner}
                                            placeholder="담당자"
                                            onChange={(event) =>
                                              setActionDraft(opinion.id, { owner: event.target.value })
                                            }
                                          />
                                        </label>
                                        <label>
                                          기한
                                          <input
                                            value={draftAction.due}
                                            placeholder="D-7"
                                            onChange={(event) =>
                                              setActionDraft(opinion.id, { due: event.target.value })
                                            }
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <button className="primary-button wide" onClick={confirmResult}>
                                결과 확정
                                <ArrowRight size={18} />
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* 참여자 뷰 */}
                  {!isHost && stage === 'setup' &&
                    waitingCard('진행자가 세션을 준비하고 있어요', '곧 의견 수집이 시작됩니다.')}

                  {!isHost && stage === 'collect' && (
                    <div className="can-two">
                      <div className="panel form-panel">
                        <PanelHeader icon={Send} title="② 의견 제출" />
                        <label>
                          Step
                          <div className="can-step-picker">
                            {CAN_STEPS.map((item) => (
                              <button
                                key={item.id}
                                className={draft.step === item.id ? 'selected' : ''}
                                onClick={() => setDraft({ ...draft, step: item.id })}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </label>
                        <p className="can-step-hint">{CAN_STEPS.find((s) => s.id === draft.step)?.hint}</p>
                        <label>
                          제출 방식
                          <div className="segmented">
                            {(['익명', '실명'] as Identity[]).map((item) => (
                              <button
                                key={item}
                                className={draft.author === item ? 'selected' : ''}
                                onClick={() => setDraft({ ...draft, author: item })}
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                        </label>
                        {draft.author === '실명' && (
                          <label>
                            이름
                            <input value={currentUser.name} disabled />
                          </label>
                        )}
                        <label>
                          내용
                          <textarea
                            value={draft.content}
                            placeholder="안건에 대한 의견을 자유롭게 남겨주세요"
                            onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                          />
                        </label>
                        <button
                          className="primary-button wide"
                          disabled={!draft.content.trim()}
                          onClick={submitOpinion}
                        >
                          의견 제출
                        </button>
                      </div>

                      <div className="panel">
                        <PanelHeader icon={UsersRound} title={`${currentUser.part} 의견`} />
                        <div className="can-part-column bare">
                          {sessionOpinions.filter((opinion) => opinion.part === currentUser.part).length === 0 && (
                            <p className="can-empty">아직 제출된 의견이 없어요. 첫 의견을 남겨보세요.</p>
                          )}
                          {sessionOpinions
                            .filter((opinion) => opinion.part === currentUser.part)
                            .map((opinion) => (
                              <article className="can-opinion" key={opinion.id}>
                                <div className="can-opinion-top">
                                  <span className="can-badge">{stepLabelOf(opinion.step)}</span>
                                  <small>{authorLabel(opinion)}</small>
                                </div>
                                <p>{opinion.content}</p>
                              </article>
                            ))}
                        </div>
                        <p className="can-hint">진행자가 수집을 마감하면 의견 공유로 넘어갑니다.</p>
                      </div>
                    </div>
                  )}

                  {!isHost && stage === 'share' && (
                    <div className="panel">
                      <PanelHeader icon={Share2} title="③ 파트별 의견 공유" />
                      {partColumns()}
                      <p className="can-hint">진행자가 핵심 의견을 선정하면 결과로 이어집니다.</p>
                    </div>
                  )}

                  {!isHost && stage === 'select' &&
                    waitingCard('진행자가 핵심 의견을 선정하고 있어요', '잠시 후 종합 결과가 공유됩니다.')}

                  {!isHost && stage === 'summary' && (
                    <div className="panel">
                      <PanelHeader icon={Sparkles} title="⑤ 캔미팅 결과" />
                      {confirmed ? (
                        <>
                          <div className="can-summary-head">
                            <strong>{session.topic}</strong>
                            <small>선정 {selectedOpinions.length}건</small>
                            <span className="can-confirmed-tag">
                              <CheckCircle2 size={14} />
                              확정됨
                            </span>
                          </div>
                          <h4 className="can-result-title">
                            <Sparkles size={16} />
                            종합 의견 (AI 취합)
                          </h4>
                          <pre className="can-ai-result">{session.resultSummary}</pre>
                          <h4 className="can-result-title">
                            <ClipboardCheck size={16} />
                            액션아이템
                          </h4>
                          {confirmedActions()}
                        </>
                      ) : (
                        waitingCard('진행자가 결과를 정리하고 있어요', '종합 의견과 액션아이템이 곧 공유됩니다.')
                      )}
                    </div>
                  )}
                </>
              );
            })()}
        </div>
      )}

      {tab === 'tea' && (
        <section className="panel">
          <PanelHeader icon={Coffee} title="티미팅" />
          <div className="category-cloud">
            {teaMeetingCategories.map((item) => (
              <button key={item}>{item}</button>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
