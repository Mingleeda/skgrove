import { Coffee, UsersRound } from 'lucide-react';
import { PanelHeader } from '../../components/PanelHeader';

const canMeetingSteps = ['세션 생성', '의견 제출', '카테고리 정리', '안건 전환', '액션 연결'];
const teaMeetingCategories = ['필요성', '회의문화', '파트섞기', '자발 제안', '결과 메모', '액션 연결'];

export function Meetings() {
  return (
    <section className="screen two-column">
      <section className="panel">
        <PanelHeader icon={UsersRound} title="캔미팅" />
        <div className="meeting-lane">
          {canMeetingSteps.map((item, index) => (
            <div className="step" key={item}>
              <span>{index + 1}</span>
              <strong>{item}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <PanelHeader icon={Coffee} title="티미팅" />
        <div className="category-cloud">
          {teaMeetingCategories.map((item) => (
            <button key={item}>{item}</button>
          ))}
        </div>
      </section>
    </section>
  );
}
