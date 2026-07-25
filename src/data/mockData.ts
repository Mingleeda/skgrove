import type { ActionItem, Agenda, Issue, PartScore, Profile } from '../types';

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

export const actionItems: ActionItem[] = [
  { title: '티미팅 아젠다 3개 제한안 작성', owner: '이상협', due: 'D-3', status: '진행중' },
  { title: '캔미팅 의견 제출 양식 배포', owner: '김승현', due: 'D-5', status: '대기' },
  { title: '파트 섞기 커피챗 1차 매칭', owner: '김수정', due: 'D-7', status: '완료' },
];

export const profiles: Profile[] = [
  { name: '이선민', part: 'TEST혁신파트', birthYear: '1994', trait: 'Careful Sprout', style: '결정 전 맥락을 충분히 봄', color: 'green' },
  { name: '김승현', part: 'ITS혁신파트', birthYear: '1990', trait: 'Swift Ember', style: '이슈를 빠르게 쪼개고 실행함', color: 'red' },
  { name: '이상협', part: '혁신도구파트', birthYear: '1988', trait: 'Calm Wave', style: '합의 기준과 프로세스를 선호함', color: 'blue' },
  { name: '김수정', part: 'TEST혁신파트', birthYear: '1996', trait: 'Bright Orbit', style: '사람 사이 연결과 분위기를 잘 봄', color: 'yellow' },
  { name: '박지훈', part: 'ITS혁신파트', birthYear: '1998', trait: 'Fresh Runner', style: '새로운 도구를 빠르게 실험함', color: 'green' },
  { name: '최하늘', part: '혁신도구파트', birthYear: '1992', trait: 'Kind Anchor', style: '흐름을 안정적으로 잡아줌', color: 'blue' },
  { name: '정다은', part: 'TEST혁신파트', birthYear: '1987', trait: 'Warm Signal', style: '놓친 맥락과 리스크를 잘 챙김', color: 'red' },
  { name: '오민재', part: 'ITS혁신파트', birthYear: '1995', trait: 'Bright Switch', style: '막힌 논의를 빠르게 전환함', color: 'yellow' },
  { name: '한유진', part: '혁신도구파트', birthYear: '1999', trait: 'Quick Spark', style: '아이디어를 작게 실행해봄', color: 'green' },
  { name: '서민호', part: 'TEST혁신파트', birthYear: '1991', trait: 'Steady Lens', style: '품질 기준을 차분히 맞춤', color: 'blue' },
  { name: '윤서연', part: 'ITS혁신파트', birthYear: '1989', trait: 'Calm Builder', style: '구조와 책임 범위를 정리함', color: 'red' },
  { name: '문태오', part: '혁신도구파트', birthYear: '1997', trait: 'Open Orbit', style: '사람 사이 연결점을 잘 찾음', color: 'yellow' },
  { name: '강리안', part: 'TEST혁신파트', birthYear: '1998', trait: 'Sharp Seed', style: '작은 이상징후를 빠르게 포착함', color: 'green' },
  { name: '고은채', part: 'ITS혁신파트', birthYear: '1993', trait: 'Soft Link', style: '서비스 흐름 사이 연결을 잘 찾음', color: 'blue' },
  { name: '권도윤', part: '혁신도구파트', birthYear: '1986', trait: 'Deep Frame', style: '긴 맥락을 구조로 정리함', color: 'red' },
  { name: '노지아', part: 'TEST혁신파트', birthYear: '1995', trait: 'Kind Check', style: '테스트 기준을 사용자 말로 바꿈', color: 'yellow' },
  { name: '류현우', part: 'ITS혁신파트', birthYear: '1999', trait: 'Fast Loop', style: '피드백을 짧게 돌려 빠르게 개선함', color: 'green' },
  { name: '마서윤', part: '혁신도구파트', birthYear: '1991', trait: 'Clear Maker', style: '복잡한 요청을 실행 단위로 쪼갬', color: 'blue' },
  { name: '배준서', part: 'TEST혁신파트', birthYear: '1988', trait: 'Quiet Guard', style: '운영 리스크를 차분히 막아줌', color: 'red' },
  { name: '신아린', part: 'ITS혁신파트', birthYear: '1997', trait: 'Open Signal', style: '새로운 시도를 팀에 쉽게 소개함', color: 'yellow' },
  { name: '양태민', part: '혁신도구파트', birthYear: '1994', trait: 'Flow Pilot', style: '도구 흐름과 사람 흐름을 같이 봄', color: 'green' },
  { name: '유나경', part: 'TEST혁신파트', birthYear: '1990', trait: 'Sure Lens', style: '품질 판단 기준을 선명하게 잡음', color: 'blue' },
  { name: '이도겸', part: 'ITS혁신파트', birthYear: '1987', trait: 'Steady Core', style: '서비스 안정성과 속도의 균형을 봄', color: 'red' },
  { name: '임채원', part: '혁신도구파트', birthYear: '1996', trait: 'Bright Map', style: '팀원이 헷갈리는 지점을 시각화함', color: 'yellow' },
  { name: '장우진', part: 'TEST혁신파트', birthYear: '1998', trait: 'Bug Scout', style: '재현 조건을 빠르게 좁혀감', color: 'green' },
  { name: '조하린', part: 'ITS혁신파트', birthYear: '1992', trait: 'Warm Bridge', style: '파트 사이 설명을 부드럽게 이어줌', color: 'blue' },
  { name: '차민석', part: '혁신도구파트', birthYear: '1989', trait: 'Rule Keeper', style: '운영 룰과 예외 처리를 잘 챙김', color: 'red' },
  { name: '최유라', part: 'TEST혁신파트', birthYear: '1995', trait: 'Gentle Fix', style: '불편한 흐름을 작은 개선으로 바꿈', color: 'yellow' },
  { name: '하준영', part: 'ITS혁신파트', birthYear: '1991', trait: 'System Eyes', style: '서비스 전체 영향을 먼저 계산함', color: 'green' },
  { name: '홍세아', part: '혁신도구파트', birthYear: '1999', trait: 'Fresh Note', style: '새로운 관점을 쉽게 기록하고 공유함', color: 'blue' },
];

export const partScores: PartScore[] = [
  { name: 'TEST혁신파트', score: 92, meetings: 6 },
  { name: 'ITS혁신파트', score: 84, meetings: 8 },
  { name: '혁신도구파트', score: 78, meetings: 11 },
];

export const initialMatches = ['김수정 · 이선민', '김승현 · 이상협', 'TEST혁신파트 · ITS혁신파트'];

export const matchCandidates = ['이선민 · 김수정', '김승현 · 김수정', '이상협 · 이선민', 'ITS혁신파트 · 혁신도구파트'];
