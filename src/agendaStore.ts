import { initialAgendas } from './data/mockData';
import { supabase } from './supabaseClient';
import type { Agenda } from './types';

const AGENDA_STORAGE_KEY = 'skgrove:agendas';
const AGENDA_TABLE = 'agendas';

type AgendaRow = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  source: string;
  part: Agenda['part'];
  author: Agenda['author'];
  author_name?: string | null;
  approve: number;
  reject: number;
  status: Agenda['status'];
  created_at?: string;
  eligible_count?: number | null;
  deadline?: string | null;
  closed_at?: string | null;
};

export async function loadAgendas() {
  if (supabase) {
    const { data, error } = await supabase.from(AGENDA_TABLE).select('*').order('created_at', { ascending: false });

    if (!error && data) {
      const agendas = data.map(agendaFromRow);
      window.localStorage.setItem(AGENDA_STORAGE_KEY, JSON.stringify(agendas));
      return agendas.length > 0 ? agendas : initialAgendas;
    }
  }

  try {
    const saved = window.localStorage.getItem(AGENDA_STORAGE_KEY);
    if (!saved) return initialAgendas;
    const parsed = JSON.parse(saved) as Agenda[];
    return parsed.length > 0 ? parsed : initialAgendas;
  } catch {
    return initialAgendas;
  }
}

export async function saveAgendas(agendas: Agenda[]) {
  window.localStorage.setItem(AGENDA_STORAGE_KEY, JSON.stringify(agendas));

  if (!supabase) return;

  const { error } = await supabase.from(AGENDA_TABLE).upsert(agendas.map(agendaToRow), { onConflict: 'id' });

  if (error) {
    console.warn('Supabase agenda save failed. Local fallback is still updated.', error);
  }
}

// 캔미팅 후속 조치는 안건을 한 번에 여러 건 만든다.
// Date.now()만 쓰면 같은 밀리초에 생성된 안건끼리 id가 겹치므로 세션 카운터를 덧붙인다.
let agendaSequence = 0;

export function makeAgendaId() {
  agendaSequence += 1;
  return `AGD-${Date.now().toString(36).toUpperCase()}-${agendaSequence.toString(36).toUpperCase()}`;
}

function agendaFromRow(row: AgendaRow): Agenda {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    category: row.category,
    source: row.source,
    part: row.part,
    author: row.author,
    authorName: row.author_name ?? '',
    approve: row.approve,
    reject: row.reject,
    status: row.status,
    createdAt: row.created_at?.slice(0, 10) ?? '',
    eligibleCount: row.eligible_count ?? 0,
    deadline: row.deadline?.slice(0, 10) ?? '',
    closedAt: row.closed_at?.slice(0, 10) ?? '',
  };
}

function agendaToRow(agenda: Agenda): AgendaRow {
  return {
    id: agenda.id,
    title: agenda.title,
    description: agenda.description,
    category: agenda.category,
    source: agenda.source,
    part: agenda.part,
    author: agenda.author,
    author_name: agenda.authorName,
    approve: agenda.approve,
    reject: agenda.reject,
    status: agenda.status,
    created_at: agenda.createdAt || undefined,
    eligible_count: agenda.eligibleCount,
    // 날짜 컬럼에 빈 문자열을 넣으면 Postgres가 거부한다. 없으면 null로 보낸다.
    deadline: agenda.deadline || null,
    closed_at: agenda.closedAt || null,
  };
}
