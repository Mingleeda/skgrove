import { useMemo, useState, type ChangeEvent } from 'react';
import { CalendarClock, ChevronDown, ImagePlus, MapPin, Trash2, Users, Zap } from 'lucide-react';
import { PanelHeader } from '../../components/PanelHeader';
import { teamParts } from '../../auth';
import type { Gathering, GatheringCost, GatheringKind, TeamPart } from '../../types';

export type GatheringDraft = Pick<
  Gathering,
  'title' | 'startAt' | 'place' | 'capacity' | 'closeAt' | 'minPeople' | 'desc' | 'part' | 'cost'
> & { imageFile: File | null };

type GatheringFormProps = {
  kind: GatheringKind;
  onSubmit: (draft: GatheringDraft) => void;
  onCancel: () => void;
};

const parts: TeamPart[] = ['전체', ...teamParts];
const costs: GatheringCost[] = ['없음', 'n빵', '주최자 부담'];

/** 'YYYY-MM-DDTHH:mm' 로컬 시각. datetime-local 이 그대로 받는 형식이다. */
function localStamp(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function at(dayOffset: number, hour: number) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, 0, 0, 0);
  return localStamp(date);
}

/*
  번개는 "지금 정해서 오늘 만나는" 것이라 날짜 입력이 가장 큰 마찰이다.
  달력을 열어 연·월·일·시를 고르게 하면 그 사이에 마음이 식는다. 칩 하나로 끝내고,
  안 맞으면 그때만 직접 고르게 한다. 공모는 미리 계획하는 것이라 칩이 의미가 적다.
*/
const FLASH_CHIPS: Array<{ label: string; value: () => string }> = [
  { label: '오늘 점심', value: () => at(0, 12) },
  { label: '오늘 저녁', value: () => at(0, 18) },
  { label: '내일 점심', value: () => at(1, 12) },
  { label: '내일 저녁', value: () => at(1, 18) },
];

