import { describe, expect, test } from "vitest";

import { isSuccessfulItsResultCode, resultCodeText } from "./itsResult";

describe("ITS result code handling", () => {
  test("accepts numeric and string zero success codes", () => {
    expect(isSuccessfulItsResultCode(0)).toBe(true);
    expect(isSuccessfulItsResultCode("0")).toBe(true);
    expect(isSuccessfulItsResultCode("00")).toBe(true);
  });

  test("rejects missing and non-zero result codes", () => {
    expect(isSuccessfulItsResultCode(undefined)).toBe(false);
    expect(isSuccessfulItsResultCode("10")).toBe(false);
    expect(isSuccessfulItsResultCode(3)).toBe(false);
  });

  test("normalizes numeric result codes for error messages", () => {
    expect(resultCodeText(12)).toBe("12");
    expect(resultCodeText(" 03 ")).toBe("03");
    expect(resultCodeText(null)).toBe("");
  });
});
