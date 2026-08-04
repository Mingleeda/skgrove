// 통합 로컬 프록시 — notify(슬랙) + ai(OpenRouter 취합) + review(접수 검토) + calendar(구글 캘린더 읽기)를
// 한 포트에서 경로로 분기한다.
// 실행: node scripts/proxy.mjs  (또는 npm run proxy)
//   POST /api/ai        → AI 취합 (ai-proxy)
//   POST /api/review    → 접수 검토 (review-proxy)
//   GET/POST /api/calendar → 구글 캘린더 읽기 (calendar-proxy)
//   POST /api/notify    → 슬랙 전송 (notify-proxy)
// 설정은 .env.ai.local / .env.notify.local / .env.calendar.local 에서 읽는다(없으면 해당 기능만 휴면).
import { createServer } from 'node:http';
import { handleAi } from './ai-proxy.mjs';
import { handleReview } from './review-proxy.mjs';
import { handleCalendar } from './calendar-proxy.mjs';
import { handleNotify } from './notify-proxy.mjs';

const PORT = Number(process.env.PROXY_PORT || 8787);

createServer((req, res) => {
  const url = req.url || '';
  if (url.includes('/api/review')) {
    handleReview(req, res);
    return;
  }
  if (url.includes('/api/calendar')) {
    handleCalendar(req, res);
    return;
  }
  if (url.includes('/api/ai')) {
    handleAi(req, res);
    return;
  }
  handleNotify(req, res); // 기본: 슬랙(경로 미지정 포함, 하위호환)
}).listen(PORT, () => {
  console.log(`🔗 proxy (notify+ai+review+calendar) 실행 중 → http://127.0.0.1:${PORT}`);
  console.log(`   • POST     /api/ai        (OpenRouter 취합)`);
  console.log(`   • POST     /api/review    (접수 검토)`);
  console.log(`   • GET/POST /api/calendar  (구글 캘린더 읽기)`);
  console.log(`   • POST     /api/notify    (슬랙 전송)`);
});
