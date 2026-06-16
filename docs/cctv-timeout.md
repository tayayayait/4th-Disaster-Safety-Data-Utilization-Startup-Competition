# CCTV upstream timeout handling

`supabase/functions/cctv-info` queries multiple CCTV upstreams when `roadType` is `all`.

Observed failure mode:

- `roadType: "ex"` returned CCTV data in about 1.6 seconds.
- `roadType: "its"` through the deployed Edge Function did not respond within 15 seconds.
- The previous implementation waited for every upstream request without a timeout, so one slow source could block the whole `cctv-info` response and the map received no CCTV markers.

Current behavior:

- The React client requests `roadType: "ex"` by default for home map markers, because this source is stable in the deployed Edge environment.
- The home map passes `limit: 120` to avoid loading more CCTV markers than the citizen view needs.
- Home map bounds updates are debounced by 700 ms and ignored when all bound edges move by less than `0.0005` degrees.
- If a later CCTV lookup times out or fails, the React hook keeps returning the last successful camera list so existing map markers are not cleared.
- When CCTV markers are available and no CCTV is selected, the map opens the nearest CCTV detail sheet. The video stream still requires the user to click the link.
- The public field CCTV screen requests `roadType: "all"` with a fixed nationwide bounding box and `limit: 5000`.
- Each CCTV upstream request is capped at 15 seconds.
- `roadType: "all"` queries ITS `type=all` first.
- If the ITS `type=all` request fails or returns no cameras, the Edge Function falls back to expressway CCTV (`ex`) and then local-road CCTV (`its`).
- Timed-out or failed sources are ignored by `Promise.allSettled`.
- Successful source results are deduplicated, sorted by distance, and returned with `status: "OK"`.
- The map can render available CCTV markers even when one upstream source is slow.
