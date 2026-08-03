import type { ManagedAccount } from './types';
import { supabase } from './supabaseClient';

const ACCOUNT_STORAGE_KEY = 'skgrove:accounts';
const ACCOUNT_TABLE = 'accounts';

const adminAccount: ManagedAccount = {
  id: 'USR-ADMIN',
  name: '이선민',
  email: 'sunmin.l@sk.com',
  role: '팀리더',
  part: '전체',
  status: '활성',
  joinedAt: '2026-07-24',
  connectioner: true,
};

export const seedAccounts: ManagedAccount[] = [
  adminAccount,
  {
    id: 'USR-02',
    name: '김승현',
    email: 'k2h9205@sk.com',
    role: '파트리더',
    part: 'ITS혁신파트',
    status: '활성',
    joinedAt: '2026-07-24',
    connectioner: true,
  },
  {
    id: 'USR-03',
    name: '김수정',
    email: 'crystalk@sk.com',
    role: '팀원',
    part: '혁신도구파트',
    status: '활성',
    joinedAt: '2026-07-24',
    connectioner: true,
  },
  {
    id: 'USR-04',
    name: '이두민',
    email: 'dumin@sk.com',
    role: '팀원',
    part: 'TEST혁신파트',
    status: '활성',
    joinedAt: '2026-07-24',
  },
];

type AccountRow = {
  id: string;
  name: string;
  email: string;
  role: ManagedAccount['role'];
  part: ManagedAccount['part'];
  status: ManagedAccount['status'];
  joined_at: string;
  photo_url?: string | null;
  is_connectioner?: boolean | null;
};

export async function loadAccounts() {
  if (supabase) {
    const { data, error } = await supabase.from(ACCOUNT_TABLE).select('*').order('joined_at', { ascending: true });

    if (!error && data) {
      const accounts = ensureAdminAccount(data.map(accountFromRow));
      await saveAccounts(accounts);
      return accounts;
    }
  }

  try {
    const saved = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (!saved) return seedAccounts;
    const parsed = JSON.parse(saved) as ManagedAccount[];
    return parsed.length > 0 ? ensureAdminAccount(parsed) : seedAccounts;
  } catch {
    return seedAccounts;
  }
}

export async function saveAccounts(accounts: ManagedAccount[]) {
  const nextAccounts = ensureAdminAccount(accounts);
  window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(nextAccounts));

  if (!supabase) return;

  const { error } = await supabase.from(ACCOUNT_TABLE).upsert(nextAccounts.map(accountToRow), { onConflict: 'id' });

  if (error) {
    console.warn('Supabase account save failed. Local fallback is still updated.', error);
  }
}

export function makeAccountId() {
  return `USR-${Date.now().toString(36).toUpperCase()}`;
}

function ensureAdminAccount(accounts: ManagedAccount[]) {
  const withoutLegacyAdmin = accounts.filter((account) => account.email.toLowerCase() !== 'sunmin@sk.com');
  const existingAdmin = withoutLegacyAdmin.find((account) => account.email.toLowerCase() === adminAccount.email);

  if (!existingAdmin) {
    return [adminAccount, ...withoutLegacyAdmin];
  }

  return withoutLegacyAdmin.map((account) =>
    account.email.toLowerCase() === adminAccount.email
      ? { ...account, ...adminAccount, id: account.id || adminAccount.id }
      : account,
  );
}

function accountFromRow(row: AccountRow): ManagedAccount {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    part: row.part,
    status: row.status,
    joinedAt: row.joined_at,
    photoUrl: row.photo_url ?? undefined,
    connectioner: row.is_connectioner ?? false,
  };
}

function accountToRow(account: ManagedAccount): AccountRow {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    part: account.part,
    status: account.status,
    joined_at: account.joinedAt,
    photo_url: account.photoUrl || null,
    is_connectioner: account.connectioner ?? false,
  };
}