export function GatheringForm({ kind, onSubmit, onCancel }: GatheringFormProps) {
  const isFlash = kind === 'flash';

  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState(isFlash ? at(0, 18) : at(7, 18));
  const [place, setPlace] = useState('');
  const [unlimited, setUnlimited] = useState(false);
  const [capacity, setCapacity] = useState('6');

  // 선택 항목은 접어 둔다. 번개 등록이 5개 필드를 넘어가면 번개가 아니게 된다.
  const [moreOpen, setMoreOpen] = useState(false);
  const [closeAt, setCloseAt] = useState('');
  const [minPeople, setMinPeople] = useState('');
  const [desc, setDesc] = useState('');
  const [part, setPart] = useState<TeamPart>('전체');
  const [cost, setCost] = useState<GatheringCost>('없음');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  // 미리보기는 파일이 바뀔 때만 다시 만든다. 렌더마다 만들면 URL 이 계속 새로 생긴다.
  const previewUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : ''), [imageFile]);

  const pickImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
  };

  const submit = () => {
    const trimmedTitle = title.trim();
    const trimmedPlace = place.trim();

    if (trimmedTitle.length < 2) {
      setError('무엇을 하는 자리인지 적어주세요. 피드에서 제목만 보고 들어올지 정합니다.');
      return;
    }
    if (!startAt) {
      setError('언제 만나는지 정해주세요.');
      return;
    }
    if (!trimmedPlace) {
      setError('어디서 만나는지 적어주세요. 온라인이면 링크를 넣어도 됩니다.');
      return;
    }

    const parsedCapacity = unlimited ? null : Number(capacity);
    if (!unlimited && (!Number.isFinite(parsedCapacity) || (parsedCapacity as number) < 1)) {
      setError('정원은 1명 이상으로 정하거나 "제한 없음"을 선택해주세요.');
      return;
    }

    // 마감을 비워두면 시작 시각을 그대로 쓴다. 대부분 그게 맞고, 물어볼 이유가 없다.
    const finalCloseAt = closeAt || startAt;
    if (finalCloseAt > startAt) {
      setError('신청 마감은 시작 시각보다 늦을 수 없습니다.');
      return;
    }

    const parsedMin = minPeople.trim() ? Number(minPeople) : null;
    if (parsedMin !== null && (!Number.isFinite(parsedMin) || parsedMin < 1)) {
      setError('최소 인원은 1명 이상으로 적어주세요.');
      return;
    }
    if (parsedMin !== null && parsedCapacity !== null && parsedMin > parsedCapacity) {
      setError('최소 인원이 정원보다 많습니다.');
      return;
    }

    setError('');
    onSubmit({
      title: trimmedTitle,
      startAt,
      place: trimmedPlace,
      capacity: parsedCapacity,
      closeAt: finalCloseAt,
      minPeople: parsedMin,
      desc: desc.trim(),
      part,
      cost,
      imageFile,
    });
  };

  return (
    <section className="panel gathering-form">
      <PanelHeader icon={isFlash ? Zap : CalendarClock} title={isFlash ? '번개 열기' : '일정 공모하기'} />

      <label className="field">
        <span className="field-label">
          무엇을 하나요 <em>필수</em>
        </span>
        <input
          autoFocus
          maxLength={40}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={isFlash ? '예) 점심 같이 먹어요' : '예) 제주 워크샵 함께 가실 분'}
          value={title}
        />
      </label>

      <div className="field">
        <span className="field-label">
          언제 만나나요 <em>필수</em>
        </span>
        {isFlash && (
          <div className="chip-row">
            {FLASH_CHIPS.map((chip) => {
              const value = chip.value();
              return (
                <button
                  className={startAt === value ? 'chip selected' : 'chip'}
                  key={chip.label}
                  onClick={() => setStartAt(value)}
                  type="button"
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        )}
        <input
          aria-label="시작 시각"
          onChange={(event) => setStartAt(event.target.value)}
          type="datetime-local"
          value={startAt}
        />
      </div>

      <div className="gathering-pair">
        <label className="field">
          <span className="field-label">
            어디서 <em>필수</em>
          </span>
        <span className="field-with-icon">
          <MapPin size={16} />
          <input
            onChange={(event) => setPlace(event.target.value)}
            placeholder="예) 1층 로비 / 강남 볼링장 / 온라인 링크"
            value={place}
          />
        </span>
      </label>

      <div className="field">
        <span className="field-label">
          몇 명까지 <em>필수</em>
        </span>
        <div className="capacity-row">
          <span className="field-with-icon">
            <Users size={16} />
            <input
              aria-label="정원"
              disabled={unlimited}
              min={1}
              onChange={(event) => setCapacity(event.target.value)}
              type="number"
              value={unlimited ? '' : capacity}
            />
          </span>
          <label className="checkline">
            <input checked={unlimited} onChange={(event) => setUnlimited(event.target.checked)} type="checkbox" />
            제한 없음
          </label>
        </div>
        {!unlimited && <p className="field-note">정원을 넘으면 대기 순번으로 받고, 앞사람이 취소하면 자동으로 올라갑니다.</p>}
        </div>
      </div>

      <button className="more-toggle" onClick={() => setMoreOpen((open) => !open)} type="button">
        <ChevronDown className={moreOpen ? 'rotated' : ''} size={16} />
        {moreOpen ? '선택 항목 접기' : '선택 항목 더 보기'}
      </button>

      {moreOpen && (
        <div className="gathering-more">
          <div className="gathering-pair">
            <label className="field">
              <span className="field-label">신청 마감</span>
            <input onChange={(event) => setCloseAt(event.target.value)} type="datetime-local" value={closeAt} />
            <p className="field-note">비워두면 시작 시각까지 받습니다.</p>
          </label>

          <label className="field">
            <span className="field-label">최소 인원</span>
            <input
              min={1}
              onChange={(event) => setMinPeople(event.target.value)}
              placeholder="예) 3"
              type="number"
              value={minPeople}
            />
            <p className="field-note">이 인원이 안 모이면 부담 없이 접을 수 있게 미리 알려둡니다.</p>
            </label>
          </div>

          <label className="field">
            <span className="field-label">한 줄 설명</span>
            <textarea
              maxLength={120}
              onChange={(event) => setDesc(event.target.value)}
              placeholder="준비물이나 분위기를 적어주세요"
              rows={2}
              value={desc}
            />
          </label>

          <div className="gathering-pair">
            <label className="field">
              <span className="field-label">대상</span>
            <select onChange={(event) => setPart(event.target.value as TeamPart)} value={part}>
              {parts.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">비용</span>
            <select onChange={(event) => setCost(event.target.value as GatheringCost)} value={cost}>
              {costs.map((item) => (
                <option key={item}>{item}</option>
              ))}
              </select>
            </label>
          </div>
        </div>
      )}

      <div className="field">
        <span className="field-label">대표 이미지</span>
        {previewUrl ? (
          <div className="image-picked">
            <img alt="첨부한 이미지 미리보기" src={previewUrl} />
            <button className="btn-ghost" onClick={() => setImageFile(null)} type="button">
              <Trash2 size={16} />
              지우고 자동 생성으로
            </button>
          </div>
        ) : (
          <label className="image-drop">
            <input accept="image/*" onChange={pickImage} type="file" />
            <ImagePlus size={22} />
            <strong>사진 넣기</strong>
            <small>넣지 않으면 입력한 내용으로 포스터를 만들어 드려요.</small>
          </label>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button className="btn-ghost" onClick={onCancel} type="button">
          취소
        </button>
        <button className="primary-button" onClick={submit} type="button">
          {isFlash ? '번개 열기' : '공모 올리기'}
        </button>
      </div>
    </section>
  );
}
