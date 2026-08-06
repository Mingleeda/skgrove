import {
  CalendarDays,
  ChevronLeft,
  Download,
  Film,
  Grid3x3,
  ImagePlus,
  MessageCircle,
  PartyPopper,
  UploadCloud,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { compressImage } from '../../imageCompress';
import {
  loadMemories,
  saveMemories,
  uploadMemoryAssetFile,
} from '../../memoryStore';
import type { CurrentUser, MemoryAsset, MemoryEmoji, TeamMemory } from '../../types';

type MemoryProps = {
  currentUser: CurrentUser;
};

const today = new Date('2026-07-25T09:00:00');

const initialMemories: TeamMemory[] = [];

const assetTones: MemoryAsset['tone'][] = ['green', 'blue', 'coral', 'amber'];
const emojiOptions: MemoryEmoji[] = ['👍', '👏', '😂', '🔥', '💚'];

function shortDate(date: string) {
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function getCalendarDays(memories: TeamMemory[]) {
  const base = new Date(today);
  base.setDate(today.getDate() - today.getDay());
  base.setHours(0, 0, 0, 0);
  const eventMap = new Map(memories.map((memory) => [memory.date, memory]));

  return Array.from({ length: 21 }, (_, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      weekday: date.getDay(),
      memory: eventMap.get(key),
    };
  });
}

export function Memory({ currentUser }: MemoryProps) {
  const [memories, setMemories] = useState<TeamMemory[]>(initialMemories);
  const [selectedId, setSelectedId] = useState(initialMemories[0]?.id ?? 0);
  const [selectedAssetId, setSelectedAssetId] = useState(initialMemories[0]?.assets[0]?.id ?? 0);
  const [assetCommentDrafts, setAssetCommentDrafts] = useState<Record<number, string>>({});
  // 인스타 프로필의 탭. 기본은 격자다 — 이 화면에 오는 이유가 사진을 보는 것이라
  // 캘린더(행사 만들기)는 필요할 때 들어가는 두 번째 탭으로 내렸다.
  const [tab, setTab] = useState<'grid' | 'calendar'>('grid');
  // 게시물 탭 안의 두 단계. 'events'는 행사별 커버 한 장씩 보는 앨범 목록,
  // 'detail'은 한 행사로 들어가 그 안의 사진들을 보고 올리는 곳이다.
  const [view, setView] = useState<'events' | 'detail'>('events');

  // 프로필 통계. 인스타의 게시물·팔로워 자리라 팀 전체를 세야 뜻이 맞는다.
  const totalAssets = memories.reduce((sum, memory) => sum + memory.assets.length, 0);
  const contributorCount = new Set(
    memories.flatMap((memory) => memory.assets.map((asset) => asset.uploader)),
  ).size;

  // 행사가 하나도 없을 수 있다(가데이터를 걷어낸 첫 상태). 이 경우 selectedMemory 는
  // undefined 이고, 게시물 탭은 늘 앨범 목록(빈 안내)만 보여주므로 상세를 못 만진다.
  const selectedMemory = memories.find((memory) => memory.id === selectedId) ?? memories[0];
  const selectedAsset =
    selectedMemory?.assets.find((asset) => asset.id === selectedAssetId) ?? selectedMemory?.assets[0];
  const calendarDays = useMemo(() => getCalendarDays(memories), [memories]);

  useEffect(() => {
    let isMounted = true;

    loadMemories(initialMemories).then((loadedMemories) => {
      if (!isMounted) return;
      setMemories(loadedMemories);
      setSelectedId(loadedMemories[0]?.id ?? 0);
      setSelectedAssetId(loadedMemories[0]?.assets[0]?.id ?? 0);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const persistMemories = (nextMemories: TeamMemory[]) => {
    setMemories(nextMemories);
    void saveMemories(nextMemories);
  };

  // 한 행사 앨범으로 들어간다. 어디서 부르든(스토리·캘린더·목록) 게시물 탭의
  // 상세로 데려가, 사진을 보고 바로 올릴 수 있게 한다.
  const openAlbum = (memory: TeamMemory) => {
    setSelectedId(memory.id);
    setSelectedAssetId(memory.assets[0]?.id ?? 0);
    setTab('grid');
    setView('detail');
  };

  const selectCalendarDay = (date: string, memory?: TeamMemory) => {
    if (memory) {
      openAlbum(memory);
      return;
    }

    const [, month, day] = date.split('-');
    const nextMemory: TeamMemory = {
      id: Date.now(),
      title: `${Number(month)}/${Number(day)} 팀 추억`,
      date,
      place: '장소 미정',
      host: currentUser.name,
      createdBy: currentUser.name,
      summary: '새 추억 공간이에요. 게시물 탭에서 사진과 영상을 올려 함께 채워가요.',
      tags: ['새앨범'],
      assets: [],
      comments: [],
      reactions: { 좋아요: 0, 웃겨요: 0, 또가요: 0 },
    };

    persistMemories([...memories, nextMemory].sort((a, b) => a.date.localeCompare(b.date)));
    // 새 앨범은 바로 상세로 들어가 첫 사진을 올릴 수 있게 한다.
    setSelectedId(nextMemory.id);
    setSelectedAssetId(0);
    setTab('grid');
    setView('detail');
  };

  const uploadAssets = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!selectedMemory) return;
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const uploadedAssets: MemoryAsset[] = await Promise.all(
      files.map(async (file, index) => {
        const id = Date.now() + index;
        const isVideo = file.type.startsWith('video');
        // 사진은 업로드 전에 줄여 용량을 아낀다(영상·GIF는 compressImage가 원본 유지).
        const toUpload = await compressImage(file);
        const localPreviewUrl = URL.createObjectURL(toUpload);
        const stored = await uploadMemoryAssetFile(selectedMemory.id, id, toUpload);

        return {
          id,
          type: isVideo ? 'video' : 'photo',
          title: file.name.replace(/\.[^/.]+$/, ''),
          uploader: currentUser.name,
          tone: assetTones[(selectedMemory.assets.length + index) % assetTones.length],
          uploadedAt: '방금',
          reactions: { '👍': 0, '👏': 0, '😂': 0, '🔥': 0, '💚': 0 },
          comments: [],
          previewUrl: stored.previewUrl || localPreviewUrl,
          storagePath: stored.storagePath || undefined,
        };
      }),
    );

    persistMemories(
      memories.map((memory) =>
        memory.id === selectedMemory.id
          ? { ...memory, assets: [...uploadedAssets, ...memory.assets] }
          : memory,
      ),
    );
    setSelectedAssetId(uploadedAssets[0].id);
    event.target.value = '';
  };

  const reactAsset = (assetId: number, emoji: MemoryEmoji) => {
    if (!selectedMemory) return;
    persistMemories(
      memories.map((memory) =>
        memory.id === selectedMemory.id
          ? {
              ...memory,
              assets: memory.assets.map((asset) =>
                asset.id === assetId
                  ? { ...asset, reactions: { ...asset.reactions, [emoji]: asset.reactions[emoji] + 1 } }
                  : asset,
              ),
            }
          : memory,
      ),
    );
  };

  const addAssetComment = (assetId: number) => {
    if (!selectedMemory) return;
    const comment = assetCommentDrafts[assetId]?.trim();
    if (!comment) return;

    persistMemories(
      memories.map((memory) =>
        memory.id === selectedMemory.id
          ? {
              ...memory,
              assets: memory.assets.map((asset) =>
                asset.id === assetId ? { ...asset, comments: [comment, ...asset.comments] } : asset,
              ),
            }
          : memory,
      ),
    );
    setAssetCommentDrafts({ ...assetCommentDrafts, [assetId]: '' });
  };

  return (
    <section className="screen ig-profile">
      {/*
        인스타 프로필 헤더. 이 앱의 계정은 사람이 아니라 팀 하나라
        아바타도 팀이고 통계도 팀의 것이다. 개인 계정을 만들면
        익명 접수의 전제가 흔들린다.
      */}
      <header className="ig-prof-head">
        <span className="ig-prof-ava">
          <PartyPopper size={38} strokeWidth={1.4} />
        </span>
        <div className="ig-prof-info">
          <div className="ig-prof-line">
            <h2>team_memory</h2>
            <button className="ig-btn-soft" type="button" onClick={() => setTab('calendar')}>
              행사 만들기
            </button>
          </div>
          <div className="ig-prof-stats">
            <span>
              행사 <b>{memories.length}</b>
            </span>
            <span>
              기록 <b>{totalAssets}</b>
            </span>
            <span>
              함께한 사람 <b>{contributorCount}</b>
            </span>
          </div>
          <p className="ig-prof-bio">
            <b>팀 추억</b>
            행사별로 사진 · 영상 · 반응을 한 곳에 모아요.
          </p>
        </div>
      </header>

      {/* 하이라이트. 인스타에서 하이라이트는 지나간 스토리를 묶어두는 자리라
          지난 행사와 성질이 같다. 링을 칠하지 않는 이유도 같다 — 이미 본 것이다. */}
      <div className="ig-tray ig-highlights">
        {memories.map((memory) => (
          <button
            className="ig-story"
            key={memory.id}
            onClick={() => openAlbum(memory)}
            type="button"
          >
            <span className={memory.id === selectedMemory?.id ? 'ig-ring' : 'ig-ring seen'}>
              <span className="ig-thumb">
                <CalendarDays size={22} strokeWidth={1.6} />
              </span>
            </span>
            <small>{memory.title}</small>
          </button>
        ))}
      </div>

      <div className="ig-tabs">
        <button
          className={tab === 'grid' ? 'on' : ''}
          onClick={() => {
            setTab('grid');
            setView('events');
          }}
          type="button"
        >
          <Grid3x3 size={12} />
          게시물
        </button>
        <button
          className={tab === 'calendar' ? 'on' : ''}
          onClick={() => setTab('calendar')}
          type="button"
        >
          <CalendarDays size={12} />
          캘린더
        </button>
      </div>

      {tab === 'grid' ? (
        view === 'events' || !selectedMemory ? (
          // 앨범 목록 — 행사마다 커버 한 장. 인스타 프로필 격자를 재사용하되
          // 각 칸이 사진 하나가 아니라 '행사 하나'다. 누르면 그 행사 상세로 들어간다.
          <div className="ig-grid-tab">
            <p className="ig-grid-note">
              <b>행사 앨범</b>
              행사를 누르면 그 행사의 사진을 볼 수 있어요.
            </p>
            <div className="ig-cells">
              {memories.map((memory) => {
                const cover = memory.assets.find((asset) => asset.previewUrl);
                return (
                  <button
                    className="ig-cell memory-album-cell"
                    key={memory.id}
                    onClick={() => openAlbum(memory)}
                    type="button"
                  >
                    {cover?.previewUrl ? (
                      cover.type === 'photo' ? (
                        <img alt="" src={cover.previewUrl} />
                      ) : (
                        <video muted src={cover.previewUrl} />
                      )
                    ) : (
                      <span className="ig-cell-blank">
                        <CalendarDays size={26} />
                      </span>
                    )}
                    <span className="memory-album-cap">
                      <strong>{memory.title}</strong>
                      <small>{memory.assets.length}개</small>
                    </span>
                  </button>
                );
              })}
            </div>
            {memories.length === 0 && (
              <div className="memory-empty">캘린더 탭에서 행사를 먼저 만들어 보세요.</div>
            )}
          </div>
        ) : (
        <div className="ig-grid-tab">
          <button className="memory-back" type="button" onClick={() => setView('events')}>
            <ChevronLeft size={16} />
            앨범 목록
          </button>
          <p className="ig-grid-note">
            <b>{selectedMemory.title}</b>
            {selectedMemory.date} · {selectedMemory.place} · 담당 {selectedMemory.host}
          </p>

          {/* 인스타 프로필 격자. 1:1 · 3열 · 3px 간격. 셀을 누르면 아래 게시물이 바뀐다. */}
          <div className="ig-cells">
            {selectedMemory.assets.map((asset) => (
              <button
                className={asset.id === selectedAsset?.id ? 'ig-cell on' : 'ig-cell'}
                key={asset.id}
                onClick={() => setSelectedAssetId(asset.id)}
                type="button"
              >
                {asset.previewUrl ? (
                  asset.type === 'photo' ? (
                    <img alt="" src={asset.previewUrl} />
                  ) : (
                    <video muted src={asset.previewUrl} />
                  )
                ) : (
                  <span className="ig-cell-blank">
                    {asset.type === 'photo' ? <ImagePlus size={26} /> : <Film size={26} />}
                  </span>
                )}
                {asset.type === 'video' && (
                  <i className="ig-cell-mark" aria-hidden="true">
                    <Film size={15} />
                  </i>
                )}
              </button>
            ))}
          </div>

          {selectedMemory.assets.length === 0 && (
            <div className="memory-empty">첫 사진이나 영상을 올려보세요.</div>
          )}

          <div className="memory-upload-box">
            <div>
              <UploadCloud size={20} />
              <strong>내 사진첩에서 여러 개 올리기</strong>
            </div>
            <label className="memory-file-drop">
              <input accept="image/*,video/*" multiple type="file" onChange={uploadAssets} />
              <span>사진/동영상 선택</span>
              <small>여러 파일을 한 번에 선택하면 앨범에 바로 쌓여요. 사진은 올릴 때 자동으로 가볍게 줄여 저장해요.</small>
            </label>
          </div>

          {selectedAsset && (
            <article className={`memory-post ${selectedAsset.tone}`}>
              <div className="memory-post-media">
                {selectedAsset.previewUrl ? (
                  selectedAsset.type === 'photo' ? (
                    <img alt="" src={selectedAsset.previewUrl} />
                  ) : (
                    <video controls src={selectedAsset.previewUrl} />
                  )
                ) : selectedAsset.type === 'photo' ? (
                  <ImagePlus size={36} />
                ) : (
                  <Film size={36} />
                )}
              </div>
              <div className="memory-post-side">
                <div className="memory-asset-profile">
                  <span>{selectedAsset.uploader.slice(0, 1)}</span>
                  <div>
                    <strong>{selectedAsset.uploader}</strong>
                    <small>{selectedAsset.uploadedAt}</small>
                  </div>
                </div>
                <h3>{selectedAsset.title}</h3>
                <div className="memory-emoji-actions" aria-label="사진 반응">
                  {emojiOptions.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => reactAsset(selectedAsset.id, emoji)}>
                      <span>{emoji}</span>
                      {selectedAsset.reactions[emoji]}
                    </button>
                  ))}
                </div>
                {selectedAsset.previewUrl && (
                  <div className="memory-asset-actions">
                    <a href={selectedAsset.previewUrl} rel="noreferrer" target="_blank">
                      <Download size={16} />
                      원본 보기
                    </a>
                  </div>
                )}
                <div className="memory-asset-comments">
                  <div className="memory-asset-comment-input">
                    <MessageCircle size={16} />
                    <input
                      value={assetCommentDrafts[selectedAsset.id] ?? ''}
                      onChange={(event) =>
                        setAssetCommentDrafts({ ...assetCommentDrafts, [selectedAsset.id]: event.target.value })
                      }
                      aria-label="댓글 달기"
                      placeholder="댓글 달기"
                    />
                    <button className="secondary-button" type="button" onClick={() => addAssetComment(selectedAsset.id)}>
                      등록
                    </button>
                  </div>
                  {selectedAsset.comments.map((comment) => (
                    <p key={comment}>{comment}</p>
                  ))}
                </div>
              </div>
            </article>
          )}
        </div>
        )
      ) : (
        <div className="ig-grid-tab">
          <section className="panel memory-calendar-panel">
            <div className="panel-header">
              <CalendarDays size={20} />
              <h2>행사 선택</h2>
            </div>
            <p className="memory-calendar-guide">
              빈 날짜를 누르면 그 날짜의 추억 공간이 만들어져요. 만든 뒤 게시물 탭에서 사진·영상을 올리면 됩니다.
            </p>
            <div className="memory-weekdays">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="memory-calendar">
              {calendarDays.map((day) => (
                <button
                  className={day.memory?.id === selectedMemory?.id ? 'selected' : ''}
                  key={day.key}
                  // 칸이 좁아 제목을 넣을 수 없다. 이름은 툴팁과 아래 행사 목록에서 읽는다.
                  title={day.memory ? day.memory.title : `${day.label} 추억 만들기`}
                  aria-label={day.memory ? `${day.label} ${day.memory.title}` : `${day.label} 추억 만들기`}
                  onClick={() => selectCalendarDay(day.key, day.memory)}
                >
                  <span>{day.label}</span>
                  {day.memory ? (
                    <>
                      <span className="memory-day-dot" aria-hidden="true" />
                      <small>{day.memory.assets.length}개</small>
                    </>
                  ) : (
                    <small className="memory-create-hint">만들기</small>
                  )}
                </button>
              ))}
            </div>
          </section>
          <section className="memory-event-list">
            {memories.map((memory) => (
              <button
                className={memory.id === selectedMemory?.id ? 'memory-event-card selected' : 'memory-event-card'}
                key={memory.id}
                onClick={() => {
                  setSelectedId(memory.id);
                  setSelectedAssetId(memory.assets[0]?.id ?? 0);
                }}
              >
                <span>{shortDate(memory.date)}</span>
                <div>
                  <strong>{memory.title}</strong>
                  <small>{memory.date} · {memory.place}</small>
                </div>
                <em>{memory.assets.length}개</em>
              </button>
            ))}
          </section>
        </div>
      )}
    </section>
  );
}
