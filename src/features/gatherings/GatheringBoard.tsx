import { useState } from 'react';
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  Check,
  Hourglass,
  MapPin,
  Plus,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';
import {
  belowMinimum,
  canJoinWaitlist,
  confirmedCount,
  deriveStatus,
  formatWhen,
  mySeat,
  sortGatherings,
  splitRoster,
  spotsLeft,
  timeUntil,
} from '../../gatheringRules';
import type { CurrentUser, Gathering, GatheringSignup, GatheringStatus } from '../../types';
import { localPoster } from '../../aiPoster';
import { GatheringForm, type GatheringDraft } from './GatheringForm';
import { PosterFrame, PosterThumb } from './PosterFrame';

type GatheringBoardProps = {
  gatherings: Gathering[];
  signups: GatheringSignup[];
  currentUser: CurrentUser;
  /** 'YYYY-MM-DDTHH:mm' 로컬 시각. 상태 파생의 기준이라 App 이 한 곳에서 만든다. */
  now: string;
  onCreate: (draft: GatheringDraft) => void;
  onJoin: (gathering: Gathering) => void;
  onLeave: (gathering: Gathering) => void;
  onCancelGathering: (gathering: Gathering) => void;
  /** 등록 직후 배경에서 그림을 그리는 중인 모임. 격자에 '그리는 중' 을 띄운다. */
  imagePendingIds: string[];
};

type BoardView = 'feed' | 'create' | 'detail';
type Filter = '모집중' | '내가 신청' | '내가 연 것' | '전체';

const FILTERS: Filter[] = ['모집중', '내가 신청', '내가 연 것', '전체'];

/*
  탭마다 없는 것이 다르므로 하는 말도 달라야 한다. '모집중' 이 비어 있는 것과
  '내가 신청' 이 비어 있는 것은 사용자가 해야 할 일이 정반대다 — 앞은 누가 열어
  주길 기다리거나 내가 열면 되고, 뒤는 이미 열려 있는 것에 신청하면 된다.
*/
const EMPTY_COPY: Record<Filter, { title: string; description: string; toOpen: boolean }> = {
  모집중: {
    title: '지금 열린 자리가 없어요',
    description: '오늘 점심이든 다음 주 워크샵이든, 먼저 열면 누군가는 옵니다.',
    toOpen: true,
  },
  '내가 신청': {
    title: '아직 신청한 모임이 없어요',
    description: '모집중 탭에서 자리가 남은 모임을 찾아보세요. 마음에 드는 게 없으면 직접 열어도 됩니다.',
    toOpen: true,
  },
  '내가 연 것': {
    title: '아직 연 모임이 없어요',
    description: '거창하지 않아도 됩니다. 오늘 점심 같이 먹자는 것도 모임이에요.',
    toOpen: true,
  },
  전체: {
    title: '아직 아무 모임도 없어요',
    description: '첫 모임을 열면 여기부터 쌓입니다.',
    toOpen: true,
  },
};

const STATUS_TONE: Record<GatheringStatus, 'moss' | 'clay' | 'muted'> = {
  모집중: 'moss',
  마감: 'clay',
  진행함: 'muted',
  종료: 'muted',
  취소: 'muted',
};

