# API 연동 현황

## 행정안전부 이재민 임시주거시설

- 로컬 파일: `api가이드파일/행정안전부_이재민임시주거시설정보_20250901.csv`
- 데이터 성격: 시도별 임시주거시설 집계. 컬럼은 `지역`, `시설구분`, `개소`, `면적(제곱미터)`, `수용능력`이다.
- 생성 명령: `pnpm run shelters:sync` 또는 `pnpm run shelters:summary`
- 생성 결과: `public/data/temporary-housing-regions.json`
- 앱 조회 위치: `src/lib/shelters/shelterApi.ts`

### 적용 원칙

침수 대피 추천에서는 민방위대피시설을 목적지 데이터로 사용하지 않는다. 민방위대피시설은 지하 시설 비중이 높아 침수 상황에서 직접 추천하면 위험하다.

현재 CSV는 시설별 주소, 위도, 경도가 없다. 따라서 `shelter_operations`에 직접 적재하지 않는다. 이 파일은 지역별 수용능력 근거와 서비스 설명 자료로만 사용한다.

위치 기반 대피소 추천을 운영하려면 `행정안전부_이재민 임시주거시설 정보 조회 서비스`처럼 시설별 주소와 좌표를 제공하는 상세 API 또는 지자체별 시설 현황 파일이 추가로 필요하다.

### CSV 매핑

| 원본 필드        | 내부 요약 필드     |
| ---------------- | ------------------ |
| `순번`           | `sequence`         |
| `자료시점`       | `dataDate`         |
| `지역`           | `region`           |
| `시설구분`       | `facilityType`     |
| `개소`           | `facilityCount`    |
| `면적(제곱미터)` | `areaSquareMeters` |
| `수용능력`       | `capacity`         |

### 침수 추천 필터

`src/lib/shelters/shelterApi.ts`는 침수 추천 후보에서 `민방위` 유형, `EXCLUDED` 상태, 지하 시설을 제외한다. DB에 현재 위치 기준 후보가 없거나 조회가 실패하면 브라우저에서 `public/data/shelters.json`의 좌표 보유 대피시설을 현재 위치 기준 거리순으로 필터링해 fallback으로 사용한다. 5km 안의 후보를 우선 사용하되, 5km 안 후보가 없으면 화면이 비지 않도록 가장 가까운 후보를 거리순으로 표시한다. 이 fallback도 지하·제외 후보는 표시하지 않는다. 서울 강남 demo 데이터 fallback은 demo 기준점 근처에서만 허용해, 지방 현재 위치에서 서울 대피소가 추천되는 상태를 방지한다.

## 국토교통부 ITS 돌발상황정보

- 데이터명: `ITS 돌발상황정보`
- API path: `/eventInfo`
- 기본 호출 URL: `https://openapi.its.go.kr:9443/eventInfo`
- Edge Function: `supabase/functions/traffic-events`
- 프론트 훅: `src/hooks/useTrafficEvents.ts`
- 지도 표시 위치: `src/components/map/NaverMap.tsx`
- 경로 반영 위치: `src/lib/risk/routeRanking.ts`

### Upstream timeout handling

`traffic-events`는 ITS `eventInfo`를 선택적인 경로 위험 근거로 취급한다. Supabase Edge Runtime에서 `https://openapi.its.go.kr:9443/eventInfo`를 15초 안에 호출하지 못하거나 upstream 5xx 오류가 발생하면 1회 재시도한다. 재시도 후에도 실패하면 함수는 HTTP 500 대신 다음 HTTP 200 응답을 반환한다.

```json
{
  "events": [],
  "source": "ITS eventInfo",
  "status": "PENDING_ACCESS",
  "message": "ITS eventInfo request timed out"
}
```

이 동작은 선택 데이터 수집 실패가 Supabase `EDGE_FUNCTION_ERROR` 로그나 대피소/경로 추천 차단으로 이어지지 않게 하기 위한 것이다.

### 인증과 설정

서버 전용 환경변수:

```text
ITS_API_KEY=
```

Runtime behavior:

- `traffic-events` reads the upstream ITS `apiKey` only from the Supabase Edge Function secret `ITS_API_KEY`.
- The browser never receives or sends the ITS key.
- There is no source-code fallback API key. If `ITS_API_KEY` is missing or blank, the function returns HTTP 200 with `status: "PENDING_ACCESS"` and `message: "ITS_API_KEY is not configured"`.
- The frontend maps `status: "PENDING_ACCESS"` to `FALLBACK` and keeps the last successful traffic events on the map instead of treating the response as an empty OK result.

