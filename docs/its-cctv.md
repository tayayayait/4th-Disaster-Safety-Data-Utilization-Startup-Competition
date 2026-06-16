# ITS CCTV 화상자료 연동

## 목적

공개 현장정보 화면에서 사용자가 선택한 위치와 무관하게 전국 도로 CCTV 위치를 확인한다. 담당자 전용 화면으로 분리하지 않고 시민도 같은 화면에서 확인할 수 있게 한다.

## API

- 제공기관: 국토교통부 ITS
- API: CCTV 화상자료
- URL: `https://openapi.its.go.kr:9443/cctvInfo`
- Edge Function: `supabase/functions/cctv-info`
- 현장정보 화면: `/ops/cctv`
- 하단 `현장` 탭은 `/ops/cctv`로 바로 이동한다.
- `/ops`로 직접 접근해도 같은 CCTV 화면을 표시한다.

## 환경변수

승인된 인증키를 아래 둘 중 하나에 넣으면 된다.

```text
ITS_CCTV_API_KEY=
ITS_API_KEY=
```

우선순위:

1. `ITS_CCTV_API_KEY`
2. `ITS_API_KEY`

돌발상황정보와 CCTV가 같은 ITS 인증키로 승인되면 `ITS_API_KEY` 하나만 넣어도 작동한다.

## 요청 매핑

| API 변수                       | 현재 설정                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `apiKey`                       | `ITS_CCTV_API_KEY` 또는 `ITS_API_KEY`                                          |
| `type`                         | 현장 CCTV 화면은 `all`, 홈 지도 오버레이는 안정성을 위해 기본 `ex`             |
| `cctvType`                     | 기본 `4` HTTPS HLS                                                             |
| `minX`, `maxX`, `minY`, `maxY` | 현장 CCTV 화면은 전국 고정 bounding box, 홈 지도는 화면/반경 기준 bounding box |
| `limit`                        | 현장 CCTV 화면은 최대 5,000개, 기본값은 300개                                  |
| `getType`                      | `json`                                                                         |

## 현장 화면 전국 조회

- `/ops/cctv` 상단에는 지도를 표시한다.
- 화면 진입과 동시에 전국 고정 bounding box로 `cctv-info`를 호출한다.
- 홈 화면에서 설정한 위치, 지도 선택 위치, 브라우저 현재 위치는 현장 CCTV 조회 조건에 사용하지 않는다.
- 현장 CCTV 화면에는 `현재 위치로 이동`, `홈에서 설정한 위치로 돌아가기`, 조회 반경 선택, `조회` 버튼을 표시하지 않는다.
- 지도 중심은 전국 표시용 고정 중심점이며, `현재 위치` 마커로 표시하지 않는다.
- CCTV 마커는 전국 조회 결과를 그대로 표시한다.
- CCTV 상세 정보창은 자동으로 열지 않는다. 사용자가 지도상의 CCTV 카메라 마커를 클릭한 경우에만 하단 정보창을 표시한다.

## 응답 매핑

| 원본 필드        | 내부 필드       |
| ---------------- | --------------- |
| `roadsectionid`  | `roadSectionId` |
| `filecreatetime` | `fileCreatedAt` |
| `cctvtype`       | `cctvType`      |
| `cctvurl`        | `streamUrl`     |
| `cctvresolution` | `resolution`    |
| `coordx`         | `position.lng`  |
| `coordy`         | `position.lat`  |
| `cctvformat`     | `format`        |
| `cctvname`       | `name`          |

ITS 샘플처럼 `coordx` 또는 `cctvname` 뒤에 세미콜론이 붙는 경우는 정규화해서 제거한다.

## 승인 대기 동작

인증키가 없으면 Edge Function은 실패 대신 아래 형태로 응답한다.

```json
{
  "cameras": [],
  "source": "ITS cctvInfo",
  "status": "PENDING_ACCESS"
}
```

따라서 승인 전에도 배포와 화면 확인은 가능하다. 승인 후 Supabase secret만 다시 등록하면 같은 코드가 실제 CCTV 목록을 조회한다.

## 배포

```powershell
pnpm run supabase:secrets
pnpm run supabase:deploy
```

`cctv-info`는 `scripts/deploy-supabase-all.ps1` 배포 목록과 `supabase/config.toml`에 포함되어 있다.
