// 모임 썸네일 생성 함수 (OpenRouter) — 사진을 첨부하지 않은 모임의 대표 이미지를 그린다.
// 로컬 프록시 scripts/image-proxy.mjs 를 Vercel 함수로 이식한 것. 화풍·구도·금지사항은
// 여기(서버)가 갖는다 — 프론트(gatheringImage.ts)는 등록값(사실)만 넘긴다. 키는 서버에만 둔다.
//
// 프론트 규격:
//   POST { gathering: { kind, title, startAt, place, capacity, desc } }
//   응답 { ok: boolean, dataUri?: string, mime?: string, attempts?: number, reason?: string }
//
// 서버 환경변수(비밀은 서버에만):
//   OPENROUTER_API_KEY     : OpenRouter 키. 없으면 휴면 → 프론트는 로컬 포스터로 폴백.
//   OPENROUTER_MODEL       : 장면 번역용 텍스트 모델(기본 anthropic/claude-haiku-4.5)
//   OPENROUTER_IMAGE_MODEL : 그림 모델(기본 google/gemini-3.1-flash-lite-image)
//   OPENROUTER_VISION_MODEL: 글자 검사용 비전 모델(기본 google/gemini-3.1-flash-lite)

type GatheringInput = {
  kind?: string;
  title?: string;
  startAt?: string;
  place?: string;
  capacity?: number | null;
  desc?: string;
};

type ChatPart = { type: string; text?: string; image_url?: { url: string } };
type ChatMessage = { role: string; content: string | ChatPart[] };

const CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const IMAGE_URL = 'https://openrouter.ai/api/v1/images';

function env(name: string): string | undefined {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
}

/*
  화풍은 코드에 고정한다. 격자에 스무 장이 쌓였을 때의 통일감이 여기서 나온다.
  건마다 화풍이 흔들리면 목록이 어지러워지는데, 그건 이 기능의 목적과 정반대다.
*/
const STYLE = [
  "A child's crayon drawing on rough paper.",
  'Thick waxy crayon strokes, visible paper grain, uneven hand-colored fills that stray outside the lines,',
  'naive simple shapes, wobbly outlines, cheerful and warm — like an 8-year-old drew it.',
  'Soft earthy palette with sage green and terracotta.',
].join(' ');

/*
  간판을 '그리지 마라' 대신 '그럴 자리가 없다' 로 말한다.
  확산 모델은 부정어를 언어적으로 처리하지 않아서 'no signage' 를 넣으면
  오히려 signage 가 활성화돼 간판이 그려진다. 카메라를 사람 쪽으로 당기면
  벽·간판·모니터가 자연히 화면 밖으로 나간다.
*/
const FRAME = [
  'Vertical 4:5 thumbnail, single continuous scene filling the whole frame.',
  'Full bleed edge to edge, no border, no white margin.',
  'Camera close on the people and what their hands are doing, so walls stay out of frame.',
  'Backgrounds are plain painted surfaces and soft shapes only.',
  'Every surface in the picture is blank and unmarked.',
  // 표면만 비우면 손에 든 종이·점수표에 숫자가 남는다. 소품까지 범위를 넓힌다.
  'Hands hold only the equipment of the activity itself — no paper, cards, tickets, menus or phones.',
  'Faces simplified, no identifiable real person.',
].join(' ');

/**
 * 시작 시각이 장면의 빛을 정한다. 'YYYY-MM-DDTHH:mm' 를 그대로 읽는다.
 * 두 자리 숫자인지 먼저 본다 — Number('') 은 NaN 이 아니라 0 이라, 그냥 읽으면
 * 시각이 없는 값이 자정으로 둔갑해 한낮 모임이 아침 장면으로 그려진다.
 */
function timeOfDay(startAt: string | undefined): string {
  const digits = String(startAt).slice(11, 13);
  if (!/^\d{2}$/.test(digits)) return 'warm daylight';
  const hour = Number(digits);
  if (hour > 23) return 'warm daylight';
  if (hour < 11) return 'bright morning';
  if (hour < 15) return 'bright midday';
  if (hour < 18) return 'warm late afternoon';
  return 'cozy evening';
}

/*
  정원이 곧 구도다. 같은 '카페에서 커피' 도 15명이면 배경 군중씬이 되고
  3명이면 클로즈업 대화씬이 된다. 등록 폼에 이미 있는 값을 쓰지 않을 이유가 없다.
*/
function castFor(capacity: number | null | undefined): string {
  if (capacity === null || capacity === undefined) return 'a lively group of coworkers';
  if (capacity <= 4) return `just ${capacity} coworkers, an intimate scene`;
  if (capacity <= 10) return `a small group of about ${capacity} coworkers`;
  return 'a cheerful crowd of coworkers';
}

