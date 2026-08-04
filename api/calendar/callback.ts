// 구글 OAuth 리디렉션 목적지 — 코드를 액세스 토큰으로 바꿔 opener 창에 넘긴다.
//
// 이 경로가 곧 구글 콘솔의 '승인된 리디렉션 URI' 다:
//   http://127.0.0.1:8787/api/calendar/callback   (로컬 통합 프록시)
//   https://<배포주소>/api/calendar/callback       (Vercel)
// 쿼리 파라미터를 붙이지 않는다. 쿼리가 든 리디렉션 URI 는 구글 콘솔이 거부하는 경우가 있다.
import { TOKEN_URL, callbackPage, config } from './_shared';

export default async function handler(request: Request): Promise<Response> {
  const settings = config();
  const html = (body: string, status = 200) =>
    new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  if (!settings) {
    return new Response('구글 캘린더 연동이 설정되지 않았습니다.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const url = new URL(request.url);

  // 사용자가 동의를 거부하면 code 대신 error 가 온다.
  const denied = url.searchParams.get('error');
  if (denied) return html(callbackPage(settings.appOrigin, { error: denied }));

  const code = url.searchParams.get('code');
  if (!code) return html(callbackPage(settings.appOrigin, { error: 'no code' }));

  try {
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: settings.clientId,
        client_secret: settings.clientSecret,
        redirect_uri: settings.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const data = (await tokenResponse.json().catch(() => null)) as
      | { access_token?: string; error_description?: string; error?: string }
      | null;
    if (!tokenResponse.ok || !data?.access_token) {
      const reason = data?.error_description || data?.error || 'token exchange failed';
      return html(callbackPage(settings.appOrigin, { error: reason }));
    }
    return html(callbackPage(settings.appOrigin, { accessToken: data.access_token }));
  } catch (cause) {
    return html(callbackPage(settings.appOrigin, { error: String(cause) }));
  }
}