돌발상황정보와 CCTV 화상자료가 같은 ITS 인증키로 승인된 경우 `ITS_API_KEY`와 `ITS_CCTV_API_KEY`에 같은 값을 등록한다. `ITS_API_KEY`가 없으면 Edge Function은 `PENDING_ACCESS`와 빈 이벤트 목록을 반환한다. 경로 API와 대피소 추천은 중단하지 않는다.

### 요청 매핑

| API 필드                       | 현재 매핑                              |
| ------------------------------ | -------------------------------------- |
| `apiKey`                       | `ITS_API_KEY`                          |
| `type`                         | `all`                                  |
| `eventType`                    | `all`                                  |
| `minX`, `maxX`, `minY`, `maxY` | 사용자 위치 기준 반경 5km bounding box |
| `getType`                      | `json`                                 |

### 응답 매핑

ITS 성공 응답의 `resultCode`는 환경에 따라 숫자 `0`, 문자열 `0`, 문자열 `00`으로 올 수 있으므로 모두 성공으로 처리한다.

| 원본 필드         | 내부 필드         |
| ----------------- | ----------------- |
| `type`            | `type`            |
| `eventType`       | `eventType`       |
| `eventDetailType` | `eventDetailType` |
| `coordX`          | `position.lng`    |
| `coordY`          | `position.lat`    |
| `linkId`          | `linkId`          |
| `roadName`        | `roadName`        |
| `roadNo`          | `roadNo`          |
| `roadDrcType`     | `roadDirection`   |
| `lanesBlockType`  | `lanesBlockType`  |
| `lanesBlocked`    | `lanesBlocked`    |
| `message`         | `message`         |
| `startDate`       | `startedAt`       |
| `endDate`         | `endedAt`         |

### 화면 표시와 경로 반영

홈 지도와 `/routes` 지도는 `trafficEvents`를 전달받아 사고, 공사, 기상, 재난, 기타 돌발 마커를 표시한다. 마커 클릭 시 하단 상세 패널은 심각도, 이벤트 유형, 도로명과 거리, 원문 메시지, 차단 유형, 차단 차로, 발생/종료 시각, 출처를 구역별로 분리해 보여준다.

경로 polyline에서 120m 이내에 `침수`, `통제`, `차단`, `재난`, `호우`, `홍수`, `수위`, `유실` 키워드를 포함한 이벤트가 있으면 해당 경로를 `REJECTED`로 처리한다. 같은 반경 안의 일반 `사고`, `공사`, `기상`, `돌발`, `정체`, `서행` 이벤트는 경로를 제외하지 않고 안전점수만 감점한다.

## 행정안전부 긴급재난문자

- 데이터명: `행정안전부_긴급재난문자`
- API path: `/V2/api/DSSP-IF-00247`
- 기본 호출 URL: `https://www.safetydata.go.kr/V2/api/DSSP-IF-00247`
- Edge Function: `supabase/functions/disaster-messages`
- 프론트 훅: `src/hooks/useDisasterMessages.ts`

### 인증과 설정

서버 전용 환경변수:

```text
DISASTER_MSG_SERVICE_KEY=
DISASTER_MSG_API_URL=
```

`DISASTER_MSG_API_URL`은 공유플랫폼 이용가이드의 base URL이 변경되거나 기관별 전용 게이트웨이가 제공될 때만 설정한다. 미설정 시 기본값은 `https://www.safetydata.go.kr/V2/api/DSSP-IF-00247`이다.

### 요청 매핑

| API 필드     | 현재 매핑                  |
| ------------ | -------------------------- |
| `serviceKey` | `DISASTER_MSG_SERVICE_KEY` |
| `numOfRows`  | 기본 `20`                  |
| `pageNo`     | 기본 `1`                   |
| `returnType` | `json` 고정                |
| `crtDt`      | `YYYYMMDD`, 기본 오늘 날짜 |
| `rgnNm`      | 기본 `서울 강남구`         |

### 응답 매핑

| 원본 필드      | 내부 필드        |
| -------------- | ---------------- |
| `SN`           | `id`             |
| `CRT_DT`       | `issuedAt`       |
| `MSG_CN`       | `body`           |
| `RCPTN_RGN_NM` | `region`         |
| `EMRG_STEP_NM` | `emergencyLevel` |
| `DST_SE_NM`    | `disasterType`   |
| `REG_YMD`      | `registeredDate` |
| `MDFCN_YMD`    | `modifiedDate`   |

호출 실패, 파싱 실패, 서비스키 누락 시 앱은 demo fallback을 사용하고 `status: "FALLBACK"`으로 표시한다.

## SafeMap 침수흔적도 WMS

