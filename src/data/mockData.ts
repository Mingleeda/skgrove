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
  {
    name: '이선민',
    part: 'TEST혁신파트',
    role: '품질 기준 정리와 테스트 흐름 설계',
    englishName: 'Lina',
    character: 'Careful Sprout',
    trait: '맥락형 조율가',
    style: '결정 전 배경과 리스크를 충분히 확인합니다.',
    collaboration: '초안과 판단 근거를 함께 보면 빠르게 맞춰갑니다.',
    feedback: '수정 이유와 기대 효과가 같이 있으면 바로 반영합니다.',
    guide: '회의 전 자료를 먼저 공유하면 논점 정리에 강점을 발휘합니다.',
    color: 'green',
  },
  {
    name: '김승현',
    part: 'ITS혁신파트',
    role: '서비스 구조화와 빠른 실행 지원',
    englishName: 'Sean',
    character: 'Swift Ember',
    trait: '실행형 문제 해결가',
    style: '이슈를 빠르게 쪼개고 바로 실험합니다.',
    collaboration: '결정권과 완료 기준이 명확할 때 속도가 납니다.',
    feedback: '핵심 이슈를 짧게 짚어주면 즉시 방향을 조정합니다.',
    guide: '큰 방향보다 오늘 끝낼 단위로 이야기하면 협업이 쉬워집니다.',
    color: 'red',
  },
  {
    name: '이상협',
    part: '혁신도구파트',
    role: '업무 프로세스와 합의 구조 설계',
    englishName: 'Sang',
    character: 'Calm Wave',
    trait: '기준형 설계자',
    style: '합의 기준과 프로세스를 선호합니다.',
    collaboration: '의사결정 기준을 먼저 맞추면 안정적으로 추진합니다.',
    feedback: '예외 케이스와 운영 기준을 함께 주면 품질이 올라갑니다.',
    guide: '반복될 업무는 템플릿과 룰로 바꾸는 대화를 좋아합니다.',
    color: 'blue',
  },
  {
    name: '김수정',
    part: 'TEST혁신파트',
    role: '팀 연결 경험과 문화 지표 기획',
    englishName: 'Crystal',
    character: 'Bright Orbit',
    trait: '관계형 촉진자',
    style: '사람 사이 연결과 분위기의 변화를 잘 봅니다.',
    collaboration: '사용자 감정과 화면 흐름을 같이 보면 좋은 아이디어가 나옵니다.',
    feedback: '좋았던 점과 바꿀 점을 나눠 들으면 다음 안을 빠르게 잡습니다.',
    guide: '팀원이 실제로 말하기 편한지, 다시 쓰고 싶은지를 함께 봅니다.',
    color: 'yellow',
  },
];

export const partScores: PartScore[] = [
  { name: 'TEST혁신파트', score: 92, meetings: 6 },
  { name: 'ITS혁신파트', score: 84, meetings: 8 },
  { name: '혁신도구파트', score: 78, meetings: 11 },
];

export const initialMatches = ['김수정 · 이선민', '김승현 · 이상협', 'TEST혁신파트 · ITS혁신파트'];

export const matchCandidates = ['이선민 · 김수정', '김승현 · 김수정', '이상협 · 이선민', 'ITS혁신파트 · 혁신도구파트'];
