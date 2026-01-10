export async function geocodeAddressToCoords(
  address: string,
  apiKey?: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const key = apiKey || process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return null;
    const encoded = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${key}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: any = await res.json();
    const loc = data?.results?.[0]?.geometry?.location;
    if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
      return { lat: loc.lat, lng: loc.lng };
    }
    return null;
  } catch {
    return null;
  }
}
