/*
  Warnings:

  - You are about to drop the column `price` on the `listings` table. All the data in the column will be lost.
  - Added the required column `condition` to the `listings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalPrice` to the `listings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purchaseYear` to the `listings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "listings" DROP COLUMN "price",
ADD COLUMN     "condition" TEXT NOT NULL,
ADD COLUMN     "estimatedValue" DOUBLE PRECISION,
ADD COLUMN     "isValuated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "purchaseYear" INTEGER NOT NULL,
ADD COLUMN     "subCategory" TEXT,
ADD COLUMN     "valuationPrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "city" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerId" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "streetAddress" TEXT,
ALTER COLUMN "password" DROP NOT NULL;
