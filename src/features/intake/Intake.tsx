import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  FileText,
  Megaphone,
  MessageSquarePlus,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { PanelHeader } from '../../components/PanelHeader';
import type { Identity, Issue, Urgency } from '../../types';

type IntakeProps = {
  identity: Identity;
  onIdentityChange: (identity: Identity) => void;
  onSubmitIssue: (issue: Omit<Issue, 'id' | 'status'>) => Issue;
};

type IntakeStep = 'scope' | 'content' | 'review' | 'complete';
type Visibility = '리더만 보기' | '안건 후보로 공개 가능';
type Target = '팀리더' | '파트리더' | '리더 전체';

const categories = ['회의문화', '협업', '업무방식', '갈등', '성장/피드백', '복지/분위기', '기타'];
const steps: Array<{ id: IntakeStep; label: string }> = [
  { id: 'scope', label: '방식 선택' },
  { id: 'content', label: '내용 작성' },
  { id: 'review', label: '제출 확인' },
  { id: 'complete', label: '접수 완료' },
];

const mySubmissions = [
  { id: 'SOOP-142', title: '팀 티미팅 시간이 길어져 집중 업무 시간이 끊겨요', status: '리더 검토', date: '오늘' },
  { id: 'SOOP-139', title: '캔미팅 결과가 액션아이템으로 이어지는 과정이 잘 안 보여요', status: '안건화', date: '어제' },
];

export function Intake({ identity, onIdentityChange, onSubmitIssue }: IntakeProps) {
  const [step, setStep] = useState<IntakeStep>('scope');
  const [target, setTarget] = useState<Target>('팀리더');
  const [visibility, setVisibility] = useState<Visibility>('리더만 보기');
  const [category, setCategory] = useState(categories[0]);
  const [urgency, setUrgency] = useState<Urgency>('보통');
  const [title, setTitle] = useState('팀 티미팅 시간을 줄이고 싶어요');
  const [body, setBody] = useState('논의할 주제가 명확하지 않은 회의는 시간을 줄이고, 필요한 경우 안건함에서 먼저 투표하면 좋겠습니다.');
  const [expectedChange, setExpectedChange] = useState('회의 전 안건을 먼저 모으고, 꼭 필요한 주제만 짧게 논의하면 좋겠습니다.');
  const [receiptId, setReceiptId] = useState('SOOP-148');
  const [submissions, setSubmissions] = useState(mySubmissions);

  const currentStepIndex = steps.findIndex((item) => item.id === step);

  const submit = () => {
    const createdIssue = onSubmitIssue({
      title,
      category,
      author: identity,
      target,
      urgency,
    });
    setReceiptId(createdIssue.id);
    setSubmissions([
      { id: createdIssue.id, title: createdIssue.title, status: '리더 검토', date: '방금' },
      ...submissions,
    ]);
    setStep('complete');
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
          <PanelHeader icon={Megaphone} title="내 접수 의견" />
          <div className="submission-list">
            {submissions.map((item) => (
              <div key={item.id}>
                <strong>{item.title}</strong>
                <span>{item.id} · {item.status} · {item.date}</span>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}
