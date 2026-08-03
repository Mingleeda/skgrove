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

-- 계정별 프로필 사진(직접 이미지 URL). 없으면 앱에서 이니셜 칩으로 폴백.
alter table public.accounts add column if not exists photo_url text;

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
  anonymous_access_code text,
  submitter_name text,
  submitter_email text,
  submitter_part text,
  target text not null,
  status text not null,
  urgency text not null check (urgency in ('낮음', '보통', '높음')),
  leader_reply text,
  one_on_one_note text,
  action_item text,
  leader_memo text,
  submitter_response text,
  one_on_one_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.issues
  add column if not exists anonymous_access_code text,
  add column if not exists submitter_name text,
  add column if not exists submitter_email text,
  add column if not exists submitter_part text,
  add column if not exists leader_reply text,
  add column if not exists one_on_one_note text,
  add column if not exists action_item text,
  add column if not exists leader_memo text,
  -- 접수 화면에서 받던 본문·기대 변화·공개 범위. 예전에는 저장되지 않고 폐기됐다.
  add column if not exists body text not null default '',
  add column if not exists expected_change text not null default '',
  -- 공개 범위를 모르는 과거 행은 공개하지 않는 쪽으로 채운다.
  add column if not exists visibility text not null default '리더만 보기',
  add column if not exists submitter_response text,
  add column if not exists one_on_one_response text;

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

create table if not exists public.profiles (
  profile_key text primary key,
  owner_email text,
  name text not null,
  part text not null check (part in ('전체', 'TEST혁신파트', 'ITS혁신파트', '혁신도구파트')),
  role text not null default '',
  english_name text not null default '',
  birth_year text not null default '',
  birthday text not null default '',
  character text not null default '',
  trait text not null default '',
  style text not null default '',
  collaboration text not null default '',
  feedback text not null default '',
  guide text not null default '',
  color text not null check (color in ('green', 'red', 'blue', 'yellow')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Allow prototype profile reads" on public.profiles;
drop policy if exists "Allow prototype profile writes" on public.profiles;
drop policy if exists "Allow prototype profile updates" on public.profiles;

create policy "Allow prototype profile reads"
  on public.profiles
  for select
  using (true);

create policy "Allow prototype profile writes"
  on public.profiles
  for insert
  with check (true);

create policy "Allow prototype profile updates"
  on public.profiles
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
  drive_folder_id text,
  drive_folder_url text,
  comments jsonb not null default '[]'::jsonb,
  reactions jsonb not null default '{"좋아요":0,"웃겨요":0,"또가요":0}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_memories
  add column if not exists drive_folder_id text,
  add column if not exists drive_folder_url text;

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
  drive_file_id text,
  drive_view_url text,
  drive_download_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_memory_assets
  add column if not exists drive_file_id text,
  add column if not exists drive_view_url text,
  add column if not exists drive_download_url text;

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

-- =====================================================================
-- 김승현 기능 테이블 (SKSOOP-14/15/21/130) — 프로토타입 개방 정책(for all).
-- 실서비스 전 RLS를 인증 기반으로 강화 필요.
-- =====================================================================

-- 알림 / 메시지 (SKSOOP-21)
create table if not exists public.notifications (
  id text primary key,
  kind text not null,
  recipient_name text not null,
  from_name text not null default '',
  title text not null default '',
  body text not null default '',
  section text not null,
  source_id text not null default '',
  dedupe_key text not null default '',
  created_at text not null default '',
  read boolean not null default false
);
alter table public.notifications enable row level security;
drop policy if exists "Allow prototype notifications all" on public.notifications;
create policy "Allow prototype notifications all" on public.notifications for all using (true) with check (true);

-- 유머게시판 (SKSOOP-130)
create table if not exists public.humor_posts (
  id text primary key,
  author text not null,
  body text not null default '',
  media_url text not null default '',
  created_at text not null default '',
  liked_by jsonb not null default '[]'::jsonb
);
alter table public.humor_posts enable row level security;
drop policy if exists "Allow prototype humor posts all" on public.humor_posts;
create policy "Allow prototype humor posts all" on public.humor_posts for all using (true) with check (true);

create table if not exists public.humor_comments (
  id text primary key,
  post_id text not null,
  author text not null,
  body text not null default '',
  created_at text not null default ''
);
alter table public.humor_comments enable row level security;
drop policy if exists "Allow prototype humor comments all" on public.humor_comments;
create policy "Allow prototype humor comments all" on public.humor_comments for all using (true) with check (true);

-- 티미팅 세션 (SKSOOP-15) — 세션 유형/캔 단계 같은 config 는 로컬 유지
create table if not exists public.tea_sessions (
  id text primary key,
  title text not null default '',
  type text not null default '',
  presenter text not null default '',
  part text not null,
  description text not null default '',
  status text not null default '제안',
  memo text not null default ''
);
alter table public.tea_sessions enable row level security;
drop policy if exists "Allow prototype tea sessions all" on public.tea_sessions;
create policy "Allow prototype tea sessions all" on public.tea_sessions for all using (true) with check (true);

-- 캔미팅 (SKSOOP-14) — 스키마 선반영. 스토어/App 연동은 후속(현재 메모리 상태).
create table if not exists public.can_sessions (
  id text primary key,
  topic text not null default '',
  team_name text not null default '',
  held_at text not null default '',
  method text not null default '오프라인',
  parts jsonb not null default '[]'::jsonb,
  stage text not null default 'setup',
  result_summary text not null default '',
  result_groups jsonb,
  follow_up jsonb
);
alter table public.can_sessions enable row level security;
drop policy if exists "Allow prototype can sessions all" on public.can_sessions;
create policy "Allow prototype can sessions all" on public.can_sessions for all using (true) with check (true);

create table if not exists public.can_opinions (
  id text primary key,
  session_id text not null,
  part text not null,
  step text not null,
  content text not null default '',
  author text not null,
  author_name text not null default '',
  selected boolean not null default false
);
alter table public.can_opinions enable row level security;
drop policy if exists "Allow prototype can opinions all" on public.can_opinions;
create policy "Allow prototype can opinions all" on public.can_opinions for all using (true) with check (true);
