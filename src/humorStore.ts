// 유머게시판 영속화 (notificationStore와 동일한 localStorage 패턴).
import { initialHumorComments, initialHumorPosts } from './data/mockData';
import type { HumorComment, HumorPost } from './types';

const POSTS_KEY = 'skgrove:humorposts';
const COMMENTS_KEY = 'skgrove:humorcomments';
const SEED_VERSION_KEY = 'skgrove:humorseedv';
// 시드(mockData) 데이터를 바꾸면 이 값을 올린다. 저장된 버전과 다르면
// 옛 localStorage를 한 번 비워 새 시드가 다시 채워지게 한다(데모용 목업 정책).
const SEED_VERSION = '2026-07-29c';

// 모듈 로드 시 1회: 시드 버전이 올라갔으면 기존 유머 데이터를 초기화한다.
try {
  if (window.localStorage.getItem(SEED_VERSION_KEY) !== SEED_VERSION) {
    window.localStorage.removeItem(POSTS_KEY);
    window.localStorage.removeItem(COMMENTS_KEY);
    window.localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
  }
} catch {
  // localStorage 접근 불가 시 무시
}

export function loadHumorPosts(): HumorPost[] {
  try {
    const saved = window.localStorage.getItem(POSTS_KEY);
    if (!saved) return initialHumorPosts;
    const parsed = JSON.parse(saved) as HumorPost[];
    return Array.isArray(parsed) ? parsed : initialHumorPosts;
  } catch {
    return initialHumorPosts;
  }
}

export function saveHumorPosts(posts: HumorPost[]) {
  try {
    window.localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  } catch {
    // 저장 실패 무시
  }
}

export function loadHumorComments(): HumorComment[] {
  try {
    const saved = window.localStorage.getItem(COMMENTS_KEY);
    if (!saved) return initialHumorComments;
    const parsed = JSON.parse(saved) as HumorComment[];
    return Array.isArray(parsed) ? parsed : initialHumorComments;
  } catch {
    return initialHumorComments;
  }
}

export function saveHumorComments(comments: HumorComment[]) {
  try {
    window.localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
  } catch {
    // 저장 실패 무시
  }
}

let humorSequence = 0;
export function makeHumorId() {
  humorSequence += 1;
  return `HUM-${Date.now().toString(36).toUpperCase()}-${humorSequence.toString(36).toUpperCase()}`;
}

let commentSequence = 0;
export function makeHumorCommentId() {
  commentSequence += 1;
  return `HMC-${Date.now().toString(36).toUpperCase()}-${commentSequence.toString(36).toUpperCase()}`;
}
