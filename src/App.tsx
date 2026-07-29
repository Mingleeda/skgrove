import { useEffect, useState } from 'react';
import { loadAccounts, makeAccountId, saveAccounts, seedAccounts } from './accountStore';
import { isLeader, isTeamLeader, teamParts } from './auth';
import { loadCanSteps, saveCanSteps } from './canStepsStore';
import type { CanStepConfig } from './canConfig';
import { AppShell } from './components/AppShell';
import {
  initialActionItems,
  initialAgendas,
  initialCanOpinions,
  initialCanSessions,
  initialIssues,
  initialMatches,
  matchCandidates,
} from './data/mockData';
import { AgendaBoard } from './features/agenda/AgendaBoard';
import { AccountManagement } from './features/auth/AccountManagement';
import { LoginScreen } from './features/auth/LoginScreen';
import { Connect } from './features/connect/Connect';
import { Dashboard } from './features/dashboard/Dashboard';
import { Intake } from './features/intake/Intake';
import { LeaderInbox } from './features/leader/LeaderInbox';
import { Meetings } from './features/meetings/Meetings';
import { Memory } from './features/memory/Memory';
import { Metrics } from './features/metrics/Metrics';
import { Profiles } from './features/profiles/Profiles';
import { loadIssues, makeIssueId, saveIssues } from './issueStore';
import type {
  ActionItem,
  Agenda,
  CanFollowRoute,
  CanOpinion,
  CanSession,
  CurrentUser,
  Identity,
  Issue,
  ManagedAccount,
  Section,
} from './types';

