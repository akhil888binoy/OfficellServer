export async function geocodeRegion(region: string, countryCode: string): Promise<{ mapLat: number; mapLng: number } | null> {
  const key = process.env.MAPTILER_API_KEY;
  const country = countryCode.trim().toUpperCase();
  const name = region.trim();
  if (!key || !name || !/^[A-Z]{2}$/.test(country)) return null;

  const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(name)}.json`);
  url.searchParams.set('key', key);
  url.searchParams.set('types', 'region');
  url.searchParams.set('country', country.toLowerCase());
  url.searchParams.set('limit', '5');
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const data = await response.json() as { features?: Array<{ text?: string; center?: [number, number]; place_type?: string[]; properties?: { country_code?: string }; context?: Array<{ id?: string; country_code?: string }> }> };
    const feature = data.features?.find(item =>
      item.place_type?.includes('region') &&
      item.text?.toLocaleLowerCase() === name.toLocaleLowerCase() &&
      (item.properties?.country_code ?? item.context?.find(part => part.id?.startsWith('country.'))?.country_code)?.toUpperCase() === country
    );
    const [mapLng, mapLat] = feature?.center ?? [];
    if (typeof mapLat !== 'number' || typeof mapLng !== 'number' || !Number.isFinite(mapLat) || !Number.isFinite(mapLng)) return null;
    return { mapLat, mapLng };
  } catch (error) {
    console.error('Could not map company region:', error);
    return null;
  }
}
