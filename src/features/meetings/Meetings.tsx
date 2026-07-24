import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Coffee,
  Download,
  FileText,
  ListChecks,
  Plus,
  Send,
  Share2,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { isLeader, teamParts } from '../../auth';
import type { CanStepConfig } from '../../canConfig';
import { makeStepId } from '../../canStepsStore';
import { PanelHeader } from '../../components/PanelHeader';
import type {
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
  if (session.stage === 'summary' && session.resultSummary.trim().length > 0) return '완료';
  return stageFlow.find((item) => item.id === session.stage)?.label ?? '진행 중';
};

const teaMeetingCategories = ['필요성', '회의문화', '파트섞기', '자발 제안', '결과 메모', '액션 연결'];

type MeetingsProps = {
  sessions: CanSession[];
  opinions: CanOpinion[];
  selectedId: string | null;
  currentUser: CurrentUser;
  canSteps: CanStepConfig[];
  onSelectSession: (id: string | null) => void;
  onStartSession: () => void;
  onUpdateSession: (session: CanSession) => void;
  onAddOpinion: (opinion: Omit<CanOpinion, 'id' | 'selected'>) => void;
  onToggleOpinion: (id: string) => void;
  onConfirmResult: (sessionId: string, summary: string) => void;
  onCanStepsChange: (steps: CanStepConfig[]) => void;
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
  canSteps,
  onSelectSession,
  onStartSession,
  onUpdateSession,
  onAddOpinion,
  onToggleOpinion,
  onConfirmResult,
  onCanStepsChange,
}: MeetingsProps) {
  const [tab, setTab] = useState<'can' | 'tea'>('can');
  const [draft, setDraft] = useState<Draft>({
    step: '',
    author: '익명',
    content: '',
  });
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [view, setView] = useState<{ id: string; stage: CanStage } | null>(null);

  const isHost = isLeader(currentUser);
  const session = sessions.find((item) => item.id === selectedId) ?? null;

  const stepLabelOf = (id: string) => canSteps.find((step) => step.id === id)?.label ?? id;
  const activeStep = draft.step || canSteps[0]?.id || '';

  const authorLabel = (opinion: CanOpinion) =>
    opinion.author === '실명' && opinion.authorName ? opinion.authorName : '익명';

  const patchStep = (id: string, patch: Partial<CanStepConfig>) =>
    onCanStepsChange(canSteps.map((step) => (step.id === id ? { ...step, ...patch } : step)));
  const addStep = () =>
    onCanStepsChange([...canSteps, { id: makeStepId(), label: `Step ${canSteps.length + 1} · 새 단계`, hint: '' }]);
  const removeStep = (id: string) => onCanStepsChange(canSteps.filter((step) => step.id !== id));
  const moveStep = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= canSteps.length) return;
    const next = [...canSteps];
    [next[index], next[target]] = [next[target], next[index]];
    onCanStepsChange(next);
  };

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
                  const done = item.stage === 'summary' && item.resultSummary.trim().length > 0;
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
              const liveStage = session.stage;
              const currentIndex = stageFlow.findIndex((item) => item.id === liveStage);
              // 조회 중 단계: 지나간 단계를 눌러 열람(읽기전용). 없으면 실제 진행 단계.
              const stage = view && view.id === session.id ? view.stage : liveStage;
              const stageIndex = stageFlow.findIndex((item) => item.id === stage);
              const isLive = stage === liveStage;
              const sessionOpinions = opinions.filter((opinion) => opinion.sessionId === session.id);
              const selectedOpinions = sessionOpinions.filter((opinion) => opinion.selected);
              const confirmed = session.resultSummary.trim().length > 0;

              const setStage = (next: CanStage) => {
                onUpdateSession({ ...session, stage: next });
                setView(null);
              };
              const viewStage = (target: CanStage) => setView({ id: session.id, stage: target });

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
                  step: activeStep,
                  content: draft.content.trim(),
                  author: draft.author,
                  authorName: draft.author === '실명' ? currentUser.name : '',
                });
                setDraft({ ...draft, content: '' });
              };

              const confirmResult = () => {
                onConfirmResult(session.id, aiSummary ?? session.resultSummary);
              };

              // 선정 의견을 단계별로 묶은 구조 (템플릿·PPT 공통 소스)
              const stepGroups = canSteps
                .map((step) => ({
                  step,
                  items: selectedOpinions.filter((opinion) => opinion.step === step.id),
                }))
                .filter((group) => group.items.length > 0);
              // 참석자: 실명 제출자에서 자동 도출
              const participants =
                Array.from(
                  new Set(
                    sessionOpinions
                      .filter((opinion) => opinion.author === '실명' && opinion.authorName)
                      .map((opinion) => opinion.authorName),
                  ),
                ).join(', ') || '—';

              // AI 취합 (자리표시): 선정 의견을 3-Step 템플릿으로 정리. 실제 LLM 연동은 예정.
              const runAiAggregate = () => {
                const grouped = stepGroups
                  .map((group) => `[${group.step.label}]\n` + group.items.map((o) => `· ${o.content}`).join('\n'))
                  .join('\n\n');
                setAiSummary(grouped || '선정된 의견이 없습니다.');
              };

              const resultTemplate = () => (
                <div className="can-template">
                  <div className="can-template-title">Can Meeting 결과 정리</div>
                  <table className="can-template-head">
                    <tbody>
                      <tr>
                        <th>팀명</th>
                        <td>{session.teamName || '—'}</td>
                        <th>참석자</th>
                        <td>{participants}</td>
                      </tr>
                      <tr>
                        <th>시행일시</th>
                        <td>{session.heldAt || '—'}</td>
                        <th>방법</th>
                        <td>{session.method}</td>
                      </tr>
                      <tr>
                        <th>주제</th>
                        <td colSpan={3}>{session.topic || '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                  <table className="can-template-steps">
                    <tbody>
                      {stepGroups.map((group) => (
                        <tr key={group.step.id}>
                          <th>{group.step.label}</th>
                          <td>
                            <ul>
                              {group.items.map((opinion) => (
                                <li key={opinion.id}>{opinion.content}</li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );

              const exportPptx = async () => {
                const pptxgen = (await import('pptxgenjs')).default;
                const pptx = new pptxgen();
                const slide = pptx.addSlide();
                const head = (text: string) => ({
                  text,
                  options: { bold: true, fill: { color: 'EFF3EC' }, color: '17352F', valign: 'middle' as const },
                });
                const body = (text: string) => ({ text, options: { valign: 'top' as const } });
                const border = { type: 'solid' as const, color: 'D5DED6', pt: 1 };

                slide.addText('Can Meeting 결과 정리', {
                  x: 0.4,
                  y: 0.3,
                  fontSize: 20,
                  bold: true,
                  color: '2F5597',
                });
                slide.addTable(
                  [
                    [head('팀명'), body(session.teamName || '-'), head('참석자'), body(participants)],
                    [head('시행일시'), body(session.heldAt || '-'), head('방법'), body(session.method)],
                    [head('주제'), { text: session.topic || '-', options: { colspan: 3, valign: 'middle' as const } }],
                  ],
                  { x: 0.4, y: 0.9, w: 9.2, colW: [1.5, 3.1, 1.5, 3.1], border, fontSize: 11, rowH: 0.4 },
                );
                slide.addTable(
                  stepGroups.map((group) => [
                    head(group.step.label),
                    body(group.items.map((opinion) => `• ${opinion.content}`).join('\n')),
                  ]),
                  { x: 0.4, y: 2.4, w: 9.2, colW: [2.2, 7.0], border, fontSize: 11, valign: 'top' },
                );
                await pptx.writeFile({ fileName: `캔미팅_${session.teamName || 'result'}_${session.heldAt || ''}.pptx` });
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
                    {stageFlow.map((item, index) => {
                      const viewable = index <= currentIndex;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            disabled={!viewable}
                            onClick={() => viewStage(item.id)}
                            className={`can-step ${index === stageIndex ? 'active' : ''} ${
                              index < currentIndex ? 'done' : ''
                            } ${viewable ? 'clickable' : ''}`}
                          >
                            <span>{index + 1}</span>
                            <strong>{item.label}</strong>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                  {!isLive && (
                    <div className="can-readonly-bar">
                      지나간 단계를 조회 중입니다 (읽기 전용).
                      <button className="can-back" onClick={() => setView(null)}>
                        현재 단계로
                      </button>
                    </div>
                  )}

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
                            placeholder="예: AI ITS혁신팀"
                            disabled={!isLive}
                            onChange={(event) => onUpdateSession({ ...session, teamName: event.target.value })}
                          />
                        </label>
                        <label>
                          시행일시
                          <input
                            type="date"
                            value={session.heldAt}
                            disabled={!isLive}
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
                                disabled={!isLive}
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
                          disabled={!isLive}
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
                              disabled={!isLive}
                              onClick={() => togglePart(part)}
                            >
                              {part}
                            </button>
                          ))}
                        </div>
                      </label>

                      <label>
                        캔미팅 단계 설정
                        <div className="can-step-editor">
                          <p className="can-hint can-step-editor-hint">
                            단계 이름·설명을 바꾸거나 추가/삭제/순서를 변경합니다. 모든 캔미팅에 공통 적용되며, 이미 제출된
                            의견은 유지됩니다.
                          </p>
                          {canSteps.map((step, index) => (
                            <div className="can-step-row" key={step.id}>
                              <input
                                value={step.label}
                                placeholder="단계 이름"
                                disabled={!isLive}
                                onChange={(event) => patchStep(step.id, { label: event.target.value })}
                              />
                              <input
                                value={step.hint}
                                placeholder="설명 (선택)"
                                disabled={!isLive}
                                onChange={(event) => patchStep(step.id, { hint: event.target.value })}
                              />
                              <div className="can-step-row-actions">
                                <button
                                  className="icon-button"
                                  disabled={!isLive || index === 0}
                                  onClick={() => moveStep(index, -1)}
                                >
                                  ↑
                                </button>
                                <button
                                  className="icon-button"
                                  disabled={!isLive || index === canSteps.length - 1}
                                  onClick={() => moveStep(index, 1)}
                                >
                                  ↓
                                </button>
                                <button
                                  className="secondary-button"
                                  disabled={!isLive || canSteps.length <= 1}
                                  onClick={() => removeStep(step.id)}
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          ))}
                          {isLive && (
                            <button className="secondary-button" onClick={addStep}>
                              <Plus size={16} />
                              단계 추가
                            </button>
                          )}
                        </div>
                      </label>
                      <div className="can-meta">진행 · {canSteps.map((s) => s.label.replace(/^Step \d+ · /, '')).join(' → ')}</div>
                      {isLive && (
                        <button
                          className="primary-button wide"
                          disabled={!session.topic.trim() || session.parts.length === 0}
                          onClick={() => setStage('collect')}
                        >
                          의견 수집 시작
                          <ArrowRight size={18} />
                        </button>
                      )}
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
                      {isLive && (
                        <button className="primary-button wide" onClick={() => setStage('share')}>
                          수집 마감하고 공유
                          <ArrowRight size={18} />
                        </button>
                      )}
                    </div>
                  )}

                  {isHost && stage === 'share' && (
                    <div className="panel">
                      <PanelHeader icon={Share2} title="③ 파트별 의견 공유 (진행자)" />
                      {partColumns()}
                      {isLive && (
                        <button className="primary-button wide" onClick={() => setStage('select')}>
                          선정 시작
                          <ArrowRight size={18} />
                        </button>
                      )}
                    </div>
                  )}

                  {isHost && stage === 'select' && (
                    <div className="panel">
                      <PanelHeader icon={ListChecks} title={`④ 진행자 선정 · ${selectedOpinions.length}건 선택됨`} />
                      <p className="can-hint">
                        {isLive
                          ? '종합 의견에 포함할 핵심 의견을 진행자가 선정합니다.'
                          : '지나간 선정 결과입니다 (읽기 전용).'}
                      </p>
                      <div className="can-select-list">
                        {sessionOpinions.map((opinion) => (
                          <button
                            key={opinion.id}
                            className={`can-select-item ${opinion.selected ? 'picked' : ''}`}
                            disabled={!isLive}
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
                      {isLive && (
                        <button
                          className="primary-button wide"
                          disabled={selectedOpinions.length === 0}
                          onClick={() => setStage('summary')}
                        >
                          결과 정리
                          <ArrowRight size={18} />
                        </button>
                      )}
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
                      ) : !confirmed && !aiSummary ? (
                        <div className="can-ai">
                          <div className="can-ai-head">
                            {isLive && (
                              <button className="ghost-button" onClick={runAiAggregate}>
                                <Sparkles size={16} />
                                AI로 취합·정리
                              </button>
                            )}
                            <span className="can-ai-note">* 실제 LLM 연동 예정 — 현재는 자리표시(로컬 취합)</span>
                          </div>
                          <p className="can-empty">‘AI로 취합·정리’를 누르면 결과 템플릿이 작성됩니다.</p>
                        </div>
                      ) : (
                        <>
                          {resultTemplate()}
                          <div className="can-result-actions">
                            <button className="secondary-button" onClick={exportPptx}>
                              <Download size={16} />
                              PPT로 내보내기
                            </button>
                            {!confirmed && isLive && (
                              <button className="primary-button" onClick={confirmResult}>
                                결과 확정
                                <ArrowRight size={18} />
                              </button>
                            )}
                          </div>
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
                            {canSteps.map((item) => (
                              <button
                                key={item.id}
                                className={activeStep === item.id ? 'selected' : ''}
                                disabled={!isLive}
                                onClick={() => setDraft({ ...draft, step: item.id })}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </label>
                        <p className="can-step-hint">{canSteps.find((s) => s.id === activeStep)?.hint}</p>
                        <label>
                          제출 방식
                          <div className="segmented">
                            {(['익명', '실명'] as Identity[]).map((item) => (
                              <button
                                key={item}
                                className={draft.author === item ? 'selected' : ''}
                                disabled={!isLive}
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
                            disabled={!isLive}
                            onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                          />
                        </label>
                        <button
                          className="primary-button wide"
                          disabled={!draft.content.trim() || !isLive}
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
                          {resultTemplate()}
                          <div className="can-result-actions">
                            <button className="secondary-button" onClick={exportPptx}>
                              <Download size={16} />
                              PPT로 내보내기
                            </button>
                          </div>
                        </>
                      ) : (
                        waitingCard('진행자가 결과를 정리하고 있어요', '종합 의견이 곧 공유됩니다.')
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
