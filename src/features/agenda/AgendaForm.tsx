import { useState } from 'react';
import { AlertTriangle, EyeOff, FilePlus2, ListChecks, Plus, Scale, Send, ShieldCheck, X } from 'lucide-react';
import { PanelHeader } from '../../components/PanelHeader';
import { teamParts } from '../../auth';
import type { Agenda, Identity, TeamPart, VoteType } from '../../types';

export type AgendaDraft = Pick<
  Agenda,
  'title' | 'description' | 'category' | 'part' | 'author' | 'deadline' | 'voteType' | 'multiSelect'
> & {
  // 라벨만 넘긴다. 선택지 id 발급과 집계 초기화는 안건을 만드는 쪽 책임이다.
  optionLabels: string[];
};

type AgendaFormProps = {
  onSubmit: (draft: AgendaDraft) => void;
  onCancel: () => void;
};

const categories = ['회의문화', '협업', '업무방식', '갈등', '성장/피드백', '복지/분위기', '기타'];
// auth.teamParts에는 '전체'가 없다. 안건은 팀 전체 대상이 기본이라 앞에 붙여 쓴다.
const agendaParts: TeamPart[] = ['전체', ...teamParts];

const DEFAULT_VOTING_DAYS = 7;
const addDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

// 선택지가 많아지면 스토리 투표 카드에서 막대가 읽히지 않고, 표도 잘게 흩어져 정족수를 못 채운다.
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

const voteTypeIcon: Record<VoteType, typeof Scale> = {
  찬반: Scale,
  객관식: ListChecks,
};

export function AgendaForm({ onSubmit, onCancel }: AgendaFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [part, setPart] = useState<TeamPart>('전체');
  const [author, setAuthor] = useState<Identity>('익명');
  const [deadline, setDeadline] = useState(addDays(DEFAULT_VOTING_DAYS));
  const [voteType, setVoteType] = useState<VoteType>('찬반');
  const [optionLabels, setOptionLabels] = useState<string[]>(Array(MIN_OPTIONS).fill(''));
  const [multiSelect, setMultiSelect] = useState(false);
  const [error, setError] = useState('');

  const updateOption = (index: number, value: string) =>
    setOptionLabels((labels) => labels.map((label, at) => (at === index ? value : label)));

  const addOption = () => setOptionLabels((labels) => (labels.length < MAX_OPTIONS ? [...labels, ''] : labels));

  const removeOption = (index: number) =>
    setOptionLabels((labels) => (labels.length > MIN_OPTIONS ? labels.filter((_, at) => at !== index) : labels));

  const submit = () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (trimmedTitle.length < 5) {
      setError('제목은 5자 이상 입력해주세요. 투표하는 사람이 제목만 보고 판단할 수 있어야 합니다.');
      return;
    }

    if (!trimmedDescription) {
      setError('배경 설명을 입력해주세요. 맥락 없는 안건은 찬반이 갈리기 어렵습니다.');
      return;
    }

    if (deadline && deadline <= addDays(0)) {
      setError('마감일은 내일 이후로 정해주세요. 오늘 마감이면 투표할 시간이 없습니다.');
      return;
    }

    // 빈 칸은 지우고 검사한다. 세 칸을 열어두고 둘만 채운 것은 실수가 아니다.
    const labels = optionLabels.map((label) => label.trim()).filter(Boolean);

    if (voteType === '객관식') {
      if (labels.length < MIN_OPTIONS) {
        setError(`선택지를 ${MIN_OPTIONS}개 이상 입력해주세요. 하나뿐이면 고를 것이 없습니다.`);
        return;
      }

      if (new Set(labels).size !== labels.length) {
        setError('같은 선택지가 두 번 들어 있습니다. 어느 쪽에 투표한 것인지 알 수 없게 됩니다.');
        return;
      }
    }

    setError('');
    onSubmit({
      title: trimmedTitle,
      description: trimmedDescription,
      category,
      part,
      author,
      deadline,
      voteType,
      // 찬반이면 선택지를 저장하지 않는다. 방식을 바꿔가며 쓴 흔적이 남을 이유가 없다.
      optionLabels: voteType === '객관식' ? labels : [],
      multiSelect: voteType === '객관식' && multiSelect,
    });
  };

  return (
    <section className="panel agenda-form-panel">
      <PanelHeader icon={FilePlus2} title="새 안건 등록" />

      <div className="intake-choice-grid">
        {(['익명', '실명'] as const).map((item) => (
          <button
            className={author === item ? 'choice-card selected' : 'choice-card'}
            key={item}
            onClick={() => setAuthor(item)}
          >
            {item === '익명' ? <EyeOff size={22} /> : <ShieldCheck size={22} />}
            <strong>{item}</strong>
          </button>
        ))}
      </div>

      <div className="form-grid">
        <label>
          카테고리
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          투표 대상 파트
          <select value={part} onChange={(event) => setPart(event.target.value as TeamPart)}>
            {agendaParts.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      <label>
        투표 마감일
        <input type="date" value={deadline} min={addDays(1)} onChange={(event) => setDeadline(event.target.value)} />
      </label>

      <p className="form-section-label">투표 방식</p>
      <div className="intake-choice-grid">
        {(Object.keys(voteTypeIcon) as VoteType[]).map((item) => {
          const Icon = voteTypeIcon[item];
          return (
            <button
              className={voteType === item ? 'choice-card selected' : 'choice-card'}
              key={item}
              onClick={() => setVoteType(item)}
              type="button"
            >
              <Icon size={22} />
              <strong>{item}</strong>
            </button>
          );
        })}
      </div>

      {voteType === '객관식' && (
        <div className="agenda-options-editor">
          <p className="form-section-label">선택지</p>
          {optionLabels.map((label, index) => (
            <div className="agenda-option-row" key={index}>
              <input
                value={label}
                onChange={(event) => updateOption(index, event.target.value)}
                placeholder={`선택지 ${index + 1}`}
                aria-label={`선택지 ${index + 1}`}
              />
              <button
                className="agenda-option-remove"
                onClick={() => removeOption(index)}
                disabled={optionLabels.length <= MIN_OPTIONS}
                aria-label={`선택지 ${index + 1} 삭제`}
                type="button"
              >
                <X size={16} />
              </button>
            </div>
          ))}

          <button
            className="secondary-button"
            onClick={addOption}
            disabled={optionLabels.length >= MAX_OPTIONS}
            type="button"
          >
            <Plus size={16} />
            {optionLabels.length >= MAX_OPTIONS ? `선택지는 ${MAX_OPTIONS}개까지` : '선택지 추가'}
          </button>

          <label className="agenda-multi-toggle">
            <input type="checkbox" checked={multiSelect} onChange={(event) => setMultiSelect(event.target.checked)} />
            <span>
              <strong>여러 개 고르기 허용</strong>
              마음에 드는 것을 모두 고를 수 있습니다. 선택지 비율의 합이 100%를 넘을 수 있어요.
            </span>
          </label>
        </div>
      )}

      <label>
        안건 제목
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="예: 팀 티미팅을 30분으로 줄이기"
        />
      </label>
      <label>
        배경 설명
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="왜 이 안건이 필요한지, 어떤 변화를 기대하는지 적어주세요."
        />
      </label>

      {error && (
        <div className="notice-line">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <div className="form-actions">
        <button className="secondary-button" onClick={onCancel}>
          취소
        </button>
        <button className="primary-button" onClick={submit}>
          <Send size={18} />
          안건 등록
        </button>
      </div>
    </section>
  );
}
