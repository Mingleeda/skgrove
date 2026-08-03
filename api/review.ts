// 접수 검토 프록시 — 대나무숲 접수 본문에서 욕설·인신공격을 찾아 다듬은 문장을 제안한다.
//
// 프론트(intakeReview.ts)는 VITE_REVIEW_ENDPOINT로 아래 규격을 POST한다:
//   { title: string, body: string, expectedChange: string }
// 응답: { ok: boolean, findings?: [{ field, kind, reason, rewritten }], reason?: string }
//
// 서버 환경변수(비밀은 서버에만):
//   OPENROUTER_API_KEY : OpenRouter 키(sk-or-...). 없으면 휴면 → 프론트는 검토 없이 통과.
//   OPENROUTER_MODEL   : 모델 슬러그(기본 anthropic/claude-haiku-4.5)

type ReviewPayload = { title?: string; body?: string; expectedChange?: string };

const OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions';

function env(name: string): string | undefined {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
}

// 이 프롬프트는 scripts/review-proxy.mjs 의 SYSTEM 상수와 내용이 동일해야 한다.
// 런타임(서버리스 TS vs 로컬 Node .mjs)이 달라 공유 모듈로 묶기 어려워 두 벌을 유지한다 — 수정 시 두 파일을 함께 고칠 것.
export const REVIEW_SYSTEM_PROMPT = [
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
  '- 본인이 겪은 피해 진술은 인신공격이 아닙니다.',
  '    "저 사람은 무능하다" → 인격 평가 → 지적합니다',
  '    "저 사람이 저에게 욕설을 했습니다" → 사실 진술 → 지적하지 않습니다',
  '- 없는 내용을 지어내지 않습니다.',
  '- 문체·어투·맞춤법은 지적하지 않습니다.',
  '- 지적할 것이 없으면 findings 를 빈 배열로 둡니다. 억지로 찾지 않습니다.',
  '',
  '반드시 아래 JSON 스키마로만 답하세요. 설명·인사말·코드펜스 없이 JSON 객체 하나만 출력합니다.',
  '{"findings":[{"field":"title|body|expectedChange","kind":"profanity|personal-attack","reason":"<한 문장>","rewritten":"<완성 문장>"}]}',
  '- field 는 문제가 있는 항목의 키입니다.',
  '- rewritten 은 그 항목 전체를 대체할 완성된 한국어 문장입니다. 문제 부분만 잘라내지 않습니다.',
  '- reason 은 접수자에게 그대로 보여집니다. 비난하지 말고 담담하게 한 문장으로 씁니다.',
].join('\n');

// LLM 출력에서 코드펜스를 걷어내고 JSON만 파싱.
function parseJson(content: string): { findings?: unknown } | null {
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

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const apiKey = env('OPENROUTER_API_KEY');
  if (!apiKey) {
    // 키 미주입 → 휴면. 프론트는 검토 없이 통과시킨다.
    return Response.json({ ok: false, reason: 'OPENROUTER_API_KEY not configured' });
  }

  let payload: ReviewPayload;
  try {
    payload = (await request.json()) as ReviewPayload;
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const title = String(payload.title ?? '').trim();
  const body = String(payload.body ?? '').trim();
  const expectedChange = String(payload.expectedChange ?? '').trim();
  if (!title && !body) {
    return Response.json({ ok: false, reason: 'empty input' });
  }

  const model = env('OPENROUTER_MODEL') || 'anthropic/claude-haiku-4.5';
  try {
    const upstream = await fetch(OPENROUTER, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Title': 'SK Grove',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: REVIEW_SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify({ title, body, expectedChange }) },
        ],
        temperature: 0,
      }),
    });
    const data = (await upstream.json().catch(() => null)) as
      | { choices?: { message?: { content?: string } }[]; error?: { message?: string } }
      | null;
    if (!upstream.ok || !data) {
      return Response.json({ ok: false, reason: data?.error?.message || `openrouter ${upstream.status}` });
    }
    const parsed = parseJson(data.choices?.[0]?.message?.content ?? '');
    if (!parsed || !Array.isArray(parsed.findings)) {
      return Response.json({ ok: false, reason: 'parse failed' });
    }
    return Response.json({ ok: true, findings: parsed.findings });
  } catch (error) {
    return Response.json({ ok: false, reason: String(error) });
  }
}