- 데이터명: 침수흔적도
- WMS URL: `https://www.safemap.go.kr/openapi2/IF_0092_WMS`
- 레이어명: `A2SM_FLUDMARKS`
- 범례 URL: `https://www.safemap.go.kr/openapi2/lgdInfo?serviceKey=...&intId=IF_0092`
- 프론트 설정: `VITE_SAFEMAP_SERVICE_KEY`
- 서버 설정: `SAFEMAP_SERVICE_KEY`

### 요청 매핑

| API 필드      | 현재 매핑                  |
| ------------- | -------------------------- |
| `serviceKey`  | `VITE_SAFEMAP_SERVICE_KEY` |
| `service`     | `WMS`                      |
| `request`     | `GetMap`                   |
| `version`     | `1.1.1`                    |
| `layers`      | `A2SM_FLUDMARKS`           |
| `styles`      | 빈 문자열                  |
| `srs`         | `EPSG:4326`                |
| `bbox`        | 현재 네이버 지도 bounds    |
| `format`      | `image/png`                |
| `width`       | 지도 컨테이너 px 너비      |
| `height`      | 지도 컨테이너 px 높이      |
| `transparent` | `TRUE`                     |

네이버 지도에서는 SafeMap WMS 이미지를 `GroundOverlay`로 올린다. OpenLayers 예제와 달리 WMS 표준 파라미터를 라이브러리가 자동으로 붙여주지 않으므로 URL 생성 단계에서 `service=WMS`, `request=GetMap`, `version=1.1.1`을 명시한다.

## SafeMap 하천범람지도(국가하천) WMS

- 데이터명: 하천범람지도(국가하천)
- WMS URL: `https://www.safemap.go.kr/openapi2/IF_0089_WMS`
- 레이어명: `A2SM_FLOODFOVRRISK1`
- 범례 URL: `https://www.safemap.go.kr/openapi2/lgdInfo?serviceKey=...&intId=IF_0089`
- 프론트 설정: `VITE_SAFEMAP_SERVICE_KEY`
- 서버 설정: `SAFEMAP_SERVICE_KEY`

### 요청 매핑

| API 필드      | 현재 매핑                  |
| ------------- | -------------------------- |
| `serviceKey`  | `VITE_SAFEMAP_SERVICE_KEY` |
| `service`     | `WMS`                      |
| `request`     | `GetMap`                   |
| `version`     | `1.1.1`                    |
| `layers`      | `A2SM_FLOODFOVRRISK1`      |
| `styles`      | 빈 문자열                  |
| `srs`         | `EPSG:4326`                |
| `bbox`        | 현재 네이버 지도 bounds    |
| `format`      | `image/png`                |
| `width`       | 지도 컨테이너 px 너비      |
| `height`      | 지도 컨테이너 px 높이      |
| `transparent` | `TRUE`                     |

침수흔적도와 동일한 SafeMap 서비스키를 사용한다. 현재 홈 지도에서는 침수흔적도와 하천범람지도 이미지를 순서대로 `GroundOverlay`에 올린다.

## Gemini / Vertex AI

현재 Edge Function은 `VERTEX_AI_PROJECT_ID`가 설정되어 있으면 Vertex AI Gemini를 우선 사용하고, 없으면 기존 AI Studio Gemini API 키 방식으로 fallback한다.

`gemini-chat`은 시민 홈 화면의 행동 추천 설명, `/routes` 경로 카드별 추천·대안·제외 사유 설명, `/help` 빠른 질문 답변에 사용한다. 홈 화면의 Gemini 입력은 `/routes`와 같은 TMAP/Naver 경로 분석 결과에서 나온 실제 route id, mode, status, safety score, `riskReasons`, shelter id를 사용하며 mock route generator를 사용하지 않는다. Gemini 출력은 설명 텍스트로만 사용하며 위험도, 경로 순위, 대피소 선택은 서버/클라이언트의 기존 계산값을 기준으로 한다.

`gemini-notice`는 운영 화면의 주민 안내문 초안 생성에 사용한다.

클라이언트는 `gemini-chat` 응답을 최대 25초까지 기다린다. 배포 환경에서 Vertex AI 경로가 약 18초 걸린 사례가 있어, 15초 이하 timeout은 정상 응답 전에 rule-based fallback을 유발할 수 있다.

### Vertex AI 설정

| 환경변수                      | 설명                                                    |
| ----------------------------- | ------------------------------------------------------- |
| `VERTEX_AI_PROJECT_ID`        | Vertex AI를 사용할 Google Cloud 프로젝트 ID             |
| `VERTEX_AI_LOCATION`          | 기본 `us-central1`                                      |
| `VERTEX_AI_MODEL`             | 기본 `gemini-2.5-flash`                                 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Vertex AI 호출 권한이 있는 서비스 계정 JSON 전체 문자열 |

