# HRFCO Sensors Integration

## Purpose

Use the Korea Flood Control Office standard hydrology DB as the app's real-time river and rainfall sensor source.

This integration implements the feature named "실시간 수위·강우 기반 선행 경보".

## Source

- Provider: 기후에너지환경부 한강홍수통제소
- Reference: `https://www.hrfco.go.kr/web/openapiPage/reference.do`
- Base URL: `https://api.hrfco.go.kr/{HRFCO_SERVICE_KEY}`
- Edge Function: `supabase/functions/sensors`
- Client access: `src/lib/sensors/sensorAccess.ts`
- Risk scoring: `src/lib/risk/calculateRiskScore.ts`

## Environment

Server-side only:

```text
HRFCO_SERVICE_KEY=
```

`scripts/set-supabase-secrets.ps1` uploads this value as a Supabase Edge Function secret.

## Used Endpoints

| Purpose                        | Endpoint                              |
| ------------------------------ | ------------------------------------- |
| Water station metadata         | `/waterlevel/info.json`               |
| Nearest water level, 10-minute | `/waterlevel/list/10M/{WLOBSCD}.json` |
| Rainfall station metadata      | `/rainfall/info.json`                 |
| Nearest rainfall, hourly       | `/rainfall/list/1H/{RFOBSCD}.json`    |
| Rainfall fallback, 10-minute   | `/rainfall/list/10M/{RFOBSCD}.json`   |
| Flood forecast alerts          | `/fldfct/list.json`                   |

Dam and weir endpoints are intentionally excluded from the first implementation. They are indirect upstream indicators and are not required for direct user-location warning.

## Selection Logic

1. Convert HRFCO DMS coordinates (`000-00-00`, WGS84) to decimal degrees.
2. Select the nearest water level station to the user.
3. Select the nearest rainfall station to the user.
4. Read latest water level and rainfall values.
5. Read flood forecast alerts.
6. Apply flood forecast alerts only when `STTNM` matches a known water station within 50 km of the user.

## Response Mapping

| HRFCO field       | Internal field                 |
| ----------------- | ------------------------------ |
| `WLOBSCD`         | water station code             |
| `RFOBSCD`         | rainfall station code          |
| `OBSNM`           | `name`                         |
| `AGCNM`           | `provider`                     |
| `ADDR`, `ETCADDR` | `region`                       |
| `LON`, `LAT`      | `position.lng`, `position.lat` |
| `WL`              | `currentLevel`                 |
| `FW`              | `flowRate`                     |
| `ATTWL`           | `attentionLevel`               |
| `WRNWL`           | `warningLevel`                 |
| `ALMWL`           | `alarmLevel`                   |
| `SRSWL`           | `seriousLevel`                 |
| `PFH`             | `plannedFloodLevel`            |
| `RF`              | `currentRainfallMmPerHour`     |
| `KIND`            | `forecastKind`                 |

## Risk Mapping

| Condition                    | App result                       |
| ---------------------------- | -------------------------------- |
| `WL >= SRSWL`                | `CRITICAL`, river flood score 80 |
| `WL >= ALMWL`                | `CRITICAL`, river flood score 80 |
| `WL >= WRNWL`                | `WARNING`, river flood score 55  |
| `WL >= ATTWL`                | `WATCH`, river flood score 30    |
| `RF >= 50 mm/h`              | `CRITICAL` rainfall signal       |
| `RF >= 30 mm/h`              | `WARNING` rainfall signal        |
| `RF >= 15 mm/h`              | `WATCH` rainfall signal          |
| `KIND` contains `홍수경보`   | `CRITICAL`, river flood score 80 |
| `KIND` contains `홍수주의보` | `WARNING`, river flood score 55  |

Rainfall contributes to the app's weather score. Water level and flood forecast alerts contribute to the `riverFlood` score.

## Verification

Verified on 2026-06-14 with the configured key:

- `/waterlevel/info.json`: HTTP 200
- `/waterlevel/list/10M/1018683.json`: HTTP 200
- `/rainfall/info.json`: HTTP 200
- `/rainfall/list/1H/10184100.json`: HTTP 200
- `/rainfall/list/10M/10184100.json`: HTTP 200
- `/fldfct/list.json`: HTTP 200 with `code: 990` when no active flood forecast exists

`code: 990` is treated as no active flood forecast data, not as authentication failure.
