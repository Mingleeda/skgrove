import {
  CalendarDays,
  Clock3,
  Download,
  ExternalLink,
  Film,
  FolderOpen,
  ImagePlus,
  MessageCircle,
  PartyPopper,
  UploadCloud,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  calendarConfigured,
  connectGoogleCalendar,
  fetchCalendarEvents,
  mergeMemories,
  toMemoryEvents,
} from '../../googleCalendar';
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

const initialMemories: TeamMemory[] = [
  {
    id: 1,
    title: '여름 팀데이',
    date: '2026-08-07',
    place: '성수 오프사이트 라운지',
    host: '김수정',
    createdBy: '김수정',
    summary: '파트를 섞어 점심을 먹고, 오후에는 짧은 회고와 사진 공유 시간을 가져요.',
    tags: ['팀행사', 'D-DAY', '사진모음'],
    assets: [
      {
        id: 101,
        type: 'photo',
        title: '사전 장소 답사',
        uploader: '김수정',
        tone: 'green',
        uploadedAt: '오늘 09:20',
        reactions: { '👍': 18, '👏': 6, '😂': 0, '🔥': 3, '💚': 9 },
        comments: ['여기 조명 좋다. 단체샷 여기서 찍자!'],
      },
      {
        id: 102,
        type: 'video',
        title: '지난 회고 하이라이트',
        uploader: '이상협',
        tone: 'blue',
        uploadedAt: '어제 17:42',
        reactions: { '👍': 12, '👏': 8, '😂': 2, '🔥': 1, '💚': 5 },
        comments: ['마지막 멘트가 제일 좋았어요.'],
      },
      {
        id: 103,
        type: 'photo',
        title: '점심 메뉴 후보',
        uploader: '강리안',
        tone: 'coral',
        uploadedAt: '오늘 10:04',
        reactions: { '👍': 9, '👏': 2, '😂': 4, '🔥': 1, '💚': 3 },
        comments: ['이 메뉴면 오후 회고까지 버틸 수 있어요.'],
      },
      {
        id: 104,
        type: 'photo',
        title: '팀 좌석 배치',
        uploader: '장우진',
        tone: 'amber',
        uploadedAt: '오늘 10:31',
        reactions: { '👍': 14, '👏': 5, '😂': 1, '🔥': 2, '💚': 6 },
        comments: [],
      },
      {
        id: 105,
        type: 'photo',
        title: '포토존 시안',
        uploader: '노지아',
        tone: 'green',
        uploadedAt: '오늘 11:12',
        reactions: { '👍': 21, '👏': 7, '😂': 0, '🔥': 5, '💚': 10 },
        comments: ['이 배경이면 다들 사진 남길 듯!'],
      },
      {
        id: 106,
        type: 'video',
        title: '오프닝 영상 초안',
        uploader: '서민호',
        tone: 'blue',
        uploadedAt: '오늘 11:45',
        reactions: { '👍': 8, '👏': 11, '😂': 3, '🔥': 4, '💚': 2 },
        comments: [],
      },
    ],
    comments: ['날씨 좋으면 야외 단체샷도 찍어요.', '파트 섞기 좌석표 기대됩니다.'],
    reactions: { 좋아요: 18, 웃겨요: 6, 또가요: 11 },
  },
  {
    id: 2,
    title: '캔미팅 워크샵',
    date: '2026-07-18',
    place: '판교 7층 라운지',
    host: '김승현',
    createdBy: '김승현',
    summary: '캔미팅에서 나온 액션아이템을 한 장씩 정리하고 다음 실험을 골랐어요.',
    tags: ['캔미팅', '회고', '자료'],
    assets: [
      {
        id: 201,
        type: 'photo',
        title: '액션아이템 보드',
        uploader: '이선민',
        tone: 'amber',
        uploadedAt: '7월 18일',
        reactions: { '👍': 24, '👏': 10, '😂': 0, '🔥': 2, '💚': 7 },
        comments: ['다음 회의 때 이 보드 그대로 쓰면 좋겠어요.'],
      },
      {
        id: 202,
        type: 'photo',
        title: '팀별 토론 장면',
        uploader: '강리안',
        tone: 'coral',
        uploadedAt: '7월 18일',
        reactions: { '👍': 16, '👏': 9, '😂': 2, '🔥': 3, '💚': 4 },
        comments: ['이 조 아이디어가 제일 현실적이었어요.'],
      },
      {
        id: 203,
        type: 'video',
        title: '마무리 한마디',
        uploader: '서민호',
        tone: 'green',
        uploadedAt: '7월 18일',
        reactions: { '👍': 11, '👏': 5, '😂': 1, '🔥': 0, '💚': 3 },
        comments: [],
      },
    ],
    comments: ['정리된 보드가 다음 회의 때 바로 도움이 됐어요.'],
    reactions: { 좋아요: 24, 웃겨요: 3, 또가요: 8 },
  },
  {
    id: 3,
    title: '랜덤 커피챗',
    date: '2026-07-29',
    place: '사내 카페',
    host: '장우진',
    createdBy: '장우진',
    summary: '조뽑기로 만난 사람끼리 짧게 커피를 마시고 서로의 일하는 방식을 나눠요.',
    tags: ['커피챗', '파트섞기'],
    assets: [
      {
        id: 301,
        type: 'photo',
        title: '지난 커피 인증',
        uploader: '노지아',
        tone: 'blue',
        uploadedAt: '7월 23일',
        reactions: { '👍': 14, '👏': 2, '😂': 5, '🔥': 1, '💚': 4 },
        comments: ['다음에는 디카페인 조도 만들어주세요.'],
      },
    ],
    comments: ['이번에는 음료 취향도 같이 남겨봐요.'],
    reactions: { 좋아요: 12, 웃겨요: 5, 또가요: 15 },
  },
  {
    id: 4,
    title: '파트 데모데이',
    date: '2026-09-04',
    place: '대회의실 A',
    host: '한유진',
    createdBy: '한유진',
    summary: '각 파트가 만든 개선 도구와 실험 결과를 짧게 공유하는 날이에요.',
    tags: ['데모', '공유회'],
    assets: [],
    comments: [],
    reactions: { 좋아요: 9, 웃겨요: 1, 또가요: 6 },
  },
];

