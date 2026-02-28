-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MassProgramSong" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "massProgramId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'unknown',
    CONSTRAINT "MassProgramSong_massProgramId_fkey" FOREIGN KEY ("massProgramId") REFERENCES "MassProgram" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MassProgramSong_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MassProgramSong" ("id", "massProgramId", "songId") SELECT "id", "massProgramId", "songId" FROM "MassProgramSong";
DROP TABLE "MassProgramSong";
ALTER TABLE "new_MassProgramSong" RENAME TO "MassProgramSong";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
