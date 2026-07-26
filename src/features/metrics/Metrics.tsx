import { BarChart3, CalendarClock, CheckCircle2, Gauge, Settings2, Sparkles, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';

type PartMetric = {
  name: string;
  members: number;
  opinionSubmitted: number;
  reflectedOpinions: number;
  voteParticipation: number;
  coffeeParticipation: number;
  oneOnOneMinutes: number;
  partMeetingMinutes: number;
  longMeetingRate: number;
  meetingTrend: string;
  profileColors: {
    label: string;
    value: number;
    color: 'green' | 'red' | 'blue' | 'yellow';
  }[];
  traits: string[];
};

type MetricWeights = {
  opinion: number;
  reflected: number;
  participation: number;
  healthyMeeting: number;
  overloadPenalty: number;
  rewardScore: number;
};

const initialWeights: MetricWeights = {
  opinion: 20,
  reflected: 30,
  participation: 20,
  healthyMeeting: 20,
  overloadPenalty: 10,
  rewardScore: 82,
};

const partMetrics: PartMetric[] = [
  {
    name: 'TEST혁신파트',
    members: 10,
    opinionSubmitted: 18,
    reflectedOpinions: 12,
    voteParticipation: 88,
    coffeeParticipation: 74,
    oneOnOneMinutes: 360,
    partMeetingMinutes: 410,
    longMeetingRate: 18,
    meetingTrend: '원온원은 충분하고 파트회의 길이는 안정권이에요.',
    profileColors: [
      { label: '맥락형', value: 34, color: 'green' },
      { label: '실행형', value: 23, color: 'red' },
      { label: '구조형', value: 28, color: 'blue' },
      { label: '연결형', value: 15, color: 'yellow' },
    ],
    traits: ['질문을 촘촘히 쌓음', '리스크를 먼저 발견', '합의 후 실행이 빠름'],
  },
  {
    name: 'ITS혁신파트',
    members: 9,
    opinionSubmitted: 13,
    reflectedOpinions: 9,
    voteParticipation: 79,
    coffeeParticipation: 68,
    oneOnOneMinutes: 280,
    partMeetingMinutes: 620,
    longMeetingRate: 36,
    meetingTrend: '파트회의가 길어지는 편이라 45분 컷 운영을 권장해요.',
    profileColors: [
      { label: '맥락형', value: 18, color: 'green' },
      { label: '실행형', value: 38, color: 'red' },
      { label: '구조형', value: 19, color: 'blue' },
      { label: '연결형', value: 25, color: 'yellow' },
    ],
    traits: ['빠른 이슈 분해', '실행 실험 선호', '분위기 전환이 좋음'],
  },
  {
    name: '혁신도구파트',
    members: 11,
    opinionSubmitted: 16,
    reflectedOpinions: 8,
    voteParticipation: 73,
    coffeeParticipation: 82,
    oneOnOneMinutes: 310,
    partMeetingMinutes: 540,
    longMeetingRate: 29,
    meetingTrend: '파트 연결 활동은 강하지만 의견 반영 속도는 조금 더 보이면 좋아요.',
    profileColors: [
      { label: '맥락형', value: 20, color: 'green' },
      { label: '실행형', value: 18, color: 'red' },
      { label: '구조형', value: 42, color: 'blue' },
      { label: '연결형', value: 20, color: 'yellow' },
    ],
    traits: ['복잡한 흐름 구조화', '도구화 감각', '파트 간 연결에 적극적'],
  },
];

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getMeetingHealth(part: PartMetric) {
  const weeklyMeetingHours = (part.oneOnOneMinutes + part.partMeetingMinutes) / 60;
  const overload = Math.max(0, weeklyMeetingHours - 12) * 3 + part.longMeetingRate * 0.7;
  return clampScore(100 - overload);
}

function getReflectionRate(part: PartMetric) {
  return Math.round((part.reflectedOpinions / part.opinionSubmitted) * 100);
}

function getPartScore(part: PartMetric, weights: MetricWeights) {
  const opinionScore = Math.min(100, part.opinionSubmitted * 5);
  const reflectedScore = getReflectionRate(part);
  const participationScore = Math.round((part.voteParticipation + part.coffeeParticipation) / 2);
  const meetingHealth = getMeetingHealth(part);
  const longMeetingPenalty = part.longMeetingRate * (weights.overloadPenalty / 30);

  return clampScore(
    (opinionScore * weights.opinion +
      reflectedScore * weights.reflected +
      participationScore * weights.participation +
      meetingHealth * weights.healthyMeeting) /
      (weights.opinion + weights.reflected + weights.participation + weights.healthyMeeting) -
      longMeetingPenalty,
  );
}

function getDominantTone(part: PartMetric) {
  return [...part.profileColors].sort((a, b) => b.value - a.value)[0];
}

export function Metrics() {
  const [selectedPart, setSelectedPart] = useState(partMetrics[0].name);
  const [weights, setWeights] = useState(initialWeights);

  const scoredParts = useMemo(
    () =>
      partMetrics
        .map((part) => ({
          ...part,
          score: getPartScore(part, weights),
          meetingHealth: getMeetingHealth(part),
          reflectionRate: getReflectionRate(part),
          dominantTone: getDominantTone(part),
        }))
        .sort((a, b) => b.score - a.score),
    [weights],
  );

  const activePart = scoredParts.find((part) => part.name === selectedPart) ?? scoredParts[0];
  const rewardCandidates = scoredParts.filter((part) => part.score >= weights.rewardScore);
  const totalOpinions = scoredParts.reduce((sum, part) => sum + part.opinionSubmitted, 0);
  const reflectedOpinions = scoredParts.reduce((sum, part) => sum + part.reflectedOpinions, 0);
  const averageMeetingHealth = Math.round(scoredParts.reduce((sum, part) => sum + part.meetingHealth, 0) / scoredParts.length);

  const updateWeight = (key: keyof MetricWeights, value: number) => {
    setWeights({ ...weights, [key]: value });
  };

  return (
    <section className="screen metrics-screen">
      <section className="metrics-hero">
        <div>
          <p className="eyebrow">CULTURE HEALTH REPORT</p>
          <h2>파트의 회의 습관, 의견 반영, 성향 색을 함께 봅니다.</h2>
          <p>구글캘린더 연결 전에는 샘플 회의 데이터를 기준으로 분석하고, 연결 후에는 원온원과 파트회의 시간이 자동 반영됩니다.</p>
        </div>
        <div className="calendar-sync-card">
          <CalendarClock size={22} />
          <strong>Google Calendar</strong>
          <span>연결 예정 · 회의 길이 자동 분석</span>
        </div>
      </section>

      <section className="metrics-summary">
        <div>
          <BarChart3 size={20} />
          의견 제출
          <strong>{totalOpinions}</strong>
        </div>
        <div>
          <CheckCircle2 size={20} />
          반영률
          <strong>{Math.round((reflectedOpinions / totalOpinions) * 100)}%</strong>
        </div>
        <div>
          <Gauge size={20} />
          회의 건강도
          <strong>{averageMeetingHealth}</strong>
        </div>
        <div>
          <Sparkles size={20} />
          보상 후보
          <strong>{rewardCandidates.length}</strong>
        </div>
      </section>

      <div className="metrics-layout">
        <section className="panel metrics-ranking">
          <div className="panel-header">
            <BarChart3 size={20} />
            <h2>파트지수 랭킹</h2>
          </div>
          <div className="metrics-part-list">
            {scoredParts.map((part) => (
              <button
                className={part.name === activePart.name ? 'selected' : ''}
                key={part.name}
                onClick={() => setSelectedPart(part.name)}
                type="button"
              >
                <div>
                  <strong>{part.name}</strong>
                  <span>{part.members}명 · 반영률 {part.reflectionRate}%</span>
                </div>
                <em>{part.score}</em>
              </button>
            ))}
          </div>
        </section>

        <section className="panel metrics-detail">
          <div className="metrics-detail-head">
            <div>
              <p className="eyebrow">선택 파트 분석</p>
              <h2>{activePart.name}</h2>
            </div>
            {activePart.score >= weights.rewardScore && <span className="reward-badge">보상 후보</span>}
          </div>

          <div className="metrics-score-grid">
            <div>
              파트지수
              <strong>{activePart.score}</strong>
            </div>
            <div>
              의견 반영도
              <strong>{activePart.reflectionRate}%</strong>
            </div>
            <div>
              긴 회의 비율
              <strong>{activePart.longMeetingRate}%</strong>
            </div>
          </div>

          <div className="meeting-health-card">
            <div>
              <CalendarClock size={20} />
              <strong>회의 건강도</strong>
              <span>{activePart.meetingTrend}</span>
            </div>
            <div className="meeting-bars">
              <label>
                원온원
                <span style={{ width: `${Math.min(100, activePart.oneOnOneMinutes / 5)}%` }} />
              </label>
              <label>
                파트회의
                <span style={{ width: `${Math.min(100, activePart.partMeetingMinutes / 7)}%` }} />
              </label>
            </div>
          </div>

          <div className="profile-color-panel">
            <div className="panel-header">
              <UsersRound size={20} />
              <h2>파트 성향 팔레트</h2>
            </div>
            <div className="color-stack" aria-label="파트 성향 비율">
              {activePart.profileColors.map((tone) => (
                <span className={tone.color} key={tone.label} style={{ width: `${tone.value}%` }} />
              ))}
            </div>
            <div className="tone-list">
              {activePart.profileColors.map((tone) => (
                <span className={tone.color} key={tone.label}>
                  {tone.label} {tone.value}%
                </span>
              ))}
            </div>
            <p>
              가장 강한 색은 <strong>{activePart.dominantTone.label}</strong>이에요. {activePart.traits.join(', ')} 흐름이
              파트 대화에서 자주 나타납니다.
            </p>
          </div>
        </section>

        <aside className="metrics-side">
          <section className="panel">
            <div className="panel-header">
              <Sparkles size={20} />
              <h2>이번 달 리포트</h2>
            </div>
            <div className="insight-list">
              <p>의견은 총 {totalOpinions}건 접수됐고 {reflectedOpinions}건이 답변/안건/액션으로 이어졌어요.</p>
              <p>{scoredParts[0].name}은 회의 건강도와 의견 반영 균형이 가장 좋아요.</p>
              <p>긴 회의 비율이 높은 파트는 45분 단위 회의 템플릿을 적용해보면 좋아요.</p>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <Settings2 size={20} />
              <h2>계산 기준 설정</h2>
            </div>
            <div className="weight-controls">
              {([
                ['opinion', '의견 제출'],
                ['reflected', '의견 반영'],
                ['participation', '투표/연결 참여'],
                ['healthyMeeting', '회의 건강도'],
                ['overloadPenalty', '긴 회의 감점'],
                ['rewardScore', '보상 기준'],
              ] as const).map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input
                    max={key === 'rewardScore' ? 100 : 40}
                    min={0}
                    onChange={(event) => updateWeight(key, Number(event.target.value))}
                    type="range"
                    value={weights[key]}
                  />
                  <strong>{weights[key]}</strong>
                </label>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
