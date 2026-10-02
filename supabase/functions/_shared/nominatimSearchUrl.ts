export function buildNominatimSearchUrl(
  baseUrl: string,
  postalCode: string,
  contactEmail: string,
): URL {
  const url = new URL(baseUrl);
  url.search = new URLSearchParams({
    postalcode: postalCode,
    country: "United States",
    countrycodes: "us",
    format: "jsonv2",
    addressdetails: "1",
    limit: "1",
    email: contactEmail,
  }).toString();

  return url;
}
