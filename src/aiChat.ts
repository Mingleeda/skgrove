// AI 상담 챗봇 이음새(seam). VITE_CHAT_ENDPOINT 프록시로 대화를 POST하고 SSE로 답을 받는다.
// 프론트는 어느 LLM/키냐를 모른다 — URL·규격에만 의존하고 키는 프록시에만 둔다
// (aiSummarize.ts·aiPoster.ts 와 같은 규약). 미설정이면 disabled 로 폴백해 위젯이
// "AI 미설정" 안내만 보이고 앱은 깨지지 않는다.
import type { Profile } from './types';

const ENDPOINT = (import.meta.env as Record<string, string | undefined>).VITE_CHAT_ENDPOINT;
export const CHAT_ENABLED = Boolean(ENDPOINT);

export type ChatMode = 'counsel' | 'rule';
export type ChatTurn = { role: 'user' | 'assistant'; content: string };

// 프록시에 넘기는 성향 요약. 상담에 쓰는 필드만 담고 생일 등 민감정보는 뺀다.
export type FaceBrief = {
  name: string;
  part?: string;
  character?: string;
  trait?: string;
  style?: string;
  collaboration?: string;
  feedback?: string;
  guide?: string;
};

export function briefOf(p: Profile | undefined): FaceBrief | undefined {
  if (!p) return undefined;
  const { name, part, character, trait, style, collaboration, feedback, guide } = p;
  return { name, part, character, trait, style, collaboration, feedback, guide };
}

export type CaseBrief = { source: string; id: string; title: string; status: string; snippet: string };

export type ChatRequest = {
  mode: ChatMode;
  messages: ChatTurn[];
  self?: FaceBrief;
  partner?: FaceBrief;
  cases?: CaseBrief[];
};

export type ChatResult = { ok: boolean; reason?: string };

/**
 * 프록시 SSE 를 읽어 토큰마다 onToken 을 부른다.
 * 프록시 이벤트 규약: `data: {"token":"..."}` 반복 → `data: {"done":true}` | `data: {"error":"..."}`.
 * 성공(ok:true)이면 onToken 으로 흘려보낸 조각을 이어붙인 것이 최종 답이다.
 */
export async function streamChat(req: ChatRequest, onToken: (t: string) => void): Promise<ChatResult> {
  if (!ENDPOINT) return { ok: false, reason: 'disabled' };
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok || !res.body) return { ok: false, reason: `http ${res.status}` };

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let failed: string | undefined;

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE 는 줄 단위다. 완성된 줄만 처리하고 잘린 마지막 줄은 버퍼에 남겨 다음 청크와 잇는다.
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const evt = JSON.parse(payload) as { token?: string; done?: boolean; error?: string };
          if (evt.error) failed = evt.error;
          else if (evt.token) onToken(evt.token);
        } catch {
          /* 부분 프레임 — 다음 청크에서 완성된다. 무시. */
        }
      }
    }
    return failed ? { ok: false, reason: failed } : { ok: true };
  } catch (error) {
    return { ok: false, reason: String(error) };
  }
}