export function App() {
  const [accounts, setAccounts] = useState<ManagedAccount[]>(seedAccounts);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [active, setActive] = useState<Section>('dashboard');
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [agendas, setAgendas] = useState<Agenda[]>(initialAgendas);
  const [identity, setIdentity] = useState<Identity>('익명');
  const [matched, setMatched] = useState(initialMatches);
  const [canSessions, setCanSessions] = useState<CanSession[]>(initialCanSessions);
  const [canOpinions, setCanOpinions] = useState<CanOpinion[]>(initialCanOpinions);
  const [selectedCanId, setSelectedCanId] = useState<string | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>(initialActionItems);
  const [canSteps, setCanSteps] = useState<CanStepConfig[]>(loadCanSteps);

  const passedAgendaCount = agendas.filter((agenda) => agenda.status === '통과').length;
  const openIssueCount = issues.filter((issue) => issue.status !== '종료').length;

  useEffect(() => {
    let isMounted = true;

    loadAccounts().then((loadedAccounts) => {
      if (isMounted) {
        setAccounts(loadedAccounts);
      }
    });
    loadIssues().then((loadedIssues) => {
      if (isMounted) {
        setIssues(loadedIssues);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const submitIssue = (issue: Omit<Issue, 'id' | 'status'>) => {
    const next: Issue = {
      id: makeIssueId(),
      ...issue,
      status: '접수',
    };
    const nextIssues = [next, ...issues];
    setIssues(nextIssues);
    void saveIssues(nextIssues);
    return next;
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
    const nextIssues: Issue[] = issues.map((item) => (item.id === issue.id ? { ...item, status: '안건화' } : item));
    setIssues(nextIssues);
    void saveIssues(nextIssues);
    setActive('agenda');
  };

  const updateIssue = (updatedIssue: Issue) => {
    const nextIssues = issues.map((issue) => (issue.id === updatedIssue.id ? updatedIssue : issue));
    setIssues(nextIssues);
    void saveIssues(nextIssues);
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

  const startCanSession = () => {
    const id = `CAN-S-${canSessions.length + 1}`;
    const draft: CanSession = {
      id,
      topic: '',
      teamName: '',
      heldAt: new Date().toISOString().slice(0, 10),
      method: '오프라인',
      parts: [...teamParts],
      stage: 'setup',
      resultSummary: '',
      followUp: null,
    };
    setCanSessions((prev) => [draft, ...prev]);
    setSelectedCanId(id);
  };

  const updateCanSession = (session: CanSession) => {
    setCanSessions((prev) => prev.map((item) => (item.id === session.id ? session : item)));
  };

  const addCanOpinion = (opinion: Omit<CanOpinion, 'id' | 'selected'>) => {
    setCanOpinions((prev) => [
      ...prev,
      { ...opinion, id: `CAN-${String(prev.length + 1).padStart(2, '0')}`, selected: false },
    ]);
  };

  const toggleCanOpinion = (id: string) => {
    setCanOpinions((prev) =>
      prev.map((opinion) => (opinion.id === id ? { ...opinion, selected: !opinion.selected } : opinion)),
    );
  };

  const updateCanSteps = (steps: CanStepConfig[]) => {
    setCanSteps(steps);
    saveCanSteps(steps);
  };

  const confirmCanResult = (sessionId: string, summary: string) => {
    if (!summary.trim()) return;
    setCanSessions((prev) =>
      prev.map((session) => (session.id === sessionId ? { ...session, resultSummary: summary } : session)),
    );
  };

  // 캔미팅 결과 후속 조치: 선택 항목을 안건함/액션아이템으로 반영 + 세션에 적용 기록
  const applyCanFollowUp = (
    sessionId: string,
    data: {
      sessionTopic: string;
      agendaTitles: string[];
      actions: ActionItem[];
      routes: Record<string, CanFollowRoute>;
      actionMeta: Record<string, { owner: string; due: string }>;
    },
  ) => {
    if (canSessions.find((session) => session.id === sessionId)?.followUp) return; // 이미 적용됨 → 중복 방지
    const { sessionTopic, agendaTitles, actions, routes, actionMeta } = data;
    if (agendaTitles.length === 0 && actions.length === 0) return;
    if (agendaTitles.length > 0) {
      const newAgendas: Agenda[] = agendaTitles.map((title) => ({
        title,
        source: `캔미팅 · ${sessionTopic}`,
        approve: 0,
        reject: 0,
        status: '투표중',
      }));
      setAgendas((prev) => [...newAgendas, ...prev]);
    }
    if (actions.length > 0) {
      setActionItems((prev) => [...actions, ...prev]);
    }
    setCanSessions((prev) =>
      prev.map((session) => (session.id === sessionId ? { ...session, followUp: { routes, actionMeta } } : session)),
    );
  };

  const persistAccounts = (nextAccounts: ManagedAccount[]) => {
    setAccounts(nextAccounts);
    void saveAccounts(nextAccounts);
  };

  const registerAccount = (account: Omit<ManagedAccount, 'id' | 'joinedAt' | 'status'>) => {
    persistAccounts([
      ...accounts,
      {
        ...account,
        id: makeAccountId(),
        status: '승인 대기',
        joinedAt: new Date().toISOString().slice(0, 10),
      },
    ]);
  };

  const changeSection = (section: Section) => {
    if (section === 'leader' && currentUser && !isLeader(currentUser)) {
      setActive('dashboard');
      return;
    }
    if (section === 'accounts' && currentUser && !isTeamLeader(currentUser)) {
      setActive('dashboard');
      return;
    }
    setActive(section);
  };

  const handleLogin = (user: CurrentUser) => {
    setActive('dashboard');
    setSelectedCanId(null);
    setCurrentUser(user);
  };

  if (!currentUser) {
    return <LoginScreen accounts={accounts} onLogin={handleLogin} onRegister={registerAccount} />;
  }

  return (
    <AppShell active={active} currentUser={currentUser} onLogout={() => setCurrentUser(null)} onSectionChange={changeSection}>
      {active === 'dashboard' && (
        <Dashboard
          openIssueCount={openIssueCount}
          passedAgendaCount={passedAgendaCount}
          currentUser={currentUser}
          actionItems={actionItems}
          onSectionChange={changeSection}
        />
      )}
      {active === 'intake' && (
        <Intake identity={identity} onIdentityChange={setIdentity} onSubmitIssue={submitIssue} />
      )}
      {active === 'leader' && isLeader(currentUser) && (
        <LeaderInbox issues={issues} onIssueUpdate={updateIssue} onPromoteToAgenda={promoteToAgenda} />
      )}
      {active === 'agenda' && <AgendaBoard agendas={agendas} onVote={vote} />}
      {active === 'meetings' && (
        <Meetings
          sessions={canSessions}
          opinions={canOpinions}
          selectedId={selectedCanId}
          currentUser={currentUser}
          canSteps={canSteps}
          onSelectSession={setSelectedCanId}
          onStartSession={startCanSession}
          onUpdateSession={updateCanSession}
          onAddOpinion={addCanOpinion}
          onToggleOpinion={toggleCanOpinion}
          onConfirmResult={confirmCanResult}
          onApplyFollowUp={applyCanFollowUp}
          onCanStepsChange={updateCanSteps}
        />
      )}
      {active === 'profiles' && <Profiles currentUser={currentUser} />}
      {active === 'connect' && <Connect matched={matched} onShuffleTeams={shuffleTeams} />}
      {active === 'memory' && <Memory currentUser={currentUser} />}
      {active === 'metrics' && <Metrics />}
      {active === 'accounts' && isTeamLeader(currentUser) && <AccountManagement accounts={accounts} onAccountsChange={persistAccounts} />}
    </AppShell>
  );
}
