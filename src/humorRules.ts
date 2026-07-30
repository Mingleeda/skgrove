// 유머게시판 월간 랭킹 — 순수 함수(팀 관례: *Rules.ts + 단위 테스트). React·상태 의존 없음.
import type { HumorComment, HumorPost } from './types';

export type Ranker = { name: string; count: number };

// 'YYYY-MM-DD' → 'YYYY-MM'
export function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

// 동점은 수치 내림차순 → 이름 오름차순. 유효 데이터(count>0)만, 상위 limit명.
function rankOf(counts: Map<string, number>, limit: number): Ranker[] {
  return Array.from(counts, ([name, count]) => ({ name, count }))
    .filter((ranker) => ranker.count > 0)
    .sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .slice(0, limit);
}

// 이번 달 글 수 집계(글쓰기왕)
function posterCounts(posts: HumorPost[], month: string): Map<string, number> {
  const counts = new Map<string, number>();
  posts
    .filter((post) => monthOf(post.createdAt) === month)
    .forEach((post) => counts.set(post.author, (counts.get(post.author) ?? 0) + 1));
  return counts;
}

// 이번 달 댓글 수 집계(댓글왕)
function commenterCounts(comments: HumorComment[], month: string): Map<string, number> {
  const counts = new Map<string, number>();
  comments
    .filter((comment) => monthOf(comment.createdAt) === month)
    .forEach((comment) => counts.set(comment.author, (counts.get(comment.author) ?? 0) + 1));
  return counts;
}

// 이번 달 자기 글이 받은 좋아요 합 집계(빵터짐왕)
function likedCounts(posts: HumorPost[], month: string): Map<string, number> {
  const counts = new Map<string, number>();
  posts
    .filter((post) => monthOf(post.createdAt) === month)
    .forEach((post) => counts.set(post.author, (counts.get(post.author) ?? 0) + post.likedBy.length));
  return counts;
}

// ── 상위 N 랭킹(명예의 전당 1~3등) ──
export function rankPosters(posts: HumorPost[], month: string, limit = 3): Ranker[] {
  return rankOf(posterCounts(posts, month), limit);
}
export function rankCommenters(comments: HumorComment[], month: string, limit = 3): Ranker[] {
  return rankOf(commenterCounts(comments, month), limit);
}
export function rankLiked(posts: HumorPost[], month: string, limit = 3): Ranker[] {
  return rankOf(likedCounts(posts, month), limit);
}

// ── 1등만(지난 달 수상자 한 줄 등) ──
export function topPoster(posts: HumorPost[], month: string): Ranker | null {
  return rankPosters(posts, month, 1)[0] ?? null;
}
export function topCommenter(comments: HumorComment[], month: string): Ranker | null {
  return rankCommenters(comments, month, 1)[0] ?? null;
}
export function topLiked(posts: HumorPost[], month: string): Ranker | null {
  return rankLiked(posts, month, 1)[0] ?? null;
}
