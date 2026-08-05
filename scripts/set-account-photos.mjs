// accounts.photo_url 일괄 세팅 — 이름 기준으로 dev DB 계정 사진을 업데이트한다.
// RLS 개방 정책이라 anon 키로 update 가능. 매칭 안 된 이름은 리포트한다.
// 실행: node scripts/set-account-photos.mjs   (프로젝트 루트에서)
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

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
if (!url || !key || url.includes('your-project')) {
  console.error('⚠️  .env.local 에 Supabase URL/anon key 가 없습니다.');
  process.exit(1);
}

const base = 'https://telinfo.skax.co.kr/servlet/PictureServlet?picGubun=1&empNo=';
// [이름, 사번] — URL은 base + 사번 으로 구성
const people = [
  ['심상준', '06346'], ['박완배', '06372'], ['곽민성', '07102'], ['심진영', '06875'],
  ['문성욱', '08194'], ['최근화', '06112'], ['이관국', '06756'], ['김태한', '08368'],
  ['이승주', '10389'], ['이소정', '10387'], ['박창헌', '11426'], ['김정태', '02187'],
  ['박소연', '07822'], ['김금', '09240'], ['김기주', '09241'], ['박동진', '09270'],
  ['조용준', '09360'], ['노현희', '04434'], ['최종현', '08541'], ['임성빈', '10637'],
  ['양권상', '11769'], ['이수현', '11809'], ['심인수', '08423'], ['윤희성', '08451'],
  ['최철원', '05344'], ['최종건', '05631'],
];

const supabase = createClient(url, key);
console.log(`🔗 접속: ${url.replace(/^https:\/\//, '').split('.')[0]}.supabase.co  (총 ${people.length}명)\n`);

let updated = 0;
const missing = [];
const errors = [];
for (const [name, empNo] of people) {
  const photoUrl = base + empNo;
  const { data, error } = await supabase
    .from('accounts')
    .update({ photo_url: photoUrl })
    .eq('name', name)
    .select('id');
  if (error) {
    console.log(`  ❌ ${name.padEnd(6)} ${error.message}`);
    errors.push(name);
  } else if (!data || data.length === 0) {
    console.log(`  ⚠️  ${name.padEnd(6)} 계정 없음(매칭 0건)`);
    missing.push(name);
  } else {
    console.log(`  ✅ ${name.padEnd(6)} ${data.length}건 갱신`);
    updated += data.length;
  }
}

console.log(`\n갱신 ${updated}건 · 계정없음 ${missing.length}명 · 오류 ${errors.length}명`);
if (missing.length) console.log(`계정 없음: ${missing.join(', ')}`);
if (errors.length) console.log(`오류: ${errors.join(', ')}`);
