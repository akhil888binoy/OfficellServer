import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { geocodeCountry } from '../src/utils/geocodeCountry';

const databaseUrl = process.env.DATABASE_URL;
const hostname = databaseUrl ? new URL(databaseUrl).hostname : '';
if (!['localhost', '127.0.0.1', '::1'].includes(hostname) && !process.argv.includes('--allow-hosted')) {
  throw new Error('Backfilling a hosted database requires --allow-hosted.');
}

const prisma = new PrismaClient();

async function main() {
  const locations = await prisma.companyLocation.findMany({
    where: { city: null, company: { type: 'MNC' } },
    select: { id: true, country: true },
  });
  const coordinatesByCountry = new Map<string, Awaited<ReturnType<typeof geocodeCountry>>>();
  let mapped = 0;
  for (const location of locations) {
    if (!coordinatesByCountry.has(location.country)) coordinatesByCountry.set(location.country, await geocodeCountry(location.country));
    const coordinates = coordinatesByCountry.get(location.country);
    if (!coordinates) {
      console.log(`No country map point for ${location.country} (location ${location.id}).`);
      continue;
    }
    await prisma.companyLocation.update({ where: { id: location.id }, data: coordinates });
    mapped++;
  }
  console.log(`Mapped ${mapped} of ${locations.length} MNC country locations.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
