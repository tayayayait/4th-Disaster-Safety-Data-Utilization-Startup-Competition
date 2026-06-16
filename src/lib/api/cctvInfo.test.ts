import { describe, expect, test } from "vitest";

import { parseCctvFeeds } from "./cctvInfo";

describe("parseCctvFeeds", () => {
  test("normalizes ITS CCTV records with semicolon-padded coordinates", () => {
    const feeds = parseCctvFeeds({
      cameras: [
        {
          id: "cctv-1",
          roadSectionId: "",
          fileCreatedAt: "20201127075753",
          cctvType: "4",
          streamUrl: "https://example.test/live.m3u8",
          resolution: "",
          position: { lat: 37.42889, lng: 127.12361 },
          format: "HLS",
          name: "[수도권제1순환선] 성남",
          source: "ITS cctvInfo",
        },
      ],
      source: "ITS cctvInfo",
      status: "OK",
    });

    expect(feeds).toEqual([
      {
        id: "cctv-1",
        roadSectionId: undefined,
        fileCreatedAt: "20201127075753",
        cctvType: "4",
        streamUrl: "https://example.test/live.m3u8",
        resolution: undefined,
        position: { lat: 37.42889, lng: 127.12361 },
        format: "HLS",
        name: "[수도권제1순환선] 성남",
        source: "ITS cctvInfo",
      },
    ]);
  });
});
