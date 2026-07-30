import { useEffect, useState } from 'react';
import { loadAccounts, makeAccountId, saveAccounts, seedAccounts } from './accountStore';
import { loadActionItems, makeActionItemId, saveActionItems } from './actionItemStore';
import { finalStatus, isOpen, liveStatus, settleAgendas } from './agendaRules';
import { loadAgendas, makeAgendaId, saveAgendas } from './agendaStore';
import { hasVoted, loadBallots, makeVoterKey, saveBallots } from './ballotStore';
import { isLeader, isTeamLeader, teamParts } from './auth';
import { loadCanSteps, saveCanSteps } from './canStepsStore';
import {
  loadTeaSessionTypes,
  loadTeaSessions,
  makeTeaSessionId,
  saveTeaSessionTypes,
  saveTeaSessions,
} from './teaStore';
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
import { HumorBoard } from './features/humor/HumorBoard';
import { Intake } from './features/intake/Intake';
import { LeaderInbox } from './features/leader/LeaderInbox';
import { Meetings } from './features/meetings/Meetings';
import { Memory } from './features/memory/Memory';
import { Metrics } from './features/metrics/Metrics';
import { NotificationCenter } from './features/notifications/NotificationCenter';
import { Profiles } from './features/profiles/Profiles';
import { loadIssues, makeIssueId, saveIssues } from './issueStore';
import { deliverDm, deliverToSlack, sendAnnouncement } from './notificationDelivery';
import {
  actionDraft,
  agendaAudience,
  agendaDrafts,
  deadlineDrafts,
  humorCommentDraft,
  isDeadlineSoon,
  issueDrafts,
  leadersFor,
  messageDraft,
  ownerAccount,
  slackChannelForKind,
  teaProposalDrafts,
  type NotificationDraft,
} from './notificationRules';
import { loadNotifications, makeNotificationId, saveNotifications } from './notificationStore';
import {
  loadHumorComments,
  loadHumorPosts,
  makeHumorCommentId,
  makeHumorId,
  saveHumorComments,
  saveHumorPosts,
} from './humorStore';
import type {
  ActionItem,
  Agenda,
  AgendaBallot,
  AppNotification,
  CanFollowRoute,
  CanOpinion,
  CanSession,
  CurrentUser,
  HumorComment,
  HumorPost,
  Identity,
  Issue,
  ManagedAccount,
  Section,
  TeaSession,
  TeaSessionStatus,
  VoteChoice,
} from './types';

const today = () => new Date().toISOString().slice(0, 10);

// 대나무숲/캔미팅에서 자동 생성된 안건의 기본 투표 기간(7일).
// 사람이 마감일을 정할 기회가 없는 경로라 기한 없이 방치되는 것을 막는다.
const DEFAULT_VOTING_DAYS = 7;
const defaultDeadline = () =>
  new Date(Date.now() + DEFAULT_VOTING_DAYS * 86400000).toISOString().slice(0, 10);

