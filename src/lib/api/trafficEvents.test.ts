import { describe, expect, test } from "vitest";

import { parseTrafficEvents, parseTrafficEventsResponse } from "@/lib/api/trafficEvents";

describe("traffic event parser", () => {
  test("parses normalized ITS traffic events", () => {
    const events = parseTrafficEvents({
      events: [
        {
          id: "2884061000:20201127075753:127.5166:34.9011:0",
          type: "국도",
          eventType: "재난",
          eventDetailType: "도로침수",
          position: { lat: 34.9011, lng: 127.5166 },
          linkId: "2884061000",
          roadName: "남해선",
          lanesBlockType: "전면통제",
          lanesBlocked: "2차로 차단",
          message: "도로 침수로 통제",
          startedAt: "2026-06-14T07:57:53+09:00",
          source: "ITS eventInfo",
        },
      ],
    });

    expect(events[0]).toMatchObject({
      eventType: "재난",
      position: { lat: 34.9011, lng: 127.5166 },
      message: "도로 침수로 통제",
    });
  });

  test("rejects events without valid coordinates", () => {
    expect(() =>
      parseTrafficEvents({
        events: [
          {
            id: "bad",
            type: "국도",
            eventType: "재난",
            position: { lat: 120, lng: 127.5166 },
            message: "bad",
            source: "ITS eventInfo",
          },
        ],
      }),
    ).toThrow();
  });

  test("preserves pending-access response metadata from the Edge Function", () => {
    expect(
      parseTrafficEventsResponse({
        events: [],
        source: "ITS eventInfo",
        status: "PENDING_ACCESS",
        message: "ITS eventInfo request timed out",
      }),
    ).toEqual({
      events: [],
      source: "ITS eventInfo",
      status: "PENDING_ACCESS",
      message: "ITS eventInfo request timed out",
    });
  });
});
