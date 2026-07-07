/*
  Warnings:

  - You are about to drop the `BusinessMemory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BusinessMemory" DROP CONSTRAINT "BusinessMemory_businessId_fkey";

-- DropTable
DROP TABLE "BusinessMemory";

-- DropEnum
DROP TYPE "MemoryKind";
