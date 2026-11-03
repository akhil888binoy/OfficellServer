CREATE TYPE "NotificationKind" AS ENUM ('POST_REPLY', 'COMMENT_REPLY', 'COMPANY_POST');

CREATE TABLE "CompanyFollow" (
  "userId" INTEGER NOT NULL,
  "companyId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyFollow_pkey" PRIMARY KEY ("userId", "companyId")
);
CREATE INDEX "CompanyFollow_companyId_idx" ON "CompanyFollow"("companyId");
ALTER TABLE "CompanyFollow" ADD CONSTRAINT "CompanyFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyFollow" ADD CONSTRAINT "CompanyFollow_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TopicFollow" (
  "userId" INTEGER NOT NULL,
  "topic" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TopicFollow_pkey" PRIMARY KEY ("userId", "topic")
);
ALTER TABLE "TopicFollow" ADD CONSTRAINT "TopicFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "NotificationPreference" (
  "userId" INTEGER NOT NULL,
  "replies" BOOLEAN NOT NULL DEFAULT false,
  "companyPosts" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Notification" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "ventId" INTEGER NOT NULL,
  "kind" "NotificationKind" NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt" DESC);
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_ventId_fkey" FOREIGN KEY ("ventId") REFERENCES "Vent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
