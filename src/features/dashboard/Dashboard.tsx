import {
  CalendarClock,
  CheckCircle2,
  Coffee,
  FileCheck2,
  Inbox,
  MessageSquarePlus,
  Plus,
  ShieldCheck,
  Sparkles,
  Vote,
  Zap,
} from 'lucide-react';
import { daysUntilDue, isDone, isOverdue, sortActionItems } from '../../actionRules';
import { mySeat, timeUntil } from '../../gatheringRules';
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

  /*
    이전에는 actionItems 를 받은 순서 그대로 slice 했다. 그래서 6일 지난 건이
    다섯 번째에 있으면 홈에서 사라지고, 완료된 건이 첫 줄을 차지했다.
    액션아이템 화면과 같은 정렬을 써야 "홈에 보이는 것"이 "가장 급한 것"이 된다.
  */
  const homeActions = sortActionItems(actionItems, today).slice(0, 3);
  const overdueCount = actionItems.filter((item) => isOverdue(item, today)).length;
  const openActionCount = actionItems.filter((item) => item.status !== '완료').length;

  /*
    내가 자리를 잡아둔 모임 중 아직 오지 않은 것. 취소된 것은 뺀다 —
    취소 알림을 이미 받았고, 홈에 남겨두면 아직 유효한 약속으로 읽힌다.
  */
  const myGatherings = gatherings
    .filter((item) => !item.canceled && item.startAt >= now && mySeat(item, signups, currentUser.name) !== null)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, 2);

  // 스토리에는 마감이 있는 것만 올린다. 투표는 마감이 있고, 모임은 시작 시각이 마감이다.
  const openGatherings = gatherings
    .filter((item) => !item.canceled && item.startAt >= now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, 6);

  // 홈에서 방식을 고른 뜻이 접수 화면까지 이어져야 한다.
  // 이전에는 두 버튼이 똑같이 화면만 옮겨서, 고른 방식이 버려지고 다시 물었다.
  const startIntake = (identity: Identity) => {
    onIdentityChange(identity);
    onSectionChange('intake');
  };

  const stats: Array<{ label: string; value: number; target: Section }> = [
    { label: '접수 의견', value: openIssueCount, target: 'intake' },
    { label: '투표 안건', value: votingAgendas.length, target: 'agenda' },
    { label: '통과 안건', value: passedAgendaCount, target: 'agenda' },
    // '진행 액션'이므로 완료된 것은 빼야 한다. 전체를 세면 아무것도 안 해도 숫자가 유지된다.
    { label: '진행 액션', value: openActionCount, target: 'actions' },
  ];

  const hasFeed = votingAgendas.length > 0 || homeActions.length > 0 || myGatherings.length > 0;

  return (
    <section className="screen ig-home">
      {/*
        스토리 트레이 = 마감이 있는 것. 첫 칸은 인스타의 '내 스토리'와 같은 자리라
        만들기(= 의견 접수)를 둔다. 히어로를 없앤 대신 여기가 시작점이 된다.
      */}
      <div className="ig-tray">
        <button className="ig-story" onClick={() => startIntake('익명')} type="button">
          <span className="ig-ring new">
            <span className="ig-thumb">
              <Plus size={22} strokeWidth={2.4} />
            </span>
          </span>
          <small>말하기</small>
        </button>
        {votingAgendas.slice(0, 4).map((agenda) => (
          <button className="ig-story" key={agenda.id} onClick={() => onSectionChange('agenda')} type="button">
            <span className="ig-ring">
              <span className="ig-thumb">
                <Vote size={22} strokeWidth={1.6} />
              </span>
            </span>
            <small>{agenda.title}</small>
          </button>
        ))}
        {openGatherings.map((item) => (
          <button className="ig-story" key={item.id} onClick={() => onSectionChange('gatherings')} type="button">
            <span className="ig-ring">
              <span className="ig-thumb">
                {item.kind === 'flash' ? <Zap size={22} strokeWidth={1.6} /> : <CalendarClock size={22} strokeWidth={1.6} />}
              </span>
            </span>
            <small>{item.title}</small>
          </button>
        ))}
      </div>

      <div className="ig-col">
        {/*
          히어로를 없애고 이 줄을 뒀다. 히어로는 "무엇을 하는 앱인가"를 매 방문마다
          다시 설명했는데, 톤앤매너 문서의 원칙대로 설명하는 말보다 사용자에게
          하는 말을 남긴다. 여기서 바로 쓰기 시작할 수 있다.
        */}
        <div className="ig-composer">
          <span className="ig-ava">{currentUser.name.slice(0, 1)}</span>
          <button className="ig-composer-field" onClick={() => startIntake('익명')} type="button">
            팀에서 바뀌었으면 하는 것...
          </button>
          <button className="ig-composer-go" onClick={() => startIntake('익명')} type="button">
            <ShieldCheck size={16} />
            익명
          </button>
          <button className="ig-composer-go" onClick={() => startIntake('실명')} type="button">
            <MessageSquarePlus size={16} />
            실명
          </button>
        </div>

        {/* 인스타 프로필의 게시물·팔로워 줄과 같은 자리. 숫자가 곧 이동 경로다. */}
        <div className="ig-stats">
          {stats.map((stat) => (
            <button key={stat.label} onClick={() => onSectionChange(stat.target)} type="button">
              <b>{stat.value}</b>
              <span>{stat.label}</span>
            </button>
          ))}
        </div>

        {votingAgendas.slice(0, 2).map((agenda) => {
          const total = agenda.approve + agenda.reject || 1;
          const approveRate = Math.round((agenda.approve / total) * 100);
          return (
            <article className="ig-post plain" key={agenda.id}>
              <header className="ig-post-head">
                <span className="ig-ava">
                  <Vote size={17} />
                </span>
                <span className="ig-post-who">
                  <b>안건함</b>
                  <span>{agenda.source}</span>
                </span>
                <span className="ig-post-status moss">투표중</span>
              </header>

              <div className="ig-post-body">
                <p className="ig-headline">{agenda.title}</p>

                {/* 인스타 스토리의 투표 스티커. 누르면 결과가 채워지는 형태가
                    익명 투표와 성질이 같다. 여기서는 현재 결과만 보여주고
                    실제 투표는 안건함에서 한다 — 홈에서 한 표가 잘못 나가면
                    되돌리는 화면이 따로 없다. */}
                <div className="ig-poll">
                  <div className="ig-opt win">
                    <span className="ig-opt-bar" style={{ width: `${approveRate}%` }} />
                    <b>찬성</b>
                    <em>{approveRate}%</em>
                  </div>
                  <div className="ig-opt">
                    <span className="ig-opt-bar" style={{ width: `${100 - approveRate}%` }} />
                    <b>반대</b>
                    <em>{100 - approveRate}%</em>
                  </div>
                </div>

                <button className="ig-join" onClick={() => onSectionChange('agenda')} type="button">
                  투표하기
                </button>
              </div>
            </article>
          );
        })}

        {homeActions.length > 0 && (
          <article className="ig-post plain">
            <header className="ig-post-head">
              <span className="ig-ava">
                <FileCheck2 size={17} />
              </span>
              <span className="ig-post-who">
                <b>액션아이템</b>
                <span>{openActionCount}건 진행 중</span>
              </span>
              {overdueCount > 0 && <span className="ig-post-status late">지연 {overdueCount}</span>}
            </header>

            <div className="ig-post-body">
              <div className="ig-list">
                {homeActions.map((item) => {
                  const StatusIcon = STATUS_ICON[item.status];
                  const late = isOverdue(item, today);
                  return (
                    <button
                      className={late ? 'ig-list-row late' : 'ig-list-row'}
                      key={item.id}
                      onClick={() => onSectionChange('actions')}
                      type="button"
                    >
                      <StatusIcon size={17} />
                      <span>
                        <b>{item.title}</b>
                        {/* 원본 날짜("2026-07-30")는 오늘과 비교해야 뜻이 생긴다.
                            그 계산을 사람에게 시키지 않는다. */}
                        <em>
                          {item.owner} · {dueLabel(daysUntilDue(item, today), isDone(item))}
                        </em>
                      </span>
                    </button>
                  );
                })}
              </div>
              {actionItems.length > homeActions.length && (
                <button className="ig-more-link" onClick={() => onSectionChange('actions')} type="button">
                  액션아이템 {actionItems.length}건 모두 보기
                </button>
              )}
            </div>
          </article>
        )}

        {myGatherings.map((item) => {
          const seat = mySeat(item, signups, currentUser.name);
          return (
            <article className="ig-post plain" key={item.id}>
              <header className="ig-post-head">
                <span className="ig-ava">{item.host.slice(0, 1)}</span>
                <span className="ig-post-who">
                  <b>{item.host}</b>
                  <span>
                    {item.place} · {timeUntil(item.startAt, now)}
                  </span>
                </span>
                {/* 대기 중이면 확정과 구분돼야 한다. 나가려고 시간을 비워둘지 판단이 갈린다. */}
                <span className="ig-post-status moss">
                  {seat === '확정' ? '신청함' : seat ? `대기 ${seat.대기}번` : ''}
                </span>
              </header>
              <div className="ig-post-body">
                <p className="ig-headline">{item.title}</p>
                <button className="ig-more-link" onClick={() => onSectionChange('gatherings')} type="button">
                  모임 보기
                </button>
              </div>
            </article>
          );
        })}

        {!hasFeed && (
          <article className="ig-post plain">
            <div className="ig-post-body ig-quiet">
              <PanelHeader icon={Inbox} title="아직 올라온 것이 없어요" />
              <p>
                투표 중인 안건도, 진행 중인 액션도, 신청한 모임도 없습니다. 위에서 한마디 남기면 여기부터 채워집니다.
              </p>
            </div>
          </article>
        )}

        {/* 매일 같은 두 링크라 피드가 아니라 아래에 조용히 둔다. */}
        <div className="ig-quick">
          <button onClick={() => onSectionChange('connect')} type="button">
            <Coffee size={18} />
            <span>
              <b>파트 섞기 커피챗</b>
              <em>이번 주 랜덤 매칭을 시작해요</em>
            </span>
          </button>
          <button onClick={() => onSectionChange('meetings')} type="button">
            <Sparkles size={18} />
            <span>
              <b>다음 티미팅 주제</b>
              <em>자발 제안 채널에서 안건을 받아요</em>
            </span>
          </button>
          <button onClick={() => onSectionChange('agenda')} type="button">
            <CheckCircle2 size={18} />
            <span>
              <b>통과된 안건 {passedAgendaCount}건</b>
              <em>무엇이 실제로 바뀌었는지 봐요</em>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
