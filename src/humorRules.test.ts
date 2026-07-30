import { describe, expect, it } from 'vitest';
import { monthOf, rankLiked, rankPosters, topCommenter, topLiked, topPoster } from './humorRules';
import type { HumorComment, HumorPost } from './types';

const MONTH = '2026-07';

const post = (patch: Partial<HumorPost> = {}): HumorPost => ({
  id: 'HUM-T', author: '김승현', body: '내용', mediaUrl: '',
  createdAt: '2026-07-10', likedBy: [], ...patch,
});

const comment = (patch: Partial<HumorComment> = {}): HumorComment => ({
  id: 'HMC-T', postId: 'HUM-T', author: '김승현', body: '댓글', createdAt: '2026-07-10', ...patch,
});

describe('월 추출', () => {
  it('YYYY-MM으로 자른다', () => {
    expect(monthOf('2026-07-29')).toBe('2026-07');
  });
});

describe('글쓰기왕', () => {
  it('이번 달 글 수가 최대인 사람', () => {
    const posts = [post({ author: 'A' }), post({ author: 'A' }), post({ author: 'B' })];
    expect(topPoster(posts, MONTH)).toEqual({ name: 'A', count: 2 });
  });
  it('지난 달 글은 제외', () => {
    const posts = [post({ author: 'A', createdAt: '2026-06-30' }), post({ author: 'B' })];
    expect(topPoster(posts, MONTH)).toEqual({ name: 'B', count: 1 });
  });
  it('데이터 없으면 null', () => {
    expect(topPoster([], MONTH)).toBeNull();
  });
  it('동점이면 이름 오름차순', () => {
    const posts = [post({ author: 'B' }), post({ author: 'A' })];
    expect(topPoster(posts, MONTH)).toEqual({ name: 'A', count: 1 });
  });
});

describe('댓글왕', () => {
  it('이번 달 댓글 수가 최대인 사람', () => {
    const cs = [comment({ author: 'A' }), comment({ author: 'B' }), comment({ author: 'B' })];
    expect(topCommenter(cs, MONTH)).toEqual({ name: 'B', count: 2 });
  });
});

describe('빵터짐왕', () => {
  it('이번 달 자기 글 좋아요 합이 최대', () => {
    const posts = [
      post({ author: 'A', likedBy: ['x', 'y', 'z', 'w'] }),
      post({ author: 'B', likedBy: ['x'] }),
      post({ author: 'B', likedBy: ['y', 'z'] }),
    ];
    expect(topLiked(posts, MONTH)).toEqual({ name: 'A', count: 4 });
  });
  it('좋아요 0이면 후보 아님(null)', () => {
    expect(topLiked([post({ author: 'A', likedBy: [] })], MONTH)).toBeNull();
  });
});

describe('1~3등 랭킹', () => {
  it('수치 내림차순 → 이름 오름차순으로 상위 3명', () => {
    const posts = [
      post({ author: 'A' }),
      post({ author: 'A' }),
      post({ author: 'A' }), // A=3
      post({ author: 'C' }),
      post({ author: 'C' }), // C=2
      post({ author: 'B' }),
      post({ author: 'B' }), // B=2 (C와 동점 → 이름순 B 먼저)
      post({ author: 'D' }), // D=1 (4등, 잘림)
    ];
    expect(rankPosters(posts, MONTH)).toEqual([
      { name: 'A', count: 3 },
      { name: 'B', count: 2 },
      { name: 'C', count: 2 },
    ]);
  });
  it('limit으로 개수를 제한한다', () => {
    const posts = [post({ author: 'A', likedBy: ['x', 'y'] }), post({ author: 'B', likedBy: ['x'] })];
    expect(rankLiked(posts, MONTH, 1)).toEqual([{ name: 'A', count: 2 }]);
  });
  it('유효 데이터 없으면 빈 배열', () => {
    expect(rankPosters([], MONTH)).toEqual([]);
  });
});
