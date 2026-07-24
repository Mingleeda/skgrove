import type { ActionItem, Agenda, CanOpinion, CanSession, Issue, PartScore, Profile } from '../types';

export const initialIssues: Issue[] = [
  {
    id: 'SOOP-142',
    title: '팀 티미팅 시간이 길어져 집중 업무 시간이 끊겨요',
    category: '회의문화',
    author: '익명',
    target: '팀장',
    status: '접수',
    urgency: '높음',
  },
  {
    id: 'SOOP-141',
    title: '파트 간 업무 맥락을 공유하는 짧은 자리가 있으면 좋겠어요',
    category: '협업',
    author: '실명',
    target: '파트장',
    status: '검토중',
    urgency: '보통',
  },
  {
    id: 'SOOP-139',
    title: '캔미팅 결과가 액션아이템으로 이어지는 과정이 잘 안 보여요',
    category: '캔미팅',
    author: '익명',
    target: '리더',
    status: '안건화',
    urgency: '보통',
  },
];

export const initialAgendas: Agenda[] = [
  {
    title: '팀 티미팅 간소화',
    source: '대나무숲 SOOP-142',
    approve: 18,
    reject: 5,
    status: '투표중',
  },
  {
    title: '월 1회 파트 섞기 커피챗 운영',
    source: '티미팅 제안',
    approve: 21,
    reject: 3,
    status: '통과',
  },
  {
    title: '회의 없는 금요일 오후 시범 운영',
    source: '캔미팅',
    approve: 12,
    reject: 13,
    status: '부결',
  },
];

export const initialActionItems: ActionItem[] = [
  { title: '티미팅 아젠다 3개 제한안 작성', owner: '이상협', due: 'D-3', status: '진행중' },
  { title: '캔미팅 의견 제출 양식 배포', owner: '김승현', due: 'D-5', status: '대기' },
  { title: '파트 섞기 커피챗 1차 매칭', owner: '김수정', due: 'D-7', status: '완료' },
];

export const profiles: Profile[] = [
  { name: '이선민', part: 'TEST혁신파트', trait: 'Careful Sprout', style: '결정 전 맥락을 충분히 봄', color: 'green' },
  { name: '김승현', part: 'ITS혁신파트', trait: 'Swift Ember', style: '이슈를 빠르게 쪼개고 실행함', color: 'red' },
  { name: '이상협', part: '혁신도구파트', trait: 'Calm Wave', style: '합의 기준과 프로세스를 선호함', color: 'blue' },
  { name: '김수정', part: 'TEST혁신파트', trait: 'Bright Orbit', style: '사람 사이 연결과 분위기를 잘 봄', color: 'yellow' },
];

export const partScores: PartScore[] = [
  { name: 'TEST혁신파트', score: 92, meetings: 6 },
  { name: 'ITS혁신파트', score: 84, meetings: 8 },
  { name: '혁신도구파트', score: 78, meetings: 11 },
];

export const initialMatches = ['김수정 · 이선민', '김승현 · 이상협', 'TEST혁신파트 · ITS혁신파트'];

export const matchCandidates = ['이선민 · 김수정', '김승현 · 김수정', '이상협 · 이선민', 'ITS혁신파트 · 혁신도구파트'];

export const initialCanSessions: CanSession[] = [
  {
    id: 'CAN-S-2',
    topic: 'Being AX 달성을 위한 협업 방식 개선',
    teamName: 'AI ITS혁신팀',
    heldAt: '2026-07-10',
    method: '오프라인',
    parts: ['TEST혁신파트', 'ITS혁신파트', '혁신도구파트'],
    stage: 'share',
    resultSummary: '',
  },
  {
    id: 'CAN-S-1',
    topic: '불필요한 회의를 줄여 집중 업무 시간 확보',
    teamName: 'AI ITS혁신팀',
    heldAt: '2026-04-15',
    method: '온라인',
    parts: ['TEST혁신파트', 'ITS혁신파트', '혁신도구파트'],
    stage: 'summary',
    resultSummary:
      '[Step 1 · Speak-out]\n· 목적이 불분명한 정기회의가 많아 집중 업무 시간이 끊깁니다.\n\n[Step 2 · Ideation]\n· 회의 없는 수요일 오후를 지정하고 기본 회의를 30분으로 제한합니다.\n\n[Step 3 · Quick-win]\n· 회의 없는 수요일 오후 시범 운영 / 30분 기본 회의 가이드 배포',
  },
];

export const initialCanOpinions: CanOpinion[] = [
  // CAN-S-2 (2026 Q3, 진행 중)
  {
    id: 'CAN-01',
    sessionId: 'CAN-S-2',
    step: 'speakout',
    part: 'TEST혁신파트',
    content: '파트 간 API 변경 공유가 늦어 재작업이 반복됩니다.',
    author: '실명',
    authorName: '이선민',
    selected: true,
  },
  {
    id: 'CAN-02',
    sessionId: 'CAN-S-2',
    step: 'ideation',
    part: 'TEST혁신파트',
    content: '주간 15분 파트 싱크로 변경 사항만 빠르게 공유하면 좋겠습니다.',
    author: '익명',
    authorName: '',
    selected: false,
  },
  {
    id: 'CAN-03',
    sessionId: 'CAN-S-2',
    step: 'speakout',
    part: 'ITS혁신파트',
    content: '기획-디자인-개발 핸드오프 기준이 명확하지 않습니다.',
    author: '실명',
    authorName: '김승현',
    selected: true,
  },
  {
    id: 'CAN-04',
    sessionId: 'CAN-S-2',
    step: 'ideation',
    part: 'ITS혁신파트',
    content: '핸드오프 체크리스트가 생기면 리뷰 시간이 절반으로 줄 것 같습니다.',
    author: '익명',
    authorName: '',
    selected: false,
  },
  {
    id: 'CAN-05',
    sessionId: 'CAN-S-2',
    step: 'speakout',
    part: '혁신도구파트',
    content: '프로세스를 늘리면 오히려 실행 속도가 느려질 수 있습니다.',
    author: '실명',
    authorName: '이상협',
    selected: false,
  },
  {
    id: 'CAN-06',
    sessionId: 'CAN-S-2',
    step: 'quickwin',
    part: '혁신도구파트',
    content: '공통 채널에 변경 로그를 남기는 규칙만 먼저 시도해봅시다.',
    author: '익명',
    authorName: '',
    selected: true,
  },
  {
    id: 'CAN-07',
    sessionId: 'CAN-S-2',
    step: 'ideation',
    part: 'TEST혁신파트',
    content: '작은 성공 사례를 회고에서 공유하면 자발적 참여가 늘 것입니다.',
    author: '실명',
    authorName: '김수정',
    selected: false,
  },
  // CAN-S-1 (2026 Q2, 완료)
  {
    id: 'CAN-Q2-01',
    sessionId: 'CAN-S-1',
    step: 'quickwin',
    part: '혁신도구파트',
    content: '수요일 오후는 회의 없는 집중 시간으로 지정합시다.',
    author: '실명',
    authorName: '이상협',
    selected: true,
  },
  {
    id: 'CAN-Q2-02',
    sessionId: 'CAN-S-1',
    step: 'quickwin',
    part: 'ITS혁신파트',
    content: '기본 회의 길이를 30분으로 줄이면 좋겠습니다.',
    author: '익명',
    authorName: '',
    selected: true,
  },
];
