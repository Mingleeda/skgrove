// AI 상담 챗봇 서버리스 프록시 — 프론트(aiChat.ts)가 /api/chat 으로 대화를 POST하면
// OpenRouter(Claude)로 스트리밍 호출해 SSE(data:{token}/{done}/{error})로 되돌린다.
//
// 이미지 생성(api/gathering-image.ts)·검토(api/review.ts)와 같은 OPENROUTER_API_KEY 를
// 재사용한다 — 비밀은 서버에만. 그래서 배포에 새 설정이 필요 없다.
// 룰 모드 지식(src/content/*.md)은 프론트가 번들해 body.knowledge 로 실어 보낸다
// (서버리스가 런타임에 파일을 못 읽어도 동작하고, md 가 단일 출처로 유지된다).
//
// 페르소나는 scripts/chat-proxy.mjs 와 동일하게 유지할 것(런타임이 달라 두 벌).

type FaceBrief = Record<string, unknown>;
type CaseBrief = { source: string; id: string; title: string; status: string; snippet: string };
type ChatTurn = { role: 'user' | 'assistant'; content: string };
type ChatBody = {
  mode?: 'counsel' | 'rule';
  messages?: ChatTurn[];
  self?: FaceBrief;
  partner?: FaceBrief;
  cases?: CaseBrief[];
  knowledge?: string;
};

const OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions';
const encoder = new TextEncoder();
const sseChunk = (obj: unknown) => encoder.encode(`data: ${JSON.stringify(obj)}\n\n`);
const SSE_HEADERS = { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache' };

function env(name: string): string | undefined {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
}

const PERSONA = [
  '너는 SK의 팀 문화 서비스 "SKonnection" 안의 마음상담 챗봇이다.',
  '오은영 선생님처럼 따뜻하되 직설적인 관계 코칭을 한다. 한국어로, 존댓말로 답한다.',
  '항상 이 골격을 따른다: (1) 감정을 인정·요약한다 (2) 나와 상대의 성향을 상대의 언어로',
  '번역해 오해를 풀어준다 (3) 오늘 할 수 있는 작은 다음 한 걸음을 1개 제안한다.',
  '특정인을 깎아내리지 않는다. 의료·심리 진단은 하지 않는다. 자·타해 등 위기 신호가',
  '보이면 조언 대신 전문 상담창구(예: 자살예방상담 109, 사내 EAP) 안내로 전환한다.',
  '답 끝에 근거를 짧게 밝힌다 — 예: "(근거: OO님 성향 \'기준형 설계자\', 유사사례 SOOP-142)".',
].join(' ');

const RULE_PERSONA = [
  '너는 팀 운영·예산·근태·AI 도구·KPI 규칙과 SK하이닉스 출입·보안 절차를 안내하는 챗봇이다.',
  '한국어 존댓말로 답한다. 아래 제공된 문서들에 근거해서만 답한다.',
  '팀 운영 문서의 "챗봇 답변 규칙"을 지킨다: 관련 규정부터, 금액·기간·절차는 정확한 수치와',
  '함께, 원칙/권고/가능/필수를 구분, 문서에 없는 승인·예외를 지어내지 말고 승인권자(팀장/',
  '파트장/담당 BR) 협의가 필요하다고 안내, 프로젝트비/조직비·개인 L/A·팀 CL/AI·프로젝트코드·',
  '공통 KPI/파트 KPI 를 혼동하지 않는다. 하이닉스 절차는 일정·담당자·URL 이 바뀔 수 있으므로',
  '정확한 내용은 담당자 확인이 필요하다고 덧붙인다. 어느 문서에서 왔는지 간단히 밝힌다.',
].join(' ');

function buildMessages(body: ChatBody) {
  const { mode, messages = [], self, partner, cases, knowledge } = body;
  const system: string[] = [];
  if (mode === 'rule') {
    system.push(RULE_PERSONA);
    system.push('\n\n[지식 문서]\n' + (knowledge || '(지식 문서가 제공되지 않았습니다.)'));
  } else {
    system.push(PERSONA);
    if (self) system.push('\n\n[상담을 요청한 사람의 성향]\n' + JSON.stringify(self, null, 2));
    if (partner) system.push('\n\n[갈등 상대의 성향]\n' + JSON.stringify(partner, null, 2));
    if (Array.isArray(cases) && cases.length) {
      system.push(
        '\n\n[팀의 유사 사례(대나무숲·안건)]\n' +
          cases.map((c) => `- [${c.source} ${c.id}] ${c.title} (${c.status}): ${c.snippet}`).join('\n'),
      );
    }
  }
  return [
    { role: 'system', content: system.join('') },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];
}

/** 즉시 한 이벤트만 흘려보내는 SSE 응답(에러·폴백용). */
function sseOnce(obj: unknown): Response {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(sseChunk(obj));
      controller.close();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const apiKey = env('OPENROUTER_API_KEY');
  if (!apiKey) return sseOnce({ error: 'OPENROUTER_API_KEY not configured' });

  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return sseOnce({ error: '잘못된 요청 형식' });
  }

  const model = env('OPENROUTER_MODEL') || 'anthropic/claude-haiku-4.5';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const upstream = await fetch(OPENROUTER, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-Title': 'Connectioner',
          },
          body: JSON.stringify({ model, stream: true, messages: buildMessages(body) }),
        });
        if (!upstream.ok || !upstream.body) {
          controller.enqueue(sseChunk({ error: `LLM 오류 ${upstream.status}` }));
          controller.close();
          return;
        }

        // OpenRouter SSE 델타 → 우리 규약(token) 으로 변환해 흘려보낸다.
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith('data:')) continue;
            const p = t.slice(5).trim();
            if (!p || p === '[DONE]') continue;
            try {
              const token = (JSON.parse(p) as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta
                ?.content;
              if (token) controller.enqueue(sseChunk({ token }));
            } catch {
              /* keep-alive 주석 등 — 무시 */
            }
          }
        }
        controller.enqueue(sseChunk({ done: true }));
        controller.close();
      } catch (error) {
        controller.enqueue(sseChunk({ error: String(error) }));
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