export function GatheringBoard({
  gatherings,
  signups,
  currentUser,
  now,
  onCreate,
  onJoin,
  onLeave,
  onCancelGathering,
  imagePendingIds,
}: GatheringBoardProps) {
  const [view, setView] = useState<BoardView>('feed');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('모집중');

  const visible = sortGatherings(
    gatherings.filter((item) => {
      const status = deriveStatus(item, signups, now);
      if (filter === '모집중') return status === '모집중' || status === '마감';
      if (filter === '내가 신청') return mySeat(item, signups, currentUser.name) !== null;
      if (filter === '내가 연 것') return item.host === currentUser.name;
      return true;
    }),
    signups,
    now,
  );

  // 목록 필터에서 빠져도 열어둔 상세는 유지되어야 하므로 전체에서 찾는다.
  const selected = gatherings.find((item) => item.id === selectedId) ?? null;

  const openDetail = (id: string) => {
    setSelectedId(id);
    setView('detail');
  };

  const create = (draft: GatheringDraft) => {
    onCreate(draft);
    setView('feed');
  };

  if (view === 'create') {
    return (
      <section className="screen">
        <GatheringForm onSubmit={create} onCancel={() => setView('feed')} />
      </section>
    );
  }

  if (view === 'detail' && selected) {
    const status = deriveStatus(selected, signups, now);
    const { confirmed, waiting } = splitRoster(selected, signups);
    const seat = mySeat(selected, signups, currentUser.name);
    const left = spotsLeft(selected, signups);
    const isHost = selected.host === currentUser.name;
    const waitlistOnly = canJoinWaitlist(selected, signups, now);
    const joinable = status === '모집중' || waitlistOnly;

    return (
      <section className="screen">
        <button className="btn-ghost back-link" onClick={() => setView('feed')} type="button">
          <ArrowLeft size={16} />
          목록으로
        </button>

        <div className="gathering-detail">
          <div className="gathering-detail-poster">
            <PosterFrame badge={status} badgeTone={STATUS_TONE[status]} gathering={selected} />
          </div>

          <div className="gathering-detail-body">
            <h2>{selected.title}</h2>
            <p className="gathering-host">{selected.host}님이 열었어요</p>

            <dl className="gathering-facts">
              <div>
                <dt>
                  <CalendarClock size={16} />
                  언제
                </dt>
                <dd>
                  {formatWhen(selected.startAt)}
                  {status === '모집중' && <em> · {timeUntil(selected.startAt, now)}</em>}
                </dd>
              </div>
              <div>
                <dt>
                  <MapPin size={16} />
                  어디서
                </dt>
                <dd>{selected.place}</dd>
              </div>
              <div>
                <dt>
                  <Users size={16} />
                  인원
                </dt>
                <dd>
                  {selected.capacity === null
                    ? `제한 없음 · 지금 ${confirmedCount(selected, signups)}명`
                    : `${confirmedCount(selected, signups)} / ${selected.capacity}명`}
                  {left !== null && left > 0 && <em> · {left}자리 남음</em>}
                </dd>
              </div>
              <div>
                <dt>
                  <Wallet size={16} />
                  비용
                </dt>
                <dd>{selected.cost}</dd>
              </div>
            </dl>

            {selected.desc && <p className="gathering-desc">{selected.desc}</p>}

            {/* 주최자에게만 보이는 판단 근거. 접을지 말지를 여기서 정한다. */}
            {isHost && selected.minPeople !== null && belowMinimum(selected, signups) && status !== '취소' && (
              <p className="gathering-warn">
                최소 {selected.minPeople}명 중 {confirmedCount(selected, signups)}명이에요. 부담 없이 접어도 괜찮습니다.
              </p>
            )}

            <div className="gathering-actions">
              {seat === '확정' && (
                <>
                  <span className="seat-badge confirmed">
                    <Check size={16} />
                    신청 완료
                  </span>
                  <button className="btn-ghost" onClick={() => onLeave(selected)} type="button">
                    신청 취소
                  </button>
                </>
              )}
              {seat && seat !== '확정' && (
                <>
                  <span className="seat-badge waiting">
                    <Hourglass size={16} />
                    대기 {seat.대기}번
                  </span>
                  <button className="btn-ghost" onClick={() => onLeave(selected)} type="button">
                    대기 취소
                  </button>
                </>
              )}
              {!seat && joinable && (
                <button className="primary-button" onClick={() => onJoin(selected)} type="button">
                  {waitlistOnly ? '대기 걸기' : '신청하기'}
                </button>
              )}
              {!seat && !joinable && <span className="seat-badge closed">{status}</span>}

              {isHost && !selected.canceled && status !== '진행함' && status !== '종료' && (
                <button className="btn-ghost danger" onClick={() => onCancelGathering(selected)} type="button">
                  <Ban size={16} />
                  모임 취소
                </button>
              )}
            </div>

            <div className="roster">
              <p className="roster-title">
                확정 {confirmed.length}명
                {waiting.length > 0 && <span> · 대기 {waiting.length}명</span>}
              </p>
              <ul className="roster-list">
                {confirmed.map((signup, index) => (
                  <li key={signup.id}>
                    <span className="roster-no">{index + 1}</span>
                    {signup.name}
                  </li>
                ))}
                {waiting.map((signup, index) => (
                  <li className="waiting" key={signup.id}>
                    <span className="roster-no">대기 {index + 1}</span>
                    {signup.name}
                  </li>
                ))}
              </ul>
              {confirmed.length === 0 && <p className="field-note">아직 아무도 신청하지 않았어요. 첫 번째가 되어보세요.</p>}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="screen">
      <div className="gathering-toolbar">
        <div className="toolbar">
          {FILTERS.map((item) => (
            <button
              className={filter === item ? 'filter active' : 'filter'}
              key={item}
              onClick={() => setFilter(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        <button className="primary-button" onClick={() => setView('create')} type="button">
          <Plus size={18} />
          모임 열기
        </button>
      </div>

      {visible.length === 0 ? (
        /*
          빈 상태를 필터마다 다르게 말한다. 전에는 어느 탭에서든 "해당하는 모임이
          없어요" 한 문장이라, '내가 연 것' 에 들어간 사람이 자기가 뭘 잘못했는지
          아니면 원래 비어 있는 건지 알 수 없었다. 무엇이 없는지와 다음에 뭘 할지를
          탭마다 따로 적는다.
        */
        <EmptyState
          action={EMPTY_COPY[filter].toOpen ? { label: '모임 열기', onClick: () => setView('create') } : undefined}
          description={EMPTY_COPY[filter].description}
          icon={Zap}
          title={EMPTY_COPY[filter].title}
        />
      ) : (
        /*
          벼룩숲과 같은 격자다. 피드로 한 건씩 보여주다가 되돌렸다 — 모임은
          "무엇이 열려 있나" 를 훑는 화면이고, 한 건씩 넘기면 오늘 갈 만한 것이
          몇 개인지 세려고 스크롤해야 한다. 판단에 필요한 사실(날짜 · 남은 자리)은
          포스터 아래 캡션이 대신 나른다.
        */
        <div className="poster-grid ig-shop ig-gallery">
          {visible.map((item) => {
            const status = deriveStatus(item, signups, now);
            const open = status === '모집중';
            const left = spotsLeft(item, signups);
            const seat = mySeat(item, signups, currentUser.name);
            const pending = imagePendingIds.includes(item.id);

            return (
              <figure className={open ? 'ig-shop-cell' : 'ig-shop-cell closed'} key={item.id}>
                {/*
                  캡션을 없애고 사진만 남긴다(인스타 프로필 격자). 사진이 없는 모임은
                  없다 — 첨부가 없으면 등록 직후 그림을 그려 넣기 때문이다.
                  다만 글자가 하나도 없는 격자는 눈으로만 읽힌다. 이름과 시각을
                  aria-label 과 title 로 남겨 스크린리더와 hover 에서는 알 수 있게 한다.
                */}
                <button
                  aria-label={`${item.title} · ${formatWhen(item.startAt)}`}
                  className="poster-cell"
                  onClick={() => openDetail(item.id)}
                  title={`${item.title} · ${formatWhen(item.startAt)}${seat === '확정' ? ' · 신청함' : seat ? ` · 대기 ${seat.대기}` : ''}`}
                  type="button"
                >
                  <PosterFrame badge={status} badgeTone={STATUS_TONE[status]} gathering={item} />
                  {/*
                    등록 직후 배경에서 그림을 그린다. 8초 안팎 걸리는데 아무 표시가
                    없으면 "포스터가 원래 저건가" 하고 지나친다. 그리는 중임을
                    이 자리에서 알린다 — 다 그려지면 이 자리가 사진으로 바뀐다.
                  */}
                  {pending && (
                    <span className="ig-drawing">
                      <Hourglass size={14} />
                      그림 그리는 중
                    </span>
                  )}
                  {!pending && left !== null && left > 0 && <span className="ig-price-tag">{left}자리 남음</span>}
                </button>
              </figure>
            );
          })}
        </div>
      )}
    </section>
  );
}
