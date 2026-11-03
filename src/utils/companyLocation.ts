type MapTilerFeature = {
  text?: string;
  place_name?: string;
  place_type?: string[];
  center?: [number, number];
  properties?: { country_code?: string };
  context?: Array<{ id?: string; text?: string; country_code?: string }>;
};

export type CompanyLocation = {
  city: string;
  country: string;
  label: string;
  mapLat: number;
  mapLng: number;
};

export async function findCompanyLocations(query: string, country?: string, region?: string): Promise<CompanyLocation[]> {
  const locations = await requestLocations(encodeURIComponent(query), {
    limit: '10', types: 'place,municipality,locality',
    ...(country ? { country: country.toLowerCase() } : {}),
  });
  const matching = locations.filter(location =>
    (!country || location.country === country.toUpperCase()) &&
    (!region || location.label.toLocaleLowerCase().includes(region.toLocaleLowerCase()))
  );
  const unique = new Map<string, CompanyLocation>();
  for (const location of matching) {
    const key = `${location.city.toLocaleLowerCase()}|${location.country}`;
    if (!unique.has(key)) unique.set(key, location);
  }
  return [...unique.values()].slice(0, 5);
}

export async function reverseCompanyLocation(lng: number, lat: number): Promise<CompanyLocation | null> {
  const locations = await requestLocations(`${lng},${lat}`, { types: 'place,municipality,locality' });
  return locations[0] ?? null;
}

async function requestLocations(path: string, options: Record<string, string>): Promise<CompanyLocation[]> {
  const key = process.env.MAPTILER_API_KEY;
  if (!key) throw new Error('MapTiler is not configured.');
  const url = new URL(`https://api.maptiler.com/geocoding/${path}.json`);
  url.searchParams.set('key', key);
  for (const [name, value] of Object.entries(options)) url.searchParams.set(name, value);
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`MapTiler geocoding failed with status ${response.status}.`);
  const data = await response.json() as { features?: MapTilerFeature[] };
  return (data.features ?? []).flatMap(feature => {
    const city = feature.text?.trim();
    const country = (feature.properties?.country_code ?? feature.context?.find(item => item.id?.startsWith('country.'))?.country_code)?.toUpperCase();
    const [mapLng, mapLat] = feature.center ?? [];
    if (!city || !country || typeof mapLat !== 'number' || typeof mapLng !== 'number' || !Number.isFinite(mapLat) || !Number.isFinite(mapLng)) return [];
    return [{ city, country, label: feature.place_name ?? `${city}, ${country}`, mapLat, mapLng }];
  });
}
