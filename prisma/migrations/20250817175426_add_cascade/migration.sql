-- DropForeignKey
ALTER TABLE "public"."Comment" DROP CONSTRAINT "Comment_author_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Comment" DROP CONSTRAINT "Comment_vent_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Media" DROP CONSTRAINT "Media_vent_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Reports" DROP CONSTRAINT "Reports_reporter_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Reports" DROP CONSTRAINT "Reports_vent_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."SubComment" DROP CONSTRAINT "SubComment_author_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."SubComment" DROP CONSTRAINT "SubComment_comment_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Vent" DROP CONSTRAINT "Vent_author_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Vent" DROP CONSTRAINT "Vent_company_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Vote" DROP CONSTRAINT "Vote_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Vote" DROP CONSTRAINT "Vote_vent_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."Vent" ADD CONSTRAINT "Vent_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vent" ADD CONSTRAINT "Vent_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vote" ADD CONSTRAINT "Vote_vent_id_fkey" FOREIGN KEY ("vent_id") REFERENCES "public"."Vent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vote" ADD CONSTRAINT "Vote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_vent_id_fkey" FOREIGN KEY ("vent_id") REFERENCES "public"."Vent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubComment" ADD CONSTRAINT "SubComment_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubComment" ADD CONSTRAINT "SubComment_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reports" ADD CONSTRAINT "Reports_vent_id_fkey" FOREIGN KEY ("vent_id") REFERENCES "public"."Vent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reports" ADD CONSTRAINT "Reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Media" ADD CONSTRAINT "Media_vent_id_fkey" FOREIGN KEY ("vent_id") REFERENCES "public"."Vent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
