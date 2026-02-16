/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `WorkerImage` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "WorkerImage_name_key" ON "WorkerImage"("name");
