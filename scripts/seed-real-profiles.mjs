// profiles(성향 프로필) 시드 — 실제 활성 계정(accounts)만 대상. mockData의 가상 인물은 제외한다.
// profile_key/owner_email = 계정 이메일로 맞춰서, 나중에 본인이 "카드 수정"으로 저장할 때
// 같은 key로 upsert되어 덮어써지도록 한다(다른 key로 새 행이 또 생기는 것 방지).
// 실행: node scripts/seed-real-profiles.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
try {
  const text = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
} catch {
  console.error('⚠️  .env.local 이 없습니다.');
  process.exit(1);
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// mockData.ts 의 실존 인물 상세 항목(이선민/이상협/김수정/김영석/문성욱). 김승현은 이미 DB에 있어 제외.
const richByName = {
  이선민: { role: '품질 기준 정리와 테스트 흐름 설계', englishName: 'Lina', birthYear: '1994', birthday: '04-12', character: 'Careful Sprout', trait: '맥락형 조율가', style: '결정 전 배경과 리스크를 충분히 확인합니다.', collaboration: '초안과 판단 근거를 함께 보면 빠르게 맞춰갑니다.', feedback: '수정 이유와 기대 효과가 같이 있으면 바로 반영합니다.', guide: '회의 전 자료를 먼저 공유하면 논점 정리에 강점을 발휘합니다.', color: 'green' },
  이상협: { role: '업무 프로세스와 합의 구조 설계', englishName: 'Sang', birthYear: '1988', birthday: '02-03', character: 'Calm Wave', trait: '기준형 설계자', style: '합의 기준과 프로세스를 선호합니다.', collaboration: '의사결정 기준을 먼저 맞추면 안정적으로 추진합니다.', feedback: '예외 케이스와 운영 기준을 함께 주면 품질이 올라갑니다.', guide: '반복될 업무는 템플릿과 룰로 바꾸는 대화를 좋아합니다.', color: 'blue' },
  김수정: { role: '팀 연결 경험과 문화 지표 기획', englishName: 'Crystal', birthYear: '1996', birthday: '11-18', character: 'Bright Orbit', trait: '관계형 촉진자', style: '사람 사이 연결과 분위기의 변화를 잘 봅니다.', collaboration: '사용자 감정과 화면 흐름을 같이 보면 좋은 아이디어가 나옵니다.', feedback: '좋았던 점과 바꿀 점을 나눠 들으면 다음 안을 빠르게 잡습니다.', guide: '팀원이 실제로 말하기 편한지, 다시 쓰고 싶은지를 함께 봅니다.', color: 'yellow' },
  김영석: { trait: 'Prime Mover', style: '핵심을 먼저 짚고 팀을 밀어붙임', color: 'red' },
  문성욱: { trait: 'Steady Spark', style: '차분하게 아이디어를 계속 던짐', color: 'green' },
};

const GENERIC_DEFAULTS = {
  role: '팀 문화와 협업 흐름 참여',
  birthday: '',
  birthYear: '',
  character: '',
  trait: '',
  style: '',
  collaboration: '초안과 맥락을 함께 보면 협업이 쉬워집니다.',
  feedback: '좋았던 점과 바꿀 점을 나눠 들으면 빠르게 반영합니다.',
  guide: '일하는 방식과 선호하는 대화 리듬을 함께 맞추면 좋아요.',
};

const COLOR_CYCLE = ['green', 'red', 'blue', 'yellow'];

function toRow(account, index) {
  const rich = richByName[account.name];
  const base = rich
    ? { ...GENERIC_DEFAULTS, ...rich, englishName: rich.englishName ?? account.name, character: rich.character ?? rich.trait }
    : { ...GENERIC_DEFAULTS, englishName: account.name, color: COLOR_CYCLE[index % COLOR_CYCLE.length] };

  const emailKey = account.email.toLowerCase();
  return {
    profile_key: emailKey,
    owner_email: emailKey,
    name: account.name,
    part: account.part,
    role: base.role,
    english_name: base.englishName,
    birth_year: base.birthYear,
    birthday: base.birthday,
    character: base.character,
    trait: base.trait,
    style: base.style,
    collaboration: base.collaboration,
    feedback: base.feedback,
    guide: base.guide,
    color: base.color,
  };
}

const { data: accounts, error: accountsError } = await supabase
  .from('accounts')
  .select('name,email,part,status')
  .eq('status', '활성')
  .order('name');
if (accountsError) {
  console.error('accounts 조회 실패:', accountsError.message);
  process.exit(1);
}

const { data: existingProfiles, error: profilesError } = await supabase.from('profiles').select('name');
if (profilesError) {
  console.error('profiles 조회 실패:', profilesError.message);
  process.exit(1);
}
const existingNames = new Set((existingProfiles ?? []).map((p) => p.name));

const toInsert = accounts.filter((account) => !existingNames.has(account.name)).map(toRow);

console.log(`활성 계정 ${accounts.length}명 · 이미 profiles에 있음 ${existingNames.size}명 · 새로 시드 ${toInsert.length}명\n`);

if (toInsert.length === 0) {
  console.log('시드할 대상이 없습니다.');
  process.exit(0);
}

const { data, error } = await supabase.from('profiles').upsert(toInsert, { onConflict: 'profile_key' }).select('name');
if (error) {
  console.error('시드 실패:', error.message);
  process.exit(1);
}

console.log(`✅ ${data.length}명 시드 완료:`, data.map((d) => d.name).join(', '));
