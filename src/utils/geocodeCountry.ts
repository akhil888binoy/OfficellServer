export async function geocodeCountry(countryCode: string): Promise<{ mapLat: number; mapLng: number } | null> {
  const key = process.env.MAPTILER_API_KEY;
  const code = countryCode.trim().toUpperCase();
  if (!key || !/^[A-Z]{2}$/.test(code)) return null;
  const name = new Intl.DisplayNames(['en'], { type: 'region' }).of(code);
  if (!name || name === code) return null;
  const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(name)}.json`);
  url.searchParams.set('key', key);
  url.searchParams.set('types', 'country');
  url.searchParams.set('country', code.toLowerCase());
  url.searchParams.set('language', 'en');
  url.searchParams.set('limit', '5');
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const data = await response.json() as { features?: Array<{ center?: [number, number]; place_type?: string[]; properties?: { country_code?: string } }> };
    const feature = data.features?.find(item => item.place_type?.includes('country') && item.properties?.country_code?.toUpperCase() === code);
    const [mapLng, mapLat] = feature?.center ?? [];
    if (typeof mapLat !== 'number' || typeof mapLng !== 'number' || !Number.isFinite(mapLat) || !Number.isFinite(mapLng)) return null;
    return { mapLat, mapLng };
  } catch (error) {
    console.error('Could not map company country:', error);
    return null;
  }
}
