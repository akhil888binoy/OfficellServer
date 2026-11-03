type Candidate = {
  id: number; company_id: number; category: string; createdAt: Date; upvote: number; downvote: number;
  _count: { comments: number; reports: number };
  company?: { type: 'LOCAL' | 'MNC'; country: string | null; isRemote: boolean; mapLat: number | null; mapLng: number | null };
  location?: { country: string } | null;
};

export type ViewerArea = { country: string; latitude?: number; longitude?: number };

const distanceKm = (latA: number, lngA: number, latB: number, lngB: number) => {
  const rad = Math.PI / 180;
  const deltaLat = (latB - latA) * rad;
  const deltaLng = (lngB - lngA) * rad;
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(latA * rad) * Math.cos(latB * rad) * Math.sin(deltaLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

function nearbyBoost(post: Candidate, area?: ViewerArea): number {
  if (!area || !post.company) return 0;
  const country = area.country.toUpperCase();
  if (post.company.type === 'MNC') return post.location?.country.toUpperCase() === country ? 1.3 : 0;
  if (post.company.country?.toUpperCase() !== country) return 0;
  if (post.company.isRemote) return 0.5;
  const { latitude, longitude } = area;
  const { mapLat, mapLng } = post.company;
  if (latitude == null || longitude == null || mapLat == null || mapLng == null) return 0.5;
  const km = distanceKm(latitude, longitude, mapLat, mapLng);
  return km <= 100 ? 2.2 : km <= 500 ? 1.4 : 0.5;
}

export function rankForYou(posts: Candidate[], companyIds: Set<number>, topics: Set<string>, now = Date.now(), area?: ViewerArea): number[] {
  const score = (post: Candidate) => {
    const hours = Math.max(0, (now - post.createdAt.getTime()) / 3_600_000);
    const freshness = 5 / Math.pow(1 + hours / 24, 0.7);
    const votes = Math.log1p(Math.max(0, post.upvote - post.downvote));
    return freshness + 4 * Number(companyIds.has(post.company_id)) + 2 * Number(topics.has(post.category)) + nearbyBoost(post, area)
      + 0.8 * votes + 0.5 * Math.log1p(post._count.comments) - 1.5 * post._count.reports;
  };
  const ranked = [...posts].sort((a, b) => score(b) - score(a) || b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id);
  const fresh = [...posts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id);
  const discovery = ranked.filter(post => !companyIds.has(post.company_id) && !topics.has(post.category));
  const output: number[] = [];
  const used = new Set<number>();
  const total = posts.length;
  while (output.length < total) {
    const pageCompanies = new Map<number, number>();
    for (let slot = 0; slot < 10 && output.length < total; slot++) {
      const pool = slot === 3 || slot === 7 ? fresh : slot === 8 ? discovery : ranked;
      const pick = (list: Candidate[]) => list.find(post => !used.has(post.id) && (pageCompanies.get(post.company_id) ?? 0) < 2);
      const chosen = pick(pool) ?? pick(ranked) ?? ranked.find(post => !used.has(post.id));
      if (!chosen) break;
      output.push(chosen.id);
      used.add(chosen.id);
      pageCompanies.set(chosen.company_id, (pageCompanies.get(chosen.company_id) ?? 0) + 1);
    }
  }
  return output;
}
