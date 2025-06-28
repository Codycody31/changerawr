-- Add TELEMETRY_SEND to ScheduledJobType enum
ALTER TYPE "ScheduledJobType" ADD VALUE 'TELEMETRY_SEND';

-- Add TelemetryState enum
CREATE TYPE "TelemetryState" AS ENUM ('PROMPT', 'ENABLED', 'DISABLED');

-- Add telemetry fields to SystemConfig table
ALTER TABLE "SystemConfig" ADD COLUMN "allowTelemetry" "TelemetryState" NOT NULL DEFAULT 'PROMPT';
ALTER TABLE "SystemConfig" ADD COLUMN "telemetryInstanceId" TEXT;

-- Create unique constraint on telemetryInstanceId
CREATE UNIQUE INDEX "SystemConfig_telemetryInstanceId_key" ON "SystemConfig"("telemetryInstanceId");

-- Remove foreign key constraint from ScheduledJob to allow generic entityIds
ALTER TABLE "ScheduledJob" DROP CONSTRAINT IF EXISTS "ScheduledJob_entityId_fkey";

-- Update relation to be optional (this change will be reflected in schema only)
-- The database relation is now removed, making entityId a generic string field