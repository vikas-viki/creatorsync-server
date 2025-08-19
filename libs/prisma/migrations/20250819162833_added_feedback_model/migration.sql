-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "feedback" TEXT,
    "feature" TEXT,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);
