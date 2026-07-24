# skgrove

팀문화 개선 웹앱 목업 저장소.

대나무숲처럼 팀원이 익명/실명으로 의견을 접수하고, 리더가 안건화하며, 팀원이 익명 투표로 안건을 통과시키면 액션아이템으로 이어지는 흐름을 중심으로 잡았습니다.

## 시작하기

```bash
git clone https://github.com/Mingleeda/skgrove.git
cd skgrove
npm install
npm run dev
```

## 개발

```bash
npm run build
```

## 가벼운 폴더 구조

```text
src/
  App.tsx                 # 목업 상태와 화면 전환 흐름
  main.tsx                # React 진입점
  navigation.ts           # 좌측 메뉴와 담당자 매핑
  types.ts                # 공통 도메인 타입
  data/mockData.ts        # 목업 데이터
  components/             # 공통 UI 조각
  features/               # 기능별 화면
```

## 기능별 작업 기준

- `features/intake`: 대나무숲 의견 접수
- `features/leader`: 리더 관리함, 안건화
- `features/agenda`: 안건함, 익명 찬반투표, 통과 처리
- `features/meetings`: 캔미팅, 티미팅
- `features/profiles`: 개인 프로필, 동료 성향 카드
- `features/connect`: 커피뽑기, 조뽑기
- `features/memory`: 팀 추억
- `features/metrics`: 파트지수, 문화 리포트
