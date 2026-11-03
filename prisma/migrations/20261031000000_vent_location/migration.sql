ALTER TABLE "Vent" ADD COLUMN "location_id" INTEGER;

CREATE INDEX "Vent_company_id_location_id_createdAt_idx" ON "Vent"("company_id", "location_id", "createdAt" DESC);

ALTER TABLE "Vent" ADD CONSTRAINT "Vent_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "CompanyLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
