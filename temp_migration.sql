-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF', 'VIEWER');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('DELETE_ENTRY', 'DELETE_TAG', 'DELETE_PROJECT', 'ALLOW_PUBLISH', 'ALLOW_SCHEDULE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "emailType" AS ENUM ('SINGLE_UPDATE', 'DIGEST');

-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('ALL_UPDATES', 'MAJOR_ONLY', 'DIGEST_ONLY');

-- CreateEnum
CREATE TYPE "TwoFactorMode" AS ENUM ('NONE', 'PASSKEY_PLUS_PASSWORD', 'PASSWORD_PLUS_PASSKEY');

-- CreateEnum
CREATE TYPE "ScheduledJobType" AS ENUM ('PUBLISH_CHANGELOG_ENTRY', 'UNPUBLISH_CHANGELOG_ENTRY', 'DELETE_CHANGELOG_ENTRY', 'SEND_EMAIL_NOTIFICATION', 'TELEMETRY_SEND', 'RENEW_SSL_CERTIFICATE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TelemetryState" AS ENUM ('PROMPT', 'ENABLED', 'DISABLED');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('PENDING_HTTP01', 'PENDING_DNS01', 'ISSUED', 'EXPIRED', 'FAILED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ChallengeType" AS ENUM ('HTTP01', 'DNS01');

-- CreateEnum
CREATE TYPE "SslMode" AS ENUM ('LETS_ENCRYPT', 'EXTERNAL', 'NONE');

-- CreateEnum
CREATE TYPE "BrowserRuleType" AS ENUM ('BLOCK', 'ALLOW');

-- CreateEnum
CREATE TYPE "ExtensionSourceType" AS ENUM ('STORE', 'CUSTOM', 'BUILTIN');

-- CreateTable
CREATE TABLE "extension_stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extension_stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editor_extensions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "author" TEXT,
    "description" TEXT,
    "category" TEXT,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceType" "ExtensionSourceType" NOT NULL DEFAULT 'STORE',
    "storeId" TEXT,
    "sourceUrl" TEXT,
    "latestVersion" TEXT,
    "updateAvailable" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,

    CONSTRAINT "editor_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "smtpHost" TEXT NOT NULL,
    "smtpPort" INTEGER NOT NULL,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "replyToEmail" TEXT,
    "defaultSubject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastTestedAt" TIMESTAMP(3),
    "testStatus" TEXT,

    CONSTRAINT "EmailConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "recipients" TEXT[],
    "subject" TEXT NOT NULL,
    "messageId" TEXT,
    "type" TEXT NOT NULL,
    "entryIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "unsubscribeToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastEmailSentAt" TIMESTAMP(3),

    CONSTRAINT "EmailSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSubscription" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "customDomain" TEXT,
    "subscriberId" TEXT NOT NULL,
    "subscriptionType" "SubscriptionType" NOT NULL DEFAULT 'ALL_UPDATES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlackIntegration" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "teamId" TEXT NOT NULL,
    "teamName" TEXT,
    "botUserId" TEXT NOT NULL,
    "botUsername" TEXT,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT,
    "autoSend" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlackIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubIntegration" (
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

    CONSTRAINT "GitHubIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSyncMetadata" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "lastSyncHash" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "totalCommitsSynced" INTEGER NOT NULL DEFAULT 0,
    "repositoryUrl" TEXT,
    "branch" TEXT NOT NULL DEFAULT 'main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSyncMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncedCommit" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "commitHash" TEXT NOT NULL,
    "commitMessage" TEXT NOT NULL,
    "commitAuthor" TEXT NOT NULL,
    "commitEmail" TEXT NOT NULL,
    "commitDate" TIMESTAMP(3) NOT NULL,
    "commitFiles" TEXT[],
    "conventionalType" TEXT,
    "conventionalScope" TEXT,
    "isBreaking" BOOLEAN NOT NULL DEFAULT false,
    "commitBody" TEXT,
    "commitFooter" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "branch" TEXT NOT NULL DEFAULT 'main',

    CONSTRAINT "SyncedCommit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "allowAutoPublish" BOOLEAN NOT NULL DEFAULT false,
    "requireApproval" BOOLEAN NOT NULL DEFAULT true,
    "defaultTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Changelog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Changelog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangelogEntry" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "version" TEXT,
    "publishedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "changelogId" TEXT NOT NULL,

    CONSTRAINT "ChangelogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangelogTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangelogTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangelogRequest" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "staffId" TEXT,
    "adminId" TEXT,
    "projectId" TEXT NOT NULL,
    "targetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "changelogEntryId" TEXT,
    "changelogTagId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ChangelogRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Widget" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "customCSS" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Widget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_domains" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "userId" TEXT,
    "forceHttps" BOOLEAN NOT NULL DEFAULT false,
    "sslMode" "SslMode" NOT NULL DEFAULT 'NONE',

    CONSTRAINT "custom_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainCertificate" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "status" "CertificateStatus" NOT NULL,
    "challengeType" "ChallengeType" NOT NULL,
    "privateKeyPem" TEXT NOT NULL,
    "certificatePem" TEXT,
    "fullChainPem" TEXT,
    "csrPem" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "acmeOrderUrl" TEXT,
    "challengeToken" TEXT,
    "challengeKeyAuth" TEXT,
    "dnsTxtValue" TEXT,
    "lastError" TEXT,
    "renewalAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainBrowserRule" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "userAgentPattern" TEXT NOT NULL,
    "ruleType" "BrowserRuleType" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainBrowserRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainThrottleConfig" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "requestsPerSecond" INTEGER NOT NULL DEFAULT 60,
    "burstSize" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainThrottleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcmeAccount" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "accountKeyPem" TEXT NOT NULL,
    "accountUrl" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcmeAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "permissions" TEXT[],
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "targetUserId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "defaultInvitationExpiry" INTEGER NOT NULL DEFAULT 7,
    "requireApprovalForChangelogs" BOOLEAN NOT NULL DEFAULT true,
    "maxChangelogEntriesPerProject" INTEGER NOT NULL DEFAULT 100,
    "enableAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "enableNotifications" BOOLEAN NOT NULL DEFAULT true,
    "enablePasswordReset" BOOLEAN NOT NULL DEFAULT false,
    "enableAIAssistant" BOOLEAN NOT NULL DEFAULT false,
    "aiApiKey" TEXT,
    "aiApiProvider" TEXT DEFAULT 'secton',
    "aiDefaultModel" TEXT DEFAULT 'copilot-zero',
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "smtpSecure" BOOLEAN,
    "systemEmail" TEXT,
    "allowTelemetry" "TelemetryState" NOT NULL DEFAULT 'PROMPT',
    "telemetryInstanceId" TEXT,
    "adminOnlyApiKeyCreation" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "allowUserTimezone" BOOLEAN NOT NULL DEFAULT true,
    "customDateTemplates" JSONB,
    "sponsorLicenseKey" TEXT,
    "sponsorLicenseValid" BOOLEAN NOT NULL DEFAULT false,
    "sponsorLastVerified" TIMESTAMP(3),
    "sponsorProof" TEXT,
    "sponsorPayload" TEXT,
    "slackOAuthClientId" TEXT,
    "slackOAuthClientSecret" TEXT,
    "slackOAuthEnabled" BOOLEAN NOT NULL DEFAULT false,
    "slackSigningSecret" TEXT,
    "panelIpWhitelistEnabled" BOOLEAN NOT NULL DEFAULT false,
    "panelIpWhitelist" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicChangelogAnalytics" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "changelogEntryId" TEXT,
    "ipHash" TEXT NOT NULL,
    "country" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionHash" TEXT NOT NULL,

    CONSTRAINT "PublicChangelogAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledJob" (
    "id" TEXT NOT NULL,
    "type" "ScheduledJobType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "changelogEntryId" TEXT,

    CONSTRAINT "ScheduledJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "lastChallenge" TEXT,
    "twoFactorMode" "TwoFactorMode" DEFAULT 'NONE',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invalidated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "authorizationUrl" TEXT NOT NULL,
    "tokenUrl" TEXT NOT NULL,
    "userInfoUrl" TEXT NOT NULL,
    "callbackUrl" TEXT NOT NULL,
    "scopes" TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "allowedEmailDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blockExistingUsers" BOOLEAN NOT NULL DEFAULT false,
    "requiredClaims" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthConnection" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "enableNotifications" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passkey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactorSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TwoFactorMode" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoFactorSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "email" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "SAMLProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "ssoUrl" TEXT NOT NULL,
    "certificate" TEXT NOT NULL,
    "spEntityId" TEXT,
    "nameIdFormat" TEXT NOT NULL DEFAULT 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    "emailAttribute" TEXT NOT NULL DEFAULT 'email',
    "nameAttribute" TEXT NOT NULL DEFAULT 'name',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "allowedEmailDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blockExistingUsers" BOOLEAN NOT NULL DEFAULT false,
    "requiredClaims" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SAMLProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SAMLConnection" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nameId" TEXT NOT NULL,
    "sessionIndex" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SAMLConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ChangelogEntryToChangelogTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChangelogEntryToChangelogTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "extension_stores_name_key" ON "extension_stores"("name");

-- CreateIndex
CREATE INDEX "extension_stores_isEnabled_idx" ON "extension_stores"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "editor_extensions_name_key" ON "editor_extensions"("name");

-- CreateIndex
CREATE INDEX "editor_extensions_name_idx" ON "editor_extensions"("name");

-- CreateIndex
CREATE INDEX "editor_extensions_isEnabled_idx" ON "editor_extensions"("isEnabled");

-- CreateIndex
CREATE INDEX "editor_extensions_storeId_idx" ON "editor_extensions"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailConfig_projectId_key" ON "EmailConfig"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSubscriber_unsubscribeToken_key" ON "EmailSubscriber"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "EmailSubscriber_email_idx" ON "EmailSubscriber"("email");

-- CreateIndex
CREATE INDEX "EmailSubscriber_unsubscribeToken_idx" ON "EmailSubscriber"("unsubscribeToken");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSubscriber_email_key" ON "EmailSubscriber"("email");

-- CreateIndex
CREATE INDEX "ProjectSubscription_projectId_idx" ON "ProjectSubscription"("projectId");

-- CreateIndex
CREATE INDEX "ProjectSubscription_customDomain_idx" ON "ProjectSubscription"("customDomain");

-- CreateIndex
CREATE INDEX "ProjectSubscription_subscriberId_idx" ON "ProjectSubscription"("subscriberId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSubscription_projectId_subscriberId_key" ON "ProjectSubscription"("projectId", "subscriberId");

-- CreateIndex
CREATE UNIQUE INDEX "SlackIntegration_projectId_key" ON "SlackIntegration"("projectId");

-- CreateIndex
CREATE INDEX "SlackIntegration_projectId_idx" ON "SlackIntegration"("projectId");

-- CreateIndex
CREATE INDEX "SlackIntegration_teamId_idx" ON "SlackIntegration"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubIntegration_projectId_key" ON "GitHubIntegration"("projectId");

-- CreateIndex
CREATE INDEX "GitHubIntegration_projectId_idx" ON "GitHubIntegration"("projectId");

-- CreateIndex
CREATE INDEX "GitHubIntegration_enabled_idx" ON "GitHubIntegration"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSyncMetadata_projectId_key" ON "ProjectSyncMetadata"("projectId");

-- CreateIndex
CREATE INDEX "ProjectSyncMetadata_projectId_idx" ON "ProjectSyncMetadata"("projectId");

-- CreateIndex
CREATE INDEX "ProjectSyncMetadata_lastSyncedAt_idx" ON "ProjectSyncMetadata"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "SyncedCommit_projectId_idx" ON "SyncedCommit"("projectId");

-- CreateIndex
CREATE INDEX "SyncedCommit_commitHash_idx" ON "SyncedCommit"("commitHash");

-- CreateIndex
CREATE INDEX "SyncedCommit_syncedAt_idx" ON "SyncedCommit"("syncedAt");

-- CreateIndex
CREATE INDEX "SyncedCommit_conventionalType_idx" ON "SyncedCommit"("conventionalType");

-- CreateIndex
CREATE INDEX "SyncedCommit_branch_idx" ON "SyncedCommit"("branch");

-- CreateIndex
CREATE UNIQUE INDEX "SyncedCommit_projectId_commitHash_key" ON "SyncedCommit"("projectId", "commitHash");

-- CreateIndex
CREATE UNIQUE INDEX "Changelog_projectId_key" ON "Changelog"("projectId");

-- CreateIndex
CREATE INDEX "ChangelogEntry_changelogId_idx" ON "ChangelogEntry"("changelogId");

-- CreateIndex
CREATE INDEX "ChangelogEntry_scheduledAt_idx" ON "ChangelogEntry"("scheduledAt");

-- CreateIndex
CREATE INDEX "ChangelogEntry_scheduledAt_publishedAt_idx" ON "ChangelogEntry"("scheduledAt", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChangelogTag_name_key" ON "ChangelogTag"("name");

-- CreateIndex
CREATE INDEX "ChangelogRequest_staffId_idx" ON "ChangelogRequest"("staffId");

-- CreateIndex
CREATE INDEX "ChangelogRequest_adminId_idx" ON "ChangelogRequest"("adminId");

-- CreateIndex
CREATE INDEX "ChangelogRequest_projectId_idx" ON "ChangelogRequest"("projectId");

-- CreateIndex
CREATE INDEX "ChangelogRequest_status_idx" ON "ChangelogRequest"("status");

-- CreateIndex
CREATE INDEX "Widget_projectId_idx" ON "Widget"("projectId");

-- CreateIndex
CREATE INDEX "Widget_projectId_isActive_idx" ON "Widget"("projectId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "custom_domains_domain_key" ON "custom_domains"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "custom_domains_verificationToken_key" ON "custom_domains"("verificationToken");

-- CreateIndex
CREATE INDEX "custom_domains_domain_idx" ON "custom_domains"("domain");

-- CreateIndex
CREATE INDEX "custom_domains_projectId_idx" ON "custom_domains"("projectId");

-- CreateIndex
CREATE INDEX "custom_domains_userId_idx" ON "custom_domains"("userId");

-- CreateIndex
CREATE INDEX "custom_domains_verified_idx" ON "custom_domains"("verified");

-- CreateIndex
CREATE INDEX "DomainCertificate_domainId_idx" ON "DomainCertificate"("domainId");

-- CreateIndex
CREATE INDEX "DomainCertificate_status_idx" ON "DomainCertificate"("status");

-- CreateIndex
CREATE INDEX "DomainCertificate_expiresAt_idx" ON "DomainCertificate"("expiresAt");

-- CreateIndex
CREATE INDEX "DomainCertificate_domainId_status_idx" ON "DomainCertificate"("domainId", "status");

-- CreateIndex
CREATE INDEX "DomainCertificate_challengeToken_idx" ON "DomainCertificate"("challengeToken");

-- CreateIndex
CREATE INDEX "DomainBrowserRule_domainId_isEnabled_idx" ON "DomainBrowserRule"("domainId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "DomainThrottleConfig_domainId_key" ON "DomainThrottleConfig"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "ApiKey_key_idx" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_projectId_idx" ON "ApiKey"("projectId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_targetUserId_idx" ON "AuditLog"("targetUserId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_telemetryInstanceId_key" ON "SystemConfig"("telemetryInstanceId");

-- CreateIndex
CREATE INDEX "PublicChangelogAnalytics_projectId_idx" ON "PublicChangelogAnalytics"("projectId");

-- CreateIndex
CREATE INDEX "PublicChangelogAnalytics_changelogEntryId_idx" ON "PublicChangelogAnalytics"("changelogEntryId");

-- CreateIndex
CREATE INDEX "PublicChangelogAnalytics_viewedAt_idx" ON "PublicChangelogAnalytics"("viewedAt");

-- CreateIndex
CREATE INDEX "PublicChangelogAnalytics_country_idx" ON "PublicChangelogAnalytics"("country");

-- CreateIndex
CREATE INDEX "PublicChangelogAnalytics_sessionHash_idx" ON "PublicChangelogAnalytics"("sessionHash");

-- CreateIndex
CREATE INDEX "ScheduledJob_type_idx" ON "ScheduledJob"("type");

-- CreateIndex
CREATE INDEX "ScheduledJob_entityId_idx" ON "ScheduledJob"("entityId");

-- CreateIndex
CREATE INDEX "ScheduledJob_scheduledAt_idx" ON "ScheduledJob"("scheduledAt");

-- CreateIndex
CREATE INDEX "ScheduledJob_status_idx" ON "ScheduledJob"("status");

-- CreateIndex
CREATE INDEX "ScheduledJob_scheduledAt_status_idx" ON "ScheduledJob"("scheduledAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "OAuthConnection_userId_idx" ON "OAuthConnection"("userId");

-- CreateIndex
CREATE INDEX "OAuthConnection_providerId_idx" ON "OAuthConnection"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthConnection_providerId_providerUserId_key" ON "OAuthConnection"("providerId", "providerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthConnection_providerId_userId_key" ON "OAuthConnection"("providerId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

-- CreateIndex
CREATE INDEX "Settings_userId_idx" ON "Settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Passkey_credentialId_key" ON "Passkey"("credentialId");

-- CreateIndex
CREATE INDEX "Passkey_userId_idx" ON "Passkey"("userId");

-- CreateIndex
CREATE INDEX "Passkey_credentialId_idx" ON "Passkey"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");

-- CreateIndex
CREATE INDEX "PasswordReset_token_idx" ON "PasswordReset"("token");

-- CreateIndex
CREATE INDEX "PasswordReset_userId_idx" ON "PasswordReset"("userId");

-- CreateIndex
CREATE INDEX "PasswordReset_email_idx" ON "PasswordReset"("email");

-- CreateIndex
CREATE INDEX "TwoFactorSession_userId_idx" ON "TwoFactorSession"("userId");

-- CreateIndex
CREATE INDEX "TwoFactorSession_expiresAt_idx" ON "TwoFactorSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "InvitationLink_token_key" ON "InvitationLink"("token");

-- CreateIndex
CREATE INDEX "InvitationLink_token_idx" ON "InvitationLink"("token");

-- CreateIndex
CREATE INDEX "InvitationLink_email_idx" ON "InvitationLink"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CliAuthCode_code_key" ON "CliAuthCode"("code");

-- CreateIndex
CREATE INDEX "CliAuthCode_code_idx" ON "CliAuthCode"("code");

-- CreateIndex
CREATE INDEX "CliAuthCode_userId_idx" ON "CliAuthCode"("userId");

-- CreateIndex
CREATE INDEX "CliAuthCode_expiresAt_idx" ON "CliAuthCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SAMLProvider_name_key" ON "SAMLProvider"("name");

-- CreateIndex
CREATE INDEX "SAMLConnection_userId_idx" ON "SAMLConnection"("userId");

-- CreateIndex
CREATE INDEX "SAMLConnection_providerId_idx" ON "SAMLConnection"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "SAMLConnection_providerId_userId_key" ON "SAMLConnection"("providerId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SAMLConnection_providerId_nameId_key" ON "SAMLConnection"("providerId", "nameId");

-- CreateIndex
CREATE INDEX "_ChangelogEntryToChangelogTag_B_index" ON "_ChangelogEntryToChangelogTag"("B");

-- AddForeignKey
ALTER TABLE "editor_extensions" ADD CONSTRAINT "editor_extensions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "extension_stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailConfig" ADD CONSTRAINT "EmailConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSubscription" ADD CONSTRAINT "ProjectSubscription_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSubscription" ADD CONSTRAINT "ProjectSubscription_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "EmailSubscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlackIntegration" ADD CONSTRAINT "SlackIntegration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubIntegration" ADD CONSTRAINT "GitHubIntegration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSyncMetadata" ADD CONSTRAINT "ProjectSyncMetadata_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncedCommit" ADD CONSTRAINT "SyncedCommit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Changelog" ADD CONSTRAINT "Changelog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangelogEntry" ADD CONSTRAINT "ChangelogEntry_changelogId_fkey" FOREIGN KEY ("changelogId") REFERENCES "Changelog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangelogRequest" ADD CONSTRAINT "ChangelogRequest_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangelogRequest" ADD CONSTRAINT "ChangelogRequest_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangelogRequest" ADD CONSTRAINT "ChangelogRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangelogRequest" ADD CONSTRAINT "ChangelogRequest_changelogEntryId_fkey" FOREIGN KEY ("changelogEntryId") REFERENCES "ChangelogEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangelogRequest" ADD CONSTRAINT "ChangelogRequest_changelogTagId_fkey" FOREIGN KEY ("changelogTagId") REFERENCES "ChangelogTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainCertificate" ADD CONSTRAINT "DomainCertificate_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "custom_domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainBrowserRule" ADD CONSTRAINT "DomainBrowserRule_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "custom_domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainThrottleConfig" ADD CONSTRAINT "DomainThrottleConfig_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "custom_domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicChangelogAnalytics" ADD CONSTRAINT "PublicChangelogAnalytics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicChangelogAnalytics" ADD CONSTRAINT "PublicChangelogAnalytics_changelogEntryId_fkey" FOREIGN KEY ("changelogEntryId") REFERENCES "ChangelogEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledJob" ADD CONSTRAINT "ScheduledJob_changelogEntryId_fkey" FOREIGN KEY ("changelogEntryId") REFERENCES "ChangelogEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthConnection" ADD CONSTRAINT "OAuthConnection_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "OAuthProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthConnection" ADD CONSTRAINT "OAuthConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passkey" ADD CONSTRAINT "Passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorSession" ADD CONSTRAINT "TwoFactorSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CliAuthCode" ADD CONSTRAINT "CliAuthCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SAMLConnection" ADD CONSTRAINT "SAMLConnection_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "SAMLProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SAMLConnection" ADD CONSTRAINT "SAMLConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChangelogEntryToChangelogTag" ADD CONSTRAINT "_ChangelogEntryToChangelogTag_A_fkey" FOREIGN KEY ("A") REFERENCES "ChangelogEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChangelogEntryToChangelogTag" ADD CONSTRAINT "_ChangelogEntryToChangelogTag_B_fkey" FOREIGN KEY ("B") REFERENCES "ChangelogTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