// 슬랙 등 외부 링크의 #해시로 특정 화면에 바로 진입(딥링크). '#meetings-tea'는 meetings 진입 후 티미팅 탭.
const SECTION_BY_HASH: Record<string, Section> = {
  '#dashboard': 'dashboard',
  '#intake': 'intake',
  '#leader': 'leader',
  '#agenda': 'agenda',
  '#actions': 'actions',
  '#meetings': 'meetings',
  '#meetings-tea': 'meetings',
  '#profiles': 'profiles',
  '#connect': 'connect',
  '#memory': 'memory',
  '#metrics': 'metrics',
  '#accounts': 'accounts',
  '#notifications': 'notifications',
  '#humor': 'humor',
};

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
  const [teaSessions, setTeaSessions] = useState<TeaSession[]>(loadTeaSessions);
  const [teaSessionTypes, setTeaSessionTypes] = useState<string[]>(loadTeaSessionTypes);
  const [notifications, setNotifications] = useState<AppNotification[]>(loadNotifications);
  const [humorPosts, setHumorPosts] = useState<HumorPost[]>(loadHumorPosts);
  const [humorComments, setHumorComments] = useState<HumorComment[]>(loadHumorComments);

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
    // 111: 의견 접수 → 대상 리더에게 알림
    notify(issueDrafts(next, leadersFor(accounts, next.target), today()));
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

  // ===== 알림 / 메시지 (SKSOOP-21) =====
  const persistNotifications = (next: AppNotification[]) => {
    setNotifications(next);
    saveNotifications(next);
  };

  // draft들을 dedupe 후 id 부여해 추가하고, 각 건을 전송 어댑터로 흘려보낸다.
  // 같은 tick에 여러 이벤트가 있으면 반드시 한 번의 notify(배열)로 넘긴다(중간 상태 클로버 방지).
  const notify = (drafts: NotificationDraft[]) => {
    const seen = new Set(notifications.map((item) => item.dedupeKey));
    const fresh = drafts
      .filter((draft) => !seen.has(draft.dedupeKey))
      .map((draft) => ({ ...draft, id: makeNotificationId() }));
    if (fresh.length === 0) return;
    const next = [...fresh, ...notifications];
    persistNotifications(next);
    // 슬랙: 이벤트(kind:sourceId)당 1회, 채널 라우팅. fresh는 최초 1회만 생기므로 슬랙도 이벤트당 1회.
    const events = new Map<string, AppNotification>();
    fresh.forEach((item) => {
      const key = `${item.kind}:${item.sourceId}`;
      if (!events.has(key)) events.set(key, item);
    });
    events.forEach((rep) => {
      // 개인 메시지(DM): 수신자 이메일로 슬랙 DM 경로. 실제 발송은 프록시(SLACK_DM_ENABLED)에서 잠금.
      if (rep.kind === 'message') {
        const email = accounts.find((account) => account.name === rep.recipientName)?.email;
        if (email) deliverDm(email, rep.kind, rep.title, rep.body, rep.fromName);
        return;
      }
      const channel = slackChannelForKind(rep.kind);
      if (channel) deliverToSlack(channel, rep.kind, rep.title, rep.body, rep.fromName);
    });
  };

  // 투표 마감 임박(113): 서버 타이머가 없으므로 안건이 로드/변경될 때 기회적으로 계산한다.
  // dedupeKey가 이미 만든 알림의 재생성을 막으므로 로드마다 중복 생성되지 않는다.
  useEffect(() => {
    const drafts: NotificationDraft[] = [];
    agendas.forEach((agenda) => {
      if (isDeadlineSoon(agenda, today())) {
        drafts.push(...deadlineDrafts(agenda, agendaAudience(accounts, agenda.part), today()));
      }
    });
    if (drafts.length > 0) notify(drafts);
    // notify는 최신 notifications 클로저를 쓰며, 이 effect는 알림 변경으로 재실행되지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendas, accounts]);

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
    // 112: 안건 등록 → 해당 파트 팀원에게 알림
    notify(agendaDrafts(next, agendaAudience(accounts, next.part), today()));
    return next;
  };

  const promoteToAgenda = (
    issue: Issue,
    draft: Pick<Agenda, 'title' | 'description' | 'category' | 'part' | 'author' | 'deadline'>,
  ) => {
    const shouldAnonymize = issue.visibility === '리더만 보기';
    const promoted: Agenda = {
      id: makeAgendaId(),
      title: draft.title,
      // 접수 원문을 그대로 공개하지 않는다. 리더가 정제한 draft만 안건으로 저장한다.
      description: draft.description,
      category: draft.category,
      source: `대나무숲 ${issue.id}`,
      part: draft.part,
      author: shouldAnonymize ? '익명' : draft.author,
      authorName: shouldAnonymize || draft.author === '익명' ? '' : (currentUser?.name ?? ''),
      approve: 0,
      reject: 0,
      status: '투표중',
      createdAt: today(),
      eligibleCount: eligibleCountFor(draft.part),
      deadline: draft.deadline || defaultDeadline(),
      closedAt: '',
    };
    persistAgendas([promoted, ...agendas]);
    const nextIssues: Issue[] = issues.map((item) => (item.id === issue.id ? { ...item, status: '안건화' } : item));
    setIssues(nextIssues);
    void saveIssues(nextIssues);
    setActive('agenda');
    // 112: 대나무숲 → 안건 승격도 팀원 알림
    notify(agendaDrafts(promoted, agendaAudience(accounts, promoted.part), today()));
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
    const followDrafts: NotificationDraft[] = [];
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
      newAgendas.forEach((agenda) =>
        followDrafts.push(...agendaDrafts(agenda, agendaAudience(accounts, agenda.part), today())),
      );
    }
    if (actions.length > 0) {
      persistActionItems([...actions, ...actionItems]);
      actions.forEach((item) => {
        const owner = ownerAccount(accounts, item.owner);
        if (owner) followDrafts.push(actionDraft(item, owner, today()));
      });
    }
    setCanSessions((prev) =>
      prev.map((session) => (session.id === sessionId ? { ...session, followUp: { routes, actionMeta } } : session)),
    );
    // 112/114: 캔미팅 후속으로 만든 안건·액션도 동일하게 알림
    if (followDrafts.length > 0) notify(followDrafts);
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
    // 114: 담당자 지정된 액션은 그 담당자에게 알림
    const ownerNotifs = created
      .map((item) => {
        const owner = ownerAccount(accounts, item.owner);
        return owner ? actionDraft(item, owner, today()) : null;
      })
      .filter((draft): draft is NotificationDraft => draft !== null);
    if (ownerNotifs.length > 0) notify(ownerNotifs);
  };

  const updateActionItem = (updated: ActionItem) => {
    const previous = actionItems.find((item) => item.id === updated.id);
    persistActionItems(actionItems.map((item) => (item.id === updated.id ? updated : item)));
    // 114: 담당자가 새로 지정/변경되면 알림
    if (previous && previous.owner !== updated.owner) {
      const owner = ownerAccount(accounts, updated.owner);
      if (owner) notify([actionDraft(updated, owner, today())]);
    }
  };

  // ===== 티미팅 =====
  const persistTeaSessions = (next: TeaSession[]) => {
    setTeaSessions(next);
    saveTeaSessions(next);
  };

  const addTeaSession = (session: Omit<TeaSession, 'id' | 'status' | 'memo'>) => {
    const created: TeaSession = { ...session, id: makeTeaSessionId(), status: '제안', memo: '' };
    persistTeaSessions([created, ...teaSessions]);
    // 티미팅 세션 제안 → 커넥셔너 대행 리더에게 알림(인앱) + 커넥셔너 채널(슬랙 1회)
    notify(teaProposalDrafts(created, leadersFor(accounts, '리더 전체'), today()));
  };

  const updateTeaSessionStatus = (id: string, status: TeaSessionStatus) => {
    persistTeaSessions(teaSessions.map((session) => (session.id === id ? { ...session, status } : session)));
  };

  const setTeaSessionMemo = (id: string, memo: string) => {
    persistTeaSessions(teaSessions.map((session) => (session.id === id ? { ...session, memo } : session)));
  };

  const updateTeaSessionTypes = (types: string[]) => {
    setTeaSessionTypes(types);
    saveTeaSessionTypes(types);
  };

  // 이번 티미팅 공지문을 팀 전체 채널로 전송.
  const announceTeaToSlack = (text: string) => sendAnnouncement('team', text);

  // ===== 유머게시판 =====
  const persistHumorPosts = (next: HumorPost[]) => {
    setHumorPosts(next);
    saveHumorPosts(next);
  };
  const persistHumorComments = (next: HumorComment[]) => {
    setHumorComments(next);
    saveHumorComments(next);
  };

  const addHumorPost = (draft: { body: string; mediaUrl: string }) => {
    if (!currentUser || !draft.body.trim()) return;
    const post: HumorPost = {
      id: makeHumorId(),
      author: currentUser.name,
      body: draft.body.trim(),
      mediaUrl: draft.mediaUrl.trim(),
      createdAt: today(),
      likedBy: [],
    };
    persistHumorPosts([post, ...humorPosts]);
  };

  const toggleHumorLike = (postId: string) => {
    if (!currentUser) return;
    const me = currentUser.name;
    persistHumorPosts(
      humorPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              likedBy: post.likedBy.includes(me) ? post.likedBy.filter((n) => n !== me) : [...post.likedBy, me],
            }
          : post,
      ),
    );
  };

  const addHumorComment = (postId: string, body: string) => {
    if (!currentUser || !body.trim()) return;
    const commentId = makeHumorCommentId();
    const comment: HumorComment = { id: commentId, postId, author: currentUser.name, body: body.trim(), createdAt: today() };
    persistHumorComments([...humorComments, comment]);
    // 남의 글에 댓글 → 작성자에게 인앱 알림
    const post = humorPosts.find((item) => item.id === postId);
    if (post && post.author !== currentUser.name) {
      notify([humorCommentDraft(post, currentUser.name, today(), commentId)]);
    }
  };

  const deleteHumorPost = (postId: string) => {
    const post = humorPosts.find((item) => item.id === postId);
    if (!post || !currentUser) return;
    if (post.author !== currentUser.name && !isTeamLeader(currentUser)) return; // 본인·팀리더만
    persistHumorPosts(humorPosts.filter((item) => item.id !== postId));
    persistHumorComments(humorComments.filter((item) => item.postId !== postId));
  };

  const deleteHumorComment = (commentId: string) => {
    const comment = humorComments.find((item) => item.id === commentId);
    if (!comment || !currentUser) return;
    if (comment.author !== currentUser.name && !isTeamLeader(currentUser)) return;
    persistHumorComments(humorComments.filter((item) => item.id !== commentId));
  };

  // 115: 특정 대상에게 직접 메시지
  const sendMessage = (recipientName: string, body: string) => {
    if (!currentUser || !recipientName || !body.trim()) return;
    const messageId = makeNotificationId();
    notify([messageDraft(currentUser.name, recipientName, body.trim(), today(), messageId)]);
  };

  const markNotificationRead = (id: string) => {
    persistNotifications(notifications.map((item) => (item.id === id ? { ...item, read: true } : item)));
  };

  const markAllNotificationsRead = () => {
    if (!currentUser) return;
    persistNotifications(
      notifications.map((item) => (item.recipientName === currentUser.name ? { ...item, read: true } : item)),
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

  // 딥링크: 로그인 상태에서 #해시가 있으면 해당 화면으로 이동(슬랙 알림 링크 진입점).
  useEffect(() => {
    if (!currentUser) return;
    const applyHash = () => {
      const target = SECTION_BY_HASH[window.location.hash];
      if (target) changeSection(target);
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleLogin = (user: CurrentUser) => {
    setActive('dashboard');
    setSelectedCanId(null);
    setCurrentUser(user);
  };

  if (!currentUser) {
    return <LoginScreen accounts={accounts} onLogin={handleLogin} onRegister={registerAccount} />;
  }

  const unreadCount = notifications.filter(
    (item) => item.recipientName === currentUser.name && !item.read,
  ).length;

  return (
    <AppShell
      active={active}
      currentUser={currentUser}
      unreadCount={unreadCount}
      onLogout={() => setCurrentUser(null)}
      onSectionChange={changeSection}
    >
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
          teaSessions={teaSessions}
          teaSessionTypes={teaSessionTypes}
          onAddTeaSession={addTeaSession}
          onUpdateTeaStatus={updateTeaSessionStatus}
          onSetTeaMemo={setTeaSessionMemo}
          onTeaTypesChange={updateTeaSessionTypes}
          onAnnounceToSlack={announceTeaToSlack}
        />
      )}
      {active === 'notifications' && (
        <NotificationCenter
          notifications={notifications}
          currentUser={currentUser}
          accounts={accounts}
          onMarkRead={markNotificationRead}
          onMarkAllRead={markAllNotificationsRead}
          onSend={sendMessage}
          onOpen={changeSection}
        />
      )}
      {active === 'humor' && (
        <HumorBoard
          posts={humorPosts}
          comments={humorComments}
          currentUser={currentUser}
          canModerate={isTeamLeader(currentUser)}
          onAddPost={addHumorPost}
          onToggleLike={toggleHumorLike}
          onAddComment={addHumorComment}
          onDeletePost={deleteHumorPost}
          onDeleteComment={deleteHumorComment}
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
