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
  anonymous_access_code?: string | null;
  submitter_name?: string | null;
  submitter_email?: string | null;
  submitter_part?: Issue['submitterPart'] | null;
  target: string;
  status: Issue['status'];
  urgency: Issue['urgency'];
  body?: string | null;
  expected_change?: string | null;
  visibility?: Issue['visibility'] | null;
  leader_reply?: string | null;
  one_on_one_note?: string | null;
  action_item?: string | null;
  leader_memo?: string | null;
  submitter_response?: string | null;
  one_on_one_response?: Issue['oneOnOneResponse'] | null;
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
    anonymousAccessCode: row.anonymous_access_code ?? undefined,
    submitterName: row.submitter_name ?? undefined,
    submitterEmail: row.submitter_email ?? undefined,
    submitterPart: row.submitter_part ?? undefined,
    target: row.target,
    status: row.status,
    urgency: row.urgency,
    body: row.body ?? '',
    expectedChange: row.expected_change ?? '',
    // 공개 범위가 기록되지 않은 과거 데이터는 접수자의 선택을 알 수 없다.
    // 모르면 공개하지 않는 쪽으로 기운다.
    visibility: row.visibility ?? '리더만 보기',
    leaderReply: row.leader_reply ?? undefined,
    oneOnOneNote: row.one_on_one_note ?? undefined,
    actionItem: row.action_item ?? undefined,
    leaderMemo: row.leader_memo ?? undefined,
    submitterResponse: row.submitter_response ?? undefined,
    oneOnOneResponse: row.one_on_one_response ?? undefined,
  };
}

function issueToRow(issue: Issue): IssueRow {
  return {
    id: issue.id,
    title: issue.title,
    category: issue.category,
    author: issue.author,
    anonymous_access_code: issue.anonymousAccessCode ?? null,
    submitter_name: issue.submitterName ?? null,
    submitter_email: issue.submitterEmail ?? null,
    submitter_part: issue.submitterPart ?? null,
    target: issue.target,
    status: issue.status,
    urgency: issue.urgency,
    body: issue.body,
    expected_change: issue.expectedChange,
    visibility: issue.visibility,
    leader_reply: issue.leaderReply ?? null,
    one_on_one_note: issue.oneOnOneNote ?? null,
    action_item: issue.actionItem ?? null,
    leader_memo: issue.leaderMemo ?? null,
    submitter_response: issue.submitterResponse ?? null,
    one_on_one_response: issue.oneOnOneResponse ?? null,
  };
}
