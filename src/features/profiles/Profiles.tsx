import {
  BadgeCheck,
  BriefcaseBusiness,
  MessageCircle,
  PenLine,
  Search,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { PanelHeader } from '../../components/PanelHeader';
import { profiles as initialProfiles } from '../../data/mockData';
import { loadProfiles, saveProfileForUser } from '../../profileStore';
import type { CurrentUser, Profile } from '../../types';

type ProfileDraft = Omit<Profile, 'color'>;
type ProfilesProps = {
  currentUser: CurrentUser;
  // 편집/로드 시 상위(App)의 프로필 디렉토리에 반영 → Avatar 전역 갱신.
  onProfilesChange?: (profiles: Profile[]) => void;
};

type SurveyChoice = {
  label: string;
  value: string;
  helper: string;
};

const colorCycle: Profile['color'][] = ['green', 'red', 'blue', 'yellow'];
const partOptions = ['전체', 'TEST혁신파트', 'ITS혁신파트', '혁신도구파트'];

const fallbackDraft: ProfileDraft = {
  name: '김수정',
  part: '혁신도구파트',
  role: '팀 연결 경험과 문화 지표 기획',
  englishName: 'Crystal',
  birthYear: '1996',
  birthday: '11-18',
  character: 'Bright Orbit',
  trait: '관계형 촉진자',
  style: '사람 사이 연결과 분위기의 변화를 잘 봅니다.',
  collaboration: '사용자 감정과 화면 흐름을 같이 보면 좋은 아이디어가 나옵니다.',
  feedback: '좋았던 점과 바꿀 점을 나눠 들으면 다음 안을 빠르게 잡습니다.',
  guide: '팀원이 실제로 말하기 편한지, 다시 쓰고 싶은지를 함께 봅니다.',
};

const roleChoices: SurveyChoice[] = [
  { label: '경험 설계', value: '팀 연결 경험과 문화 지표 기획', helper: '사람이 쓰는 흐름과 감정을 먼저 봅니다.' },
  { label: '실행 지원', value: '자동화 도구 운영과 팀 업무 개선', helper: '반복 업무와 실행 조건을 정리합니다.' },
  { label: '품질 정리', value: '품질 기준 정리와 테스트 흐름 설계', helper: '완료 기준과 빠진 조건을 꼼꼼히 봅니다.' },
];

const traitChoices: SurveyChoice[] = [
  { label: '관계형', value: '관계형 촉진자', helper: '팀 분위기와 연결감을 민감하게 봅니다.' },
  { label: '실행형', value: '실행형 문제 해결가', helper: '문제를 쪼개고 바로 움직입니다.' },
  { label: '기준형', value: '기준형 설계자', helper: '합의 기준과 운영 구조를 선호합니다.' },
  { label: '맥락형', value: '맥락형 조율가', helper: '결정 전 배경과 리스크를 확인합니다.' },
];

const collaborationChoices: SurveyChoice[] = [
  { label: '같이 그리기', value: '사용자 감정과 화면 흐름을 같이 보면 좋은 아이디어가 나옵니다.', helper: '초기 아이디어를 함께 만지는 방식' },
  { label: '기준 먼저', value: '목표와 제약 조건을 같이 알려주면 현실적인 실행안을 만듭니다.', helper: '조건을 먼저 맞추는 방식' },
  { label: '짧은 단위', value: '오늘 끝낼 단위로 이야기하면 협업이 쉬워집니다.', helper: '작게 쪼개 빠르게 진행' },
];

const feedbackChoices: SurveyChoice[] = [
  { label: '좋은 점 + 바꿀 점', value: '좋았던 점과 바꿀 점을 나눠 들으면 다음 안을 빠르게 잡습니다.', helper: '방향을 잃지 않고 개선' },
  { label: '기준 중심', value: '결과물 기준과 우선순위를 함께 들으면 수정 속도가 빠릅니다.', helper: '무엇이 통과인지 선명하게' },
  { label: '근거 포함', value: '수정 이유와 기대 효과가 같이 있으면 바로 반영합니다.', helper: '왜 바꾸는지까지 이해' },
];

function getAgeMood(birthYear: string) {
  const year = Number(birthYear);

  if (!Number.isFinite(year)) {
    return {
      label: '감각 미입력',
      helper: '조섞기에서 연령대가 한쪽으로 몰리지 않게 하려면 생년을 입력해주세요.',
    };
  }

  if (year >= 1997) {
    return {
      label: '새싹 감각',
      helper: '새로운 관점과 빠른 적응력을 팀에 더해요.',
    };
  }

  if (year >= 1990) {
    return {
      label: '브릿지 감각',
      helper: '경험과 변화 사이를 자연스럽게 이어요.',
    };
  }

  return {
    label: '든든한 감각',
    helper: '쌓인 맥락과 안정감을 팀에 더해요.',
  };
}

export function Profiles({ currentUser, onProfilesChange }: ProfilesProps) {
  const [profileList, setProfileList] = useState<Profile[]>(initialProfiles);
  const [selectedName, setSelectedName] = useState(() => {
    return initialProfiles.find((profile) => profile.name === currentUser.name)?.name ?? initialProfiles[0]?.name ?? '';
  });
  const [partFilter, setPartFilter] = useState('전체');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const myProfile = useMemo(() => {
    return profileList.find((profile) => profile.name === currentUser.name) ?? profileList[0];
  }, [currentUser.name, profileList]);

  const [draft, setDraft] = useState<ProfileDraft>(() => ({
    ...(initialProfiles.find((profile) => profile.name === currentUser.name) ?? fallbackDraft),
    name: currentUser.name,
    part: currentUser.part === '전체' ? fallbackDraft.part : currentUser.part,
  }));

  const selectedProfile = useMemo(
    () => profileList.find((profile) => profile.name === selectedName) ?? myProfile,
    [myProfile, profileList, selectedName],
  );

  const filteredProfiles = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return profileList
      .filter((profile) => partFilter === '전체' || profile.part === partFilter)
      .filter((profile) => {
        if (!normalizedSearch) return true;
        return [profile.name, profile.englishName, profile.character, profile.trait, profile.role]
          .some((value) => value.toLowerCase().includes(normalizedSearch));
      })
      .sort((a, b) => {
        if (a.name === currentUser.name) return -1;
        if (b.name === currentUser.name) return 1;
        return a.name.localeCompare(b.name, 'ko');
      });
  }, [currentUser.name, partFilter, profileList, searchTerm]);

  const partCounts = useMemo(() => {
    return partOptions.map((part) => ({
      part,
      count: part === '전체' ? profileList.length : profileList.filter((profile) => profile.part === part).length,
    }));
  }, [profileList]);

  const draftColor = myProfile?.color ?? colorCycle[profileList.length % colorCycle.length];
  const previewProfile: Profile = {
    ...draft,
    color: draftColor,
  };
  const myAgeMood = myProfile ? getAgeMood(myProfile.birthYear) : undefined;
  const previewAgeMood = getAgeMood(previewProfile.birthYear);
  const selectedAgeMood = selectedProfile ? getAgeMood(selectedProfile.birthYear) : undefined;

  useEffect(() => {
    let isMounted = true;

    loadProfiles(initialProfiles, currentUser).then((loadedProfiles) => {
      if (!isMounted) return;
      setProfileList(loadedProfiles);
      onProfilesChange?.(loadedProfiles);
      const nextMine = loadedProfiles.find((profile) => profile.name === currentUser.name) ?? loadedProfiles[0];
      if (nextMine) {
        setSelectedName(nextMine.name);
        setDraft({
          name: nextMine.name,
          part: nextMine.part,
          role: nextMine.role,
          englishName: nextMine.englishName,
          birthYear: nextMine.birthYear,
          birthday: nextMine.birthday,
          character: nextMine.character,
          trait: nextMine.trait,
          style: nextMine.style,
          collaboration: nextMine.collaboration,
          feedback: nextMine.feedback,
          guide: nextMine.guide,
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const updateDraft = (field: keyof ProfileDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const startEdit = () => {
    if (myProfile) {
      setDraft({
        name: myProfile.name,
        part: myProfile.part,
        role: myProfile.role,
        englishName: myProfile.englishName,
        birthYear: myProfile.birthYear,
        birthday: myProfile.birthday,
        character: myProfile.character,
        trait: myProfile.trait,
        style: myProfile.style,
        collaboration: myProfile.collaboration,
        feedback: myProfile.feedback,
        guide: myProfile.guide,
      });
    }
    setIsEditing(true);
  };

  const saveProfile = () => {
    if (!draft.name.trim()) return;

    const nextProfile: Profile = {
      ...draft,
      name: draft.name.trim(),
      color: myProfile?.color ?? colorCycle[profileList.length % colorCycle.length],
    };
    const nextProfiles = [nextProfile, ...profileList.filter((profile) => profile.name !== nextProfile.name)];
    setProfileList(nextProfiles);
    onProfilesChange?.(nextProfiles);
    void saveProfileForUser(nextProfile, currentUser, profileList);
    setSelectedName(nextProfile.name);
    setIsEditing(false);
  };

  return (
    <section className="screen profiles-screen">
      {myProfile && (
        <section className={`my-profile-card ${myProfile.color}`}>
          <div className="my-profile-main">
            <div className="my-profile-topline">
              <div className="my-profile-label">
                <UserRound size={18} />
                내 프로필 카드
              </div>
              <button className="secondary-button" onClick={startEdit}>
                <PenLine size={17} />
                카드 수정
              </button>
            </div>
            <div className="profile-detail-head">
              <div className={`avatar ${myProfile.color}`}>{myProfile.name.slice(0, 1)}</div>
              <div>
                <span>{myProfile.part}</span>
                <h2>{myProfile.name}</h2>
                <strong>{myProfile.englishName} · {myProfile.character}</strong>
              </div>
            </div>
            <div className="profile-mood-row">
              <p>{myProfile.trait}</p>
              {myAgeMood && <span className="age-mood-pill">{myAgeMood.label}</span>}
            </div>
          </div>
          <div className="my-profile-notes">
            <div>
              <span>역할</span>
              <strong>{myProfile.role}</strong>
            </div>
            <div>
              <span>협업</span>
              <strong>{myProfile.collaboration}</strong>
            </div>
            <div>
              <span>피드백</span>
              <strong>{myProfile.feedback}</strong>
            </div>
            <div>
              <span>조섞기 무드</span>
              <strong>{myAgeMood?.helper}</strong>
            </div>
          </div>
        </section>
      )}

      {isEditing && (
        <section className="panel profile-form-panel profile-survey-panel">
          <PanelHeader icon={PenLine} title="성향 카드 짧은 설문" />
          <div className="profile-mini-fields">
            <label>
              영어 이름
              <input value={draft.englishName} onChange={(event) => updateDraft('englishName', event.target.value)} />
            </label>
            <label>
              성향 캐릭터
              <input value={draft.character} onChange={(event) => updateDraft('character', event.target.value)} />
            </label>
          </div>
          <div className="profile-private-fields">
            <div>
              <strong>조섞기용 셀프 기록</strong>
              <span>카드에는 생년 대신 무드 라벨로만 보여요. 조섞기에서는 연령대가 한쪽으로 몰리지 않게 쓰입니다.</span>
            </div>
            <div className="profile-mini-fields">
              <label>
                태어난 연도
                <input
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="1996"
                  value={draft.birthYear}
                  onChange={(event) => updateDraft('birthYear', event.target.value)}
                />
              </label>
              <label>
                생일
                <input placeholder="MM-DD" value={draft.birthday} onChange={(event) => updateDraft('birthday', event.target.value)} />
              </label>
            </div>
          </div>
          <SurveyQuestion title="주로 맡는 역할은?" field="role" value={draft.role} choices={roleChoices} onSelect={updateDraft} />
          <SurveyQuestion title="일하는 성향에 가까운 쪽은?" field="trait" value={draft.trait} choices={traitChoices} onSelect={updateDraft} />
          <SurveyQuestion title="협업할 때 편한 방식은?" field="collaboration" value={draft.collaboration} choices={collaborationChoices} onSelect={updateDraft} />
          <SurveyQuestion title="피드백은 어떻게 받는 게 좋은가요?" field="feedback" value={draft.feedback} choices={feedbackChoices} onSelect={updateDraft} />
          <label>
            동료에게 남길 한 줄 가이드
            <input value={draft.guide} onChange={(event) => updateDraft('guide', event.target.value)} />
          </label>
          <div className="profile-form-actions">
            <button className="secondary-button" onClick={() => setIsEditing(false)}>
              닫기
            </button>
            <button className="primary-button" onClick={saveProfile}>
              <BadgeCheck size={18} />
              카드 저장
            </button>
          </div>
        </section>
      )}

      <aside className="profile-side">
        <section className={`profile-card feature-preview ${previewProfile.color}`}>
          <div className="profile-card-head">
            <div className="avatar">{previewProfile.name.slice(0, 1)}</div>
            <div>
              <span>{previewProfile.part}</span>
              <h2>{previewProfile.name}</h2>
              <strong>{previewProfile.englishName} · {previewProfile.character}</strong>
            </div>
          </div>
          <p>{previewProfile.trait}</p>
          <div className="profile-chip-list">
            <span>{previewAgeMood.label}</span>
            <span>{previewProfile.role}</span>
            <span>{previewProfile.collaboration}</span>
          </div>
        </section>

      </aside>

      <section className="panel profile-directory">
        <PanelHeader icon={Sparkles} title="동료 프로필 찾기" />
        <div className="profile-directory-tools">
          <label>
            파트
            <select value={partFilter} onChange={(event) => setPartFilter(event.target.value)}>
              {partCounts.map((item) => (
                <option key={item.part} value={item.part}>
                  {item.part} · {item.count}명
                </option>
              ))}
            </select>
          </label>
          <label>
            검색
            <div className="profile-search-box">
              <Search size={18} />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="이름, 성향, 역할로 찾기" />
            </div>
          </label>
        </div>
        <div className="profile-result-summary">
          <strong>{filteredProfiles.length}명</strong>
          <span>30명 규모에서는 파트와 검색으로 좁혀서 보는 흐름이 가장 빠릅니다.</span>
        </div>
        <div className="profile-list-grid">
          {filteredProfiles.map((profile) => (
            <button className={selectedProfile?.name === profile.name ? 'selected' : ''} key={profile.name} onClick={() => setSelectedName(profile.name)}>
              <Avatar name={profile.name} color={profile.color} />
              <div>
                <strong>{profile.name}{profile.name === currentUser.name ? ' · 나' : ''}</strong>
                <small>{profile.part} · {profile.englishName}</small>
              </div>
              <em>{getAgeMood(profile.birthYear).label}</em>
            </button>
          ))}
        </div>
      </section>

      {selectedProfile && (
        <section className="panel profile-detail">
          <div className="profile-detail-head">
            <div className={`avatar ${selectedProfile.color}`}>{selectedProfile.name.slice(0, 1)}</div>
            <div>
              <span>{selectedProfile.part}</span>
              <h2>{selectedProfile.name}</h2>
              <strong>{selectedProfile.englishName} · {selectedProfile.character}</strong>
            </div>
          </div>
          <div className="profile-detail-grid">
            <div>
              <BriefcaseBusiness size={20} />
              <span>역할</span>
              <strong>{selectedProfile.role}</strong>
            </div>
            <div>
              <Sparkles size={20} />
              <span>성향</span>
              <strong>{selectedProfile.trait}</strong>
            </div>
            <div>
              <UserRound size={20} />
              <span>조섞기 무드</span>
              <strong>{selectedAgeMood?.label}</strong>
            </div>
            <div>
              <MessageCircle size={20} />
              <span>협업 선호</span>
              <strong>{selectedProfile.collaboration}</strong>
            </div>
            <div>
              <BadgeCheck size={20} />
              <span>피드백 선호</span>
              <strong>{selectedProfile.feedback}</strong>
            </div>
          </div>
          <div className="profile-guide">
            <strong>동료 이해 가이드</strong>
            <p>{selectedProfile.guide}</p>
          </div>
        </section>
      )}
    </section>
  );
}

function SurveyQuestion({
  title,
  field,
  value,
  choices,
  onSelect,
}: {
  title: string;
  field: keyof ProfileDraft;
  value: string;
  choices: SurveyChoice[];
  onSelect: (field: keyof ProfileDraft, value: string) => void;
}) {
  return (
    <fieldset className="survey-question">
      <legend>{title}</legend>
      <div className="survey-choice-grid">
        {choices.map((choice) => (
          <button className={value === choice.value ? 'selected' : ''} key={choice.value} type="button" onClick={() => onSelect(field, choice.value)}>
            <strong>{choice.label}</strong>
            <span>{choice.helper}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
