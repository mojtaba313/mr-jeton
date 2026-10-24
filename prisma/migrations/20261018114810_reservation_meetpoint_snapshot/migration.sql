/*
  Warnings:

  - Added the required column `deliveryDate` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deliveryFrom` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deliveryTo` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lat` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lng` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `meetText` to the `reservations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "deliveryDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "deliveryFrom" TEXT NOT NULL,
ADD COLUMN     "deliveryTo" TEXT NOT NULL,
ADD COLUMN     "lat" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "lng" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "meetPoint" TEXT,
ADD COLUMN     "meetText" TEXT NOT NULL;
