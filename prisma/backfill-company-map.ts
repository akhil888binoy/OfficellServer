import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { geocodeCompany } from '../src/utils/geocodeCompany';

const databaseUrl = process.env.DATABASE_URL;
const hostname = databaseUrl ? new URL(databaseUrl).hostname : '';
if (!['localhost', '127.0.0.1', '::1'].includes(hostname) && !process.argv.includes('--allow-hosted')) {
  throw new Error('Backfilling a hosted database requires --allow-hosted.');
}

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    where: { mapLat: null, mapLng: null, city: { not: null }, country: { not: null } },
    select: { id: true, name: true, city: true, country: true },
  });
  let mapped = 0;
  for (const company of companies) {
    const location = await geocodeCompany(company.city, company.country);
    if (!location) {
      console.log(`No map location for ${company.name} (${company.id}).`);
      continue;
    }
    await prisma.company.update({ where: { id: company.id }, data: location });
    mapped++;
  }
  console.log(`Mapped ${mapped} of ${companies.length} companies.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
