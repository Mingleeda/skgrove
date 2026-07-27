import {
  BarChart3,
  CheckCircle2,
  Coffee,
  FileCheck2,
  Inbox,
  MessageSquarePlus,
  ShieldCheck,
  Sparkles,
  UserRound,
  Vote,
} from 'lucide-react';
import { PanelHeader } from '../../components/PanelHeader';
import { profiles } from '../../data/mockData';
import type { ActionItem, Agenda, CurrentUser, Section } from '../../types';

type DashboardProps = {
  openIssueCount: number;
  passedAgendaCount: number;
  agendas: Agenda[];
  currentUser: CurrentUser;
  actionItems: ActionItem[];
  onSectionChange: (section: Section) => void;
};

export function Dashboard({
  openIssueCount,
  passedAgendaCount,
  agendas,
  currentUser,
  actionItems,
  onSectionChange,
}: DashboardProps) {
  const votingAgendas = agendas.filter((agenda) => agenda.status === '투표중');
  const stats = [
    { label: '접수 의견', value: openIssueCount, icon: Inbox, tone: 'mint' },
    { label: '투표 안건', value: votingAgendas.length, icon: Vote, tone: 'violet' },
    { label: '통과 안건', value: passedAgendaCount, icon: CheckCircle2, tone: 'blue' },
    { label: '진행 액션', value: actionItems.length, icon: FileCheck2, tone: 'amber' },
  ];
  const activeAgendas = votingAgendas.slice(0, 2);
  const featuredProfiles = profiles.slice(0, 3);

  return (
    <section className="screen">
      <div className="home-hero">
        <div>
          <p className="eyebrow">오늘의 팀문화 허브</p>
          <h2>{currentUser.name}님, 말하기 어려운 이야기도 바꾸고 싶은 문화도 여기서 시작해요</h2>
          <p className="hero-copy">
            의견은 리더에게 안전하게 전달되고, 필요한 주제는 안건과 익명 투표를 거쳐 액션아이템으로 이어집니다.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => onSectionChange('intake')}>
              <ShieldCheck size={18} />
              익명으로 말하기
            </button>
            <button className="secondary-button" onClick={() => onSectionChange('intake')}>
              <MessageSquarePlus size={18} />
              실명으로 제안하기
            </button>
          </div>
        </div>
        <div className="home-signal" aria-label="culture flow">
          <strong>접수</strong>
          <span>리더 검토</span>
          <span>익명 투표</span>
          <strong>액션</strong>
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

      <div className="home-grid">
        <section className="panel agenda-panel">
          <PanelHeader icon={Vote} title="진행 중인 안건 투표" />
          <div className="home-agenda-list">
            {activeAgendas.map((agenda) => {
              const total = agenda.approve + agenda.reject || 1;
              const approveRate = Math.round((agenda.approve / total) * 100);
              return (
                <button className="home-agenda-card" key={agenda.id} onClick={() => onSectionChange('agenda')}>
                  <div>
                    <strong>{agenda.title}</strong>
                    <span>{agenda.source}</span>
                  </div>
                  <div className="vote-bar">
                    <span style={{ width: `${approveRate}%` }} />
                  </div>
                  <small>찬성 {approveRate}% · 투표하기</small>
                </button>
              );
            })}
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

        <section className="panel">
          <PanelHeader icon={Coffee} title="오늘의 팀 연결" />
          <div className="quick-card-list">
            <button onClick={() => onSectionChange('connect')}>
              <Coffee size={19} />
              <div>
                <strong>파트 섞기 커피챗</strong>
                <span>이번 주 랜덤 매칭을 시작해요</span>
              </div>
            </button>
            <button onClick={() => onSectionChange('meetings')}>
              <Sparkles size={19} />
              <div>
                <strong>다음 티미팅 주제</strong>
                <span>자발 제안 채널에서 안건을 받아요</span>
              </div>
            </button>
          </div>
        </section>

        <section className="panel">
          <PanelHeader icon={UserRound} title="동료 성향 카드" />
          <div className="compact-profile-list">
            {featuredProfiles.map((profile) => (
              <button key={profile.name} onClick={() => onSectionChange('profiles')}>
                <span className={`tiny-avatar ${profile.color}`}>{profile.name.slice(0, 1)}</span>
                <div>
                  <strong>{profile.name}</strong>
                  <small>{profile.trait}</small>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="panel culture-summary">
        <PanelHeader icon={BarChart3} title="팀 문화 요약" />
        <div className="summary-strip">
          <button onClick={() => onSectionChange('leader')}>
            리더 답변 대기<strong>6</strong>
          </button>
          <button onClick={() => onSectionChange('agenda')}>
            투표 참여율<strong>74%</strong>
          </button>
          <button onClick={() => onSectionChange('metrics')}>
            평균 파트지수<strong>82</strong>
          </button>
          <button onClick={() => onSectionChange('memory')}>
            이번 달 팀 추억<strong>9</strong>
          </button>
        </div>
      </section>
    </section>
  );
}
