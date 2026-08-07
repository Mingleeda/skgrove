# AI 상담 챗봇 (플로팅 캐릭터) — 설계

- 날짜: 2026-08-07
- 한 줄: 우하단 플로팅 캐릭터를 누르면 열리는 챗봇. 팀원 성향과 과거 사례를 근거로
  갈등을 중재하는 "오은영식" 상담과, 팀 그라운드룰 Q&A를 한 위젯에서 제공한다.

## 1. 목적 · 두 모드

메뉴가 아니라 **어느 화면에서든 떠 있는 플로팅 캐릭터**로 진입한다. 클릭하면 우하단에서
챗 패널이 펼쳐지고, 상단 토글로 모드를 고른다.

- 🧭 **상담 모드** — 사용자가 고민을 적고, 필요하면 갈등 상대를 이름으로 지정한다.
  봇은 **나의 성향 + 상대의 성향**을 함께 이해시켜 중재 조언을 주고, **팀의 유사 사례**
  (대나무숲 접수·안건)를 찾아 "우리 팀에도 이런 일이 있었다"를 곁들인다.
- 📖 **룰 확인 모드** — 소스에 넣어 둔 팀 그라운드룰(md)을 근거로 질문에 답한다.

## 2. 진입 UI — 플로팅 캐릭터 위젯

- `App` 루트에 `<ChatWidget/>` 하나. 라우팅과 무관하게 모든 화면 위에 뜬다.
- 우하단 `position: fixed` 캐릭터 버튼(자체 SVG/CSS 마스코트 — 외부 이미지 없음,
  브랜드 파랑 + 하트핸드셰이크 결). 이모지를 아이콘으로 쓰지 않는 규칙을 지킨다.
- 클릭 → 패널 오픈(우하단에서 위로). 상단: 모드 토글 + 닫기. 본문: 메시지 목록 +
  입력창. 상담 모드일 때만 "갈등 상대 지정(선택)" 셀렉트(팀원 이름).
- 접힘/펼침만 로컬 상태로 관리. 안 읽음 배지 등은 후속 확장 여지로 남긴다.

## 3. 구조 — 기존 AI 프록시 규약 재사용

프론트는 "어느 LLM/키냐"를 모른다. URL·규격에만 의존하고 키는 프록시에만 둔다
(`aiSummarize.ts`·`aiPoster.ts`와 동일 규약).

- **프론트 seam** `src/aiChat.ts` — `VITE_CHAT_ENDPOINT`로 POST. 엔드포인트가 없으면
  `{ ok:false, reason:'disabled' }`로 폴백해 위젯이 "AI 미설정" 안내만 보이고 앱은 안 깨진다.
  요청 바디: `{ mode, messages, self, partner?, cases?, groundRules? }` — 단, 성향·사례·룰
  **원문 조립은 프록시가** 하고(프론트는 필요한 원자료만 넘김), 프론트는 화면 데이터를 전달.
- **프록시** `scripts/chat-proxy.mjs` — OpenRouter 키 보유(`.env.ai.local`).
  시스템 프롬프트(페르소나 + 주입 컨텍스트)를 조립해 Claude 호출(기본
  `anthropic/claude-haiku-4.5`, 품질↑ 옵션 sonnet). **SSE 스트리밍**으로 토큰을 흘려보낸다.
- 프록시는 앱 DB를 모른다. 성향/사례/룰은 프론트가 프록시로 넘긴다.

### 주입 컨텍스트

- 상담 모드: `내 성향 프로필`(Profile 전 필드: character·trait·style·collaboration·
  feedback·guide) + `(지정 시) 상대 성향 프로필` + `대나무숲·안건에서 키워드 유사 상위
  3건 요약`(제목·상태·한 줄, 상수로 조정 가능). 유사도는 프론트에서 간단 키워드 매칭으로 후보를 추리고
  프록시에 넘긴다(임베딩·RAG는 과함 — YAGNI).
- 룰 모드: `src/content/team-ground-rules.md` 전문.

## 4. 스트리밍

- 프록시: OpenRouter `stream:true` → `text/event-stream`으로 델타 전달.
- 프론트: `fetch` + `ReadableStream`(또는 EventSource 계열)로 델타를 이어붙여 말풍선을
  점진 렌더. 실패 시 부분 응답까지 남기고 오류 표시.
- 폴백: 스트림 미지원/오류면 한 번에 받은 전체 텍스트로 대체.

## 5. 저장 — Supabase (작성자 소프트 스코핑)

- 새 테이블 **단일 `counsel_messages`**. 컬럼:
  `id, session_id(nullable), author(email), mode, role('user'|'assistant'), content,
  partner_name(nullable), created_at`. 한 위젯 세션의 메시지를 `session_id`로 묶되,
  별도 세션 테이블은 두지 않는다(YAGNI — 대화 목록 UI가 생기면 그때 분리).
- `src/counselStore.ts` — gatheringStore와 같은 규약(load/insert). Supabase 있으면 DB,
  없으면 localStorage(`skgrove:counsel*`) 단독. 조회는 **현재 사용자 author로 필터**.
- **프라이버시 한계(명시)**: 이 앱의 Supabase는 실제 인증이 없고 anon 키 + prototype
  오픈 RLS다. 따라서 author 필터는 **소프트 스코핑**이며 DB 차원에서 남의 상담 열람을
  강제 차단하지 못한다(대나무숲·안건과 동일한 신뢰 모델). 사용자가 이 한계를 인지하고
  C(계정별 저장, 기기 이동 시 이어짐)를 선택함. 향후 Supabase Auth 도입 시 RLS로 강화.

## 6. 페르소나 · 가드레일

- 톤: 따뜻하되 직설적인 "오은영"식 관계 코칭. 양쪽을 다 이해시키고 **다음 한 걸음**을
  제안. 평가·편들기보다 번역(서로의 성향을 상대 언어로 옮겨 주기).
- 가드: 의료·심리 **진단은 하지 않는다**. 위기 신호(자·타해 등)엔 전문가·상담창구 안내로
  전환. 특정인을 깎아내리는 발언 금지. 근거로 성향·그라운드룰을 인용.

## 7. 파일 (신규/변경)

- 신규: `src/aiChat.ts`(seam), `src/features/chat/ChatWidget.tsx`(+하위),
  `src/counselStore.ts`, `src/content/team-ground-rules.md`(자리표시 샘플),
  `scripts/chat-proxy.mjs`, `supabase-schema.sql`에 `counsel_messages` 추가,
  `.env.ai.example`에 `CHAT_*`/`VITE_CHAT_ENDPOINT` 안내.
- 변경: `src/App.tsx`(ChatWidget 마운트 + currentUser·profiles·issues·agendas 전달),
  `src/styles.css`(위젯·마스코트·말풍선).

## 8. 테스트

- `aiChat.test.ts`: 엔드포인트 없으면 disabled 폴백, 응답 sanitize.
- 유사사례 추리기 순수 함수(`findSimilarCases`) 단위 테스트.
- `counselStore` load/insert(로컬 폴백) 스모크.
- designTokens 회귀 유지(하드코딩 hex 0, 브레이크포인트 720/1100, keep-all).

## 9. 스코프 밖(후속)

임베딩 기반 유사도, 스트리밍 중단 버튼, 안 읽음 배지, 상담→안건 전환, 다국어.
