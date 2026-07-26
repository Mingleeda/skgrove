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

type ProfileSeed = Pick<Profile, 'name' | 'part' | 'birthYear' | 'trait' | 'style' | 'color'> &
  Partial<Pick<Profile, 'role' | 'englishName' | 'birthday' | 'character' | 'collaboration' | 'feedback' | 'guide'>>;

const profileFromSeed = (profile: ProfileSeed): Profile => ({
  role: '팀 문화와 협업 흐름 참여',
  englishName: profile.name,
  birthday: '',
  character: profile.trait,
  collaboration: '초안과 맥락을 함께 보면 협업이 쉬워집니다.',
  feedback: '좋았던 점과 바꿀 점을 나눠 들으면 빠르게 반영합니다.',
  guide: '일하는 방식과 선호하는 대화 리듬을 함께 맞추면 좋아요.',
  ...profile,
});

export const profiles: Profile[] = [
  profileFromSeed({ name: '이선민', part: 'TEST혁신파트', role: '품질 기준 정리와 테스트 흐름 설계', englishName: 'Lina', birthYear: '1994', birthday: '04-12', character: 'Careful Sprout', trait: '맥락형 조율가', style: '결정 전 배경과 리스크를 충분히 확인합니다.', collaboration: '초안과 판단 근거를 함께 보면 빠르게 맞춰갑니다.', feedback: '수정 이유와 기대 효과가 같이 있으면 바로 반영합니다.', guide: '회의 전 자료를 먼저 공유하면 논점 정리에 강점을 발휘합니다.', color: 'green' }),
  profileFromSeed({ name: '김승현', part: 'ITS혁신파트', role: '서비스 구조화와 빠른 실행 지원', englishName: 'Sean', birthYear: '1990', birthday: '09-20', character: 'Swift Ember', trait: '실행형 문제 해결가', style: '이슈를 빠르게 쪼개고 바로 실험합니다.', collaboration: '결정권과 완료 기준이 명확할 때 속도가 납니다.', feedback: '핵심 이슈를 짧게 짚어주면 즉시 방향을 조정합니다.', guide: '큰 방향보다 오늘 끝낼 단위로 이야기하면 협업이 쉬워집니다.', color: 'red' }),
  profileFromSeed({ name: '이상협', part: '혁신도구파트', role: '업무 프로세스와 합의 구조 설계', englishName: 'Sang', birthYear: '1988', birthday: '02-03', character: 'Calm Wave', trait: '기준형 설계자', style: '합의 기준과 프로세스를 선호합니다.', collaboration: '의사결정 기준을 먼저 맞추면 안정적으로 추진합니다.', feedback: '예외 케이스와 운영 기준을 함께 주면 품질이 올라갑니다.', guide: '반복될 업무는 템플릿과 룰로 바꾸는 대화를 좋아합니다.', color: 'blue' }),
  profileFromSeed({ name: '김수정', part: 'TEST혁신파트', role: '팀 연결 경험과 문화 지표 기획', englishName: 'Crystal', birthYear: '1996', birthday: '11-18', character: 'Bright Orbit', trait: '관계형 촉진자', style: '사람 사이 연결과 분위기의 변화를 잘 봅니다.', collaboration: '사용자 감정과 화면 흐름을 같이 보면 좋은 아이디어가 나옵니다.', feedback: '좋았던 점과 바꿀 점을 나눠 들으면 다음 안을 빠르게 잡습니다.', guide: '팀원이 실제로 말하기 편한지, 다시 쓰고 싶은지를 함께 봅니다.', color: 'yellow' }),
  profileFromSeed({ name: '박지훈', part: 'ITS혁신파트', birthYear: '1998', trait: 'Fresh Runner', style: '새로운 도구를 빠르게 실험함', color: 'green' }),
  profileFromSeed({ name: '최하늘', part: '혁신도구파트', birthYear: '1992', trait: 'Kind Anchor', style: '흐름을 안정적으로 잡아줌', color: 'blue' }),
  profileFromSeed({ name: '정다은', part: 'TEST혁신파트', birthYear: '1987', trait: 'Warm Signal', style: '놓친 맥락과 리스크를 잘 챙김', color: 'red' }),
  profileFromSeed({ name: '오민재', part: 'ITS혁신파트', birthYear: '1995', trait: 'Bright Switch', style: '막힌 논의를 빠르게 전환함', color: 'yellow' }),
  profileFromSeed({ name: '한유진', part: '혁신도구파트', birthYear: '1999', trait: 'Quick Spark', style: '아이디어를 작게 실행해봄', color: 'green' }),
  profileFromSeed({ name: '서민호', part: 'TEST혁신파트', birthYear: '1991', trait: 'Steady Lens', style: '품질 기준을 차분히 맞춤', color: 'blue' }),
  profileFromSeed({ name: '윤서연', part: 'ITS혁신파트', birthYear: '1989', trait: 'Calm Builder', style: '구조와 책임 범위를 정리함', color: 'red' }),
  profileFromSeed({ name: '문태오', part: '혁신도구파트', birthYear: '1997', trait: 'Open Orbit', style: '사람 사이 연결점을 잘 찾음', color: 'yellow' }),
  profileFromSeed({ name: '강리안', part: 'TEST혁신파트', birthYear: '1998', trait: 'Sharp Seed', style: '작은 이상징후를 빠르게 포착함', color: 'green' }),
  profileFromSeed({ name: '고은채', part: 'ITS혁신파트', birthYear: '1993', trait: 'Soft Link', style: '서비스 흐름 사이 연결을 잘 찾음', color: 'blue' }),
  profileFromSeed({ name: '권도윤', part: '혁신도구파트', birthYear: '1986', trait: 'Deep Frame', style: '긴 맥락을 구조로 정리함', color: 'red' }),
  profileFromSeed({ name: '노지아', part: 'TEST혁신파트', birthYear: '1995', trait: 'Kind Check', style: '테스트 기준을 사용자 말로 바꿈', color: 'yellow' }),
  profileFromSeed({ name: '류현우', part: 'ITS혁신파트', birthYear: '1999', trait: 'Fast Loop', style: '피드백을 짧게 돌려 빠르게 개선함', color: 'green' }),
  profileFromSeed({ name: '마서윤', part: '혁신도구파트', birthYear: '1991', trait: 'Clear Maker', style: '복잡한 요청을 실행 단위로 쪼갬', color: 'blue' }),
  profileFromSeed({ name: '배준서', part: 'TEST혁신파트', birthYear: '1988', trait: 'Quiet Guard', style: '운영 리스크를 차분히 막아줌', color: 'red' }),
  profileFromSeed({ name: '신아린', part: 'ITS혁신파트', birthYear: '1997', trait: 'Open Signal', style: '새로운 시도를 팀에 쉽게 소개함', color: 'yellow' }),
  profileFromSeed({ name: '양태민', part: '혁신도구파트', birthYear: '1994', trait: 'Flow Pilot', style: '도구 흐름과 사람 흐름을 같이 봄', color: 'green' }),
  profileFromSeed({ name: '유나경', part: 'TEST혁신파트', birthYear: '1990', trait: 'Sure Lens', style: '품질 판단 기준을 선명하게 잡음', color: 'blue' }),
  profileFromSeed({ name: '이도겸', part: 'ITS혁신파트', birthYear: '1987', trait: 'Steady Core', style: '서비스 안정성과 속도의 균형을 봄', color: 'red' }),
  profileFromSeed({ name: '임채원', part: '혁신도구파트', birthYear: '1996', trait: 'Bright Map', style: '팀원이 헷갈리는 지점을 시각화함', color: 'yellow' }),
  profileFromSeed({ name: '장우진', part: 'TEST혁신파트', birthYear: '1998', trait: 'Bug Scout', style: '재현 조건을 빠르게 좁혀감', color: 'green' }),
  profileFromSeed({ name: '조하린', part: 'ITS혁신파트', birthYear: '1992', trait: 'Warm Bridge', style: '파트 사이 설명을 부드럽게 이어줌', color: 'blue' }),
  profileFromSeed({ name: '차민석', part: '혁신도구파트', birthYear: '1989', trait: 'Rule Keeper', style: '운영 룰과 예외 처리를 잘 챙김', color: 'red' }),
  profileFromSeed({ name: '최유라', part: 'TEST혁신파트', birthYear: '1995', trait: 'Gentle Fix', style: '불편한 흐름을 작은 개선으로 바꿈', color: 'yellow' }),
  profileFromSeed({ name: '하준영', part: 'ITS혁신파트', birthYear: '1991', trait: 'System Eyes', style: '서비스 전체 영향을 먼저 계산함', color: 'green' }),
  profileFromSeed({ name: '홍세아', part: '혁신도구파트', birthYear: '1999', trait: 'Fresh Note', style: '새로운 관점을 쉽게 기록하고 공유함', color: 'blue' }),
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
    followUp: null,
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
    followUp: null,
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
