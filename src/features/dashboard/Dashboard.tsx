import {
  CalendarClock,
  CheckCircle2,
  Coffee,
  FileCheck2,
  Inbox,
  MessageSquarePlus,
  ShieldCheck,
  Sparkles,
  Vote,
  Zap,
} from 'lucide-react';
import { daysUntilDue, isDone, isOverdue, sortActionItems } from '../../actionRules';
import { mySeat, timeUntil } from '../../gatheringRules';
import { EmptyState } from '../../components/EmptyState';
import { PanelHeader } from '../../components/PanelHeader';
import { STATUS_ICON, dueLabel } from '../actions/actionDisplay';
import type {
  ActionItem,
  Agenda,
  CurrentUser,
  Gathering,
  GatheringSignup,
  Identity,
  Section,
} from '../../types';

type DashboardProps = {
  openIssueCount: number;
  passedAgendaCount: number;
  agendas: Agenda[];
  currentUser: CurrentUser;
  actionItems: ActionItem[];
  gatherings: Gathering[];
  signups: GatheringSignup[];
  today: string;
  /** 'YYYY-MM-DDTHH:mm' 로컬 시각. 모임의 '아직 안 지났는가' 판정에 쓴다. */
  now: string;
  onSectionChange: (section: Section) => void;
  onIdentityChange: (identity: Identity) => void;
};

