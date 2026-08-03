// 티미팅 세션 영속화 — Supabase(tea_sessions) 있으면 DB, 없으면 localStorage.
// 세션 유형(config)은 자주 안 바뀌는 관리 설정이라 로컬 유지.
import { initialTeaSessions } from './data/mockData';
import { supabase } from './supabaseClient';
import type { TeaSession, TeaSessionStatus, TeamPart } from './types';

const SESSIONS_KEY = 'skgrove:teasessions';
const SESSION_TYPES_KEY = 'skgrove:teasessiontypes';
const SESSIONS_TABLE = 'tea_sessions';

type TeaSessionRow = {
  id: string;
  title?: string | null;
  type?: string | null;
  presenter?: string | null;
  part: string;
  description?: string | null;
  status?: string | null;
  memo?: string | null;
};

export async function loadTeaSessions(): Promise<TeaSession[]> {
  if (supabase) {
    const { data, error } = await supabase.from(SESSIONS_TABLE).select('*');
    if (!error && data) {
      const sessions = (data as TeaSessionRow[]).map(sessionFromRow);
      window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      return sessions.length > 0 ? sessions : initialTeaSessions;
    }
  }
  try {
    const saved = window.localStorage.getItem(SESSIONS_KEY);
    if (!saved) return initialTeaSessions;
    const parsed = JSON.parse(saved) as TeaSession[];
    return Array.isArray(parsed) ? parsed : initialTeaSessions;
  } catch {
    return initialTeaSessions;
  }
}

export async function saveTeaSessions(sessions: TeaSession[]) {
  try {
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // 저장 실패는 무시 (메모리 상태는 유지)
  }
  if (!supabase || sessions.length === 0) return;
  const { error } = await supabase.from(SESSIONS_TABLE).upsert(sessions.map(sessionToRow), { onConflict: 'id' });
  if (error) {
    console.warn('Supabase tea session save failed. Local fallback is still updated.', error);
  }
}

export const DEFAULT_TEA_SESSION_TYPES = ['기술세미나', '여행기', '팀워크샵', '팀내공유사항'];

export function loadTeaSessionTypes(): string[] {
  try {
    const saved = window.localStorage.getItem(SESSION_TYPES_KEY);
    if (!saved) return DEFAULT_TEA_SESSION_TYPES;
    const parsed = JSON.parse(saved) as string[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TEA_SESSION_TYPES;
  } catch {
    return DEFAULT_TEA_SESSION_TYPES;
  }
}

export function saveTeaSessionTypes(types: string[]) {
  try {
    window.localStorage.setItem(SESSION_TYPES_KEY, JSON.stringify(types));
  } catch {
    // 저장 실패는 무시 (메모리 상태는 유지)
  }
}

// 같은 밀리초에 세션이 여럿 만들어져도 id가 겹치지 않도록 세션 카운터를 덧붙인다.
let teaSessionSequence = 0;

export function makeTeaSessionId() {
  teaSessionSequence += 1;
  return `TEA-${Date.now().toString(36).toUpperCase()}-${teaSessionSequence.toString(36).toUpperCase()}`;
}

function sessionFromRow(row: TeaSessionRow): TeaSession {
  return {
    id: row.id,
    title: row.title ?? '',
    type: row.type ?? '',
    presenter: row.presenter ?? '',
    part: row.part as TeamPart,
    desc: row.description ?? '',
    status: (row.status as TeaSessionStatus) ?? '제안',
    memo: row.memo ?? '',
  };
}

function sessionToRow(session: TeaSession): TeaSessionRow {
  return {
    id: session.id,
    title: session.title || null,
    type: session.type || null,
    presenter: session.presenter || null,
    part: session.part,
    description: session.desc || null,
    status: session.status,
    memo: session.memo || null,
  };
}
