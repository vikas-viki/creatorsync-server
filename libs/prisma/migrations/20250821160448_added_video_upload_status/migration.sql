-- CreateEnum
CREATE TYPE "VideoUploadStatus" AS ENUM ('NOT_APPROVED', 'UPLOAD_STARTED', 'VIDEO_UPLOADED', 'THUMBNAIL_UPDATED');

-- AlterTable
ALTER TABLE "VideoRequest" ADD COLUMN     "uploadStatus" "VideoUploadStatus" NOT NULL DEFAULT 'NOT_APPROVED';
