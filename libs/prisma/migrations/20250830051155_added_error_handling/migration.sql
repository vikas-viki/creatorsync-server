/*
  Warnings:

  - The values [CHANGES_REQUESTED] on the enum `VideoRequestStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `version` on the `VideoRequest` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "VideoRequestStatus_new" AS ENUM ('PENDING', 'APPROVED', 'ERROR');
ALTER TABLE "VideoRequest" ALTER COLUMN "status" TYPE "VideoRequestStatus_new" USING ("status"::text::"VideoRequestStatus_new");
ALTER TYPE "VideoRequestStatus" RENAME TO "VideoRequestStatus_old";
ALTER TYPE "VideoRequestStatus_new" RENAME TO "VideoRequestStatus";
DROP TYPE "VideoRequestStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "VideoRequest" DROP COLUMN "version",
ADD COLUMN     "errorReason" TEXT;
