-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "disputeReason" TEXT,
ADD COLUMN     "disputedAt" TIMESTAMP(3);
