-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "recipientId" TEXT;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
