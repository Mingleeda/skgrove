// 로컬 접수 검토 프록시 (OpenRouter) — 접수 본문에서 욕설·인신공격을 찾아 다듬은 문장을 제안.
// 단독 실행: node scripts/review-proxy.mjs   |   통합 실행: scripts/proxy.mjs 가 handleReview 를 /api/review 로 라우팅.
// 키는 .env.ai.local 에만 존재(AI 취합 프록시와 같은 파일을 공유). Node 18+.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const env = {};
try {
  const text = readFileSync(new URL('../.env.ai.local', import.meta.url), 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
} catch {
  console.warn('⚠️  .env.ai.local 없음 — 접수 검토 휴면. 설정: cp .env.ai.example .env.ai.local');
}

const PORT = Number(env.REVIEW_PORT || 8789);
const API_KEY = env.OPENROUTER_API_KEY;
const MODEL = env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
const OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 이 프롬프트는 api/review.ts 의 REVIEW_SYSTEM_PROMPT 상수와 내용이 동일해야 한다.
// 런타임(서버리스 TS vs 로컬 Node .mjs)이 달라 공유 모듈로 묶기 어려워 두 벌을 유지한다 — 수정 시 두 파일을 함께 고칠 것.
const SYSTEM = [
  '당신은 사내 익명 의견 접수 글을 검토합니다.',
  '목적은 검열이 아니라, 읽는 리더가 사안에 집중할 수 있게 만드는 것입니다.',
  '',
  '지적할 것은 두 가지뿐입니다.',
  '1) 욕설·비속어 → kind: "profanity"',
  '2) 특정인의 인격·능력에 대한 평가·비하 → kind: "personal-attack"',
  '',
  '반드시 지킬 것:',
  '- 사실 주장과 개선 요구는 절대 삭제하거나 완곡하게 만들지 않습니다. 강도를 낮추지 않습니다.',
  '- 행동·영향·요구는 그대로 둡니다. 사람에 대한 평가 표현만 바꿉니다.',
  '- 본인이 겪은 피해 진술은 욕설·인신공격 어느 쪽으로도 지적하지 않습니다.',
  '    "저 사람은 무능하다" → 인격 평가 → 지적합니다',
  '    "저 사람이 저에게 욕설을 했습니다" → 사실 진술 → 지적하지 않습니다',
  '- 인용된 발언은 접수자의 표현이 아닙니다. 겪은 일을 옮긴 인용문 안의 욕설·비하 표현은 지적하지 않습니다.',
  '    "그 사람이 저에게 \\"XX새끼\\"라고 했습니다" → 피해 진술의 인용 → 지적하지 않습니다',
  '    "그 XX새끼 때문에 못 해먹겠다" → 접수자 본인의 욕설 → 지적합니다',
  '- 없는 내용을 지어내지 않습니다.',
  '- 문체·어투·맞춤법은 지적하지 않습니다.',
  '- 지적할 것이 없으면 findings 를 빈 배열로 둡니다. 억지로 찾지 않습니다.',
  '',
  '반드시 아래 JSON 스키마로만 답하세요. 설명·인사말·코드펜스 없이 JSON 객체 하나만 출력합니다.',
  '{"findings":[{"field":"title|body|expectedChange","kind":"profanity|personal-attack","reason":"<한 문장>","rewritten":"<완성 문장>"}]}',
  '- field 는 문제가 있는 항목의 키입니다.',
  '- rewritten 은 그 항목 전체를 대체할 완성된 한국어 문장입니다. 문제 부분만 잘라내지 않습니다.',
  '- 문제가 된 표현 외의 문장은 원문 그대로 옮깁니다. 다시 쓰지 않습니다.',
  '- reason 은 접수자에게 그대로 보여집니다. 비난하지 말고 담담하게 한 문장으로 씁니다.',
].join('\n');

function parseJson(content) {
  const stripped = String(content || '')
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < 0) return null;
  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return null;
  }
}

// 통합/단독 공용 요청 핸들러 (/api/review).
export function handleReview(req, res) {
  const send = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json', ...CORS });
    res.end(JSON.stringify(obj));
  };
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    send(405, { ok: false, reason: 'method' });
    return;
  }
  let raw = '';
  req.on('data', (chunk) => (raw += chunk));
  req.on('end', async () => {
    if (!API_KEY) {
      // 키 미주입 → 휴면. reason 은 반드시 'disabled' 여야 한다.
      // ReviewGate.tsx 는 이 문자열로만 "기능 없음(조용히 통과)"과 "검사 실패(경고 배너)"를 구분한다.
      send(200, { ok: false, reason: 'disabled' });
      return;
    }
    let p;
    try {
      p = JSON.parse(raw);
    } catch {
      send(400, { ok: false, reason: 'bad json' });
      return;
    }
    const title = String(p.title || '').trim();
    const body = String(p.body || '').trim();
    const expectedChange = String(p.expectedChange || '').trim();
    if (!title && !body) {
      send(200, { ok: false, reason: 'empty input' });
      return;
    }
    try {
      const upstream = await fetch(OPENROUTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
          'X-Title': 'SK Grove',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: JSON.stringify({ title, body, expectedChange }) },
          ],
          temperature: 0,
        }),
      });
      const data = await upstream.json().catch(() => null);
      if (!upstream.ok || !data) {
        const reason = data?.error?.message || `openrouter ${upstream.status}`;
        console.error('[review] upstream error:', reason);
        send(200, { ok: false, reason });
        return;
      }
      const parsed = parseJson(data.choices?.[0]?.message?.content);
      if (!parsed || !Array.isArray(parsed.findings)) {
        send(200, { ok: false, reason: 'parse failed' });
        return;
      }
      send(200, { ok: true, findings: parsed.findings });
    } catch (error) {
      console.error('[review] error:', error);
      send(200, { ok: false, reason: String(error) });
    }
  });
}

// 단독 실행일 때만 서버를 띄운다(import 되면 핸들러만 제공).
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  createServer(handleReview).listen(PORT, () => {
    console.log(`🧐 review-proxy 실행 중 → http://127.0.0.1:${PORT}/api/review`);
  });
}
