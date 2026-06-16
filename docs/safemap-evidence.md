# SafeMap Risk Evidence

## Purpose

This feature explains why the current location is considered flood-risky when SafeMap WMS data overlaps the user's position.

The API connection already exists. This work turns the SafeMap overlap result into visible user-facing evidence.

## Existing Data Sources

| Layer        | SafeMap API   | Layer name            | Use                                          |
| ------------ | ------------- | --------------------- | -------------------------------------------- |
| 침수흔적도   | `IF_0092_WMS` | `A2SM_FLUDMARKS`      | Past flood trace evidence                    |
| 하천범람지도 | `IF_0089_WMS` | `A2SM_FLOODFOVRRISK1` | 100-year frequency river flood risk evidence |

The browser renders WMS images where configured. `GetFeatureInfo` is proxied through `supabase/functions/safemap-feature-info` because direct browser fetches can be blocked by CORS.

## Implementation

- `src/hooks/useWmsOverlap.ts` calls `GetFeatureInfo` for both SafeMap layers.
- `src/lib/risk/safemapEvidence.ts` converts overlap results into explanation entries.
- `src/components/risk/SafeMapEvidencePanel.tsx` renders the evidence under the home action card.
- `src/lib/risk/calculateRiskScore.ts` still uses the overlap values for scoring.

## Evidence Copy

| Condition            | User-facing explanation                     |
| -------------------- | ------------------------------------------- |
| 침수흔적도 overlap   | 현재 위치가 과거 침수 이력 구역과 겹칩니다. |
| 하천범람지도 overlap | 현재 위치가 하천범람 예상지역과 겹칩니다.   |

The panel also shows the SafeMap source ID and feature count returned by `GetFeatureInfo`.

## Compliance Notes

- This app uses user location to query risk data. Location-based service 신고/허가 requirements must be reviewed before production release.
- SafeMap/public data license terms, including public누리 type restrictions, must be confirmed before commercial deployment.
- The current implementation displays source attribution as `SafeMap IF_0092_WMS` or `SafeMap IF_0089_WMS`.
