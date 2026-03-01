-- DropForeignKey
ALTER TABLE "MassProgramSong" DROP CONSTRAINT "MassProgramSong_massProgramId_fkey";

-- DropForeignKey
ALTER TABLE "MassProgramSong" DROP CONSTRAINT "MassProgramSong_songId_fkey";

-- DropForeignKey
ALTER TABLE "Pledge" DROP CONSTRAINT "Pledge_userId_fkey";

-- DropForeignKey
ALTER TABLE "Pledge" DROP CONSTRAINT "Pledge_contributionTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_userId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_roomId_fkey";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "Announcement";

-- DropTable
DROP TABLE "MassProgram";

-- DropTable
DROP TABLE "Song";

-- DropTable
DROP TABLE "MassProgramSong";

-- DropTable
DROP TABLE "ContributionType";

-- DropTable
DROP TABLE "Pledge";

-- DropTable
DROP TABLE "ChatRoom";

-- DropTable
DROP TABLE "Message";

