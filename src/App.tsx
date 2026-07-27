import { useEffect, useState } from 'react';
import { loadAccounts, makeAccountId, saveAccounts, seedAccounts } from './accountStore';
import { loadActionItems, makeActionItemId, saveActionItems } from './actionItemStore';
import { finalStatus, isOpen, liveStatus, settleAgendas } from './agendaRules';
import { loadAgendas, makeAgendaId, saveAgendas } from './agendaStore';
import { hasVoted, loadBallots, makeVoterKey, saveBallots } from './ballotStore';
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
import { ActionBoard } from './features/actions/ActionBoard';
import { ActionCreateForm } from './features/actions/ActionCreateForm';
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
  AgendaBallot,
  CanFollowRoute,
  CanOpinion,
  CanSession,
  CurrentUser,
  Identity,
  Issue,
  ManagedAccount,
  Section,
  VoteChoice,
} from './types';

const today = () => new Date().toISOString().slice(0, 10);

// 대나무숲/캔미팅에서 자동 생성된 안건의 기본 투표 기간(7일).
// 사람이 마감일을 정할 기회가 없는 경로라 기한 없이 방치되는 것을 막는다.
const DEFAULT_VOTING_DAYS = 7;
const defaultDeadline = () =>
  new Date(Date.now() + DEFAULT_VOTING_DAYS * 86400000).toISOString().slice(0, 10);

