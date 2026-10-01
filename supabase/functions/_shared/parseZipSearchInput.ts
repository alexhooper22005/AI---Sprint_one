export type ZipSearchInput =
  | { postalCode: string }
  | { error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseZipSearchInput(value: unknown): ZipSearchInput {
  if (!isRecord(value)) {
    return { error: "Enter a valid five-digit U.S. ZIP code." };
  }

  const postalCode = value.postalCode;
  if (typeof postalCode !== "string") {
    return { error: "Enter a valid five-digit U.S. ZIP code." };
  }

  const match = postalCode.trim().match(/^(\d{5})(?:-\d{4})?$/);
  if (!match) {
    return { error: "Enter a valid five-digit U.S. ZIP code." };
  }

  return { postalCode: match[1] };
}
