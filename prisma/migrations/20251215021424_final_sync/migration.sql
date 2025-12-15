/*
  Warnings:

  - The `receiptUrl` column on the `listings` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "valuationDocUrl" TEXT[],
DROP COLUMN "receiptUrl",
ADD COLUMN     "receiptUrl" TEXT[];
