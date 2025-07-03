-- Drop index only if it exists
DROP INDEX IF EXISTS "ScheduledJob_changelogEntryId_idx";

-- Create CliAuthCode table
CREATE TABLE "CliAuthCode" (
                               "id" TEXT NOT NULL,
                               "code" TEXT NOT NULL,
                               "userId" TEXT NOT NULL,
                               "callbackUrl" TEXT NOT NULL,
                               "expiresAt" TIMESTAMP(3) NOT NULL,
                               "usedAt" TIMESTAMP(3),
                               "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                               CONSTRAINT "CliAuthCode_pkey" PRIMARY KEY ("id")
);

-- Create indexes for CliAuthCode
CREATE UNIQUE INDEX "CliAuthCode_code_key" ON "CliAuthCode"("code");
CREATE INDEX "CliAuthCode_code_idx" ON "CliAuthCode"("code");
CREATE INDEX "CliAuthCode_userId_idx" ON "CliAuthCode"("userId");
CREATE INDEX "CliAuthCode_expiresAt_idx" ON "CliAuthCode"("expiresAt");

-- Add foreign key constraints conditionally
DO $$
    BEGIN
        -- Add ScheduledJob foreign key if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'ScheduledJob_changelogEntryId_fkey'
        ) THEN
            ALTER TABLE "ScheduledJob"
                ADD CONSTRAINT "ScheduledJob_changelogEntryId_fkey"
                    FOREIGN KEY ("changelogEntryId") REFERENCES "ChangelogEntry"("id")
                        ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END $$;

-- Add CliAuthCode foreign key
ALTER TABLE "CliAuthCode" ADD CONSTRAINT "CliAuthCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;