const assetTones: MemoryAsset['tone'][] = ['green', 'blue', 'coral', 'amber'];
const emojiOptions: MemoryEmoji[] = ['👍', '👏', '😂', '🔥', '💚'];
const driveRootUrl = 'https://drive.google.com/drive/folders';
const driveFileUrl = 'https://drive.google.com/file/d';

function getDriveFolderId(memory: Pick<TeamMemory, 'id'>) {
  return `skgrove-memory-${memory.id}`;
}

function getDriveFolderUrl(folderId: string) {
  return `${driveRootUrl}/${folderId}`;
}

function getDriveFileMeta(folderId: string, assetId: number) {
  const driveFileId = `${folderId}-file-${assetId}`;
  return {
    driveFileId,
    driveViewUrl: `${driveFileUrl}/${driveFileId}/view`,
    driveDownloadUrl: `${driveFileUrl}/${driveFileId}/uc?export=download`,
  };
}

function getSampleDriveAssets(memory: TeamMemory): MemoryAsset[] {
  const folderId = memory.driveFolderId ?? getDriveFolderId(memory);
  const firstId = Date.now();
  const secondId = firstId + 1;
  return [
    {
      id: firstId,
      type: 'photo',
      title: `${memory.title} 단체컷`,
      uploader: 'Google Drive',
      tone: 'green',
      uploadedAt: 'Drive 동기화',
      reactions: { '👍': 0, '👏': 0, '😂': 0, '🔥': 0, '💚': 0 },
      comments: [],
      ...getDriveFileMeta(folderId, firstId),
    },
    {
      id: secondId,
      type: 'video',
      title: `${memory.title} 하이라이트`,
      uploader: 'Google Drive',
      tone: 'blue',
      uploadedAt: 'Drive 동기화',
      reactions: { '👍': 0, '👏': 0, '😂': 0, '🔥': 0, '💚': 0 },
      comments: [],
      ...getDriveFileMeta(folderId, secondId),
    },
  ];
}

