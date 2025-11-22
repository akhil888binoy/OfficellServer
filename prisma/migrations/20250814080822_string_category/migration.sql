/*
  Warnings:

  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_VentCategories` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `category` to the `Vent` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."_VentCategories" DROP CONSTRAINT "_VentCategories_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_VentCategories" DROP CONSTRAINT "_VentCategories_B_fkey";

-- AlterTable
ALTER TABLE "public"."Vent" ADD COLUMN     "category" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."Category";

-- DropTable
DROP TABLE "public"."_VentCategories";
