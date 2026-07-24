import { initialIssues } from './data/mockData';
import { supabase } from './supabaseClient';
import type { Issue } from './types';

const ISSUE_STORAGE_KEY = 'skgrove:issues';
const ISSUE_TABLE = 'issues';

type IssueRow = {
  id: string;
  title: string;
  category: string;
  author: Issue['author'];
  target: string;
  status: string;
  urgency: Issue['urgency'];
  created_at?: string;
};

export async function loadIssues() {
  if (supabase) {
    const { data, error } = await supabase.from(ISSUE_TABLE).select('*').order('created_at', { ascending: false });

    if (!error && data) {
      const issues = data.map(issueFromRow);
      window.localStorage.setItem(ISSUE_STORAGE_KEY, JSON.stringify(issues));
      return issues.length > 0 ? issues : initialIssues;
    }
  }

  try {
    const saved = window.localStorage.getItem(ISSUE_STORAGE_KEY);
    if (!saved) return initialIssues;
    const parsed = JSON.parse(saved) as Issue[];
    return parsed.length > 0 ? parsed : initialIssues;
  } catch {
    return initialIssues;
  }
}

export async function saveIssues(issues: Issue[]) {
  window.localStorage.setItem(ISSUE_STORAGE_KEY, JSON.stringify(issues));

  if (!supabase) return;

  const { error } = await supabase.from(ISSUE_TABLE).upsert(issues.map(issueToRow), { onConflict: 'id' });

  if (error) {
    console.warn('Supabase issue save failed. Local fallback is still updated.', error);
  }
}

export function makeIssueId() {
  return `SOOP-${Date.now().toString(36).toUpperCase()}`;
}

function issueFromRow(row: IssueRow): Issue {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    author: row.author,
    target: row.target,
    status: row.status,
    urgency: row.urgency,
  };
}

function issueToRow(issue: Issue): IssueRow {
  return {
    id: issue.id,
    title: issue.title,
    category: issue.category,
    author: issue.author,
    target: issue.target,
    status: issue.status,
    urgency: issue.urgency,
  };
}
