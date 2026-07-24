import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Coffee,
  FileCheck2,
  Flag,
  HeartHandshake,
  Home,
  Inbox,
  Megaphone,
  MessageSquarePlus,
  Shuffle,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  UsersRound,
  Vote,
} from 'lucide-react';
import './styles.css';

type Section =
  | 'dashboard'
  | 'intake'
  | 'leader'
  | 'agenda'
  | 'meetings'
  | 'profiles'
  | 'connect'
  | 'memory'
  | 'metrics';

type Issue = {
  id: string;
  title: string;
  category: string;
  author: '익명' | '실명';
  target: string;
  status: string;
  urgency: '낮음' | '보통' | '높음';
};

type Agenda = {
  title: string;
  source: string;
  approve: number;
  reject: number;
  status: '투표중' | '통과' | '부결';
};

const sections: Array<{ id: Section; label: string; icon: React.ElementType; owner: string }> = [
  { id: 'dashboard', label: '홈', icon: Home, owner: '공통' },
  { id: 'intake', label: '대나무숲 접수', icon: MessageSquarePlus, owner: '이선민' },
  { id: 'leader', label: '리더 관리함', icon: Inbox, owner: '김승현' },
  { id: 'agenda', label: '안건함 / 투표', icon: Vote, owner: '이상협' },
  { id: 'meetings', label: '캔미팅 / 티미팅', icon: CalendarDays, owner: '김승현 · 이상협' },
  { id: 'profiles', label: '동료 성향', icon: UserRound, owner: '김수정' },
  { id: 'connect', label: '커피뽑기 / 조뽑기', icon: Shuffle, owner: '김수정' },
  { id: 'memory', label: '팀 추억', icon: Sparkles, owner: '김수정' },
  { id: 'metrics', label: '파트지수 / 리포트', icon: BarChart3, owner: '김수정' },
];

const initialIssues: Issue[] = [
  {
    id: 'SOOP-142',
    title: '팀 티미팅 시간이 길어져 집중 업무 시간이 끊겨요',
    category: '회의문화',
    author: '익명',
    target: '팀장',
    status: '접수',
    urgency: '높음',
  },
  {
    id: 'SOOP-141',
    title: '파트 간 업무 맥락을 공유하는 짧은 자리가 있으면 좋겠어요',
    category: '협업',
    author: '실명',
    target: '파트장',
    status: '검토중',
    urgency: '보통',
  },
  {
    id: 'SOOP-139',
    title: '캔미팅 결과가 액션아이템으로 이어지는 과정이 잘 안 보여요',
    category: '캔미팅',
    author: '익명',
    target: '리더',
    status: '안건화',
    urgency: '보통',
  },
];

const initialAgendas: Agenda[] = [
  {
    title: '팀 티미팅 간소화',
    source: '대나무숲 SOOP-142',
    approve: 18,
    reject: 5,
    status: '투표중',
  },
  {
    title: '월 1회 파트 섞기 커피챗 운영',
    source: '티미팅 제안',
    approve: 21,
    reject: 3,
    status: '통과',
  },
  {
    title: '회의 없는 금요일 오후 시범 운영',
    source: '캔미팅',
    approve: 12,
    reject: 13,
    status: '부결',
  },
];

const actionItems = [
  { title: '티미팅 아젠다 3개 제한안 작성', owner: '이상협', due: 'D-3', status: '진행중' },
  { title: '캔미팅 의견 제출 양식 배포', owner: '김승현', due: 'D-5', status: '대기' },
  { title: '파트 섞기 커피챗 1차 매칭', owner: '김수정', due: 'D-7', status: '완료' },
];

const profiles = [
  { name: '이선민', part: '플랫폼', trait: 'Careful Sprout', style: '결정 전 맥락을 충분히 봄', color: 'green' },
  { name: '김승현', part: '경험', trait: 'Swift Ember', style: '이슈를 빠르게 쪼개고 실행함', color: 'red' },
  { name: '이상협', part: '운영', trait: 'Calm Wave', style: '합의 기준과 프로세스를 선호함', color: 'blue' },
  { name: '김수정', part: '문화', trait: 'Bright Orbit', style: '사람 사이 연결과 분위기를 잘 봄', color: 'yellow' },
];

