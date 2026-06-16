# UI Routing Notes

## Citizen App Shell

- Citizen pages run inside a fixed-height `100dvh` shell.
- The fixed bottom navigation reserves `64px + env(safe-area-inset-bottom)`.
- Page content scrolls inside the shell, not behind the bottom navigation.
- Ops pages keep the existing full-page layout and do not use the citizen bottom navigation.
- The citizen bottom navigation exposes Home, Shelter, Field, and Help only. It must not include a direct Route tab.
- The header shows the active disaster state as static status text. It does not expose a normal-time scenario selector.
- In citizen pages, clicking the `침수퇴로 AI` logo area resets location selection to `PROMPT` and returns to the home address setup screen.

## Route Mode State

- `/routes` accepts `mode=WALK` or `mode=DRIVE` as search state.
- `/routes` requires `locationStatus=GRANTED`. If a location has not been selected on Home, the screen redirects to Home instead of rendering route comparison content.
- The expected in-app entry points for `/routes` are the Home action card's route preview and vehicle route buttons.
- The route mode segmented control must update the search parameter, not only local component state.
- The route mode segmented control must show the requested search mode as selected, even if route content falls back to another available mode.
- The visible route mode can still fall back to the available API result when the requested mode has no route data.
- If every candidate for the visible mode is `REJECTED`, the screen must show an explicit `안전 경로 없음` advisory before listing excluded candidates.
- Each visible route card shows an `AI 경로 설명` block. It uses the existing Gemini chat path to explain why the route is recommended, alternative, or rejected, while route status and safety score remain computed by the route-ranking logic.
- If Gemini is delayed or unavailable, route cards keep a rule-based explanation using the route status, safety score, shelter, and `riskReasons`.

## Address Fallback

- The address form submit button is labeled `주소 검색` because submit returns candidate locations first.
- Route recalculation completes only after the user selects one returned address candidate.

## Map Interaction

- The `/routes` map must display only the shelter targeted by the currently displayed recommended route, not the full nearby shelter list.
- Shelter markers are interactive controls. Selecting a marker must open a visible shelter detail panel with name, address, distance, status, and capacity.
- Naver Maps HTML marker buttons use `data-shelter-id` so direct DOM clicks and SDK marker events both select the same shelter.
- Closing a shelter detail panel must hide that panel without changing the active shelter selection, and it must not reopen solely because shelter or route data refreshes with the same selected shelter id.
- ITS 돌발상황 마커는 `data-traffic-event-id`를 사용한다. 직접 DOM 클릭과 SDK marker event 모두 같은 돌발상황 상세 패널을 열어야 한다.
- The home screen must let citizens reselect the active evacuation facility. A marker click or the home shelter selector changes the recommended shelter and recalculates the displayed route target.
- The home map exposes a `내 위치` control that requests the device location again, updates the current origin when available, and does not directly change the selected evacuation facility.
- The home and `/routes` maps must show nearby ITS traffic events when available. Blocking flood/control events near a route affect route rejection; non-blocking accident/construction/weather events are visible context and route score penalties only.

## Location Permission Prompt

- The initial location permission request is a non-modal prompt, not a full-screen blocking dialog.
- The bottom navigation must remain reachable while the prompt is visible.
- The home screen must not render the map, shelter picker, route recommendation, or SafeMap evidence panels until `locationStatus` is `GRANTED`.
- Initial, denied, and error location states show the manual address fallback. The map appears only after a geocoding candidate is selected or device geolocation succeeds.

## Help Answers

- Rule-based AI fallback answers must be specific to the selected quick question.
- Family-share and official-report questions use dedicated labels and response text instead of reusing generic route-risk reasons.

## Home AI Guidance

- The home action card may request Gemini guidance only after an evacuation facility and route candidate are available.
- The home action card must use the same `useRoutes` route-analysis path as `/routes`; it must not call `buildRoutes` or any mock route generator.
- Before location permission or manual geocoding is completed, home must keep route loading disabled so TMAP/Naver route APIs are not called for the default origin.
- If the user selects a specific evacuation facility on the home screen, the home route request must target that selected facility only.
- The Gemini input must include route `riskReasons`, risk-score reasons, and SafeMap WMS overlap evidence when present.
- Gemini input must also include the actual route id, route name, route mode, route status, safety score, shelter id, shelter name, and route API timestamp.
- Gemini only explains the recommended action and route rationale. It must not override the computed risk level, shelter selection, route status, safety score, or official-control priority.