/*
  번역이 지시를 못 알아듣고 '이미지가 첨부되지 않았다' 같은 답을 돌려준 적이 있다.
  그대로 이미지 프롬프트에 넣으면 등산이 회식 장면이 되므로, 쓸 수 있는 문장인지 본다.
*/
function usableSubject(line: string): boolean {
  const text = String(line || '').trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 3 || words.length > 25) return false;
  return !/\b(I|I'm|sorry|cannot|can't|please|attached|provide|as an)\b/i.test(text);
}

/*
  모델이 png 를 준다고 가정하면 안 된다. 실제로는 jpeg 를 돌려준다.
  data URI 의 타입이 실제 바이트와 다르면 비전 API 가 400 을 내고,
  그 빈 응답이 '글자 없음' 으로 오해돼 검사기가 통째로 무력화된다.
*/
function sniffMime(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
  if (buf.length > 12 && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  return 'application/octet-stream';
}

/** 화풍(고정) + 등록값(가변) + 제약(고정) 을 한 줄로 잇는다. */
function buildPrompt(subject: string, gathering: GatheringInput): string {
  return (
    `${STYLE} Subject: Korean coworkers in Korea. ${subject}` +
    ` Cast: ${castFor(gathering.capacity)}.` +
    ` Mood: ${timeOfDay(gathering.startAt)}, friendly. ${FRAME}`
  );
}

/** 재시도 프롬프트. 같은 말을 반복하면 같은 이유로 또 글자가 나온다. */
function retryNoteFor(found: string): string {
  const seen = String(found).replace(/\s+/g, ' ').slice(0, 40);
  return (
    ` The previous attempt wrongly showed the writing "${seen}".` +
    ' Remove whatever object carried it — the gate, sign, board or banner — from the scene entirely.'
  );
}

// OpenRouter 대시보드에 표기되는 앱 이름. api/ai.ts 와 같은 값으로 맞춘다.
const APP_TITLE = 'Connectioner';

// 응답이 비면 조용히 통과시키지 않는다. 검사기가 죽은 것을 '이상 없음' 으로 읽으면 안 된다.
async function chat(apiKey: string, model: string, messages: ChatMessage[], maxTokens: number): Promise<string> {
  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, 'X-Title': APP_TITLE },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
  });
  const data = (await res.json().catch(() => null)) as
    | { choices?: { message?: { content?: string } }[]; error?: { message?: string } }
    | null;
  const content = String(data?.choices?.[0]?.message?.content ?? '').trim();
  if (!content) throw new Error(`${model} 빈 응답 (HTTP ${res.status}) ${data?.error?.message ?? ''}`);
  return content;
}

/*
  장소 고유명사를 일반명사로 바꾼다. 'Gangnam bowling alley' 가 남으면 그 가게 간판이 그려진다.
  금지어를 늘리는 대신 '바꿔라' 로 지시하는 게 중요하다 — 금지 목록이 길어지자 모델이 거절문을 뱉었다.
*/
function askSubject(apiKey: string, textModel: string, gathering: GatheringInput): Promise<string> {
  return chat(
    apiKey,
    textModel,
    [
      {
        role: 'user',
        content:
          'You write one-line scene descriptions for an illustrator.\n' +
          'Turn this Korean workplace gathering into ONE English sentence, 8-15 words.\n' +
          'Describe what the people are physically doing and the generic kind of place ' +
          '(a bowling lane, a mountain trail, a small cafe). ' +
          'Replace any proper place name with its generic type.\n' +
          'Reply with the sentence alone — no markdown, no quotes, no preamble.\n' +
          `제목: ${gathering.title}\n장소: ${gathering.place}`,
      },
    ],
    60,
  );
}

/*
  판정 대신 받아쓰기를 요구한다.
  'YES/NO' 로 물으면 큰 간판만 보고 전체 인상으로 답해, 손에 든 점수표의 숫자를 놓쳤다.
  본 것을 적게 하면 실제로 훑어봐야 하므로 작은 글자도 걸린다.
*/
async function findText(apiKey: string, visionModel: string, dataUri: string): Promise<string | null> {
  const answer = await chat(
    apiKey,
    visionModel,
    [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUri } },
          {
            type: 'text',
            text:
              'Transcribe every letter, digit, word or written mark visible anywhere in this picture — ' +
              'on signs, screens, posters, clothing, and on any paper or object a person is holding. ' +
              'Include marks that only look like writing. ' +
              'Reply with the transcription alone, or exactly NONE if there is truly nothing.',
          },
        ],
      },
    ],
    120,
  );
  return /^none\b/i.test(answer) ? null : answer;
}

