/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `LuckyWinner` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `Raffle` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "LuckyWinner_userId_winnerId_key";

-- DropIndex
DROP INDEX "Raffle_userId_raffleId_key";

-- CreateIndex
CREATE UNIQUE INDEX "LuckyWinner_userId_key" ON "LuckyWinner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Raffle_userId_key" ON "Raffle"("userId");