로컬 검증에서는 gcloud OAuth 토큰으로 `gen-lang-client-0563653718`, `us-central1`, `gemini-2.5-flash` 조합의 `generateContent` 호출이 성공했다. Supabase Edge Function 배포 환경에서는 gcloud가 없으므로 서비스 계정 JSON을 secret으로 등록해야 한다.

### Supabase CLI 업로드

프로젝트에는 로컬 Supabase CLI와 전체 업로드 스크립트를 둔다.

```powershell
pnpm supabase --version
pnpm supabase login
pnpm run supabase:deploy
```

`pnpm run supabase:deploy`는 Supabase project ref `qsuxpldbwzqnomvtmtyw`에 대해 DB migration push, Edge Function 배포, Edge Function secret 등록을 순서대로 실행한다.

배포 대상 Edge Functions:

- `naver-directions`
- `tmap-pedestrian`
- `weather`
- `disaster-messages`
- `gemini-chat`
- `gemini-notice`
- `sensors`
- `safemap-feature-info`
- `traffic-events`
- `cctv-info`

secret만 다시 등록할 때는 아래 명령을 사용한다.

```powershell
pnpm run supabase:secrets
```

등록되는 필수 secret은 `NAVER_DIRECTIONS_CLIENT_ID`, `NAVER_DIRECTIONS_CLIENT_SECRET`, `TMAP_APP_KEY`, `KMA_SERVICE_KEY`, `HRFCO_SERVICE_KEY`, `DISASTER_MSG_SERVICE_KEY`, `VERTEX_AI_PROJECT_ID`, `VERTEX_AI_LOCATION`, `VERTEX_AI_MODEL`, `GOOGLE_SERVICE_ACCOUNT_JSON`이다. 선택 secret은 `DISASTER_MSG_API_URL`, `GEMINI_API_KEY`, `SAFEMAP_SERVICE_KEY`, `ITS_API_KEY`, `ITS_CCTV_API_KEY`, `NAVER_SEARCH_CLIENT_ID`, `NAVER_SEARCH_CLIENT_SECRET`, `SENSOR_API_KEY`, `FCM_SERVER_KEY`이다. `GOOGLE_SERVICE_ACCOUNT_JSON`은 프로젝트 루트의 `apikey.json`을 우선 사용한다.

현재 CLI 로그인 계정이 해당 프로젝트 owner/admin 권한을 갖지 않으면 Supabase API가 `necessary privileges` 오류를 반환하므로, 프로젝트가 보이는 계정으로 다시 로그인해야 한다. DB push에서 비밀번호를 요구하는 경우에는 PowerShell 세션에 `SUPABASE_DB_PASSWORD`를 설정한 뒤 재실행한다.

### 기존 AI Studio fallback

| 환경변수         | 설명                                               |
| ---------------- | -------------------------------------------------- |
| `GEMINI_API_KEY` | `generativelanguage.googleapis.com` 호출용 API key |

AI Studio Prepay 잔액이 0이면 이 방식은 `429 RESOURCE_EXHAUSTED`로 실패한다.

## 센서 Edge Function

- Edge Function: `supabase/functions/sensors`
- 클라이언트 호출 위치: `src/lib/sensors/sensorAccess.ts`
- 호출 방식: `supabase.functions.invoke("sensors", { method: "GET" })`
- 배포 대상: `supabase/config.toml`, `scripts/deploy-supabase-all.ps1`
- CORS 허용 메서드: `GET, POST, OPTIONS`

배포된 엔드포인트 `https://qsuxpldbwzqnomvtmtyw.supabase.co/functions/v1/sensors`가 `404 NOT_FOUND`를 반환하면 함수가 배포되지 않은 상태다. `pnpm run supabase:deploy`로 재배포해야 브라우저 preflight가 함수 코드의 CORS 응답까지 도달한다.

## SafeMap GetFeatureInfo 프록시

- Edge Function: `supabase/functions/safemap-feature-info`
- 클라이언트 호출 위치: `src/lib/api/wmsFeatureInfo.ts`
- 호출 방식: `supabase.functions.invoke("safemap-feature-info", { body })`
- 서버 secret: `SAFEMAP_SERVICE_KEY`
- 허용 레이어: `A2SM_FLUDMARKS`, `A2SM_FLOODFOVRRISK1`

SafeMap WMS 이미지는 브라우저에서 표시할 수 있지만 `GetFeatureInfo`를 `fetch()`로 직접 호출하면 SafeMap 응답에 `Access-Control-Allow-Origin`이 없어 CORS로 차단된다. 따라서 겹침 판정용 `GetFeatureInfo`는 Edge Function에서 서버 사이드로 호출한다. SafeMap이 400 또는 비 JSON/XML 오류를 반환하면 앱은 겹침값 `0`으로 fallback한다.
