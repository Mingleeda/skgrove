import { useMemo, useState } from 'react';
import type { ElementType } from 'react';
import { AlertTriangle, ArrowLeft, Crown, FileText, Image as ImageIcon, Laugh, Link2, MessageCircle, Medal, PenLine, PlayCircle, Send, Sparkles, Trash2, Trophy, X } from 'lucide-react';
import { Avatar } from '../../components/Avatar';
import { PanelHeader } from '../../components/PanelHeader';
import { monthOf, rankCommenters, rankLiked, rankPosters, topCommenter, topLiked, topPoster } from '../../humorRules';
import type { Ranker } from '../../humorRules';
import type { CurrentUser, HumorComment, HumorPost } from '../../types';

type HumorBoardProps = {
  posts: HumorPost[];
  comments: HumorComment[];
  currentUser: CurrentUser;
  canModerate: boolean;
  onAddPost: (draft: { body: string; mediaUrl: string }) => void;
  onToggleLike: (postId: string) => void;
  onAddComment: (postId: string, body: string) => void;
  onEditPost: (postId: string, draft: { body: string; mediaUrl: string }) => void;
  onDeletePost: (postId: string) => void;
  onDeleteComment: (commentId: string) => void;
};

// 'YYYY-MM' 기준으로 delta개월 이동.
function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split('-').map(Number);
  return new Date(Date.UTC(year, mon - 1 + delta, 1)).toISOString().slice(0, 7);
}

// 붙여넣은 링크에서 유튜브 영상 id 추출(watch·youtu.be·shorts·embed).
function youtubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /[?&]v=([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

type Media = { type: 'image' | 'youtube' | 'video' | 'link'; src: string };

// 백엔드가 없으므로 파일 업로드 대신 붙여넣은 URL을 종류별로 판별해 렌더한다.
// 안전한 scheme(http(s)·data:image)만 허용한다. javascript:·data:text/html 등은
// 렌더하지 않는다(<a href>·<img src> XSS/피싱 차단).
function resolveMedia(url: string): Media | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const yt = youtubeId(trimmed);
  if (yt) return { type: 'youtube', src: `https://www.youtube.com/embed/${yt}` };

  const isHttp = /^https?:\/\//i.test(trimmed);
  const isDataImage = /^data:image\//i.test(trimmed);

  if (isHttp && /\.(mp4|webm|ogg)(\?|$)/i.test(trimmed)) return { type: 'video', src: trimmed };
  if (isDataImage || (isHttp && /\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|$)/i.test(trimmed))) {
    return { type: 'image', src: trimmed };
  }
  if (isHttp) return { type: 'link', src: trimmed };
  return null; // 미지원·위험 scheme은 미디어로 취급하지 않음
}

/*
  목록 행에 붙는 미디어 표시(무거운 플레이어 대신 종류 아이콘만).
  이모지는 OS 마다 다른 그림으로 그려진다 — 한국어 폰트를 Pretendard 로 고정한 것과
  같은 이유로 인터페이스 기호는 아이콘을 쓴다. 스크린리더가 "사진" 대신 "액자"를
  읽는 문제와 --color-* 토큰으로 색을 못 맞추는 문제도 함께 사라진다.
*/
function mediaGlyph(media: Media | null): ElementType {
  if (!media) return FileText;
  if (media.type === 'image') return ImageIcon;
  if (media.type === 'youtube' || media.type === 'video') return PlayCircle;
  return Link2;
}

