create table if not exists public.accounts (
  id text primary key,
  name text not null,
  email text not null unique,
  role text not null check (role in ('팀원', '파트리더', '팀리더')),
  part text not null check (part in ('전체', 'TEST혁신파트', 'ITS혁신파트', '혁신도구파트')),
  status text not null check (status in ('승인 대기', '활성', '비활성')),
  joined_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

drop policy if exists "Allow prototype account reads" on public.accounts;
drop policy if exists "Allow prototype account writes" on public.accounts;
drop policy if exists "Allow prototype account updates" on public.accounts;

create policy "Allow prototype account reads"
  on public.accounts
  for select
  using (true);

create policy "Allow prototype account writes"
  on public.accounts
  for insert
  with check (true);

create policy "Allow prototype account updates"
  on public.accounts
  for update
  using (true)
  with check (true);

insert into public.accounts (id, name, email, role, part, status, joined_at)
values
  ('USR-ADMIN', '이선민', 'sunmin.l@sk.com', '팀리더', '전체', '활성', '2026-07-24'),
  ('USR-02', '김승현', 'k2h9205@sk.com', '파트리더', 'ITS혁신파트', '활성', '2026-07-24'),
  ('USR-03', '김수정', 'crystalk@sk.com', '팀원', '혁신도구파트', '승인 대기', '2026-07-24')
on conflict (id) do update set
  name = excluded.name,
  email = excluded.email,
  role = excluded.role,
  part = excluded.part,
  status = excluded.status,
  joined_at = excluded.joined_at,
  updated_at = now();

create table if not exists public.issues (
  id text primary key,
  title text not null,
  category text not null,
  author text not null check (author in ('익명', '실명')),
  target text not null,
  status text not null,
  urgency text not null check (urgency in ('낮음', '보통', '높음')),
  leader_reply text,
  one_on_one_note text,
  action_item text,
  leader_memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.issues
  add column if not exists leader_reply text,
  add column if not exists one_on_one_note text,
  add column if not exists action_item text,
  add column if not exists leader_memo text;

alter table public.issues enable row level security;

drop policy if exists "Allow prototype issue reads" on public.issues;
drop policy if exists "Allow prototype issue writes" on public.issues;
drop policy if exists "Allow prototype issue updates" on public.issues;

create policy "Allow prototype issue reads"
  on public.issues
  for select
  using (true);

create policy "Allow prototype issue writes"
  on public.issues
  for insert
  with check (true);

create policy "Allow prototype issue updates"
  on public.issues
  for update
  using (true)
  with check (true);

create table if not exists public.agendas (
  id text primary key,
  title text not null,
  description text not null default '',
  category text not null,
  source text not null,
  part text not null check (part in ('전체', 'TEST혁신파트', 'ITS혁신파트', '혁신도구파트')),
  author text not null check (author in ('익명', '실명')),
  author_name text not null default '',
  approve integer not null default 0,
  reject integer not null default 0,
  status text not null check (status in ('투표중', '통과', '부결')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agendas enable row level security;

drop policy if exists "Allow prototype agenda reads" on public.agendas;
drop policy if exists "Allow prototype agenda writes" on public.agendas;
drop policy if exists "Allow prototype agenda updates" on public.agendas;

create policy "Allow prototype agenda reads"
  on public.agendas
  for select
  using (true);

create policy "Allow prototype agenda writes"
  on public.agendas
  for insert
  with check (true);

create policy "Allow prototype agenda updates"
  on public.agendas
  for update
  using (true)
  with check (true);

alter table public.agendas
  add column if not exists deadline date,
  add column if not exists closed_at date;

-- 투표용지. 익명성을 위해 "누가 투표했는가"만 담고 선택(찬성/반대)은 담지 않는다.
-- 선택은 agendas.approve / agendas.reject 카운터에만 반영되므로
-- 이 테이블의 어떤 행도 사람과 선택을 이어주지 못한다.
create table if not exists public.agenda_ballots (
  agenda_id text not null references public.agendas(id) on delete cascade,
  -- sha256(agenda_id + 소문자 이메일). 안건마다 값이 달라 투표 이력이 연결되지 않는다.
  voter_key text not null,
  created_at timestamptz not null default now(),
  primary key (agenda_id, voter_key)
);

alter table public.agenda_ballots enable row level security;

drop policy if exists "Allow prototype ballot reads" on public.agenda_ballots;
drop policy if exists "Allow prototype ballot writes" on public.agenda_ballots;

create policy "Allow prototype ballot reads"
  on public.agenda_ballots
  for select
  using (true);

create policy "Allow prototype ballot writes"
  on public.agenda_ballots
  for insert
  with check (true);
