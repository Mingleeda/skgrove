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
  formatDay,
  formatWhen,
  mySeat,
  sortGatherings,
  splitRoster,
  spotsLeft,
  timeUntil,
} from '../../gatheringRules';
import type { CurrentUser, Gathering, GatheringKind, GatheringSignup, GatheringStatus } from '../../types';
import { GatheringForm, type GatheringDraft } from './GatheringForm';
import { PosterFrame } from './PosterFrame';

type GatheringBoardProps = {
  kind: GatheringKind;
  gatherings: Gathering[];
  signups: GatheringSignup[];
  currentUser: CurrentUser;
  /** 'YYYY-MM-DDTHH:mm' 로컬 시각. 상태 파생의 기준이라 App 이 한 곳에서 만든다. */
  now: string;
  onCreate: (draft: GatheringDraft) => void;
  onJoin: (gathering: Gathering) => void;
  onLeave: (gathering: Gathering) => void;
  onCancelGathering: (gathering: Gathering) => void;
};

type BoardView = 'feed' | 'create' | 'detail';
type Filter = '모집중' | '내가 신청' | '내가 연 것' | '전체';

const FILTERS: Filter[] = ['모집중', '내가 신청', '내가 연 것', '전체'];

const STATUS_TONE: Record<GatheringStatus, 'moss' | 'clay' | 'muted'> = {
  모집중: 'moss',
  마감: 'clay',
  진행함: 'muted',
  종료: 'muted',
  취소: 'muted',
};

export function GatheringBoard({
  kind,
  gatherings,
  signups,
  currentUser,
  now,
  onCreate,
  onJoin,
  onLeave,
  onCancelGathering,
}: GatheringBoardProps) {
  const isFlash = kind === 'flash';
  const [view, setView] = useState<BoardView>('feed');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('모집중');

  const mine = gatherings.filter((item) => item.kind === kind);
  const visible = sortGatherings(
    mine.filter((item) => {
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
        <GatheringForm kind={kind} onSubmit={create} onCancel={() => setView('feed')} />
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
          {isFlash ? '번개 열기' : '공모 올리기'}
        </button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          action={{ label: isFlash ? '번개 열기' : '공모 올리기', onClick: () => setView('create') }}
          description={
            isFlash
              ? '오늘 점심이든 퇴근 후든, 먼저 열면 누군가는 옵니다.'
              : '미리 날짜를 잡아두면 선착순으로 사람이 모입니다.'
          }
          icon={isFlash ? Zap : CalendarClock}
          title={filter === '모집중' ? '지금 열린 자리가 없어요' : '해당하는 모임이 없어요'}
        />
      ) : (
        /* 인스타처럼 포스터가 격자로 쌓인다. 지난 모임도 지우지 않는 이유가 여기 있다 —
           "쌓이면 한눈에 보기 좋게"가 이 화면의 목적이다. */
        <div className="poster-grid">
          {visible.map((item) => {
            const status = deriveStatus(item, signups, now);
            const left = spotsLeft(item, signups);
            const seat = mySeat(item, signups, currentUser.name);
            return (
              <button className="poster-cell" key={item.id} onClick={() => openDetail(item.id)} type="button">
                <PosterFrame badge={status} badgeTone={STATUS_TONE[status]} gathering={item} />
                <div className="poster-meta">
                  <span className="poster-meta-when">
                    {status === '모집중' ? timeUntil(item.startAt, now) : formatDay(item.startAt)}
                  </span>
                  <span className="poster-meta-seats">
                    {item.capacity === null
                      ? `${confirmedCount(item, signups)}명 참여`
                      : left && left > 0
                        ? `${left}자리 남음`
                        : `${confirmedCount(item, signups)}/${item.capacity} 마감`}
                  </span>
                  {seat && <span className="poster-meta-mine">{seat === '확정' ? '신청함' : `대기 ${seat.대기}`}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
