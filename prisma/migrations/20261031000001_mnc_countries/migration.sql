CREATE TYPE "CompanyType" AS ENUM ('LOCAL', 'MNC');
ALTER TABLE "Company" ADD COLUMN "type" "CompanyType" NOT NULL DEFAULT 'LOCAL';
ALTER TABLE "CompanyLocation" ALTER COLUMN "city" DROP NOT NULL;

UPDATE "Company" SET "type" = 'MNC', "industry" = NULL, "city" = NULL, "country" = NULL, "mapLat" = NULL, "mapLng" = NULL WHERE "industry" = 'MNCs';

WITH keepers AS (
  SELECT "companyId", "country", MIN("id") AS keep_id
  FROM "CompanyLocation"
  WHERE "companyId" IN (SELECT "id" FROM "Company" WHERE "type" = 'MNC')
  GROUP BY "companyId", "country"
)
UPDATE "Vent" v SET "location_id" = k.keep_id
FROM "CompanyLocation" l, keepers k
WHERE v."location_id" = l."id" AND l."companyId" = k."companyId" AND l."country" = k."country";

WITH keepers AS (
  SELECT "companyId", "country", MIN("id") AS keep_id
  FROM "CompanyLocation"
  WHERE "companyId" IN (SELECT "id" FROM "Company" WHERE "type" = 'MNC')
  GROUP BY "companyId", "country"
)
DELETE FROM "CompanyLocation" l USING keepers k
WHERE l."companyId" = k."companyId" AND l."country" = k."country" AND l."id" <> k.keep_id;

UPDATE "CompanyLocation" SET "city" = NULL
WHERE "companyId" IN (SELECT "id" FROM "Company" WHERE "type" = 'MNC');

CREATE UNIQUE INDEX "CompanyLocation_company_country_only_key" ON "CompanyLocation" ("companyId", "country") WHERE "city" IS NULL;
