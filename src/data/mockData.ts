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
  { name: '이선민', part: '플랫폼', trait: 'Careful Sprout', style: '결정 전 맥락을 충분히 봄', color: 'green' },
  { name: '김승현', part: '경험', trait: 'Swift Ember', style: '이슈를 빠르게 쪼개고 실행함', color: 'red' },
  { name: '이상협', part: '운영', trait: 'Calm Wave', style: '합의 기준과 프로세스를 선호함', color: 'blue' },
  { name: '김수정', part: '문화', trait: 'Bright Orbit', style: '사람 사이 연결과 분위기를 잘 봄', color: 'yellow' },
];

export const partScores: PartScore[] = [
  { name: '문화파트', score: 92, meetings: 6 },
  { name: '플랫폼파트', score: 84, meetings: 8 },
  { name: '경험파트', score: 78, meetings: 11 },
  { name: '운영파트', score: 73, meetings: 13 },
];

export const initialMatches = ['김수정 · 이선민', '김승현 · 이상협', '플랫폼 · 문화 · 경험'];

export const matchCandidates = ['이선민 · 김수정', '김승현 · 김수정', '이상협 · 이선민', '경험 · 운영 · 문화'];
