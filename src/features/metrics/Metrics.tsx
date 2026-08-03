import { BarChart3, CalendarClock, CheckCircle2, Gauge, Settings2, Sparkles, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { loadActionItems } from '../../actionItemStore';
import { loadAgendas } from '../../agendaStore';
import { loadBallots } from '../../ballotStore';
import {
  initialAgendas,
  initialCanOpinions,
  initialCanSessions,
  initialIssues,
  profiles,
} from '../../data/mockData';
import { loadIssues } from '../../issueStore';
import { loadTeaSessions } from '../../teaStore';
import type { ActionItem, Agenda, AgendaBallot, CanOpinion, CanSession, Issue, Profile, TeaSession } from '../../types';

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

const partNames = ['TEST혁신파트', 'ITS혁신파트', '혁신도구파트'];

type MetricsActivity = {
  actionItems: ActionItem[];
  agendas: Agenda[];
  ballots: AgendaBallot[];
  canOpinions: CanOpinion[];
  canSessions: CanSession[];
  connectShareTexts: string[];
  issues: Issue[];
  teaSessions: TeaSession[];
};

const initialActivity: MetricsActivity = {
  actionItems: [],
  agendas: initialAgendas,
  ballots: [],
  canOpinions: initialCanOpinions,
  canSessions: initialCanSessions,
  connectShareTexts: [],
  issues: initialIssues,
  teaSessions: [],
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getMeetingHealth(part: PartMetric) {
  const weeklyMeetingHours = (part.oneOnOneMinutes + part.partMeetingMinutes) / 60;
  const overload = Math.max(0, weeklyMeetingHours - 12) * 3 + part.longMeetingRate * 0.7;
  return clampScore(100 - overload);
}

function getReflectionRate(part: PartMetric) {
  if (part.opinionSubmitted === 0) return 0;
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

function getProfileTone(profile: Profile): PartMetric['profileColors'][number] {
  const source = `${profile.trait} ${profile.style} ${profile.role}`;

  if (/품질|기준|테스트|판단|재현|리스크/.test(source)) {
    return { label: '맥락형', value: 0, color: 'green' };
  }
  if (/빠르게|실행|실험|피드백|개선|시도/.test(source)) {
    return { label: '실행형', value: 0, color: 'red' };
  }
  if (/구조|룰|운영|프로세스|정리|흐름|도구/.test(source)) {
    return { label: '구조형', value: 0, color: 'blue' };
  }
  return { label: '연결형', value: 0, color: 'yellow' };
}

function getProfilePalette(members: Profile[]) {
  const base: PartMetric['profileColors'] = [
    { label: '맥락형', value: 0, color: 'green' },
    { label: '실행형', value: 0, color: 'red' },
    { label: '구조형', value: 0, color: 'blue' },
    { label: '연결형', value: 0, color: 'yellow' },
  ];

  members.forEach((member) => {
    const tone = getProfileTone(member);
    const target = base.find((item) => item.label === tone.label);
    if (target) target.value += 1;
  });

  return base.map((item) => ({
    ...item,
    value: members.length > 0 ? Math.round((item.value / members.length) * 100) : 0,
  }));
}

function getTraits(members: Profile[]) {
  return members
    .map((member) => member.style)
    .filter(Boolean)
    .slice(0, 3);
}

function getConnectParticipation(partMembers: Profile[], shareTexts: string[]) {
  if (shareTexts.length === 0 || partMembers.length === 0) return 0;

  const participated = new Set<string>();
  shareTexts.forEach((text) => {
    partMembers.forEach((member) => {
      if (text.includes(member.name)) participated.add(member.name);
    });
  });

  return Math.round((participated.size / partMembers.length) * 100);
}

function getVoteParticipation(partAgendas: Agenda[], allAgendas: Agenda[], ballots: AgendaBallot[]) {
  const targetAgendas = partAgendas.length > 0 ? partAgendas : allAgendas;
  const eligibleCount = targetAgendas.reduce((sum, agenda) => sum + Math.max(agenda.eligibleCount, 0), 0);
  const visibleVoteCount = targetAgendas.reduce((sum, agenda) => sum + agenda.approve + agenda.reject, 0);
  const anonymousBallotHint = allAgendas.length > 0 ? Math.round(ballots.length / allAgendas.length) : 0;

  if (eligibleCount <= 0) return 0;
  return clampScore(((visibleVoteCount + anonymousBallotHint) / eligibleCount) * 100);
}

function getMeetingTrend(partMeetingMinutes: number, longMeetingRate: number) {
  if (longMeetingRate >= 35) return '긴 회의 비율이 높아 45분 컷 운영을 권장해요.';
  if (partMeetingMinutes >= 520) return '파트회의 총량이 높아 안건 사전 정리를 붙이면 좋아요.';
  return '원온원과 파트회의 길이가 안정권이에요.';
}

function readConnectShareTexts() {
  try {
    const saved = window.localStorage.getItem('skgrove:connect-results');
    if (!saved) return [];
    const parsed = JSON.parse(saved) as { shareText?: string }[];
    return parsed.map((item) => item.shareText ?? '').filter(Boolean);
  } catch {
    return [];
  }
}

function buildPartMetrics(activity: MetricsActivity): PartMetric[] {
  return partNames.map((partName) => {
    const members = profiles.filter((profile) => profile.part === partName);
    const canOpinions = activity.canOpinions.filter((opinion) => opinion.part === partName);
    const partAgendas = activity.agendas.filter((agenda) => agenda.part === partName || agenda.part === '전체');
    const partActions = activity.actionItems.filter((item) => members.some((member) => item.owner === member.name));
    const reflectedFromCan = canOpinions.filter((opinion) => opinion.selected).length;
    const reflectedFromActions = partActions.filter((item) => item.status === '완료' || item.status === '진행중').length;
    const issuePressure = activity.issues.filter((issue) => issue.target === '파트장' || issue.target.includes(partName)).length;
    const teaCount = activity.teaSessions.filter((session) => session.part === partName || members.some((member) => member.name === session.presenter)).length;
    const canSessionCount = activity.canSessions.filter((session) => session.parts.includes(partName as never)).length;
    const oneOnOneMinutes = members.length * 25 + issuePressure * 20;
    const partMeetingMinutes = canSessionCount * 80 + teaCount * 45 + canOpinions.length * 12;
    const longMeetingRate = clampScore((canSessionCount * 8 + teaCount * 4 + issuePressure * 3) / Math.max(1, members.length) * 5);

    return {
      name: partName,
      members: members.length,
      opinionSubmitted: canOpinions.length + issuePressure,
      reflectedOpinions: reflectedFromCan + reflectedFromActions,
      voteParticipation: getVoteParticipation(partAgendas, activity.agendas, activity.ballots),
      coffeeParticipation: getConnectParticipation(members, activity.connectShareTexts),
      oneOnOneMinutes,
      partMeetingMinutes,
      longMeetingRate,
      meetingTrend: getMeetingTrend(partMeetingMinutes, longMeetingRate),
      profileColors: getProfilePalette(members),
      traits: getTraits(members),
    };
  });
}

export function Metrics() {
  const [partMetrics, setPartMetrics] = useState<PartMetric[]>(() => buildPartMetrics(initialActivity));
  const [selectedPart, setSelectedPart] = useState(partNames[0]);
  const [weights, setWeights] = useState(initialWeights);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      loadIssues(),
      loadAgendas(),
      loadBallots(),
      loadActionItems(),
      loadTeaSessions(),
    ]).then(([issues, agendas, ballots, actionItems, teaSessions]) => {
      if (!isMounted) return;
      setPartMetrics(buildPartMetrics({
        actionItems,
        agendas,
        ballots,
        canOpinions: initialCanOpinions,
        canSessions: initialCanSessions,
        connectShareTexts: readConnectShareTexts(),
        issues,
        teaSessions,
      }));
    });

    return () => {
      isMounted = false;
    };
  }, []);

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
  const reflectionRate = totalOpinions > 0 ? Math.round((reflectedOpinions / totalOpinions) * 100) : 0;

  const updateWeight = (key: keyof MetricWeights, value: number) => {
    setWeights({ ...weights, [key]: value });
  };

  return (
    <section className="screen metrics-screen">
      <section className="metrics-hero">
        <div>
          <p className="eyebrow">CULTURE HEALTH REPORT</p>
          <h2>파트의 회의 습관, 의견 반영, 성향 색을 함께 봅니다.</h2>
          <p>대나무숲, 캔미팅, 안건 투표, 액션아이템, 티미팅, 커넥트 결과를 모아 파트별 문화 흐름을 계산합니다.</p>
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
          <strong>{reflectionRate}%</strong>
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