// 상세에서만 실제 미디어를 로드(첫 목록 화면은 가볍게 유지).
function MediaBlock({ media }: { media: Media | null }) {
  if (!media) return null;
  if (media.type === 'image') {
    return (
      <div className="humor-card-image">
        <img src={media.src} alt="" loading="lazy" />
      </div>
    );
  }
  if (media.type === 'youtube') {
    return (
      <div className="humor-card-video">
        <iframe
          src={media.src}
          title="유머 영상"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (media.type === 'video') {
    return (
      <div className="humor-card-video">
        <video src={media.src} controls />
      </div>
    );
  }
  return (
    <a className="humor-card-link" href={media.src} target="_blank" rel="noreferrer">
      <Link2 size={16} />
      링크 열기
    </a>
  );
}

type RankerCard = { key: string; icon: ElementType; title: string; unit: string; list: Ranker[] };

// 1·2·3위. 메달 이모지는 OS 마다 색과 모양이 달라 순위가 안 읽히는 기기가 있었다.
const MEDAL_RANK = ['1위', '2위', '3위'];

export function HumorBoard({
  posts,
  comments,
  currentUser,
  canModerate,
  onAddPost,
  onToggleLike,
  onAddComment,
  onEditPost,
  onDeletePost,
  onDeleteComment,
}: HumorBoardProps) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [body, setBody] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [sort, setSort] = useState<'latest' | 'popular'>('latest');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  // 글 수정: 상세 화면에서 본인 글의 내용/미디어를 인라인 편집.
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState('');
  const [editMedia, setEditMedia] = useState('');
  // 삭제는 되돌릴 수 없는 행동 — 네이티브 confirm() 대신 카드 안에서 펼치는 확인 UI로 받는다.
  const [deletingPost, setDeletingPost] = useState(false);

  const openDetail = (postId: string | null) => {
    setDetailId(postId);
    setEditing(false);
    setDeletingPost(false);
  };

  const thisMonth = new Date().toISOString().slice(0, 7);
  const lastMonth = shiftMonth(thisMonth, -1);

  const commentsByPost = useMemo(() => {
    const map = new Map<string, HumorComment[]>();
    comments.forEach((comment) => {
      const list = map.get(comment.postId) ?? [];
      list.push(comment);
      map.set(comment.postId, list);
    });
    map.forEach((list) => list.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)));
    return map;
  }, [comments]);

  const submitComment = (postId: string) => {
    const draft = commentDrafts[postId]?.trim();
    if (!draft) return;
    onAddComment(postId, draft);
    setCommentDrafts({ ...commentDrafts, [postId]: '' });
  };

  const canDeletePost = (post: HumorPost) => post.author === currentUser.name || canModerate;
  const canDeleteComment = (comment: HumorComment) => comment.author === currentUser.name || canModerate;
  const canEditPost = (post: HumorPost) => post.author === currentUser.name; // 수정은 본인 글만

  const startEditPost = (post: HumorPost) => {
    setEditBody(post.body);
    setEditMedia(post.mediaUrl);
    setEditing(true);
    setDeletingPost(false);
  };
  const saveEditPost = (postId: string) => {
    if (!editBody.trim()) return;
    onEditPost(postId, { body: editBody, mediaUrl: editMedia });
    setEditing(false);
  };

  // ── 글상세 화면 ──────────────────────────────
  const detailPost = detailId ? posts.find((post) => post.id === detailId) ?? null : null;
  if (detailPost) {
    const postComments = commentsByPost.get(detailPost.id) ?? [];
    const liked = detailPost.likedBy.includes(currentUser.name);
    return (
      <section className="screen humor-screen">
        <button className="humor-back" onClick={() => openDetail(null)}>
          <ArrowLeft size={16} />
          목록으로
        </button>
        <article className="humor-card humor-detail">
          <header className="humor-card-head">
            <Avatar name={detailPost.author} />
            <div>
              <strong>{detailPost.author}</strong>
              <small>{detailPost.createdAt}</small>
            </div>
            {!editing && !deletingPost && (canEditPost(detailPost) || canDeletePost(detailPost)) && (
              <div className="humor-owner-actions">
                {canEditPost(detailPost) && (
                  <button className="humor-owner-btn edit" onClick={() => startEditPost(detailPost)}>
                    <PenLine size={15} />
                    수정
                  </button>
                )}
                {canDeletePost(detailPost) && (
                  <button className="humor-owner-btn delete" onClick={() => setDeletingPost(true)}>
                    <Trash2 size={15} />
                    삭제
                  </button>
                )}
              </div>
            )}
          </header>
          {deletingPost && (
            <div className="agenda-close-box">
              <AlertTriangle size={18} />
              <p>이 글을 삭제하면 되돌릴 수 없어요. 댓글도 함께 사라집니다.</p>
              <div className="vote-confirm-actions">
                <button className="secondary-button" onClick={() => setDeletingPost(false)}>
                  취소
                </button>
                <button
                  className="primary-button"
                  onClick={() => {
                    onDeletePost(detailPost.id);
                    openDetail(null);
                  }}
                >
                  <Trash2 size={15} />
                  삭제 확정
                </button>
              </div>
            </div>
          )}
          {editing ? (
            <div className="humor-edit">
              <label>
                내용
                <textarea value={editBody} autoFocus onChange={(event) => setEditBody(event.target.value)} />
              </label>
              <label>
                이미지 · 영상 링크 (선택)
                <input
                  value={editMedia}
                  placeholder="이미지 주소나 유튜브 링크"
                  onChange={(event) => setEditMedia(event.target.value)}
                />
              </label>
              <div className="humor-edit-actions">
                <button className="secondary-button" onClick={() => setEditing(false)}>
                  취소
                </button>
                <button className="primary-button" disabled={!editBody.trim()} onClick={() => saveEditPost(detailPost.id)}>
                  저장
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="humor-card-body">{detailPost.body}</p>
              <MediaBlock media={resolveMedia(detailPost.mediaUrl)} />
            </>
          )}
          <div className="humor-card-actions">
            <button className={liked ? 'humor-like active' : 'humor-like'} onClick={() => onToggleLike(detailPost.id)}>
              <Laugh size={16} />
              빵터짐 {detailPost.likedBy.length}
            </button>
            <span className="humor-comment-count">
              <MessageCircle size={16} />
              댓글 {postComments.length}
            </span>
          </div>
          <div className="humor-comments">
            {postComments.map((comment) => (
              <div className="humor-comment" key={comment.id}>
                <Avatar name={comment.author} />
                <div className="humor-comment-body">
                  <strong>{comment.author}</strong>
                  <p>{comment.body}</p>
                  <small>{comment.createdAt}</small>
                </div>
                {canDeleteComment(comment) && (
                  <button className="humor-icon-btn" aria-label="댓글 삭제" onClick={() => onDeleteComment(comment.id)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {postComments.length === 0 && <p className="humor-comment-empty">첫 댓글을 남겨보세요.</p>}
            <div className="humor-comment-input">
              <input
                value={commentDrafts[detailPost.id] ?? ''}
                placeholder="댓글 달기"
                onChange={(event) => setCommentDrafts({ ...commentDrafts, [detailPost.id]: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitComment(detailPost.id);
                }}
              />
              <button className="secondary-button" onClick={() => submitComment(detailPost.id)}>
                <Send size={15} />
              </button>
            </div>
          </div>
        </article>
      </section>
    );
  }

  // ── 목록 화면 ────────────────────────────────
  const rankers: RankerCard[] = [
    { key: 'liked', icon: Laugh, title: '빵터짐왕', unit: '좋아요', list: rankLiked(posts, thisMonth) },
    { key: 'poster', icon: PenLine, title: '글쓰기왕', unit: '글', list: rankPosters(posts, thisMonth) },
    { key: 'commenter', icon: MessageCircle, title: '댓글왕', unit: '댓글', list: rankCommenters(comments, thisMonth) },
  ];

  const lastWinners = [
    { icon: Laugh, label: '빵터짐왕', ranker: topLiked(posts, lastMonth) },
    { icon: PenLine, label: '글쓰기왕', ranker: topPoster(posts, lastMonth) },
    { icon: MessageCircle, label: '댓글왕', ranker: topCommenter(comments, lastMonth) },
  ].filter((item) => item.ranker);

  const visiblePosts = [...posts];
  if (sort === 'popular') {
    visiblePosts.sort((a, b) => b.likedBy.length - a.likedBy.length || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  } else {
    visiblePosts.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  }

  const submitPost = () => {
    if (!body.trim()) return;
    onAddPost({ body, mediaUrl });
    setBody('');
    setMediaUrl('');
    setWriting(false);
  };

  return (
    <section className="screen humor-screen">
      <div className="humor-hero">
        <div>
          <p className="eyebrow">YU~MER BOARD</p>
          <h2>유~머 한 잔 하고 가세요</h2>
          <p>아재개그·짤·웃긴 영상 다 환영이에요. 매달 웃음 랭커에게 작은 상품도 드립니다</p>
        </div>
        <div className="humor-hero-badge">
          <Sparkles size={20} />
          <span>이번 달</span>
          <strong>{thisMonth.replace('-', '.')}</strong>
          <small>글 {posts.filter((post) => monthOf(post.createdAt) === thisMonth).length} · 댓글 {comments.filter((comment) => monthOf(comment.createdAt) === thisMonth).length}</small>
        </div>
      </div>

      <section className="panel humor-hall">
        <PanelHeader icon={Trophy} title="이번 달 명예의 전당" />
        <div className="humor-rankers">
          {rankers.map((card) => (
            <div className={`humor-ranker ${card.list.length ? '' : 'empty'}`} key={card.key}>
              <span className="humor-ranker-crown">
                <Crown size={16} />
                <card.icon size={16} aria-hidden />
                {card.title}
              </span>
              {card.list.length === 0 ? (
                <p className="humor-ranker-none">아직 없음</p>
              ) : (
                <ol className="humor-podium">
                  {card.list.map((ranker, index) => (
                    <li key={ranker.name} className={index === 0 ? 'top' : ''}>
                      <span className="humor-medal">{MEDAL_RANK[index]}</span>
                      <Avatar name={ranker.name} />
                      <strong>{ranker.name}</strong>
                      <em>
                        {ranker.count}
                        {card.unit}
                      </em>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
        <p className="humor-hall-foot">
          <Medal size={14} aria-hidden />
          지난 달 수상자 ·{' '}
          {lastWinners.length === 0
            ? '기록 없음'
            : lastWinners.map((item) => `${item.label} ${item.ranker!.name}`).join('  ·  ')}
        </p>
      </section>

      <div className="humor-controls">
        <div className="humor-sort">
          <button className={sort === 'latest' ? 'active' : ''} onClick={() => setSort('latest')}>
            최신순
          </button>
          <button className={sort === 'popular' ? 'active' : ''} onClick={() => setSort('popular')}>
            인기순
          </button>
        </div>
        <button className={writing ? 'secondary-button humor-write-toggle' : 'primary-button humor-write-toggle'} onClick={() => setWriting((prev) => !prev)}>
          {writing ? (
            <>
              <X size={16} />
              닫기
            </>
          ) : (
            <>
              <PenLine size={16} />
              글쓰기
            </>
          )}
        </button>
      </div>

      {writing && (
        <section className="panel form-panel humor-compose">
          <p className="humor-compose-author">
            작성자 <Avatar name={currentUser.name} />
            <strong>{currentUser.name}</strong> · 실명으로 게시돼요
          </p>
          <label>
            내용
            <textarea
              value={body}
              placeholder="웃긴 이야기나 짤 설명을 적어보세요"
              autoFocus
              onChange={(event) => setBody(event.target.value)}
            />
          </label>
          <label>
            이미지 · 영상 링크 (선택)
            <input
              value={mediaUrl}
              placeholder="이미지 주소나 유튜브 링크를 붙여넣어요"
              onChange={(event) => setMediaUrl(event.target.value)}
            />
            <small className="humor-media-hint">이미지 주소 · 유튜브 · mp4 링크를 알아서 붙여 보여줘요.</small>
          </label>
          <button className="primary-button wide" disabled={!body.trim()} onClick={submitPost}>
            올리기
          </button>
        </section>
      )}

      <div className="humor-list">
        {visiblePosts.length === 0 && <p className="can-empty">아직 글이 없어요. 첫 유머를 올려보세요!</p>}
        {visiblePosts.map((post) => {
          const postComments = commentsByPost.get(post.id) ?? [];
          return (
            <button className="humor-row" key={post.id} onClick={() => openDetail(post.id)}>
              <span className="humor-row-glyph">
                {(() => {
                  const Glyph = mediaGlyph(resolveMedia(post.mediaUrl));
                  return <Glyph size={18} aria-hidden />;
                })()}
              </span>
              <span className="humor-row-main">
                <strong>{post.body}</strong>
                <small>
                  <Avatar name={post.author} />
                  {post.author} · {post.createdAt}
                </small>
              </span>
              <span className="humor-row-stats">
                <span>
                  <Laugh size={14} />
                  {post.likedBy.length}
                </span>
                <span>
                  <MessageCircle size={14} />
                  {postComments.length}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