async function draw(apiKey: string, imageModel: string, prompt: string): Promise<{ mime: string; dataUri: string }> {
  const res = await fetch(IMAGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, 'X-Title': APP_TITLE },
    body: JSON.stringify({ model: imageModel, prompt }),
  });
  const data = (await res.json().catch(() => null)) as
    | { data?: { b64_json?: string; image?: string }[]; error?: { message?: string } }
    | null;
  const raw = String(data?.data?.[0]?.b64_json ?? data?.data?.[0]?.image ?? '');
  const b64 = raw.replace(/^data:image\/\w+;base64,/, '');
  if (!b64) throw new Error(`이미지 없음 (HTTP ${res.status}) ${data?.error?.message ?? ''}`);
  const buf = Buffer.from(b64, 'base64');
  const mime = sniffMime(buf);
  return { mime, dataUri: `data:${mime};base64,${b64}` };
}

// 세 번까지 다시 그린다. 등록 직후 배경에서 도는 일이라 사용자는 이 시간을 기다리지 않는다.
const MAX_ATTEMPTS = 3;

type ThumbResult = { mime: string; dataUri: string; attempts: number };

/** 글자 없는 썸네일을 만든다. 못 만들면 null — 호출부는 기존 로컬 포스터로 떨어진다. */
async function generateThumbnail(
  apiKey: string,
  models: { text: string; image: string; vision: string },
  gathering: GatheringInput,
): Promise<ThumbResult | null> {
  const translated = await askSubject(apiKey, models.text, gathering).catch(() => '');
  // 못 미더운 번역은 버린다. 그림이 밋밋해질 뿐 주제가 엉뚱해지지는 않는다.
  const subject = usableSubject(translated) ? translated : 'Coworkers spending time together after work.';
  const prompt = buildPrompt(subject, gathering);

  let note = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const image = await draw(apiKey, models.image, prompt + note);
    const found = await findText(apiKey, models.vision, image.dataUri);
    if (!found) return { ...image, attempts: attempt };
    console.log(`[image] ${attempt}회차 글자 검출 → 재시도: ${found.replace(/\s+/g, ' ').slice(0, 40)}`);
    note = retryNoteFor(found);
  }
  // 깨끗한 그림을 못 얻으면 아무것도 주지 않는다. 이게 '글자 0' 의 마지막 보장이다.
  return null;
}

// Vercel Node 함수는 기본 export 를 (req,res)=>void 로 취급해 반환한 Response 를 버린다
// (응답이 안 나가고 타임아웃). named export(POST)로 Web API 시그니처를 쓴다 — api/ai.ts 와 같다.
export async function POST(request: Request): Promise<Response> {
  const apiKey = env('OPENROUTER_API_KEY');
  // 키 미주입 → 휴면. 프론트는 로컬 포스터로 폴백한다.
  if (!apiKey) return Response.json({ ok: false, reason: 'OPENROUTER_API_KEY not configured' });

  let payload: { gathering?: GatheringInput };
  try {
    payload = (await request.json()) as { gathering?: GatheringInput };
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const gathering = payload.gathering;
  if (!gathering?.title) return Response.json({ ok: false, reason: 'no gathering' });

  const models = {
    text: env('OPENROUTER_MODEL') || 'anthropic/claude-haiku-4.5',
    image: env('OPENROUTER_IMAGE_MODEL') || 'google/gemini-3.1-flash-lite-image',
    vision: env('OPENROUTER_VISION_MODEL') || 'google/gemini-3.1-flash-lite',
  };

  const started = Date.now();
  try {
    const image = await generateThumbnail(apiKey, models, gathering);
    if (!image) {
      console.warn(`[image] "${gathering.title}" 글자 제거 실패 — 포스터로 폴백`);
      return Response.json({ ok: false, reason: 'text remained' });
    }
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`[image] "${gathering.title}" ${seconds}초 · 시도 ${image.attempts}회 · ${image.mime}`);
    return Response.json({ ok: true, dataUri: image.dataUri, mime: image.mime, attempts: image.attempts });
  } catch (error) {
    console.error('[image] error:', String(error));
    return Response.json({ ok: false, reason: String(error) });
  }
}
