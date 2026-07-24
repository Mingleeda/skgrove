import { Megaphone, MessageSquarePlus } from 'lucide-react';
import { PanelHeader } from '../../components/PanelHeader';
import type { Identity } from '../../types';

type IntakeProps = {
  identity: Identity;
  onIdentityChange: (identity: Identity) => void;
  onSubmitIssue: () => void;
};

export function Intake({ identity, onIdentityChange, onSubmitIssue }: IntakeProps) {
  return (
    <section className="screen form-screen">
      <div className="panel form-panel">
        <PanelHeader icon={MessageSquarePlus} title="의견 접수" />
        <div className="segmented">
          {(['익명', '실명'] as const).map((item) => (
            <button className={identity === item ? 'selected' : ''} onClick={() => onIdentityChange(item)} key={item}>
              {item}
            </button>
          ))}
        </div>
        <label>
          제목
          <input defaultValue="팀 티미팅 시간을 줄이고 싶어요" />
        </label>
        <label>
          전달 대상
          <select defaultValue="팀장">
            <option>팀장</option>
            <option>파트장</option>
            <option>리더 전체</option>
          </select>
        </label>
        <label>
          카테고리
          <select defaultValue="회의문화">
            <option>회의문화</option>
            <option>협업</option>
            <option>갈등</option>
            <option>캔미팅</option>
            <option>티미팅</option>
          </select>
        </label>
        <label>
          내용
          <textarea defaultValue="논의할 주제가 명확하지 않은 회의는 시간을 줄이고, 필요한 경우 안건함에서 먼저 투표하면 좋겠습니다." />
        </label>
        <button className="primary-button wide" onClick={onSubmitIssue}>
          <Megaphone size={18} />
          접수하기
        </button>
      </div>

      <div className="privacy-visual">
        <div className="privacy-node hidden">익명 보호</div>
        <div className="privacy-line" />
        <div className="privacy-node visible">리더 접수</div>
        <div className="privacy-line" />
        <div className="privacy-node action">안건화</div>
      </div>
    </section>
  );
}
