import { useState } from 'react';
import { AlertTriangle, CircleDot, FileCheck2, RotateCcw, Search } from 'lucide-react';
import { actionStatuses, daysUntilDue, isOverdue, nextStatuses, sortActionItems } from '../../actionRules';
import type { ActionItem, ActionStatus, CurrentUser, ManagedAccount } from '../../types';

type ActionBoardProps = {
  items: ActionItem[];
  accounts: ManagedAccount[];
  currentUser: CurrentUser;
  today: string;
  onUpdate: (item: ActionItem) => void;
};

type StatusFilter = '전체' | ActionStatus;
type OwnerFilter = '전체' | '내 담당';

const statusFilters: StatusFilter[] = ['전체', ...actionStatuses];

// 완료된 항목도 목표일이 과거일 수 있다. 부호를 보고 문구를 정해야
// "-1일 남음" 같은 표시가 나오지 않는다.
// 완료된 건에 "9일 지남"을 붙이면 아직 밀린 일로 읽힌다. 상단 배너의 지연 건수는
// isOverdue로 완료를 이미 빼고 세므로, 카드 문구만 배너와 어긋나 있었다.
function dueLabel(left: number | null, done: boolean) {
  if (left === null) return '목표일 미정';
  if (done) return left < 0 ? '목표일 이후 완료' : '완료';
  if (left < 0) return `${Math.abs(left)}일 지남`;
  if (left === 0) return '오늘 마감';
  return `${left}일 남음`;
}

export function ActionBoard({ items, accounts, currentUser, today, onUpdate }: ActionBoardProps) {
  const [status, setStatus] = useState<StatusFilter>('전체');
  const [owner, setOwner] = useState<OwnerFilter>('전체');
  const [keyword, setKeyword] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const query = keyword.trim().toLowerCase();
  const visible = sortActionItems(
    items.filter((item) => {
      if (status !== '전체' && item.status !== status) return false;
      if (owner === '내 담당' && item.owner !== currentUser.name) return false;
      if (!query) return true;
      return `${item.title} ${item.sourceLabel} ${item.owner}`.toLowerCase().includes(query);
    }),
    today,
  );

  const overdueCount = items.filter((item) => isOverdue(item, today)).length;
  const activeOwners = accounts.filter((account) => account.status === '활성').map((account) => account.name);

  // 현재 담당자가 활성 계정 목록에 없으면(퇴사·비활성·외부 이름) 옵션에 없어서
  // select가 조용히 '미정'을 가리키고, 다른 항목만 바꿔도 담당자가 날아간다.
  const ownerOptions = (owner: string) =>
    owner && owner !== '미정' && !activeOwners.includes(owner) ? [owner, ...activeOwners] : activeOwners;

  // 완료·재검토는 각각 결과와 사유를 받아야 넘어간다. 빈 채로 넘기면 왜 그랬는지가 사라진다.
  const needsNote = (to: ActionStatus) => to === '완료' || to === '재검토';

  const startTransition = (item: ActionItem, to: ActionStatus) => {
    if (!needsNote(to)) {
      onUpdate({ ...item, status: to });
      return;
    }
    setEditingId(`${item.id}:${to}`);
    setDraft(to === '완료' ? item.outcome : item.reviewReason);
  };

  const commitTransition = (item: ActionItem, to: ActionStatus) => {
    const note = draft.trim();
    if (!note) return;

    onUpdate(
      to === '완료'
        ? { ...item, status: to, outcome: note }
        : { ...item, status: to, reviewReason: note },
    );
    setEditingId(null);
    setDraft('');
  };

  return (
    <section className="screen">
      <div className="agenda-toolbar">
        <div className="toolbar leader-toolbar">
          {statusFilters.map((item) => (
            <button className={status === item ? 'filter active' : 'filter'} key={item} onClick={() => setStatus(item)}>
              {item}
            </button>
          ))}
        </div>

        <div className="agenda-toolbar-right">
          <label className="agenda-search">
            <Search size={16} />
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="액션 검색" />
          </label>
          <select value={owner} onChange={(event) => setOwner(event.target.value as OwnerFilter)}>
            <option>전체</option>
            <option>내 담당</option>
          </select>
        </div>
      </div>

      {overdueCount > 0 && (
        <div className="notice-line action-overdue-notice">
          <AlertTriangle size={18} />
          목표일이 지난 액션아이템이 {overdueCount}건 있습니다.
        </div>
      )}

      {visible.length === 0 ? (
        <div className="panel empty-panel">
          <strong>조건에 맞는 액션아이템이 없습니다.</strong>
          <span>통과된 안건 상세에서 액션아이템을 만들 수 있어요.</span>
        </div>
      ) : (
        <div className="action-board-list">
          {visible.map((item) => {
            const left = daysUntilDue(item, today);
            const overdue = isOverdue(item, today);
            const editingKey = editingId?.startsWith(`${item.id}:`) ? editingId.split(':')[1] : null;

            return (
              <article className={overdue ? 'panel action-card overdue' : 'panel action-card'} key={item.id}>
                <div className="action-card-head">
                  <span className={`status-pill action-${item.status}`}>{item.status}</span>
                  <small>
                    {item.sourceKind}
                    {item.sourceLabel && ` · ${item.sourceLabel}`}
                  </small>
                </div>

                <h2>{item.title}</h2>

                <p className="action-card-meta">
                  담당 {item.owner} ·{' '}
                  {item.due ? `목표일 ${item.due} (${dueLabel(left, item.status === '완료')})` : '목표일 미정'}
                </p>

                {item.outcome && (
                  <p className="action-note">
                    <FileCheck2 size={15} />
                    적용 결과: {item.outcome}
                  </p>
                )}
                {item.reviewReason && (
                  <p className="action-note review">
                    <RotateCcw size={15} />
                    재검토 사유: {item.reviewReason}
                  </p>
                )}

                <div className="action-assign-row">
                  <label>
                    담당자
                    <select value={item.owner} onChange={(event) => onUpdate({ ...item, owner: event.target.value })}>
                      <option>미정</option>
                      {ownerOptions(item.owner).map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    목표일
                    <input
                      type="date"
                      value={item.due}
                      onChange={(event) => onUpdate({ ...item, due: event.target.value })}
                    />
                  </label>
                </div>

                {editingKey ? (
                  <div className="action-note-editor">
                    <label>
                      {editingKey === '완료' ? '적용 결과' : '재검토 사유'}
                      <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder={
                          editingKey === '완료'
                            ? '무엇을 했고 어떤 변화가 있었는지 적어주세요.'
                            : '왜 다시 봐야 하는지 적어주세요.'
                        }
                      />
                    </label>
                    <div className="form-actions">
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setEditingId(null);
                          setDraft('');
                        }}
                      >
                        취소
                      </button>
                      <button
                        className="primary-button"
                        disabled={!draft.trim()}
                        onClick={() => commitTransition(item, editingKey as ActionStatus)}
                      >
                        {editingKey}로 변경
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="action-transitions">
                    {nextStatuses(item.status).map((to) => (
                      <button key={to} className="secondary-button" onClick={() => startTransition(item, to)}>
                        <CircleDot size={16} />
                        {to}
                      </button>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
