/*
  Warnings:

  - A unique constraint covering the columns `[testId,questionId]` on the table `aptitude_test_answers` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "aptitude_test_answers_testId_questionId_key" ON "aptitude_test_answers"("testId", "questionId");
