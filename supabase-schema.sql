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
  add column if not exists leader_memo text,
  -- 접수 화면에서 받던 본문·기대 변화·공개 범위. 예전에는 저장되지 않고 폐기됐다.
  add column if not exists body text not null default '',
  add column if not exists expected_change text not null default '',
  -- 공개 범위를 모르는 과거 행은 공개하지 않는 쪽으로 채운다.
  add column if not exists visibility text not null default '리더만 보기';

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
  add column if not exists closed_at date,
  -- 등록 시점의 투표 대상 인원. 계정 변동에 과거 안건의 정족수/참여율이 흔들리지 않도록 스냅샷으로 둔다.
  add column if not exists eligible_count integer not null default 0;

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

create table if not exists public.action_items (
  id text primary key,
  title text not null,
  owner text not null default '미정',
  -- 목표일 미정을 허용한다. 담당자 없이 먼저 만들어두는 흐름이 실제로 있다.
  due date,
  status text not null check (status in ('대기', '진행중', '완료', '재검토')),
  source_kind text not null check (source_kind in ('안건', '캔미팅', '직접')),
  source_id text,
  source_label text,
  -- 적용 결과와 재검토 사유. 완료/재검토로 넘길 때 무엇이 왜 그랬는지 남긴다.
  outcome text,
  review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.action_items enable row level security;

drop policy if exists "Allow prototype action reads" on public.action_items;
drop policy if exists "Allow prototype action writes" on public.action_items;
drop policy if exists "Allow prototype action updates" on public.action_items;

create policy "Allow prototype action reads"
  on public.action_items
  for select
  using (true);

create policy "Allow prototype action writes"
  on public.action_items
  for insert
  with check (true);

create policy "Allow prototype action updates"
  on public.action_items
  for update
  using (true)
  with check (true);

create table if not exists public.connect_results (
  id text primary key,
  mode text not null check (mode in ('coffee', 'teams')),
  title text not null,
  summary text not null default '',
  share_text text not null default '',
  share_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.connect_results enable row level security;

drop policy if exists "Allow prototype connect result reads" on public.connect_results;
drop policy if exists "Allow prototype connect result writes" on public.connect_results;
drop policy if exists "Allow prototype connect result updates" on public.connect_results;
drop policy if exists "Allow prototype connect result deletes" on public.connect_results;

create policy "Allow prototype connect result reads"
  on public.connect_results
  for select
  using (true);

create policy "Allow prototype connect result writes"
  on public.connect_results
  for insert
  with check (true);

create policy "Allow prototype connect result updates"
  on public.connect_results
  for update
  using (true)
  with check (true);

create policy "Allow prototype connect result deletes"
  on public.connect_results
  for delete
  using (true);

create table if not exists public.team_memories (
  id bigint primary key,
  title text not null,
  event_date date not null,
  place text not null default '장소 미정',
  host text not null,
  created_by text not null,
  summary text not null default '',
  tags jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  reactions jsonb not null default '{"좋아요":0,"웃겨요":0,"또가요":0}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_memories enable row level security;

drop policy if exists "Allow prototype team memory reads" on public.team_memories;
drop policy if exists "Allow prototype team memory writes" on public.team_memories;
drop policy if exists "Allow prototype team memory updates" on public.team_memories;
drop policy if exists "Allow prototype team memory deletes" on public.team_memories;

create policy "Allow prototype team memory reads"
  on public.team_memories
  for select
  using (true);

create policy "Allow prototype team memory writes"
  on public.team_memories
  for insert
  with check (true);

create policy "Allow prototype team memory updates"
  on public.team_memories
  for update
  using (true)
  with check (true);

create policy "Allow prototype team memory deletes"
  on public.team_memories
  for delete
  using (true);

create table if not exists public.team_memory_assets (
  id bigint primary key,
  memory_id bigint not null references public.team_memories(id) on delete cascade,
  type text not null check (type in ('photo', 'video')),
  title text not null,
  uploader text not null,
  tone text not null check (tone in ('green', 'blue', 'coral', 'amber')),
  uploaded_at text not null,
  reactions jsonb not null default '{"👍":0,"👏":0,"😂":0,"🔥":0,"💚":0}'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  preview_url text,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_memory_assets enable row level security;

drop policy if exists "Allow prototype team memory asset reads" on public.team_memory_assets;
drop policy if exists "Allow prototype team memory asset writes" on public.team_memory_assets;
drop policy if exists "Allow prototype team memory asset updates" on public.team_memory_assets;
drop policy if exists "Allow prototype team memory asset deletes" on public.team_memory_assets;

create policy "Allow prototype team memory asset reads"
  on public.team_memory_assets
  for select
  using (true);

create policy "Allow prototype team memory asset writes"
  on public.team_memory_assets
  for insert
  with check (true);

create policy "Allow prototype team memory asset updates"
  on public.team_memory_assets
  for update
  using (true)
  with check (true);

create policy "Allow prototype team memory asset deletes"
  on public.team_memory_assets
  for delete
  using (true);

insert into storage.buckets (id, name, public)
values ('team-memory-assets', 'team-memory-assets', true)
on conflict (id) do update set
  public = excluded.public;

drop policy if exists "Allow prototype team memory file reads" on storage.objects;
drop policy if exists "Allow prototype team memory file writes" on storage.objects;
drop policy if exists "Allow prototype team memory file updates" on storage.objects;
drop policy if exists "Allow prototype team memory file deletes" on storage.objects;

create policy "Allow prototype team memory file reads"
  on storage.objects
  for select
  using (bucket_id = 'team-memory-assets');

create policy "Allow prototype team memory file writes"
  on storage.objects
  for insert
  with check (bucket_id = 'team-memory-assets');

create policy "Allow prototype team memory file updates"
  on storage.objects
  for update
  using (bucket_id = 'team-memory-assets')
  with check (bucket_id = 'team-memory-assets');

create policy "Allow prototype team memory file deletes"
  on storage.objects
  for delete
  using (bucket_id = 'team-memory-assets');
