import { describe, expect, test } from "vitest";

import {
  buildDisasterMessagesUrl,
  normalizeDisasterMessageItem,
  normalizeDisasterMessagesResponse,
} from "./disasterMessages";

describe("disaster messages Edge helpers", () => {
  test("builds the MOIS emergency disaster messages API URL", () => {
    const url = buildDisasterMessagesUrl({
      apiUrl: "https://www.safetydata.go.kr/V2/api/DSSP-IF-00247",
      serviceKey: "service-key",
      numOfRows: 20,
      pageNo: 1,
      returnType: "json",
      crtDt: "20260612",
      rgnNm: "서울 강남구",
    });

    expect(url.pathname).toBe("/V2/api/DSSP-IF-00247");
    expect(url.searchParams.get("serviceKey")).toBe("service-key");
    expect(url.searchParams.get("returnType")).toBe("json");
    expect(url.searchParams.get("crtDt")).toBe("20260612");
    expect(url.searchParams.get("rgnNm")).toBe("서울 강남구");
  });

  test("normalizes uppercase API fields", () => {
    expect(
      normalizeDisasterMessageItem({
        SN: 123,
        CRT_DT: "2026-06-12 10:00:00",
        MSG_CN: "침수 위험",
        RCPTN_RGN_NM: "서울 강남구",
        EMRG_STEP_NM: "안전안내",
        DST_SE_NM: "호우",
      }),
    ).toMatchObject({
      id: "123",
      region: "서울 강남구",
      body: "침수 위험",
      source: "MOIS-DSSP-IF-00247",
      disasterType: "호우",
    });
  });

  test("extracts nested response body items", () => {
    const messages = normalizeDisasterMessagesResponse({
      response: {
        body: {
          items: {
            item: [
              {
                SN: "1",
                CRT_DT: "2026-06-12 10:00:00",
                MSG_CN: "하천변 접근 금지",
                RCPTN_RGN_NM: "서울 강남구",
              },
            ],
          },
        },
      },
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]?.body).toBe("하천변 접근 금지");
  });
});
