-- CreateTable
CREATE TABLE "impact_statements" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "interviewNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approvedAt" TIMESTAMP(3),
    "approvedByName" TEXT,
    "updatedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "impact_statements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "impact_statements_assessmentId_key" ON "impact_statements"("assessmentId");
