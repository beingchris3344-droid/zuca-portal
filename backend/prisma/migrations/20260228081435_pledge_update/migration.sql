/*
  Warnings:

  - You are about to drop the column `amountPaid` on the `Pledge` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `Pledge` table. All the data in the column will be lost.
  - You are about to drop the column `updatedBy` on the `Pledge` table. All the data in the column will be lost.
  - Added the required column `amount` to the `Pledge` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ContributionType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amountRequired" REAL NOT NULL,
    "deadline" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ContributionType" ("amountRequired", "createdAt", "deadline", "description", "id", "title", "updatedAt") SELECT "amountRequired", "createdAt", "deadline", "description", "id", "title", "updatedAt" FROM "ContributionType";
DROP TABLE "ContributionType";
ALTER TABLE "new_ContributionType" RENAME TO "ContributionType";
CREATE TABLE "new_Pledge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "contributionTypeId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pledge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pledge_contributionTypeId_fkey" FOREIGN KEY ("contributionTypeId") REFERENCES "ContributionType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Pledge" ("contributionTypeId", "createdAt", "id", "status", "updatedAt", "userId") SELECT "contributionTypeId", "createdAt", "id", "status", "updatedAt", "userId" FROM "Pledge";
DROP TABLE "Pledge";
ALTER TABLE "new_Pledge" RENAME TO "Pledge";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
