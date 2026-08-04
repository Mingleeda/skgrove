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
import { participationRate } from '../../agendaRules';
import { Avatar } from '../../components/Avatar';
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
  // 카드마다 목적지가 다르다. 전부 안건함으로 보내면 라벨과 결과가 어긋난다.
  const stats: Array<{ label: string; value: number; icon: typeof Inbox; tone: string; target: Section }> = [
    { label: '접수 의견', value: openIssueCount, icon: Inbox, tone: 'mint', target: 'intake' },
    { label: '투표 안건', value: votingAgendas.length, icon: Vote, tone: 'violet', target: 'agenda' },
    { label: '통과 안건', value: passedAgendaCount, icon: CheckCircle2, tone: 'blue', target: 'agenda' },
    // '진행 액션'이므로 완료된 것은 빼야 한다. 전체 개수를 세면 아무것도 안 해도 숫자가 유지된다.
    {
      label: '진행 액션',
      value: actionItems.filter((item) => item.status !== '완료').length,
      icon: FileCheck2,
      tone: 'amber',
      target: 'actions',
    },
  ];

  // 투표 참여율: 대상 인원이 잡힌 안건들의 평균. 근거가 없으면 숫자를 만들지 않는다.
  const ratedAgendas = agendas.filter((agenda) => agenda.eligibleCount > 0);
  const averageParticipation =
    ratedAgendas.length > 0
      ? Math.round(ratedAgendas.reduce((sum, agenda) => sum + participationRate(agenda), 0) / ratedAgendas.length)
      : null;
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
            <button className={`stat-card ${stat.tone}`} key={stat.label} onClick={() => onSectionChange(stat.target)}>
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
            {activeAgendas.length === 0 && (
              <p className="field-note">
                지금 투표 중인 안건이 없어요. 접수된 의견이 안건이 되면 여기에서 바로 투표할 수 있습니다.
              </p>
            )}
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
            {/* 홈은 요약 화면이다. 전체 목록은 액션아이템 화면이 담당한다. */}
            {actionItems.slice(0, 4).map((item) => (
              <div className="action-row" key={item.id}>
                <CheckCircle2 size={18} />
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {item.owner} · {item.due || '목표일 미정'}
                  </span>
                </div>
                <em>{item.status}</em>
              </div>
            ))}
            {actionItems.length > 4 && (
              <button className="secondary-button wide" onClick={() => onSectionChange('actions')}>
                액션아이템 {actionItems.length}건 전체 보기
              </button>
            )}
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
                <Avatar name={profile.name} color={profile.color} />
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
        {/* 실제 집계로 계산할 수 있는 값만 숫자로 보여준다.
            근거 없는 숫자가 한 칸이라도 섞이면 옆의 진짜 숫자까지 못 믿게 된다. */}
        <div className="summary-strip">
          <button onClick={() => onSectionChange('leader')}>
            리더 처리 대기<strong>{openIssueCount}</strong>
          </button>
          <button onClick={() => onSectionChange('agenda')}>
            투표 참여율<strong>{averageParticipation === null ? '집계 전' : `${averageParticipation}%`}</strong>
          </button>
          <button onClick={() => onSectionChange('metrics')}>
            파트지수 리포트<strong>보기</strong>
          </button>
          <button onClick={() => onSectionChange('memory')}>
            팀 추억<strong>보기</strong>
          </button>
        </div>
      </section>
    </section>
  );
}
