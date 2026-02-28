/*
  Warnings:

  - You are about to drop the column `amount` on the `Pledge` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ContributionType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amountRequired" REAL NOT NULL DEFAULT 1000,
    "deadline" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ContributionType" ("createdAt", "description", "id", "title") SELECT "createdAt", "description", "id", "title" FROM "ContributionType";
DROP TABLE "ContributionType";
ALTER TABLE "new_ContributionType" RENAME TO "ContributionType";
CREATE TABLE "new_Pledge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "contributionTypeId" TEXT NOT NULL,
    "amountPaid" REAL NOT NULL DEFAULT 0,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pledge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pledge_contributionTypeId_fkey" FOREIGN KEY ("contributionTypeId") REFERENCES "ContributionType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Pledge" ("contributionTypeId", "createdAt", "id", "note", "status", "updatedAt", "updatedBy", "userId") SELECT "contributionTypeId", "createdAt", "id", "note", "status", "updatedAt", "updatedBy", "userId" FROM "Pledge";
DROP TABLE "Pledge";
ALTER TABLE "new_Pledge" RENAME TO "Pledge";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
