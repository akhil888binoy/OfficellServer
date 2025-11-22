/*
  Warnings:

  - You are about to drop the column `branch_name` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `formatted_address` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `google_place_id` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `lat` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `lng` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `Company` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Company_google_place_id_key";

-- AlterTable
ALTER TABLE "public"."Company" DROP COLUMN "branch_name",
DROP COLUMN "formatted_address",
DROP COLUMN "google_place_id",
DROP COLUMN "lat",
DROP COLUMN "lng",
DROP COLUMN "state";
