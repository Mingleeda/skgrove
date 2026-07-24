import { useState } from 'react';
import { isLeader } from './auth';
import { AppShell } from './components/AppShell';
import { initialAgendas, initialIssues, initialMatches, matchCandidates } from './data/mockData';
import { AgendaBoard } from './features/agenda/AgendaBoard';
import { LoginScreen } from './features/auth/LoginScreen';
import { Connect } from './features/connect/Connect';
import { Dashboard } from './features/dashboard/Dashboard';
import { Intake } from './features/intake/Intake';
import { LeaderInbox } from './features/leader/LeaderInbox';
import { Meetings } from './features/meetings/Meetings';
import { Memory } from './features/memory/Memory';
import { Metrics } from './features/metrics/Metrics';
import { Profiles } from './features/profiles/Profiles';
import type { Agenda, CurrentUser, Identity, Issue, Section } from './types';

export function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [active, setActive] = useState<Section>('dashboard');
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [agendas, setAgendas] = useState<Agenda[]>(initialAgendas);
  const [identity, setIdentity] = useState<Identity>('익명');
  const [matched, setMatched] = useState(initialMatches);

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
    setMatched([...matchCandidates].sort(() => Math.random() - 0.5).slice(0, 3));
  };

  const changeSection = (section: Section) => {
    if (section === 'leader' && currentUser && !isLeader(currentUser)) {
      setActive('dashboard');
      return;
    }
    setActive(section);
  };

  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  return (
    <AppShell active={active} currentUser={currentUser} onLogout={() => setCurrentUser(null)} onSectionChange={changeSection}>
      {active === 'dashboard' && (
        <Dashboard
          openIssueCount={openIssueCount}
          passedAgendaCount={passedAgendaCount}
          currentUser={currentUser}
          onSectionChange={changeSection}
        />
      )}
      {active === 'intake' && (
        <Intake identity={identity} onIdentityChange={setIdentity} onSubmitIssue={submitIssue} />
      )}
      {active === 'leader' && isLeader(currentUser) && <LeaderInbox issues={issues} onPromoteToAgenda={promoteToAgenda} />}
      {active === 'agenda' && <AgendaBoard agendas={agendas} onVote={vote} />}
      {active === 'meetings' && <Meetings />}
      {active === 'profiles' && <Profiles />}
      {active === 'connect' && <Connect matched={matched} onShuffleTeams={shuffleTeams} />}
      {active === 'memory' && <Memory />}
      {active === 'metrics' && <Metrics />}
    </AppShell>
  );
}
