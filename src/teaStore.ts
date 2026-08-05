// 티미팅 영속화 — Supabase 있으면 DB, 없으면 localStorage.
// 세션은 tea_sessions 테이블, 세션 유형(공용 설정)은 app_config(configStore)에 둔다.
import { TEA_SESSION_TYPES_KEY, loadConfig, saveConfig } from './configStore';
import { initialTeaSessions } from './data/mockData';
import { supabase } from './supabaseClient';
import type { TeaSession, TeaSessionStatus, TeamPart } from './types';

const SESSIONS_KEY = 'skgrove:teasessions';
const SESSION_TYPES_KEY = TEA_SESSION_TYPES_KEY;
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
  held_at?: string | null;
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
    return Array.isArray(parsed) ? parsed.map(withDefaults) : initialTeaSessions;
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

// 세션 유형은 팀 전체가 같은 목록을 봐야 하는 공용 설정이라 app_config에 둔다.
export async function loadTeaSessionTypes(): Promise<string[]> {
  const types = await loadConfig<string[]>(SESSION_TYPES_KEY, DEFAULT_TEA_SESSION_TYPES);
  return Array.isArray(types) && types.length > 0 ? types : DEFAULT_TEA_SESSION_TYPES;
}

export async function saveTeaSessionTypes(types: string[]) {
  await saveConfig(SESSION_TYPES_KEY, types);
}

// 같은 밀리초에 세션이 여럿 만들어져도 id가 겹치지 않도록 세션 카운터를 덧붙인다.
let teaSessionSequence = 0;

export function makeTeaSessionId() {
  teaSessionSequence += 1;
  return `TEA-${Date.now().toString(36).toUpperCase()}-${teaSessionSequence.toString(36).toUpperCase()}`;
}

/**
 * heldAt 이 생기기 전에 저장된 세션에는 그 값이 없다.
 * 없는 채로 두면 캘린더 대조가 문자열 메서드를 빈 값에 부르게 된다.
 */
function withDefaults(session: TeaSession): TeaSession {
  return { ...session, heldAt: session.heldAt ?? '' };
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
    // 컬럼이 생기기 전에 들어간 행은 null 이다. 빈 값이면 캘린더 대조에서 자연히 빠진다.
    heldAt: row.held_at ?? '',
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
    // held_at 은 not null 컬럼이다. 빈 값을 null 로 보내면 upsert 가 제약에 걸린다.
    held_at: session.heldAt,
  };
}
