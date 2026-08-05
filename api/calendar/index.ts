// 구글 캘린더 읽기 프록시 — 동의 URL 발급과 일정 조회.
// 코드→토큰 교환은 api/calendar/callback.ts 가 맡는다.
//
// 프론트(googleCalendar.ts)가 호출하는 규격:
//   GET  /api/calendar?action=auth    → { ok, url }
//   POST /api/calendar?action=events  → { ok, events }   body: { accessToken, timeMin, timeMax }
//
// 리디렉션 URI 는 /api/calendar/callback 처럼 쿼리 없는 경로여야 한다.
// 쿼리가 붙은 리디렉션 URI 는 구글 콘솔이 거부하는 경우가 있다.
import { AUTH_URL, SCOPE, config, corsHeaders, eventsUrl, normalizeEvents, type GoogleEvent } from './_shared';

export default async function handler(request: Request): Promise<Response> {
  const settings = config();
  if (!settings) return Response.json({ ok: false, reason: 'disabled' });

  const cors = corsHeaders(settings.appOrigin);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  // 1) 동의 화면 주소
  if (action === 'auth' && request.method === 'GET') {
    const consent = new URL(AUTH_URL);
    consent.searchParams.set('client_id', settings.clientId);
    consent.searchParams.set('redirect_uri', settings.redirectUri);
    consent.searchParams.set('response_type', 'code');
    consent.searchParams.set('scope', SCOPE);
    // 갱신 토큰을 보관하지 않는다. 저장할 곳이 없으면 새지도 않는다.
    consent.searchParams.set('access_type', 'online');
    consent.searchParams.set('include_granted_scopes', 'true');
    return Response.json({ ok: true, url: consent.toString() }, { headers: cors });
  }

  // 2) 일정 조회
  if (action === 'events' && request.method === 'POST') {
    let payload: { accessToken?: string; timeMin?: string; timeMax?: string };
    try {
      payload = (await request.json()) as typeof payload;
    } catch {
      return Response.json({ ok: false, reason: 'bad request' }, { status: 400, headers: cors });
    }

    const accessToken = String(payload.accessToken ?? '').trim();
    if (!accessToken) return Response.json({ ok: false, reason: 'no token' }, { status: 401, headers: cors });

    const query = new URLSearchParams({ singleEvents: 'true', orderBy: 'startTime', maxResults: '250' });
    if (payload.timeMin) query.set('timeMin', payload.timeMin);
    if (payload.timeMax) query.set('timeMax', payload.timeMax);

    try {
      const upstream = await fetch(`${eventsUrl(settings.calendarId)}?${query}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = (await upstream.json().catch(() => null)) as
        | { items?: GoogleEvent[]; error?: { message?: string } }
        | null;
      if (!upstream.ok || !data) {
        return Response.json(
          { ok: false, reason: data?.error?.message || `google ${upstream.status}` },
          { headers: cors },
        );
      }
      return Response.json({ ok: true, events: normalizeEvents(data.items ?? []) }, { headers: cors });
    } catch (cause) {
      return Response.json({ ok: false, reason: String(cause) }, { headers: cors });
    }
  }

  return Response.json({ ok: false, reason: 'unknown action' }, { status: 404, headers: cors });
}
