type GeocodingFeature = { center?: [number, number]; text?: string; place_type?: string[] };

export const geocodeCompany = async (city?: string | null, country?: string | null, region?: string | null): Promise<{ mapLat: number; mapLng: number } | null> => {
  const key = process.env.MAPTILER_API_KEY;
  if (!key || !city?.trim() || !country?.trim()) return null;

  const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent([city.trim(), region?.trim(), country.trim()].filter(Boolean).join(', '))}.json`);
  url.searchParams.set('key', key);
  url.searchParams.set('limit', '5');
  url.searchParams.set('country', country.trim().toLowerCase());
  url.searchParams.set('types', 'place,municipality,locality,region');

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const data = await response.json() as { features?: GeocodingFeature[] };
    const match = data.features?.find(feature =>
      feature.text?.toLocaleLowerCase() === city.trim().toLocaleLowerCase() &&
      feature.place_type?.some(type => type === 'place' || type === 'municipality' || type === 'locality')
    );
    const [mapLng, mapLat] = match?.center ?? [];
    if (typeof mapLat !== 'number' || typeof mapLng !== 'number' || !Number.isFinite(mapLat) || !Number.isFinite(mapLng)) return null;
    return { mapLat, mapLng };
  } catch (error) {
    console.error('Could not map company location:', error);
    return null;
  }
};
