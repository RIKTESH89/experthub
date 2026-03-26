-- AlterTable: Make hashedPassword optional for Google OAuth users
ALTER TABLE "User" ALTER COLUMN "hashedPassword" DROP NOT NULL;
