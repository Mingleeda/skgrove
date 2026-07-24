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

현재 `main`에 공통 구조를 반영했고, 기능별 브랜치는 `main` 기준으로 나누었습니다.

```text
main
├─ feature/intake
├─ feature/leader
├─ feature/agenda
├─ feature/meetings
├─ feature/profiles
├─ feature/connect
├─ feature/memory
└─ feature/metrics
```

| 폴더 | 브랜치 | 기능 범위 | 설명 |
| --- | --- | --- | --- |
| `features/intake` | `feature/intake` | 대나무숲 의견 접수 | 팀원이 익명 또는 실명으로 이슈, 불만, 제안을 접수하는 화면입니다. 전달 대상, 카테고리, 긴급도, 공개 범위 같은 입력 흐름을 담당합니다. |
| `features/leader` | `feature/leader` | 리더 관리함, 안건화 | 팀장/파트장이 접수된 의견을 확인하고 상태를 바꾸거나 답변하며, 필요한 의견을 팀 안건으로 전환하는 관리 화면입니다. |
| `features/agenda` | `feature/agenda` | 안건함, 익명 찬반투표, 통과 처리 | 안건 목록과 상세, 익명 찬반투표, 중복 투표 방지, 과반수 기준 통과/부결 처리를 담당합니다. 통과된 안건은 액션아이템 생성 대상으로 이어집니다. |
| `features/meetings` | `feature/meetings` | 캔미팅, 티미팅 | 캔미팅 의견 제출/정리/제출 흐름과 티미팅 주제 접수, 카테고리 유지, 파트 섞기 조 편성, 회의 결과 메모를 담당합니다. |
| `features/profiles` | `feature/profiles` | 개인 프로필, 동료 성향 카드 | 개인의 업무, 역할, 협업 방식, 피드백 선호 방식을 입력하고 동료가 이해하기 쉬운 성향 카드로 보여주는 화면입니다. |
| `features/connect` | `feature/connect` | 커피뽑기, 조뽑기 | 파트가 섞이도록 커피챗 상대나 회의/워크샵 조를 랜덤 매칭하고, 결과를 저장하거나 공유하는 기능입니다. |
| `features/memory` | `feature/memory` | 팀 추억 | 팀 활동, 워크샵, 회고, 커피챗 같은 추억을 사진과 글로 남기고 댓글/반응으로 이어지게 하는 공간입니다. |
| `features/metrics` | `feature/metrics` | 파트지수, 문화 리포트 | 의견 접수, 투표 참여, 커피뽑기 참여, 회의 수 등을 기반으로 파트별 문화 활동 지수와 리더용 요약 리포트를 보여줍니다. |

## 개인 작업 브랜치 예시

기능 브랜치를 기준으로 각자 로컬 작업 브랜치를 따서 개발합니다.

```bash
git fetch origin
git switch feature/intake
git switch -c 이선민
```
