/*
  Warnings:

  - Added the required column `report` to the `Reports` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Reports" ADD COLUMN     "report" TEXT NOT NULL;
