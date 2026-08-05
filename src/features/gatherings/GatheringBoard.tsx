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
  gatherings,
  signups,
  currentUser,
  now,
  onCreate,
  onJoin,
  onLeave,
  onCancelGathering,
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

  // 스토리에는 마감이 남은 것만 올린다. sortGatherings 가 이미 임박순이라 앞에서 자른다.
  const openSoon = sortGatherings(
    gatherings.filter((item) => deriveStatus(item, signups, now) === '모집중'),
    signups,
    now,
  ).slice(0, 8);

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

      {/*
        스토리 트레이 = 마감이 있는 것만. 스토리의 "24시간 뒤 사라짐"과 번개의
        "마감"이 같은 성질이라 이 자리에 놓는다. 지난 모임은 여기 오지 않는다.
      */}
      <div className="ig-tray">
        <button className="ig-story" onClick={() => setView('create')} type="button">
          <span className="ig-ring new">
            <span className="ig-thumb">
              <Plus size={22} strokeWidth={2.4} />
            </span>
          </span>
          <small>모임 열기</small>
        </button>
        {openSoon.map((item) => (
          <button className="ig-story" key={item.id} onClick={() => openDetail(item.id)} type="button">
            <span className="ig-ring">
              <PosterThumb gathering={item} />
            </span>
            <small>{item.title}</small>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          action={{ label: '모임 열기', onClick: () => setView('create') }}
          description="오늘 점심이든 다음 주 워크샵이든, 먼저 열면 누군가는 옵니다."
          icon={Zap}
          title={filter === '모집중' ? '지금 열린 자리가 없어요' : '해당하는 모임이 없어요'}
        />
      ) : (
        /*
          격자에서 피드로 바꿨다. 격자는 "무엇이 있나"만 보여주고 판단에 필요한
          사실(누가 열었나 · 언제 · 몇 자리 남았나)을 전부 상세로 미뤘는데,
          그 셋이 실제로는 "갈지 말지"를 정하는 전부였다. 피드는 한 건씩만
          보여주는 대신 그 셋을 포스터 아래에 같이 놓는다.

          좋아요와 댓글은 넣지 않았다. 데이터 모델에 없어서 넣으면 아무 데도
          저장되지 않는 가짜 버튼이 된다. 그 자리는 실제로 있는 것 —
          신청한 사람 — 이 대신 채운다.
        */
        <div className="ig-feed">
          {visible.map((item) => {
            const status = deriveStatus(item, signups, now);
            const { confirmed } = splitRoster(item, signups);
            const seat = mySeat(item, signups, currentUser.name);
            const left = spotsLeft(item, signups);
            const waitlistOnly = canJoinWaitlist(item, signups, now);
            const joinable = status === '모집중' || waitlistOnly;
            const poster = item.poster ?? localPoster(item);

            return (
              <article className="ig-post" key={item.id}>
                <header className="ig-post-head">
                  <span className="ig-ava">{item.host.slice(0, 1)}</span>
                  <span className="ig-post-who">
                    <b>{item.host}</b>
                    <span>
                      {item.place} · {formatWhen(item.startAt)}
                    </span>
                  </span>
                  <span className={`ig-post-status ${STATUS_TONE[status]}`}>{status}</span>
                </header>

                <button
                  aria-label={`${item.title} 자세히 보기`}
                  className="ig-media"
                  onClick={() => openDetail(item.id)}
                  type="button"
                >
                  <PosterFrame gathering={item} />
                  {left !== null && left > 0 && <span className="ig-media-tag">{left}자리 남음</span>}
                </button>

                <div className="ig-post-body">
                  {confirmed.length > 0 ? (
                    <p className="ig-roster">
                      <span className="ig-stack">
                        {confirmed.slice(0, 3).map((signup) => (
                          <span className="ig-ava sm" key={signup.id}>
                            {signup.name.slice(0, 1)}
                          </span>
                        ))}
                      </span>
                      <span>
                        <b>{confirmed[0].name}</b>
                        {confirmed.length > 1 ? `님 외 ${confirmed.length - 1}명이 신청했어요` : '님이 신청했어요'}
                      </span>
                    </p>
                  ) : (
                    <p className="ig-roster empty">아직 아무도 신청하지 않았어요</p>
                  )}

                  <p className="ig-cap">
                    <b>{item.host}</b>
                    {item.desc || poster.headline}
                  </p>

                  <button className="ig-more-link" onClick={() => openDetail(item.id)} type="button">
                    자세히 보기
                  </button>

                  {seat === '확정' && (
                    <button className="ig-join done" onClick={() => onLeave(item)} type="button">
                      <Check size={16} />
                      신청함 · 취소하기
                    </button>
                  )}
                  {seat && seat !== '확정' && (
                    <button className="ig-join done" onClick={() => onLeave(item)} type="button">
                      <Hourglass size={16} />
                      대기 {seat.대기}번 · 취소하기
                    </button>
                  )}
                  {!seat && joinable && (
                    <button className="ig-join" onClick={() => onJoin(item)} type="button">
                      {waitlistOnly ? '대기 걸기' : '참여하기'}
                      {left !== null && left > 0 && ` · ${left}자리 남음`}
                    </button>
                  )}
                  {!seat && !joinable && (
                    <button className="ig-join closed" disabled type="button">
                      {status === '마감' ? '자리가 다 찼어요' : `${status}된 모임이에요`}
                    </button>
                  )}

                  {status === '모집중' && <span className="ig-ago">{timeUntil(item.startAt, now)}</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
