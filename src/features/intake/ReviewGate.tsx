import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, PenLine, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { reviewIntake, type ReviewField, type ReviewFinding } from '../../intakeReview';

// 검토 입력을 객체로 받지 않는다. 매 렌더마다 새 객체가 되어 재검토가 무한히 돈다.
//
// 제안을 자동 반영하는 버튼은 두지 않는다. 실제로 돌려보니 모델이 문제 표현만
// 바꾸는 게 아니라 항목 전체를 다시 써서, 대상(누가)과 사안(무슨 일)이 통째로
// 사라지고 입력에 없던 주제가 들어왔다. 고치는 것은 작성자가 한다.
type ReviewGateProps = {
  title: string;
  body: string;
  expectedChange: string;
  onEditManually: () => void;
  onReadyChange: (ready: boolean) => void;
};

type GateState =
  | { phase: 'checking' }
  | { phase: 'clear' }
  | { phase: 'blocked'; findings: ReviewFinding[] }
  | { phase: 'unavailable' };

const FIELD_LABEL: Record<ReviewField, string> = {
  title: '제목',
  body: '내용',
  expectedChange: '기대 변화',
};

export function ReviewGate({
  title,
  body,
  expectedChange,
  onEditManually,
  onReadyChange,
}: ReviewGateProps) {
  const [state, setState] = useState<GateState>({ phase: 'checking' });

  // 의존성은 원시값 셋이다. 값이 실제로 바뀔 때만 다시 검토한다.
  const runReview = useCallback(async () => {
    setState({ phase: 'checking' });
    const result = await reviewIntake({ title, body, expectedChange });

    // 엔드포인트 미설정은 "기능 없음"이지 "검사 실패"가 아니다. 조용히 통과시킨다.
    if (!result.ok) {
      setState({ phase: result.reason === 'disabled' ? 'clear' : 'unavailable' });
      return;
    }

    const findings = result.findings ?? [];
    setState(findings.length > 0 ? { phase: 'blocked', findings } : { phase: 'clear' });
  }, [title, body, expectedChange]);

  useEffect(() => {
    void runReview();
  }, [runReview]);

  // 제출 가능 여부를 부모에게 알린다. 지적이 남아 있는 동안에만 잠근다.
  useEffect(() => {
    onReadyChange(state.phase === 'clear' || state.phase === 'unavailable');
  }, [state.phase, onReadyChange]);

  if (state.phase === 'checking') {
    return (
      <div className="review-gate checking">
        <Sparkles size={18} />
        <p>내용을 검토하고 있어요. 잠시만 기다려주세요.</p>
      </div>
    );
  }

  if (state.phase === 'unavailable') {
    return (
      <div className="review-gate unavailable">
        <AlertTriangle size={18} />
        <div>
          <strong>AI 검토를 받지 못한 상태로 접수됩니다</strong>
          <span>특정인을 향한 표현이 없는지 직접 확인해주세요.</span>
        </div>
        <button className="secondary-button" onClick={() => void runReview()}>
          <RefreshCw size={16} />
          다시 검토
        </button>
      </div>
    );
  }

  if (state.phase === 'clear') {
    return (
      <div className="review-gate clear">
        <ShieldCheck size={18} />
        <p>검토를 마쳤어요. 이대로 접수할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="review-gate blocked">
      <div className="review-gate-head">
        <AlertTriangle size={18} />
        <strong>다듬어야 접수할 수 있어요</strong>
      </div>

      {state.findings.map((finding, index) => (
        <article className="review-finding" key={`${finding.field}-${index}`}>
          <span className={`review-kind ${finding.kind}`}>
            {finding.kind === 'profanity' ? '욕설' : '인신공격'} · {FIELD_LABEL[finding.field]}
          </span>
          {finding.reason && <p className="review-reason">{finding.reason}</p>}
          {/* 참고 예시일 뿐이다. 그대로 쓰라는 뜻이 아니라는 걸 라벨로 분명히 한다. */}
          <p className="review-suggestion-label">이렇게 바꿔볼 수 있어요</p>
          <p className="review-rewritten">{finding.rewritten}</p>
        </article>
      ))}

      <div className="review-gate-foot">
        <button className="primary-button" onClick={onEditManually}>
          <PenLine size={16} />
          내용 고치러 가기
        </button>
        {/* 앱이 받지 못하는 말도 사람은 받을 수 있어야 한다. 막다른 길을 만들지 않는다. */}
        <p className="field-note">
          이 내용이 꼭 그대로 전달되어야 하는 사안이라면, 리더에게 1on1을 요청해주세요. 접수 화면 대신 직접 이야기하는
          편이 나은 일도 있습니다.
        </p>
      </div>
    </div>
  );
}