export function App() {
  const [accounts, setAccounts] = useState<ManagedAccount[]>(seedAccounts);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [active, setActive] = useState<Section>('dashboard');
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [agendas, setAgendas] = useState<Agenda[]>(initialAgendas);
  const [ballots, setBallots] = useState<AgendaBallot[]>([]);
  const [identity, setIdentity] = useState<Identity>('익명');
  const [matched, setMatched] = useState(initialMatches);
  const [canSessions, setCanSessions] = useState<CanSession[]>(initialCanSessions);
  const [canOpinions, setCanOpinions] = useState<CanOpinion[]>(initialCanOpinions);
  const [selectedCanId, setSelectedCanId] = useState<string | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>(initialActionItems);
  const [canSteps, setCanSteps] = useState<CanStepConfig[]>(loadCanSteps);

  const [votedAgendaIds, setVotedAgendaIds] = useState<string[]>([]);
  const [agendaForActions, setAgendaForActions] = useState<Agenda | null>(null);

  const actionCountByAgenda = actionItems.reduce<Record<string, number>>((acc, item) => {
    if (item.sourceKind === '안건' && item.sourceId) {
      acc[item.sourceId] = (acc[item.sourceId] ?? 0) + 1;
    }
    return acc;
  }, {});

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
    loadAgendas().then((loadedAgendas) => {
      if (!isMounted) return;
      // 서버 배치가 없으므로 마감일 경과와 조기 확정을 열어보는 시점에 함께 반영한다.
      const settled = settleAgendas(loadedAgendas, today());
      setAgendas(settled);
      if (settled !== loadedAgendas) void saveAgendas(settled);
    });
    loadBallots().then((loadedBallots) => {
      if (isMounted) {
        setBallots(loadedBallots);
      }
    });
    loadActionItems().then((loadedItems) => {
      if (isMounted) {
        setActionItems(loadedItems);
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

  // voterKey는 해시라 비동기다. 화면마다 계산하지 않도록 여기서 한 번 풀어 내려보낸다.
  useEffect(() => {
    if (!currentUser) {
      setVotedAgendaIds([]);
      return;
    }

    let isMounted = true;

    Promise.all(
      agendas.map(async (agenda) => {
        const voterKey = await makeVoterKey(currentUser.email, agenda.id);
        return hasVoted(ballots, agenda.id, voterKey) ? agenda.id : null;
      }),
    ).then((ids) => {
      if (isMounted) {
        setVotedAgendaIds(ids.filter((id): id is string => id !== null));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [agendas, ballots, currentUser]);

  const persistAgendas = (nextAgendas: Agenda[]) => {
    setAgendas(nextAgendas);
    void saveAgendas(nextAgendas);
  };

  // 투표 대상 인원. 파트 한정 안건은 해당 파트 + 전체 소속(팀리더)만 센다.
  const eligibleCountFor = (part: Agenda['part']) =>
    accounts.filter(
      (account) => account.status === '활성' && (part === '전체' || account.part === part || account.part === '전체'),
    ).length;

  // 안건 직접 등록(안건함 화면). 익명이면 작성자 이름은 저장하지 않는다.
  const createAgenda = (
    draft: Pick<Agenda, 'title' | 'description' | 'category' | 'part' | 'author' | 'deadline'>,
  ) => {
    const next: Agenda = {
      ...draft,
      id: makeAgendaId(),
      source: '직접 등록',
      authorName: draft.author === '실명' ? (currentUser?.name ?? '') : '',
      approve: 0,
      reject: 0,
      status: '투표중',
      createdAt: today(),
      eligibleCount: eligibleCountFor(draft.part),
      closedAt: '',
    };
    persistAgendas([next, ...agendas]);
    return next;
  };

  const promoteToAgenda = (issue: Issue) => {
    // 접수자가 '리더만 보기'로 낸 의견은 공개 안건이 될 수 없다.
    // 화면에서도 막지만, 호출 경로가 늘어나도 약속이 깨지지 않도록 여기서 한 번 더 막는다.
    if (issue.visibility !== '안건 후보로 공개 가능') return;

    persistAgendas([
      {
        id: makeAgendaId(),
        title: issue.title,
        // 접수자가 쓴 본문이 안건의 배경 설명이 된다.
        // 본문이 없을 때만 리더 답변으로 대체한다.
        description: [issue.body, issue.expectedChange].filter(Boolean).join('\n\n') || issue.leaderReply || '',
        category: issue.category,
        source: `대나무숲 ${issue.id}`,
        part: '전체',
        author: issue.author,
        authorName: '',
        approve: 0,
        reject: 0,
        status: '투표중',
        createdAt: today(),
        eligibleCount: eligibleCountFor('전체'),
        deadline: defaultDeadline(),
        closedAt: '',
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

  // 목록에 필터/정렬이 붙어도 안전하도록 index가 아닌 id로 대상을 찾는다.
  //
  // 투표는 두 갈래로 기록된다.
  //  - 선택(찬성/반대)은 안건의 카운터에만 더한다. 누가 골랐는지는 남기지 않는다.
  //  - "이 사람이 투표했다"는 사실만 투표용지에 남긴다. 무엇을 골랐는지는 담지 않는다.
  // 두 기록이 만나지 않으므로 중복은 막으면서 선택은 익명으로 남는다.
  const vote = async (id: string, type: VoteChoice) => {
    if (!currentUser) return;

    const target = agendas.find((agenda) => agenda.id === id);
    if (!target || !isOpen(target)) return;

    const voterKey = await makeVoterKey(currentUser.email, id);
    if (hasVoted(ballots, id, voterKey)) return;

    persistAgendas(
      agendas.map((agenda) => {
        if (agenda.id !== id) return agenda;
        const next = { ...agenda, [type]: agenda[type] + 1 };
        const status = liveStatus(next);
        // 조기 확정된 경우에만 마감 처리한다. 아직 뒤집힐 수 있으면 열어둔다.
        return status === '투표중' ? next : { ...next, status, closedAt: today() };
      }),
    );

    const nextBallots = [...ballots, { agendaId: id, voterKey, createdAt: today() }];
    setBallots(nextBallots);
    void saveBallots(nextBallots);
  };

  // 마감: 참여 수와 무관하게 과반 여부로 최종 상태를 확정한다.
  const closeAgenda = (id: string) => {
    persistAgendas(
      agendas.map((agenda) =>
        agenda.id === id && isOpen(agenda)
          ? { ...agenda, status: finalStatus(agenda), closedAt: today() }
          : agenda,
      ),
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
        id: makeAgendaId(),
        title,
        description: '',
        category: '회의문화',
        source: `캔미팅 · ${sessionTopic}`,
        part: '전체',
        author: '익명',
        authorName: '',
        approve: 0,
        reject: 0,
        status: '투표중',
        createdAt: today(),
        eligibleCount: eligibleCountFor('전체'),
        deadline: defaultDeadline(),
        closedAt: '',
      }));
      persistAgendas([...newAgendas, ...agendas]);
    }
    if (actions.length > 0) {
      persistActionItems([...actions, ...actionItems]);
    }
    setCanSessions((prev) =>
      prev.map((session) => (session.id === sessionId ? { ...session, followUp: { routes, actionMeta } } : session)),
    );
  };

  const persistActionItems = (nextItems: ActionItem[]) => {
    setActionItems(nextItems);
    void saveActionItems(nextItems);
  };

  // SKSOOP-53: 통과된 안건에서 액션아이템을 만든다.
  // 캔미팅 경로(applyCanFollowUp)와 같은 목록에 합류하되 출처로 구분된다.
  const createActionItemsFromAgenda = (agenda: Agenda, drafts: Array<Pick<ActionItem, 'title' | 'owner' | 'due'>>) => {
    const usable = drafts.filter((draft) => draft.title.trim());
    if (usable.length === 0) return;

    const created: ActionItem[] = usable.map((draft) => ({
      id: makeActionItemId(),
      title: draft.title.trim(),
      owner: draft.owner.trim() || '미정',
      due: draft.due,
      status: '대기',
      sourceKind: '안건',
      sourceId: agenda.id,
      sourceLabel: agenda.title,
      createdAt: today(),
      outcome: '',
      reviewReason: '',
    }));

    persistActionItems([...created, ...actionItems]);
    setActive('actions');
  };

  const updateActionItem = (updated: ActionItem) => {
    persistActionItems(actionItems.map((item) => (item.id === updated.id ? updated : item)));
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
          agendas={agendas}
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
      {active === 'agenda' && !agendaForActions && (
        <AgendaBoard
          agendas={agendas}
          currentUser={currentUser}
          votedAgendaIds={votedAgendaIds}
          canClose={isLeader(currentUser)}
          today={today()}
          onVote={vote}
          onCloseAgenda={closeAgenda}
          onCreateAgenda={createAgenda}
          actionCountByAgenda={actionCountByAgenda}
          onCreateActions={setAgendaForActions}
        />
      )}
      {active === 'agenda' && agendaForActions && (
        <section className="screen">
          <ActionCreateForm
            agenda={agendaForActions}
            accounts={accounts}
            today={today()}
            onCreate={(agenda, drafts) => {
              createActionItemsFromAgenda(agenda, drafts);
              setAgendaForActions(null);
            }}
            onCancel={() => setAgendaForActions(null)}
          />
        </section>
      )}
      {active === 'actions' && (
        <ActionBoard
          items={actionItems}
          accounts={accounts}
          currentUser={currentUser}
          today={today()}
          onUpdate={updateActionItem}
        />
      )}
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
      {active === 'memory' && <Memory />}
      {active === 'metrics' && <Metrics />}
      {active === 'accounts' && isTeamLeader(currentUser) && <AccountManagement accounts={accounts} onAccountsChange={persistAccounts} />}
    </AppShell>
  );
}
