import { BarChart3, CheckCircle2 } from 'lucide-react';
import { PanelHeader } from '../../components/PanelHeader';
import { partScores } from '../../data/mockData';

export function Metrics() {
  return (
    <section className="screen two-column">
      <section className="panel">
        <PanelHeader icon={BarChart3} title="파트지수" />
        <div className="score-list">
          {partScores.map((part) => (
            <div className="score-row" key={part.name}>
              <div>
                <strong>{part.name}</strong>
                <span>회의 {part.meetings}회</span>
              </div>
              <div className="score-track">
                <span style={{ width: `${part.score}%` }} />
              </div>
              <em>{part.score}</em>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <PanelHeader icon={CheckCircle2} title="문화 리포트" />
        <div className="report-grid">
          <div>
            의견 접수<strong>31</strong>
          </div>
          <div>
            안건 통과<strong>8</strong>
          </div>
          <div>
            액션 완료<strong>12</strong>
          </div>
          <div>
            팀 연결<strong>46</strong>
          </div>
        </div>
      </section>
    </section>
  );
}
