import type { ElementType } from 'react';
import {
  CalendarClock,
  FileCheck2,
  Inbox,
  Laugh,
  Plus,
  Store,
  Vote,
  Zap,
} from 'lucide-react';
import { PanelHeader } from '../../components/PanelHeader';
import { buildHomeFeed, type HomeFeedKind } from '../../homeFeed';
import type {
  ActionItem,
  Agenda,
  CurrentUser,
  Gathering,
  GatheringSignup,
  HumorPost,
  Identity,
  MarketItem,
  Section,
} from '../../types';

// 피드 타일의 좌상단 배지·색 타일에 쓰는 도메인별 라벨·아이콘·색 클래스.
// 색은 styles.css 의 .home-feed-card.k-* 규칙(디자인 토큰)으로 정의한다.
const KIND_STYLE: Record<HomeFeedKind, { label: string; icon: ElementType; cls: string }> = {
  agenda: { label: '안건', icon: Vote, cls: 'k-agenda' },
  action: { label: '액션', icon: FileCheck2, cls: 'k-action' },
  gathering: { label: '모임', icon: CalendarClock, cls: 'k-gathering' },
  humor: { label: '유머', icon: Laugh, cls: 'k-humor' },
  market: { label: '장터', icon: Store, cls: 'k-market' },
};

type DashboardProps = {
  openIssueCount: number;
  passedAgendaCount: number;
  agendas: Agenda[];
  currentUser: CurrentUser;
  actionItems: ActionItem[];
  gatherings: Gathering[];
  signups: GatheringSignup[];
  humorPosts: HumorPost[];
  marketItems: MarketItem[];
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
  humorPosts,
  marketItems,
  today,
  now,
  onSectionChange,
  onIdentityChange,
}: DashboardProps) {
  const votingAgendas = agendas.filter((agenda) => agenda.status === '투표중');
  const openActionCount = actionItems.filter((item) => item.status !== '완료').length;

  /*
    스토리 줄에는 번개(flash)로 등록된 것만, 최신 등록순(맨 앞이 최신)으로 올린다.
    취소된 것은 뺀다.
  */
  const flashStories = gatherings
    .filter((item) => !item.canceled && item.kind === 'flash')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12);

  /*
    홈 통합 피드. 번개는 위 스토리로 이미 올라가므로 피드에서는 뺀다(공모는 남긴다).
    안건·액션·공모·유머·장터를 buildHomeFeed 가 최신순 30개로 접는다.
  */
  const feedItems = buildHomeFeed({
    agendas,
    actionItems,
    gatherings: gatherings.filter((item) => item.kind !== 'flash'),
    humorPosts,
    marketItems,
  });

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
        {flashStories.map((item) => (
          <button className="ig-story" key={item.id} onClick={() => onSectionChange('gatherings')} type="button">
            <span className="ig-ring">
              <span className="ig-thumb">
                <Zap size={22} strokeWidth={1.6} />
              </span>
            </span>
            <small>{item.title}</small>
          </button>
        ))}
      </div>

      <div className="ig-col">
        {/* 인스타 프로필의 게시물·팔로워 줄과 같은 자리. 숫자가 곧 이동 경로다. */}
        <div className="ig-stats">
          {stats.map((stat) => (
            <button key={stat.label} onClick={() => onSectionChange(stat.target)} type="button">
              <b>{stat.value}</b>
              <span>{stat.label}</span>
            </button>
          ))}
        </div>

        {/*
          홈 통합 피드. 안건·액션·번개·유머·장터의 최근 소식을 한 판에 최신순 3열로 모은다.
          풀폭 포스트로 도메인마다 다른 리치 UI(투표 진행바·인라인 토글)를 두던 것을 걷어내고,
          같은 크기 타일 + 클릭 이동으로 통일했다. 정렬·개수·매핑은 buildHomeFeed(순수)가 맡는다.
        */}
        {feedItems.length > 0 ? (
          <div className="home-feed">
            {feedItems.map((item) => {
              const style = KIND_STYLE[item.kind];
              const Icon = style.icon;
              return (
                <button
                  className={item.imageUrl ? 'home-feed-card has-image' : `home-feed-card ${style.cls}`}
                  key={item.id}
                  onClick={() => onSectionChange(item.section)}
                  title={`${style.label} · ${item.title}`}
                  type="button"
                >
                  {item.imageUrl ? (
                    <>
                      <img alt="" className="home-feed-bg" loading="lazy" src={item.imageUrl} />
                      <span aria-hidden className="home-feed-corner">
                        <Icon size={15} strokeWidth={2.4} />
                      </span>
                    </>
                  ) : (
                    <span className="home-feed-plain">
                      <Icon aria-hidden size={26} strokeWidth={1.5} />
                      <strong>{item.title}</strong>
                      {item.meta && <em>{item.meta}</em>}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <article className="ig-post plain">
            <div className="ig-post-body ig-quiet">
              <PanelHeader icon={Inbox} title="아직 소식이 없어요" />
              <p>
                안건·액션·모임·유머·장터에 새 소식이 올라오면 여기 최신순으로 모입니다. 위에서 한마디 남기면 여기부터 채워집니다.
              </p>
            </div>
          </article>
        )}

      </div>
    </section>
  );
}