function App() {
  const [active, setActive] = useState<Section>('dashboard');
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [agendas, setAgendas] = useState<Agenda[]>(initialAgendas);
  const [identity, setIdentity] = useState<'익명' | '실명'>('익명');
  const [matched, setMatched] = useState(['김수정 · 이선민', '김승현 · 이상협', '플랫폼 · 문화 · 경험']);

  const currentSection = sections.find((section) => section.id === active) ?? sections[0];

  const passedAgendaCount = agendas.filter((agenda) => agenda.status === '통과').length;
  const openIssueCount = issues.filter((issue) => issue.status !== '완료').length;

  const submitIssue = () => {
    const next: Issue = {
      id: `SOOP-${143 + issues.length}`,
      title: identity === '익명' ? '익명으로 접수된 새 문화 개선 의견' : '실명으로 접수된 새 문화 개선 의견',
      category: '팀문화',
      author: identity,
      target: '팀장',
      status: '접수',
      urgency: '보통',
    };
    setIssues([next, ...issues]);
    setActive('leader');
  };

  const promoteToAgenda = (issue: Issue) => {
    setAgendas([
      {
        title: issue.title,
        source: `대나무숲 ${issue.id}`,
        approve: 0,
        reject: 0,
        status: '투표중',
      },
      ...agendas,
    ]);
    setIssues(issues.map((item) => (item.id === issue.id ? { ...item, status: '안건화' } : item)));
    setActive('agenda');
  };

  const vote = (index: number, type: 'approve' | 'reject') => {
    setAgendas(
      agendas.map((agenda, agendaIndex) => {
        if (agendaIndex !== index || agenda.status !== '투표중') return agenda;
        const next = { ...agenda, [type]: agenda[type] + 1 };
        const total = next.approve + next.reject;
        return total >= 10 && next.approve > total / 2 ? { ...next, status: '통과' } : next;
      }),
    );
  };

  const shuffleTeams = () => {
    const candidates = ['이선민 · 김수정', '김승현 · 김수정', '이상협 · 이선민', '경험 · 운영 · 문화'];
    setMatched(candidates.sort(() => Math.random() - 0.5).slice(0, 3));
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <HeartHandshake size={24} />
          </div>
          <div>
            <strong>SK Grove</strong>
            <span>Team Culture Hub</span>
          </div>
        </div>

        <nav className="nav">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                className={active === section.id ? 'nav-item active' : 'nav-item'}
                key={section.id}
                onClick={() => setActive(section.id)}
                title={`${section.label} · ${section.owner}`}
              >
                <Icon size={18} />
                <span>{section.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="owner-box">
          <span>현재 화면</span>
          <strong>{currentSection.owner}</strong>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">대나무숲 기반 팀문화 개선</p>
            <h1>{currentSection.label}</h1>
          </div>
          <div className="top-actions">
            <button className="icon-button" title="알림">
              <Bell size={19} />
            </button>
            <button className="primary-button" onClick={() => setActive('intake')}>
              <MessageSquarePlus size={18} />
              의견 접수
            </button>
          </div>
        </header>

        {active === 'dashboard' && (
          <Dashboard openIssueCount={openIssueCount} passedAgendaCount={passedAgendaCount} setActive={setActive} />
        )}
        {active === 'intake' && (
          <Intake identity={identity} setIdentity={setIdentity} submitIssue={submitIssue} />
        )}
        {active === 'leader' && <Leader issues={issues} promoteToAgenda={promoteToAgenda} />}
        {active === 'agenda' && <AgendaBoard agendas={agendas} vote={vote} />}
        {active === 'meetings' && <Meetings />}
        {active === 'profiles' && <Profiles />}
        {active === 'connect' && <Connect matched={matched} shuffleTeams={shuffleTeams} />}
        {active === 'memory' && <Memory />}
        {active === 'metrics' && <Metrics />}
      </main>
    </div>
  );
}

function Dashboard({
  openIssueCount,
  passedAgendaCount,
  setActive,
}: {
  openIssueCount: number;
  passedAgendaCount: number;
  setActive: (section: Section) => void;
}) {
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
            <button className={`stat-card ${stat.tone}`} key={stat.label} onClick={() => setActive('agenda')}>
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
              <button key={section.id} onClick={() => setActive(section.id)}>
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

function Intake({
  identity,
  setIdentity,
  submitIssue,
}: {
  identity: '익명' | '실명';
  setIdentity: (identity: '익명' | '실명') => void;
  submitIssue: () => void;
}) {
  return (
    <section className="screen form-screen">
      <div className="panel form-panel">
        <PanelHeader icon={MessageSquarePlus} title="의견 접수" />
        <div className="segmented">
          {(['익명', '실명'] as const).map((item) => (
            <button className={identity === item ? 'selected' : ''} onClick={() => setIdentity(item)} key={item}>
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
        <button className="primary-button wide" onClick={submitIssue}>
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

function Leader({ issues, promoteToAgenda }: { issues: Issue[]; promoteToAgenda: (issue: Issue) => void }) {
  return (
    <section className="screen">
      <div className="toolbar">
        <button className="filter active">전체</button>
        <button className="filter">접수</button>
        <button className="filter">검토중</button>
        <button className="filter">안건화</button>
      </div>
      <div className="issue-list">
        {issues.map((issue) => (
          <article className="issue-card" key={issue.id}>
            <div className="issue-main">
              <span className={`priority ${issue.urgency}`}>{issue.urgency}</span>
              <h2>{issue.title}</h2>
              <p>
                {issue.id} · {issue.category} · {issue.author} · {issue.target}
              </p>
            </div>
            <div className="issue-actions">
              <span className="status-pill">{issue.status}</span>
              <button className="secondary-button" onClick={() => promoteToAgenda(issue)}>
                <Vote size={17} />
                안건화
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AgendaBoard({ agendas, vote }: { agendas: Agenda[]; vote: (index: number, type: 'approve' | 'reject') => void }) {
  return (
    <section className="screen">
      <div className="agenda-grid">
        {agendas.map((agenda, index) => {
          const total = agenda.approve + agenda.reject || 1;
          const approveRate = Math.round((agenda.approve / total) * 100);
          return (
            <article className="agenda-card" key={`${agenda.title}-${index}`}>
              <div className="agenda-top">
                <span className={`status-dot ${agenda.status}`}>{agenda.status}</span>
                <small>{agenda.source}</small>
              </div>
              <h2>{agenda.title}</h2>
              <div className="vote-bar">
                <span style={{ width: `${approveRate}%` }} />
              </div>
              <div className="vote-counts">
                <span>찬성 {agenda.approve}</span>
                <span>반대 {agenda.reject}</span>
              </div>
              {agenda.status === '통과' ? (
                <div className="passed-box">
                  <FileCheck2 size={18} />
                  액션아이템 생성 대상
                </div>
              ) : (
                <div className="vote-actions">
                  <button onClick={() => vote(index, 'approve')}>
                    <ThumbsUp size={17} />
                    찬성
                  </button>
                  <button onClick={() => vote(index, 'reject')}>
                    <ThumbsDown size={17} />
                    반대
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Meetings() {
  return (
    <section className="screen two-column">
      <section className="panel">
        <PanelHeader icon={UsersRound} title="캔미팅" />
        <div className="meeting-lane">
          {['세션 생성', '의견 제출', '카테고리 정리', '안건 전환', '액션 연결'].map((item, index) => (
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
          {['필요성', '회의문화', '파트섞기', '자발 제안', '결과 메모', '액션 연결'].map((item) => (
            <button key={item}>{item}</button>
          ))}
        </div>
      </section>
    </section>
  );
}

function Profiles() {
  return (
    <section className="screen">
      <div className="profile-grid">
        {profiles.map((profile) => (
          <article className={`profile-card ${profile.color}`} key={profile.name}>
            <div className="avatar">{profile.name.slice(0, 1)}</div>
            <h2>{profile.name}</h2>
            <span>{profile.part}</span>
            <strong>{profile.trait}</strong>
            <p>{profile.style}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Connect({ matched, shuffleTeams }: { matched: string[]; shuffleTeams: () => void }) {
  return (
    <section className="screen">
      <div className="panel">
        <PanelHeader icon={Shuffle} title="커피뽑기 / 조뽑기" />
        <div className="draw-board">
          <div className="draw-controls">
            <button className="primary-button" onClick={shuffleTeams}>
              <Shuffle size={18} />
              다시 뽑기
            </button>
            <button className="secondary-button">
              <UsersRound size={18} />
              파트 섞기
            </button>
          </div>
          <div className="match-list">
            {matched.map((match) => (
              <div className="match-card" key={match}>
                <Coffee size={22} />
                <strong>{match}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Memory() {
  return (
    <section className="screen">
      <div className="memory-grid">
        {['캔미팅 워크샵', '상반기 회고', '랜덤 커피챗', '파트 데모데이'].map((item, index) => (
          <article className="memory-card" key={item}>
            <div className={`photo-block photo-${index + 1}`} />
            <h2>{item}</h2>
            <span>댓글 {index + 2} · 반응 {index + 8}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function Metrics() {
  const parts = [
    { name: '문화파트', score: 92, meetings: 6 },
    { name: '플랫폼파트', score: 84, meetings: 8 },
    { name: '경험파트', score: 78, meetings: 11 },
    { name: '운영파트', score: 73, meetings: 13 },
  ];

  return (
    <section className="screen two-column">
      <section className="panel">
        <PanelHeader icon={BarChart3} title="파트지수" />
        <div className="score-list">
          {parts.map((part) => (
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
          <div>의견 접수<strong>31</strong></div>
          <div>안건 통과<strong>8</strong></div>
          <div>액션 완료<strong>12</strong></div>
          <div>팀 연결<strong>46</strong></div>
        </div>
      </section>
    </section>
  );
}

function PanelHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="panel-header">
      <Icon size={20} />
      <h2>{title}</h2>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
