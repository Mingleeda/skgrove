import { BadgeCheck, Coffee, Dice5, Search, Shuffle, Sparkles, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PanelHeader } from '../../components/PanelHeader';
import { profiles } from '../../data/mockData';
import type { Profile } from '../../types';

type ConnectProps = {
  matched: string[];
  onShuffleTeams: () => void;
};

type ConnectMode = 'coffee' | 'teams';
type BalanceRule = 'part' | 'age' | 'both' | 'random';
type TeamBasis = 'count' | 'size';

type TeamGroup = {
  id: number;
  members: Profile[];
};

const participantNames = profiles.map((profile) => profile.name);
const partOrder = ['TEST혁신파트', 'ITS혁신파트', '혁신도구파트'];

function getAgeMood(birthYear: string) {
  const year = Number(birthYear);

  if (!Number.isFinite(year)) return { key: 'unknown', label: '감각 미입력' };
  if (year >= 1997) return { key: 'fresh', label: '새싹 감각' };
  if (year >= 1990) return { key: 'bridge', label: '브릿지 감각' };
  return { key: 'steady', label: '든든한 감각' };
}

function shuffleProfiles(items: Profile[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function getBalanceKey(profile: Profile, rule: BalanceRule) {
  if (rule === 'part') return profile.part;
  if (rule === 'age') return getAgeMood(profile.birthYear).key;
  if (rule === 'both') return `${profile.part}-${getAgeMood(profile.birthYear).key}`;
  return 'random';
}

function buildBalancedTeams(participants: Profile[], teamCount: number, rule: BalanceRule) {
  const groups: TeamGroup[] = Array.from({ length: teamCount }, (_, index) => ({ id: index + 1, members: [] }));
  const buckets = new Map<string, Profile[]>();

  shuffleProfiles(participants).forEach((profile) => {
    const key = getBalanceKey(profile, rule);
    buckets.set(key, [...(buckets.get(key) ?? []), profile]);
  });

  const ordered = [...buckets.values()].flatMap((bucket) => bucket);
  ordered.forEach((profile, index) => {
    const round = Math.floor(index / teamCount);
    const position = index % teamCount;
    const groupIndex = round % 2 === 0 ? position : teamCount - position - 1;
    groups[groupIndex].members.push(profile);
  });

  return groups;
}

function getTeamCount(participantCount: number, basis: TeamBasis, value: number) {
  if (participantCount === 0) return 0;
  if (basis === 'count') return Math.min(Math.max(1, value), participantCount);
  return Math.ceil(participantCount / Math.max(2, value));
}

export function Connect({ matched: _matched, onShuffleTeams: _onShuffleTeams }: ConnectProps) {
  const [mode, setMode] = useState<ConnectMode>('teams');
  const [selectedNames, setSelectedNames] = useState(participantNames);
  const [balanceRule, setBalanceRule] = useState<BalanceRule>('both');
  const [teamBasis, setTeamBasis] = useState<TeamBasis>('count');
  const [teamValue, setTeamValue] = useState(4);
  const [coffeeBuyer, setCoffeeBuyer] = useState<Profile | null>(null);
  const [teams, setTeams] = useState<TeamGroup[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [teamEventText, setTeamEventText] = useState('조건을 고르고 셔플 버튼을 눌러보세요');
  const [coffeeEventText, setCoffeeEventText] = useState('컵을 고르고 운명을 맡겨보세요');
  const [coffeeRound, setCoffeeRound] = useState(0);
  const [coffeeSpotlight, setCoffeeSpotlight] = useState<Profile | null>(null);
  const [participantSearch, setParticipantSearch] = useState('');

  const selectedParticipants = useMemo(() => {
    return profiles.filter((profile) => selectedNames.includes(profile.name));
  }, [selectedNames]);

  const visibleParticipants = useMemo(() => {
    const keyword = participantSearch.trim().toLowerCase();

    if (!keyword) return profiles;
    return profiles.filter((profile) => (
      profile.name.toLowerCase().includes(keyword) ||
      profile.part.toLowerCase().includes(keyword) ||
      getAgeMood(profile.birthYear).label.toLowerCase().includes(keyword)
    ));
  }, [participantSearch]);

  const visibleParticipantsByPart = useMemo(() => {
    return partOrder.map((part) => ({
      part,
      members: visibleParticipants.filter((profile) => profile.part === part),
    }));
  }, [visibleParticipants]);

  const teamCount = getTeamCount(selectedParticipants.length, teamBasis, teamValue);
  const selectedParts = new Set(selectedParticipants.map((profile) => profile.part)).size;
  const selectedAgeMoods = new Set(selectedParticipants.map((profile) => getAgeMood(profile.birthYear).key)).size;

  const toggleParticipant = (name: string) => {
    setSelectedNames((current) => (
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
    ));
  };

  const selectAll = () => {
    setSelectedNames(participantNames);
  };

  const clearAll = () => {
    setSelectedNames([]);
    setCoffeeBuyer(null);
    setCoffeeSpotlight(null);
    setTeams([]);
  };

  const togglePart = (part: string) => {
    const partMemberNames = profiles.filter((profile) => profile.part === part).map((profile) => profile.name);
    const hasEveryMember = partMemberNames.every((name) => selectedNames.includes(name));

    setSelectedNames((current) => (
      hasEveryMember
        ? current.filter((name) => !partMemberNames.includes(name))
        : [...new Set([...current, ...partMemberNames])]
    ));
  };

  const drawCoffeeBuyer = () => {
    if (selectedParticipants.length < 2 || isDrawing) return;

    setIsDrawing(true);
    setCoffeeBuyer(null);
    setCoffeeRound(1);
    setCoffeeSpotlight(selectedParticipants[0] ?? null);
    setCoffeeEventText('3개의 컵이 동시에 출발합니다');

    const spinTimer = window.setInterval(() => {
      setCoffeeRound((current) => current + 1);
      setCoffeeSpotlight(selectedParticipants[Math.floor(Math.random() * selectedParticipants.length)]);
    }, 130);

    window.setTimeout(() => {
      setCoffeeEventText('마지막 한 바퀴...');
    }, 520);

    window.setTimeout(() => {
      window.clearInterval(spinTimer);
      const winner = selectedParticipants[Math.floor(Math.random() * selectedParticipants.length)];
      setCoffeeBuyer(winner);
      setCoffeeSpotlight(winner);
      setCoffeeEventText(`${winner.name}님, 오늘의 커피 요정 당첨`);
      setIsDrawing(false);
    }, 1280);
  };

  const drawTeams = () => {
    if (selectedParticipants.length < 2 || teamCount === 0 || isDrawing) return;

    setIsDrawing(true);
    setTeams([]);
    setTeamEventText('파트와 감각을 테이블 위에 골고루 펼치는 중...');

    window.setTimeout(() => {
      const nextTeams = buildBalancedTeams(selectedParticipants, teamCount, balanceRule);
      setTeams(nextTeams);
      setTeamEventText(`${nextTeams.length}개 조가 완성됐어요`);
      setIsDrawing(false);
    }, 860);
  };

  return (
    <section className="screen connect-screen">
      <section className="panel connect-studio">
        <PanelHeader icon={Shuffle} title="커피뽑기 / 조뽑기" />
        <div className="connect-mode-tabs" role="tablist" aria-label="뽑기 방식">
          <button className={mode === 'teams' ? 'selected' : ''} onClick={() => setMode('teams')} type="button">
            <UsersRound size={18} />
            조뽑기
          </button>
          <button className={mode === 'coffee' ? 'selected' : ''} onClick={() => setMode('coffee')} type="button">
            <Coffee size={18} />
            커피뽑기
          </button>
        </div>

        <div className="connect-layout">
          <aside className={`participant-panel ${mode === 'coffee' ? 'coffee-participants' : 'team-participants'}`}>
            <div className="participant-head">
              <div>
                <strong>참여자 선택</strong>
                <span>{selectedParticipants.length}명 선택</span>
              </div>
              <div>
                <button className="secondary-button" onClick={selectAll} type="button">전체</button>
                <button className="secondary-button" onClick={clearAll} type="button">해제</button>
              </div>
            </div>
            <div className="participant-search">
              <Search size={17} />
              <input
                placeholder={mode === 'coffee' ? '이름으로 빠르게 찾기' : '이름, 파트, 감각으로 찾기'}
                value={participantSearch}
                onChange={(event) => setParticipantSearch(event.target.value)}
              />
            </div>
            {mode === 'coffee' ? (
              <div className="coffee-chip-grid">
                {visibleParticipants.map((profile) => (
                  <button
                    className={selectedNames.includes(profile.name) ? `selected ${profile.color}` : ''}
                    key={profile.name}
                    onClick={() => toggleParticipant(profile.name)}
                    type="button"
                  >
                    {profile.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="part-group-list">
                {visibleParticipantsByPart.map((group) => (
                  <section className="part-group" key={group.part}>
                    <div className="part-group-head">
                      <div>
                        <strong>{group.part}</strong>
                        <span>{group.members.filter((member) => selectedNames.includes(member.name)).length}/{group.members.length}명 선택</span>
                      </div>
                      <button className="secondary-button" onClick={() => togglePart(group.part)} type="button">파트 선택</button>
                    </div>
                    <div className="participant-list compact">
                      {group.members.map((profile) => {
                        const ageMood = getAgeMood(profile.birthYear);
                        const isSelected = selectedNames.includes(profile.name);

                        return (
                          <button
                            className={isSelected ? `selected ${profile.color}` : ''}
                            key={profile.name}
                            onClick={() => toggleParticipant(profile.name)}
                            type="button"
                          >
                            <span className={`tiny-avatar ${profile.color}`}>{profile.name.slice(0, 1)}</span>
                            <div>
                              <strong>{profile.name}</strong>
                              <small>{ageMood.label}</small>
                            </div>
                            {isSelected && <BadgeCheck size={18} />}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </aside>

          <div className="connect-workbench">
            {mode === 'teams' ? (
              <>
                <section className="connect-control-panel">
                  <div className="connect-control-grid">
                    <label>
                      섞기 조건
                      <select value={balanceRule} onChange={(event) => setBalanceRule(event.target.value as BalanceRule)}>
                        <option value="both">파트 + 연령대 골고루</option>
                        <option value="part">파트 골고루</option>
                        <option value="age">연령대 골고루</option>
                        <option value="random">랜덤</option>
                      </select>
                    </label>
                    <label>
                      편성 기준
                      <select value={teamBasis} onChange={(event) => setTeamBasis(event.target.value as TeamBasis)}>
                        <option value="count">조 개수</option>
                        <option value="size">조 인원</option>
                      </select>
                    </label>
                    <label>
                      {teamBasis === 'count' ? '조 개수' : '조당 인원'}
                      <input
                        max={selectedParticipants.length || 1}
                        min={teamBasis === 'count' ? 1 : 2}
                        type="number"
                        value={teamValue}
                        onChange={(event) => setTeamValue(Number(event.target.value))}
                      />
                    </label>
                  </div>
                  <div className="connect-summary-strip">
                    <span>파트 {selectedParts}종</span>
                    <span>감각 {selectedAgeMoods}종</span>
                    <span>예상 {teamCount}개 조</span>
                  </div>
                  <button className="primary-button wide" disabled={selectedParticipants.length < 2 || isDrawing} onClick={drawTeams} type="button">
                    <Sparkles size={18} />
                    조 섞기 시작
                  </button>
                </section>

                <DrawStage isDrawing={isDrawing} text={teamEventText} variant="teams" />

                <section className="team-result-grid">
                  {teams.map((team) => (
                    <article className="team-result-card" key={team.id}>
                      <div className="team-result-head">
                        <strong>{team.id}조</strong>
                        <span>{team.members.length}명</span>
                      </div>
                      <div className="team-member-list">
                        {team.members.map((member) => (
                          <div key={member.name}>
                            <span className={`tiny-avatar ${member.color}`}>{member.name.slice(0, 1)}</span>
                            <div>
                              <strong>{member.name}</strong>
                              <small>{member.part} · {getAgeMood(member.birthYear).label}</small>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </section>
              </>
            ) : (
              <>
                <section className="connect-control-panel coffee-panel">
                  <div>
                    <strong>오늘 커피는 누가 살까요?</strong>
                    <span>참여자를 고르고 버튼을 누르면 한 명이 당첨됩니다.</span>
                  </div>
                  <button className="primary-button wide" disabled={selectedParticipants.length < 2 || isDrawing} onClick={drawCoffeeBuyer} type="button">
                    <Dice5 size={18} />
                    커피 살 사람 뽑기
                  </button>
                </section>

                <CoffeeDrawStage
                  buyer={coffeeBuyer}
                  isDrawing={isDrawing}
                  round={coffeeRound}
                  spotlight={coffeeSpotlight}
                  text={coffeeEventText}
                />

                {coffeeBuyer && (
                  <section className={`coffee-winner-card ${coffeeBuyer.color}`}>
                    <Coffee size={34} />
                    <span>오늘의 커피 담당</span>
                    <strong>{coffeeBuyer.name}</strong>
                    <p>{coffeeBuyer.part} · {getAgeMood(coffeeBuyer.birthYear).label}</p>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}

function DrawStage({ isDrawing, text, variant }: { isDrawing: boolean; text: string; variant: ConnectMode }) {
  return (
    <section className={isDrawing ? `draw-stage rolling ${variant}` : `draw-stage ${variant}`}>
      <div className="draw-orbit">
        <span />
        <span />
        <span />
        <span />
      </div>
      <strong>{text}</strong>
    </section>
  );
}

function CoffeeDrawStage({
  buyer,
  isDrawing,
  round,
  spotlight,
  text,
}: {
  buyer: Profile | null;
  isDrawing: boolean;
  round: number;
  spotlight: Profile | null;
  text: string;
}) {
  const displayName = spotlight?.name ?? buyer?.name ?? '???';

  return (
    <section className={isDrawing ? 'coffee-draw-stage rolling' : buyer ? 'coffee-draw-stage finished' : 'coffee-draw-stage'}>
      <div className="coffee-confetti" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="coffee-cup-track" aria-hidden="true">
        <div className="coffee-cup">
          <Coffee size={24} />
        </div>
        <div className="coffee-cup main">
          <Coffee size={28} />
        </div>
        <div className="coffee-cup">
          <Coffee size={24} />
        </div>
      </div>
      <div className="coffee-draw-copy">
        <span>{isDrawing ? `ROUND ${Math.min(round, 9)}` : buyer ? 'RESULT' : 'READY'}</span>
        <strong>{text}</strong>
        <em>{displayName}</em>
      </div>
    </section>
  );
}
