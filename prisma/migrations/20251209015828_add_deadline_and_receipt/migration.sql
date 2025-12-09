/*
  Warnings:

  - Added the required column `collectionDeadline` to the `listings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "collectionDeadline" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "receiptUrl" TEXT;
