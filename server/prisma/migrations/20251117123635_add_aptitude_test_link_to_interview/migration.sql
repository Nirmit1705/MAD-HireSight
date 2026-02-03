-- AlterTable
ALTER TABLE "interviews" ADD COLUMN     "aptitudeTestId" TEXT;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_aptitudeTestId_fkey" FOREIGN KEY ("aptitudeTestId") REFERENCES "aptitude_tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
