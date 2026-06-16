# 침수퇴로 AI — 시민 앱 MVP 구현 계획

상세서(`상세서.md`)에 정의된 디자인 시스템과 화면 규격을 그대로 따르되, 외부 API는 모두 Mock 데이터로 시연 가능한 형태로 구축합니다.

## 범위

포함:

- 시민용 4탭 모바일 PWA (홈 / 경로 / 대피소 / 도움)
- Leaflet + OpenStreetMap 지도 + 위험구역 오버레이 + 마커
- 위치 권한 흐름 (허용 / 거부→주소입력 / 실패)
- 위험도 5단계(SAFE/WATCH/WARNING/CRITICAL/UNKNOWN) 시각화 + 심각 상태 긴급 모드
- 도보/차량 경로 비교 화면(추천/대안/제외 카드 + 색상 규칙)
- 대피소 목록(도달 가능성 점수 정렬) + 상태 배지
- AI 도움 화면 — 고정 질문 5개 + 답변 카드(Lovable AI Gateway / Gemini, 검증·면책 규칙 포함)
- 데이터 기준시각, 출처, 면책 문구, fallback 처리

제외(상세서 명시):

- 담당자 대시보드(Phase 2)
- 실 API 연동(NAVER, TMAP, 기상청, WMS) — Mock으로 대체
- 인증/계정

## 기술 결정

- 지도: **Leaflet + react-leaflet + OSM 타일**. WMS 오버레이 자리는 Mock 폴리곤(GeoJSON)으로 위험구역 표현.
- 백엔드: **Lovable Cloud 활성화**. 사용 목적 = Gemini 호출용 서버 함수(`createServerFn` + Lovable AI Gateway)와 향후 대피소 데이터 캐싱. 인증/RLS는 사용하지 않음.
- AI: **Lovable AI Gateway (google/gemini-2.5-flash)**. 응답은 서버에서 JSON schema 검증 후 클라이언트 전달, 실패 시 규칙 기반 fallback.
- Mock 데이터: `src/mocks/`에 대피소 25개, 위험구역 폴리곤, 경로 GeoJSON(서울 한 구역 기준 좌표), 재난문자, 기상 예보를 정적 JSON으로 작성.
- 디자인 토큰: 상세서 §6~§9를 그대로 `src/styles.css`에 매핑(색상·타입스케일·radius·z-index). Pretendard CDN. Tailwind v4 토큰화.

## 라우트 구조

```
src/routes/
  __root.tsx          // 헤더 + 4탭 + Outlet, 폰트/메타
  index.tsx           // 홈 (위험도/지도/행동카드)
  routes.tsx          // 경로 비교 (도보/차량 segmented)
  shelters.tsx        // 대피소 목록
  shelters.$id.tsx    // 대피소 상세 sheet 라우트
  help.tsx            // AI 도움
```

## 컴포넌트 계층

- `components/layout/` — `AppHeader`, `BottomTabs`, `EmergencyBar`
- `components/risk/` — `RiskBadge`, `ActionCard`, `RiskOverlay`
- `components/map/` — `BaseMap`, `CurrentLocationMarker`, `ShelterMarker`, `RouteLine`
- `components/routes/` — `RouteCard`, `ModeSegmented`, `RouteFailureCard`
- `components/shelter/` — `ShelterCard`, `StatusBadge`, `ShelterSheet`
- `components/ai/` — `QuickQuestionList`, `AnswerCard`, `AiDisclaimer`
- `components/ui/` — 기존 shadcn 컴포넌트 활용(Button/Sheet/Badge 등을 상세서 토큰에 맞게 variant 추가)
- `components/common/` — `DataTimestamp`, `SourceList`, `LocationPermissionModal`, `AddressSearchInput`

## 핵심 로직

- `lib/risk/score.ts` — Mock 입력으로 위험점수 0~100 산출 → 상태 매핑
- `lib/routes/rerank.ts` — Mock 경로 후보를 안전점수로 재정렬 + RECOMMENDED/ALTERNATIVE/REJECTED 부여
- `lib/shelter/reachability.ts` — 도달 가능성 점수
- `lib/geo/distance.ts` — Haversine
- `lib/ai/gemini.functions.ts` — `createServerFn` + Lovable AI Gateway 호출 + schema 검증 + 허용 enum 체크 + 30분 캐시(Map)
- `hooks/useGeolocation.ts` — 위치 권한 상태 머신(GRANTED/DENIED/PROMPT/ERROR)

## 상태 관리

- TanStack Query로 Mock fetch + Gemini server fn 캐싱(`staleTime` 상세서 §17.3 기준)
- 위치 상태는 Zustand 한 store(`useLocationStore`) — 위치/주소/위험도 공유

## 디자인 시스템 매핑

`src/styles.css`에 다음 토큰 추가:

- `--color-primary: #2563EB`, `--color-bg: #F8FAFC` 등 §6 전체
- 위험도 5색(`--risk-safe-bg/text/overlay` 등)
- 폰트: Pretendard CDN preconnect + `font-family` 체인
- `tabular-nums` 유틸 클래스

## 단계

1. Lovable Cloud 활성화 + AI Gateway 키 생성
2. 디자인 토큰 + Pretendard + 레이아웃 셸(헤더/하단탭/EmergencyBar) + 라우트 4개 스캐폴드
3. Mock 데이터 작성(대피소/위험구역/경로/재난문자/기상)
4. 홈: 지도 + 마커 + 위험 오버레이 + 위험도 배지 + 행동카드 + 위치 권한 모달
5. 경로 비교: segmented + 경로선 + 카드 3종 + 실패 처리
6. 대피소: 목록 정렬 + 카드 + 상태 배지 + 상세 sheet
7. 도움: 고정 질문 + Gemini server fn(검증/fallback/면책 문구)
8. 접근성·QA 체크리스트(§19) 점검: 44px 터치, ARIA 라벨, 색맹 대비 텍스트 동반, focus trap

## 시연 시나리오

기본 진입 시 위치 거부 → 서울 강남 한 구역 좌표로 Mock 로드, 위험도 `WARNING` 상태로 시연. 헤더의 "시나리오" 드롭다운(개발용 토글)으로 SAFE/WATCH/WARNING/CRITICAL을 즉시 전환해 발표 시 4가지 화면을 모두 보여줄 수 있게 합니다.
