import { describe, expect, it } from "vitest";
import { parseZipSearchInput } from "../../supabase/functions/_shared/parseZipSearchInput";

describe("parseZipSearchInput", () => {
  it("accepts a five-digit ZIP code", () => {
    expect(parseZipSearchInput({ postalCode: "80202" })).toEqual({
      postalCode: "80202",
    });
  });

  it("normalizes a ZIP+4 code to its five-digit area", () => {
    expect(parseZipSearchInput({ postalCode: "80202-1234" })).toEqual({
      postalCode: "80202",
    });
  });

  it("rejects malformed input", () => {
    expect(parseZipSearchInput({ postalCode: "ABCDE" })).toEqual({
      error: "Enter a valid five-digit U.S. ZIP code.",
    });
  });
});
