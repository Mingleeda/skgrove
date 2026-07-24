import { CheckCircle2, ChevronRight, FileCheck2, Flag, Inbox, Vote } from 'lucide-react';
import { PanelHeader } from '../../components/PanelHeader';
import { actionItems } from '../../data/mockData';
import { sections } from '../../navigation';
import type { Section } from '../../types';

type DashboardProps = {
  openIssueCount: number;
  passedAgendaCount: number;
  onSectionChange: (section: Section) => void;
};

export function Dashboard({ openIssueCount, passedAgendaCount, onSectionChange }: DashboardProps) {
  const stats = [
    { label: '접수 의견', value: openIssueCount, icon: Inbox, tone: 'mint' },
    { label: '투표 안건', value: 4, icon: Vote, tone: 'violet' },
    { label: '통과 안건', value: passedAgendaCount, icon: CheckCircle2, tone: 'blue' },
    { label: '진행 액션', value: 5, icon: FileCheck2, tone: 'amber' },
  ];

  return (
    <section className="screen">
      <div className="hero-panel">
        <div>
          <p className="eyebrow">오늘의 팀 신호</p>
          <h2>의견이 안건이 되고, 안건이 액션으로 이어지는 흐름</h2>
        </div>
        <div className="signal-map" aria-label="culture flow">
          <span>접수</span>
          <ChevronRight size={18} />
          <span>리더 검토</span>
          <ChevronRight size={18} />
          <span>익명 투표</span>
          <ChevronRight size={18} />
          <span>액션아이템</span>
        </div>
      </div>

      <div className="stat-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <button className={`stat-card ${stat.tone}`} key={stat.label} onClick={() => onSectionChange('agenda')}>
              <Icon size={22} />
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </button>
          );
        })}
      </div>

      <div className="two-column">
        <section className="panel">
          <PanelHeader icon={Flag} title="2주 개발 에픽" />
          <div className="epic-list">
            {sections.slice(1).map((section) => (
              <button key={section.id} onClick={() => onSectionChange(section.id)}>
                <span>{section.label}</span>
                <small>{section.owner}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <PanelHeader icon={FileCheck2} title="액션아이템" />
          <div className="action-list">
            {actionItems.map((item) => (
              <div className="action-row" key={item.title}>
                <CheckCircle2 size={18} />
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {item.owner} · {item.due}
                  </span>
                </div>
                <em>{item.status}</em>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