export function Dashboard({
  openIssueCount,
  passedAgendaCount,
  agendas,
  currentUser,
  actionItems,
  gatherings,
  signups,
  today,
  now,
  onSectionChange,
  onIdentityChange,
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

  const activeAgendas = votingAgendas.slice(0, 2);
  const hasVoting = activeAgendas.length > 0;

  /*
    이전에는 actionItems 를 받은 순서 그대로 slice(0, 4) 했다. 그래서 6일 지난
    건이 다섯 번째에 있으면 홈에서 사라지고, 완료된 건이 첫 줄을 차지했다.
    액션아이템 화면과 같은 정렬을 써야 "홈에 보이는 4건"이 "가장 급한 4건"이 된다.
  */
  const homeActions = sortActionItems(actionItems, today).slice(0, 4);
  const overdueCount = actionItems.filter((item) => isOverdue(item, today)).length;

  /*
    내가 자리를 잡아둔 모임 중 아직 오지 않은 것. 취소된 것은 뺀다 —
    취소 알림을 이미 받았고, 홈에 남겨두면 아직 유효한 약속으로 읽힌다.
  */
  const myGatherings = gatherings
    .filter((item) => !item.canceled && item.startAt >= now && mySeat(item, signups, currentUser.name) !== null)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, 2);

  // 홈에서 방식을 고른 뜻이 접수 화면까지 이어져야 한다.
  // 이전에는 두 버튼이 똑같이 화면만 옮겨서, 고른 방식이 버려지고 다시 물었다.
  const startIntake = (identity: Identity) => {
    onIdentityChange(identity);
    onSectionChange('intake');
  };

  const agendaPanel = (
    <section className="panel agenda-panel">
      <PanelHeader icon={Vote} title="진행 중인 안건 투표" />
      <div className="home-agenda-list">
        {!hasVoting && (
          /* 바로 위 스탯카드가 이미 "투표 안건 0"을 말한다. 같은 사실을 258px 짜리
             큰 빈 상자로 한 번 더 말하면, 화면에서 가장 큰 블록이 "할 일 없음"이 된다.
             한 줄로 눕힌다. */
          <EmptyState
            compact
            icon={Vote}
            title="지금 투표 중인 안건이 없어요"
            action={{ label: '안건함 열기', onClick: () => onSectionChange('agenda') }}
          />
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
  );

  const actionPanel = (
    <section className="panel">
      {/* 지연이 있으면 패널을 열기 전에 알아야 한다. 행마다 "6일 지남"이 있어도
          세 줄을 다 읽어야 몇 건인지 알 수 있다. */}
      <PanelHeader
        icon={FileCheck2}
        title="액션아이템"
        note={overdueCount > 0 ? `지연 ${overdueCount}` : undefined}
      />
      <div className="action-list">
        {/* 옆 패널의 카드는 전부 눌리는데 이 행만 div였다. 같은 모양이면 같이 동작해야 한다. */}
        {/* 홈은 요약 화면이다. 전체 목록은 액션아이템 화면이 담당한다. */}
        {homeActions.map((item) => {
          const StatusIcon = STATUS_ICON[item.status];
          const late = isOverdue(item, today);
          return (
            <button
              className={late ? 'action-row overdue' : 'action-row'}
              key={item.id}
              onClick={() => onSectionChange('actions')}
            >
              <StatusIcon size={18} />
              <div>
                <strong>{item.title}</strong>
                {/* 원본 날짜("2026-07-30")는 오늘과 비교해야 뜻이 생긴다.
                    그 계산을 사람에게 시키지 않는다. */}
                <span>
                  {item.owner} · {dueLabel(daysUntilDue(item, today), isDone(item))}
                </span>
              </div>
              <em>{item.status}</em>
            </button>
          );
        })}
        {/* 안건 패널에만 빈 상태가 있어서, 액션이 0건이면 제목만 남은 빈 상자가 됐다. */}
        {actionItems.length === 0 && (
          <p className="field-note">
            아직 액션아이템이 없어요. 통과된 안건이 실행 항목으로 바뀌면 여기에 담당자와 목표일이 표시됩니다.
          </p>
        )}
        {actionItems.length > 4 && (
          <button className="secondary-button wide" onClick={() => onSectionChange('actions')}>
            액션아이템 {actionItems.length}건 전체 보기
          </button>
        )}
      </div>
    </section>
  );

  const connectPanel = (
    <section className="panel">
      <PanelHeader icon={Coffee} title="오늘의 팀 연결" />
      {/*
        이 패널은 이름이 '오늘의'인데 내용은 고정 링크 두 개뿐이라 매일 같았다.
        내가 자리를 잡아둔 모임이야말로 오늘 일어날 팀 연결이다. 있으면 위에 둔다.
      */}
      {myGatherings.length > 0 && (
        <div className="home-gathering-list">
          {myGatherings.map((item) => {
            const seat = mySeat(item, signups, currentUser.name);
            return (
              <button
                className="home-gathering-row"
                key={item.id}
                onClick={() => onSectionChange(item.kind === 'flash' ? 'flash' : 'callup')}
                type="button"
              >
                {item.kind === 'flash' ? <Zap size={17} /> : <CalendarClock size={17} />}
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {timeUntil(item.startAt, now)} · {item.place}
                  </span>
                </div>
                {/* 대기 중이면 확정과 구분돼야 한다. 나가려고 시간을 비워둘지 판단이 갈린다. */}
                {seat !== '확정' && seat !== null && <em className="home-gathering-wait">대기 {seat.대기}</em>}
              </button>
            );
          })}
        </div>
      )}
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
  );

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
            <button className="primary-button" onClick={() => startIntake('익명')}>
              <ShieldCheck size={18} />
              익명으로 말하기
            </button>
            <button className="secondary-button" onClick={() => startIntake('실명')}>
              <MessageSquarePlus size={18} />
              실명으로 제안하기
            </button>
          </div>
        </div>
        {/* 의견이 거치는 단계를 보여주는 그림이다. 실제 진행 상태가 아니다.
            이전에는 앞뒤 두 칸만 강조되어 "지금 이 단계"로 읽혔다. 네 칸을 같게 두고
            화살표로 흐름만 나타낸다. */}
        <div className="home-signal">
          <p className="home-signal-label">의견이 지나는 길</p>
          <ol>
            <li>접수</li>
            <li>리더 검토</li>
            <li>익명 투표</li>
            <li>액션</li>
          </ol>
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

      {/* 두 열을 각각 채운다. 한 그리드에 네 패널을 넣고 행 높이를 맞추면,
          투표가 없는 날 안건 패널이 오른쪽 열 높이까지 늘어나 500px 넘는 빈 상자가 된다.

          넓은 왼쪽 칸은 "지금 할 일"이 가진다. 투표할 안건이 있으면 안건이, 없으면
          액션아이템이 가져간다. 넓은 칸을 안건에 고정해 두면 투표가 없는 날 147px 짜리
          "없어요" 패널이 그 자리를 잡고 아래로 387px 가 빈다 — 빈 상자를 빈 구멍으로
          바꾸는 것일 뿐이다. */}
      {hasVoting ? (
        <div className="home-grid">
          <div className="home-col">{agendaPanel}</div>
          <div className="home-col">
            {actionPanel}
            {connectPanel}
          </div>
        </div>
      ) : (
        <>
          {agendaPanel}
          <div className="home-grid">
            <div className="home-col">{actionPanel}</div>
            <div className="home-col">{connectPanel}</div>
          </div>
        </>
      )}
    </section>
  );
}
