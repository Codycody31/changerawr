-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "GitLabIntegration" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "repositoryUrl" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "lastSyncAt" TIMESTAMP(3),
    "lastCommitSha" TEXT,
    "includeBreakingChanges" BOOLEAN NOT NULL DEFAULT true,
    "includeFixes" BOOLEAN NOT NULL DEFAULT true,
    "includeFeatures" BOOLEAN NOT NULL DEFAULT true,
    "includeChores" BOOLEAN NOT NULL DEFAULT false,
    "customCommitTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitLabIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GitLabIntegration_projectId_key" ON "GitLabIntegration"("projectId");

-- CreateIndex
CREATE INDEX "GitLabIntegration_projectId_idx" ON "GitLabIntegration"("projectId");

-- CreateIndex
CREATE INDEX "GitLabIntegration_enabled_idx" ON "GitLabIntegration"("enabled");

-- AddForeignKey
ALTER TABLE "GitLabIntegration" ADD CONSTRAINT "GitLabIntegration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
