-- CreateEnum
CREATE TYPE "public"."VoteType" AS ENUM ('UPVOTE', 'DOWNVOTE', 'NOVOTE');

-- AlterTable
ALTER TABLE "public"."Vote" ADD COLUMN     "vote" "public"."VoteType" NOT NULL DEFAULT 'NOVOTE';
