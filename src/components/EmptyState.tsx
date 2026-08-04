import type { ElementType } from 'react';

export type EmptyStateProps = {
  icon: ElementType;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
};

/*
  빈 상태가 화면마다 맨 텍스트였다. "조건에 맞는 안건이 없습니다"로 끝나면
  다음에 뭘 해야 하는지가 없다. 다음 행동을 함께 둔다.
*/
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Icon aria-hidden size={28} />
      <p className="empty-state-title">{title}</p>
      {description ? <p className="empty-state-desc">{description}</p> : null}
      {action ? (
        <button type="button" className="btn-secondary" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
