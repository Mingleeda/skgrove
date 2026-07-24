import { Vote } from 'lucide-react';
import type { Issue } from '../../types';

type LeaderInboxProps = {
  issues: Issue[];
  onPromoteToAgenda: (issue: Issue) => void;
};

export function LeaderInbox({ issues, onPromoteToAgenda }: LeaderInboxProps) {
  return (
    <section className="screen">
      <div className="toolbar">
        <button className="filter active">전체</button>
        <button className="filter">접수</button>
        <button className="filter">검토중</button>
        <button className="filter">안건화</button>
      </div>
      <div className="issue-list">
        {issues.map((issue) => (
          <article className="issue-card" key={issue.id}>
            <div className="issue-main">
              <span className={`priority ${issue.urgency}`}>{issue.urgency}</span>
              <h2>{issue.title}</h2>
              <p>
                {issue.id} · {issue.category} · {issue.author} · {issue.target}
              </p>
            </div>
            <div className="issue-actions">
              <span className="status-pill">{issue.status}</span>
              <button className="secondary-button" onClick={() => onPromoteToAgenda(issue)}>
                <Vote size={17} />
                안건화
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
