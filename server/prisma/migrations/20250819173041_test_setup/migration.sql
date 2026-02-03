-- AlterTable
ALTER TABLE "aptitude_questions" ADD COLUMN     "explanation" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
