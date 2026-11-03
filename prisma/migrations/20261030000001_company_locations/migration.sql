CREATE TABLE "CompanyLocation" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "mapLat" DOUBLE PRECISION NOT NULL,
    "mapLng" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CompanyLocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyLocation_companyId_city_country_key" ON "CompanyLocation"("companyId", "city", "country");

ALTER TABLE "CompanyLocation" ADD CONSTRAINT "CompanyLocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