function getDday(date: string) {
  const eventDate = new Date(`${date}T00:00:00`);
  const diff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'D-DAY';
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
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
  const [selectedId, setSelectedId] = useState(initialMemories[0].id);
  const [selectedAssetId, setSelectedAssetId] = useState(initialMemories[0].assets[0]?.id ?? 0);
  const [assetCommentDrafts, setAssetCommentDrafts] = useState<Record<number, string>>({});
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [calendarNotice, setCalendarNotice] = useState('');

  const selectedMemory = memories.find((memory) => memory.id === selectedId) ?? memories[0];
  const selectedAsset = selectedMemory.assets.find((asset) => asset.id === selectedAssetId) ?? selectedMemory.assets[0];
  const upcomingMemories = useMemo(
    () => [...memories].sort((a, b) => a.date.localeCompare(b.date)).filter((memory) => !getDday(memory.date).startsWith('D+')),
    [memories],
  );
  const calendarDays = useMemo(() => getCalendarDays(memories), [memories]);

  useEffect(() => {
    let isMounted = true;

    loadMemories(initialMemories).then((loadedMemories) => {
      if (!isMounted) return;
      setMemories(loadedMemories);
      setSelectedId(loadedMemories[0]?.id ?? initialMemories[0].id);
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

  // 구글 캘린더의 '종일 일정'만 행사로 가져온다. 시간이 잡힌 일정은 회의라
  // 추억 캘린더에 올리면 팀데이·워크샵이 회의에 묻힌다.
  // 앞뒤 6개월을 본다 — 지난 행사는 기록으로, 앞으로의 행사는 D-day 로 쓰인다.
  const CALENDAR_WINDOW_DAYS = 180;

  const importCalendarEvents = async () => {
    if (calendarBusy) return;
    setCalendarBusy(true);
    setCalendarNotice('');
    try {
      const connected = await connectGoogleCalendar();
      if (!connected.ok || !connected.accessToken) {
        setCalendarNotice(
          connected.reason === 'disabled'
            ? '캘린더 연동이 아직 설정되지 않았어요.'
            : `구글 연결에 실패했어요: ${connected.reason ?? '알 수 없는 오류'}`,
        );
        return;
      }

      const now = Date.now();
      const result = await fetchCalendarEvents(
        connected.accessToken,
        new Date(now - CALENDAR_WINDOW_DAYS * 86400000).toISOString(),
        new Date(now + CALENDAR_WINDOW_DAYS * 86400000).toISOString(),
      );
      if (!result.ok || !result.events) {
        setCalendarNotice(`일정을 읽지 못했어요: ${result.reason ?? '알 수 없는 오류'}`);
        return;
      }

      const nextId = memories.reduce((max, memory) => Math.max(max, memory.id), 0) + 1;
      const incoming = toMemoryEvents(result.events, nextId, currentUser.name);
      const merged = mergeMemories(memories, incoming);
      const added = merged.length - memories.length;

      if (added > 0) persistMemories(merged);
      // 0건도 결과다. 조용히 넘기면 눌렀는데 아무 일도 안 난 것처럼 보인다.
      setCalendarNotice(
        added > 0
          ? `행사 ${added}건을 가져왔어요.`
          : '새로 가져올 행사가 없어요. 구글 캘린더의 종일 일정만 행사로 가져옵니다.',
      );
    } finally {
      setCalendarBusy(false);
    }
  };

  const selectCalendarDay = (date: string, memory?: TeamMemory) => {
    if (memory) {
      setSelectedId(memory.id);
      setSelectedAssetId(memory.assets[0]?.id ?? 0);
      return;
    }

    const [, month, day] = date.split('-');
    const nextMemoryId = Date.now();
    const nextDriveFolderId = getDriveFolderId({ id: nextMemoryId });
    const nextMemory: TeamMemory = {
      id: nextMemoryId,
      title: `${Number(month)}/${Number(day)} 팀 추억`,
      date,
      place: '장소 미정',
      host: currentUser.name,
      createdBy: currentUser.name,
      summary: '캘린더에서 만든 새 추억 공간이에요. 팀원이 함께 사진과 영상을 모아갈 수 있어요.',
      tags: ['새앨범', '공동사진첩'],
      driveFolderId: nextDriveFolderId,
      driveFolderUrl: getDriveFolderUrl(nextDriveFolderId),
      assets: [],
      comments: [],
      reactions: { 좋아요: 0, 웃겨요: 0, 또가요: 0 },
    };

    persistMemories([...memories, nextMemory].sort((a, b) => a.date.localeCompare(b.date)));
    setSelectedId(nextMemory.id);
    setSelectedAssetId(0);
  };

  const uploadAssets = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const uploadedAssets: MemoryAsset[] = await Promise.all(
      files.map(async (file, index) => {
        const id = Date.now() + index;
        const localPreviewUrl = URL.createObjectURL(file);
        const stored = await uploadMemoryAssetFile(selectedMemory.id, id, file);
        const folderId = selectedMemory.driveFolderId ?? getDriveFolderId(selectedMemory);

        return {
          id,
          type: file.type.startsWith('video') ? 'video' : 'photo',
          title: file.name.replace(/\.[^/.]+$/, ''),
          uploader: currentUser.name,
          tone: assetTones[(selectedMemory.assets.length + index) % assetTones.length],
          uploadedAt: '방금',
          reactions: { '👍': 0, '👏': 0, '😂': 0, '🔥': 0, '💚': 0 },
          comments: [],
          previewUrl: stored.previewUrl || localPreviewUrl,
          storagePath: stored.storagePath || undefined,
          ...getDriveFileMeta(folderId, id),
        };
      }),
    );

    persistMemories(
      memories.map((memory) =>
        memory.id === selectedMemory.id
          ? {
              ...memory,
              driveFolderId: memory.driveFolderId ?? getDriveFolderId(memory),
              driveFolderUrl: memory.driveFolderUrl ?? getDriveFolderUrl(memory.driveFolderId ?? getDriveFolderId(memory)),
              assets: [...uploadedAssets, ...memory.assets],
            }
          : memory,
      ),
    );
    setSelectedAssetId(uploadedAssets[0].id);
    event.target.value = '';
  };

  const connectDriveFolder = () => {
    const folderId = selectedMemory.driveFolderId ?? getDriveFolderId(selectedMemory);
    persistMemories(
      memories.map((memory) =>
        memory.id === selectedMemory.id
          ? {
              ...memory,
              driveFolderId: folderId,
              driveFolderUrl: getDriveFolderUrl(folderId),
              tags: memory.tags.includes('Drive연동') ? memory.tags : ['Drive연동', ...memory.tags],
            }
          : memory,
      ),
    );
  };

  const importDriveSamples = () => {
    const folderId = selectedMemory.driveFolderId ?? getDriveFolderId(selectedMemory);
    const sampleAssets = getSampleDriveAssets({
      ...selectedMemory,
      driveFolderId: folderId,
      driveFolderUrl: getDriveFolderUrl(folderId),
    });

    persistMemories(
      memories.map((memory) =>
        memory.id === selectedMemory.id
          ? {
              ...memory,
              driveFolderId: folderId,
              driveFolderUrl: getDriveFolderUrl(folderId),
              tags: memory.tags.includes('Drive연동') ? memory.tags : ['Drive연동', ...memory.tags],
              assets: [...sampleAssets, ...memory.assets],
            }
          : memory,
      ),
    );
    setSelectedAssetId(sampleAssets[0].id);
  };

  const reactAsset = (assetId: number, emoji: MemoryEmoji) => {
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
    <section className="screen memory-screen">
      <div className="memory-hero">
        <div>
          <p className="eyebrow">TEAM MEMORY CLOUD</p>
          <h2>행사별로 사진, 영상, 반응을 한 곳에 모아요.</h2>
          <p>캘린더에서 팀 행사를 고르면 함께 업로드한 기록과 댓글이 바로 이어져요.</p>
        </div>
        <div className="memory-dday-board">
          <Clock3 size={22} />
          <span>다가오는 행사</span>
          <strong>{upcomingMemories[0] ? getDday(upcomingMemories[0].date) : '없음'}</strong>
          <small>{upcomingMemories[0]?.title ?? '새 팀 행사를 등록해보세요'}</small>
        </div>
      </div>

      <div className="memory-layout">
        <div className="memory-main">
          <section className="panel memory-calendar-panel">
            <div className="panel-header">
              <CalendarDays size={20} />
              <h2>행사 선택</h2>
            </div>
            <p className="memory-calendar-guide">빈 날짜를 누르면 바로 추억 공간이 만들어져요.</p>
            <div className="memory-calendar-sync">
              <button
                className="secondary-button wide"
                type="button"
                disabled={calendarBusy}
                onClick={() => void importCalendarEvents()}
              >
                <CalendarDays size={16} />
                {calendarBusy ? '구글 캘린더 읽는 중…' : '구글 캘린더에서 행사 가져오기'}
              </button>
              {!calendarConfigured() && (
                <small>연동을 설정하면 캘린더의 종일 일정이 행사로 들어옵니다.</small>
              )}
              {calendarNotice && <small className="memory-calendar-notice">{calendarNotice}</small>}
            </div>
            <div className="memory-weekdays">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="memory-calendar">
              {calendarDays.map((day) => (
                <button
                  className={day.memory?.id === selectedMemory.id ? 'selected' : ''}
                  key={day.key}
                  // 칸이 좁아 제목을 넣을 수 없다. 이름은 툴팁과 아래 행사 목록에서 읽는다.
                  title={day.memory ? `${day.memory.title} · ${getDday(day.memory.date)}` : `${day.label} 추억 만들기`}
                  aria-label={day.memory ? `${day.label} ${day.memory.title}` : `${day.label} 추억 만들기`}
                  onClick={() => selectCalendarDay(day.key, day.memory)}
                >
                  <span>{day.label}</span>
                  {day.memory ? (
                    <>
                      <span className="memory-day-dot" aria-hidden="true" />
                      <small>{getDday(day.memory.date)}</small>
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
                className={memory.id === selectedMemory.id ? 'memory-event-card selected' : 'memory-event-card'}
                key={memory.id}
                onClick={() => {
                  setSelectedId(memory.id);
                  setSelectedAssetId(memory.assets[0]?.id ?? 0);
                }}
              >
                <span>{getDday(memory.date)}</span>
                <div>
                  <strong>{memory.title}</strong>
                  <small>{memory.date} · {memory.place}</small>
                </div>
                <em>{memory.assets.length}개</em>
              </button>
            ))}
          </section>
        </div>

        <aside className="memory-side">
          <section className="panel memory-detail-panel">
            <div className="memory-detail-head">
              <span className="status-pill">{getDday(selectedMemory.date)}</span>
              <h2>{selectedMemory.title}</h2>
              <p>{selectedMemory.summary}</p>
              <div className="memory-meta">
                <span>{selectedMemory.date}</span>
                <span>{selectedMemory.place}</span>
                <span>담당 {selectedMemory.host}</span>
              </div>
            </div>

            <div className="memory-tags">
              {selectedMemory.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>

            <div className="memory-drive-panel">
              <div>
                <FolderOpen size={20} />
                <strong>Google Drive 공동 사진첩</strong>
                <span>
                  {selectedMemory.driveFolderUrl
                    ? '행사별 Drive 폴더와 연결되어 업로드/다운로드 링크를 함께 관리해요.'
                    : '실제 Drive OAuth 전까지 행사별 폴더 매핑과 파일 링크 구조를 먼저 확인해요.'}
                </span>
              </div>
              <div className="memory-drive-actions">
                <button className="secondary-button" type="button" onClick={connectDriveFolder}>
                  폴더 연결
                </button>
                <button type="button" onClick={importDriveSamples}>
                  Drive 샘플 가져오기
                </button>
                {selectedMemory.driveFolderUrl && (
                  <a className="secondary-button" href={selectedMemory.driveFolderUrl} rel="noreferrer" target="_blank">
                    <ExternalLink size={15} />
                    폴더 열기
                  </a>
                )}
              </div>
              <div className="memory-drive-meta">
                <span>{selectedMemory.driveFolderId ? 'Drive 폴더 연결됨' : 'Drive 미연결'}</span>
                <span>{selectedMemory.assets.filter((asset) => asset.driveFileId).length}개 파일 링크</span>
                <span>파일 반응/댓글은 앱에 저장</span>
              </div>
            </div>

            <div className="memory-upload-box">
              <div>
                <UploadCloud size={20} />
                <strong>내 사진첩에서 여러 개 올리기</strong>
              </div>
              <label className="memory-file-drop">
                <input accept="image/*,video/*" multiple type="file" onChange={uploadAssets} />
                <span>사진/동영상 선택</span>
                <small>여러 파일을 한 번에 선택하면 구글 드라이브처럼 앨범에 바로 쌓여요.</small>
              </label>
            </div>

            <div className="memory-album-head">
              <div>
                <strong>{selectedMemory.title} 사진첩</strong>
                <span>{selectedMemory.assets.length}개 파일 · 누구나 업로드/다운로드 가능</span>
              </div>
              <button className="secondary-button" type="button">
                <Download size={16} />
                전체 다운로드
              </button>
            </div>

            <div className="memory-assets">
              {selectedMemory.assets.map((asset) => (
                <button
                  className={asset.id === selectedAsset?.id ? `memory-asset selected ${asset.tone}` : `memory-asset ${asset.tone}`}
                  key={asset.id}
                  onClick={() => setSelectedAssetId(asset.id)}
                  type="button"
                >
                  <div className="memory-asset-visual">
                    {asset.previewUrl ? (
                      asset.type === 'photo' ? (
                        <img alt="" src={asset.previewUrl} />
                      ) : (
                        <video muted src={asset.previewUrl} />
                      )
                    ) : asset.type === 'photo' ? (
                      <ImagePlus size={28} />
                    ) : (
                      <Film size={28} />
                    )}
                    <span>{asset.type === 'photo' ? 'PHOTO' : 'VIDEO'}</span>
                  </div>
                </button>
              ))}
              {selectedMemory.assets.length === 0 && <div className="memory-empty">첫 사진이나 영상을 올려보세요.</div>}
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
                  <div className="memory-asset-actions">
                    {selectedAsset.driveViewUrl && (
                      <a href={selectedAsset.driveViewUrl} rel="noreferrer" target="_blank">
                        <ExternalLink size={16} />
                        Drive 보기
                      </a>
                    )}
                    <a href={selectedAsset.driveDownloadUrl ?? selectedAsset.previewUrl ?? '#'} rel="noreferrer" target="_blank">
                      <Download size={16} />
                      다운로드
                    </a>
                  </div>
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

          </section>
        </aside>
      </div>

      <section className="memory-gallery-strip">
        <div>
          <PartyPopper size={20} />
          <strong>공동 앨범</strong>
        </div>
        <span>팀원이 올린 사진과 영상이 행사별 폴더처럼 쌓이고, 클릭한 행사에서 바로 이어서 볼 수 있어요.</span>
      </section>
    </section>
  );
}
