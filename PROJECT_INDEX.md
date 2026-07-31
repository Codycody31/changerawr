# Project Index: Changerawr

Generated: 2026-05-29 | Version: 1.0.7 (Stable) | License: CNC OSL

## 📁 Project Structure

```
changerawr/
├── app/                     # Next.js App Router pages & API routes
│   ├── (auth)/              # Auth flows: login, register, setup, 2FA, OAuth callback
│   ├── (email)/             # Unsubscribe email landing page
│   ├── api/                 # REST API (route.ts files)
│   ├── changelog/           # Public changelog viewer + RSS
│   └── dashboard/           # Authenticated UI (projects, admin)
├── components/              # React components
│   ├── ui/                  # shadcn/ui primitives (Radix-based)
│   ├── changelog/           # Changelog display & editor pieces
│   ├── markdown-editor/     # Full markdown editor w/ extensions
│   ├── admin/               # Admin-specific components
│   ├── analytics/           # Chart + table components
│   └── project/             # Project-scoped components
├── lib/                     # Server-side logic & shared utilities
│   ├── auth/                # JWT, OAuth, SAML, passkeys, CLI auth
│   ├── api/                 # Middleware, permissions, route guards
│   ├── services/            # Business logic services
│   ├── custom-domains/      # Domain verification + SSL
│   ├── utils/               # Date, encryption, analytics helpers
│   ├── types/               # Shared TypeScript types
│   └── constants/           # Timezones, etc.
├── hooks/                   # React hooks (client-side)
├── prisma/
│   ├── schema/              # Split Prisma schema files
│   └── migrations/          # DB migration history
├── extensions/              # 3rd-party CUM extensions (changerawr/)
└── scripts/                 # Dev tooling, widget build, Swagger gen
```

## 🚀 Entry Points

| Target | Path | Command |
|--------|------|---------|
| Next.js dev | `app/` | `npm run dev` (port 3001) |
| Extension builder | `scripts/extension-builder/server.js` | `npm run dev:builder` |
| Maintenance server | `scripts/maintenance/server.js` | `npm run maintenance` |
| Widget build | `scripts/widget/build.ts` | `npm run build:widget` |
| Swagger gen | `scripts/api/generateSwagger.ts` | `npm run generate-swagger` |
| Prisma Studio | — | `npm run prisma:studio` |

## 📦 Core Modules

### Auth (`lib/auth/`)
- `tokens.ts` — `verifyAccessToken`, JWT sign/verify; cookie name = `accessToken`
- `authorization.ts` — RBAC helpers; roles: ADMIN, STAFF, VIEWER
- `oauth.ts` / `saml.ts` — OAuth 2.0 + SAML SSO providers
- `webauthn.ts` — Passkey/WebAuthn registration & authentication
- `cli-auth.ts` — CLI device-code flow
- `api-key.ts` — API key validation
- `claim-validator.ts` / `email-domain-validator.ts` — SSO claim checks

### Database (`lib/db.ts`)
- Prisma singleton exported as `db`; resolves `DATABASE_URL`
- `prisma generate` must run after schema changes before runtime works

### Services (`lib/services/`)
- `core/markdown/` — CUM engine wrapper; built-in extensions: table, subtext, syntax-highlight, image, link
- `core/markdown/extensionLoader.ts` — Dynamic extension discovery from `extensions/`
- `github/changelog-generator.ts` + `github/client.ts` — GitHub integration
- `email/notification.ts` + `email/schedule-notification.ts` — Email dispatch
- `slack/` — Slack webhook posting
- `analytics/geolocation.ts` — IP geolocation for analytics
- `jobs/job-runner.service.ts` — Background job runner
- `jobs/scheduled-job.service.ts` — Cron-style scheduled jobs
- `jobs/executors/` — changelog-publish, ssl-renewal, telemetry-send
- `projects/importing/` — Canny + Markdown import pipeline
- `projects/catch-up/` — AI-powered catch-up summaries
- `search/service.ts` — Full-text search (Postgres)
- `changelog/rss.ts` — RSS feed generation
- `custom-domains/ssl/` — ACME/Let's Encrypt SSL management
- `bookmarks/bookmark.service.ts` — Bookmark management
- `telemetry/service.ts` — Usage telemetry
- `sponsor/service.ts` — Sponsor data (separate MySQL DB — no migrations here)
- `easypanel/index.ts` — EasyPanel deployment integration

### API Middleware (`lib/api/`)
- `middleware.ts` — Auth guard wrapper for route handlers
- `permissions.ts` — Permission definitions
- `route-permissions.ts` — Per-route permission config

### Utilities (`lib/utils/`)
- `format-date.ts` — Date formatting with timezone support
- `encryption.ts` — AES encryption (used for SSL private keys, etc.)
- `auditLog.ts` — Audit log writer
- `changelog.ts` — Changelog-specific helpers
- `rate-limit.ts` — Request rate limiting
- `cookies.ts` — Cookie helpers
- `ai/prompts.ts` + `ai/types.ts` — AI assistant prompt templates
- `analytics.ts` — Analytics event helpers

### Hooks (`hooks/`)
- `use-timezone.ts` — `useTimezone()` — resolves effective timezone (user → system → UTC)
- `useAIAssistant.ts` — AI panel state management
- `useCommandPalette.ts` — Global command palette
- `useMarkdownState.ts` — Editor state
- `useEditorHistory.ts` — Undo/redo history
- `useBookmarks.ts` — Bookmark operations
- `useTelemetry.ts` — Telemetry opt-in/out
- `use-spellcheck.ts` — LanguageTool integration

### App Info (`lib/app-info.ts`)
- Single source of truth for version, license, repo URL, CUM engine version

## 🗄️ Data Models (Prisma)

**Schema split across `prisma/schema/`:**

| File | Key Models |
|------|-----------|
| `base.prisma` | Datasource (PostgreSQL) + generator |
| `users.prisma` | User, Settings, RefreshToken, OAuthProvider, OAuthConnection, SAMLProvider, SAMLConnection, Passkey, PasswordReset, TwoFactorSession, InvitationLink, CliAuthCode |
| `projects.prisma` | Project, Changelog, ChangelogEntry, ChangelogTag, ChangelogRequest, Widget, CustomDomain, DomainCertificate, DomainBrowserRule, DomainThrottleConfig, AcmeAccount |
| `integrations.prisma` | GitHubIntegration, EmailConfig, EmailLog, SlackIntegration, ProjectSubscription, SyncedCommit, ProjectSyncMetadata |
| `system.prisma` | SystemConfig (timezone, email, Slack OAuth, AI, telemetry, LanguageTool), AuditLog, ScheduledJob |
| `enums.prisma` | Role (ADMIN/STAFF/VIEWER), TwoFactorMode, SslMode, CertificateStatus, etc. |
| `extensions.prisma` | Extension, ExtensionSetting |

## 🌐 API Surface

**Auth (`/api/auth/`)**
- `POST /login`, `POST /logout`, `GET /me`, `GET /validate`
- `POST /change-password`, `POST /reset-password/request`
- `GET /invitation/[token]`
- `GET/POST /oauth/authorize/[providerName]`, `GET /oauth/providers`
- `GET/POST /passkeys`, `POST /passkeys/register/options+verify`, `POST /passkeys/authenticate/options`
- `GET /security-settings`, `POST /cli/generate`, `GET /cli/token`, `POST /cli/refresh`
- `GET /preview` — preview-mode token

**Projects (`/api/projects/`)**
- `GET/POST /` — list/create projects
- `GET/PATCH/DELETE /[projectId]` — project CRUD
- `GET/POST /[projectId]/changelog/tags`
- `GET/PATCH/DELETE /[projectId]/changelog/[entryId]/schedule`
- `POST /[projectId]/integrations/github`, `/github/test`, `/github/tags`, `/github/generate`
- `POST /[projectId]/integrations/email/test`, `/email/send`
- `GET/POST /[projectId]/api-keys`, `DELETE /[projectId]/api-keys/[keyId]`
- `GET/POST /[projectId]/cli/link`, `/cli/sync`, `/cli/sync/status`, `/cli/unlink`
- `GET/POST /[projectId]/catch-up`, `POST /[projectId]/catch-up/ai-summary`
- `POST /import/canny/fetch+validate`, `/import/parse`, `/import/process`

**Public Changelog (`/api/changelog/`)**
- `GET /[projectId]/entries`, `GET /[projectId]/entries/all`
- `POST /subscribe`, `GET /unsubscribe/[token]`
- `GET /requests`, `GET/PATCH /requests/[requestId]`
- `POST /verify-domain`
- `GET /entries/[entryId]`
- `GET /[projectId]/rss.xml` (via `app/changelog/`)

**Admin (`/api/admin/`)**
- `GET/POST /users`, `PATCH /users/[userId]`, `PATCH /users/[userId]/role`
- `GET/POST /invitations`, `DELETE /invitations/[id]`
- `GET/PATCH /config` — SystemConfig (requires ADMIN role)
- `PATCH /config/system-email`
- `GET/POST /api-keys`, `DELETE /api-keys/[keyId]`
- `GET /audit-logs`, `GET /audit-logs/actions`
- `GET /analytics`, `GET /dashboard`
- `GET/PATCH /ai-settings`, `POST /ai-settings/test-key`
- `GET/POST /oauth/providers`, `GET/PATCH/DELETE /oauth/providers/[id]`
- `GET/POST /saml/providers`, `GET/PATCH/DELETE /saml/providers/[id]`

**System (`/api/system/`)**
- `GET /version`, `GET /update-status`, `POST /perform-update`
- `GET /easypanel/status`

**Widgets (`/api/integrations/widget/`)**
- `GET /[projectId]` — single widget embed data
- `GET /[projectId]/list`, `GET/PATCH/DELETE /[projectId]/[widgetId]`

**ACME/SSL (`/api/acme/`)**
- `POST /issue`, `POST /renew/[certId]`, `POST /revoke/[certId]`
- `GET /status/[certId]`, `POST /cancel/[certId]`, `POST /verify-dns`

**Misc**
- `GET /api/health` — health check
- `GET /api/search` — full-text search
- `POST /api/analytics/track` — public analytics tracking
- `GET /api/telemetry/config`, `GET /api/telemetry/debug`
- `GET/PATCH /api/ai/settings`, `POST /api/ai/decrypt`
- `GET /api/dashboard/stats`
- `GET/POST /api/setup`, `GET /api/setup/status`
- `GET/POST/PATCH/DELETE /api/subscribers`
- `GET/POST /api/changelog/requests`, `POST /api/requests`
- `GET /api/config/timezone` — public, no auth, resolves effective timezone

## 🧩 Extension System

**Built-in (always loaded, `lib/services/core/markdown/extensions/`):**
- `table` — GFM markdown tables
- `subtext` — Discord-style `-#` subtext syntax
- `syntax-highlight` — Code block syntax highlighting
- `image` — Enhanced image (captions, sizing, alignment)
- `link` — BetterLinks (markdown inside link text)

**Loadable (from `extensions/changerawr/`):**
- `spoiler`, `highlight`, `unsplash`, `geode`
- Each has: `index.ts`, `extension.json`, `toolbar.tsx`, `README.md`, `CHANGELOG.md`

**Extension loader:** `lib/services/core/markdown/extensionLoader.ts`
**Safelist generation:** `npm run extensions:safelist`

## 🔧 Configuration

| File | Purpose |
|------|---------|
| `.env` | `DATABASE_URL`, JWT secrets, SMTP, OAuth credentials, GitHub tokens |
| `prisma/schema/` | Database schema (split; run `prisma:generate` after changes) |
| `tailwind.config.ts` | Tailwind + safelist for dynamic extension classes |
| `next.config.*` | Next.js config |
| `tsconfig.json` | TypeScript paths (`@/` → root) |
| `docker-entrypoint.sh` | Production Docker startup |

## 🔑 Auth Patterns

- Cookie: `accessToken` (JWT) — **not** `auth_token`
- Verify with `verifyAccessToken` from `lib/auth/tokens`
- Roles: ADMIN > STAFF > VIEWER
- 2FA: TOTP or passkey (stored in `TwoFactorSession`)
- CLI auth: device-code flow (`/api/auth/cli/generate → token → refresh`)
- API keys: project-scoped or admin-level
- SSO: OAuth 2.0 (generic) + SAML + EasyPanel + PocketID

## 🌍 Timezone Hierarchy

User `Settings.timezone` → `SystemConfig.timezone` → `'UTC'`
- Client: `useTimezone()` hook from `hooks/use-timezone.ts`
- Server/email: query DB directly
- Public: `GET /api/config/timezone`

## 🗂️ Dashboard Pages

```
/dashboard                    → overview + stats
/dashboard/projects           → project list
/dashboard/projects/[id]      → project detail (changelog, analytics, integrations, settings)
/dashboard/projects/[id]/changelog/new → entry editor
/dashboard/requests           → staff: pending changelog requests
/dashboard/admin/             → admin overview
/dashboard/admin/system       → system config (email, slack, templates, etc.)
/dashboard/admin/users        → user management
/dashboard/admin/audit-logs   → audit log viewer
/dashboard/admin/analytics    → site-wide analytics
/dashboard/admin/ai-settings  → AI assistant config
/dashboard/admin/requests     → admin: approve/reject requests
```

## 📝 Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env  # fill DATABASE_URL + secrets

# 3. Database
npm run prisma:migrate    # run migrations
npm run prisma:generate   # generate Prisma client

# 4. Extensions
npm run extensions:generate  # build extension import maps

# 5. Dev
npm run dev              # Next.js (3001) + extension builder
```

## 🔗 Key Dependencies

| Package | Purpose |
|---------|---------|
| `next ^16.1.6` | App Router framework |
| `@prisma/client ^6.7.0` | Database ORM |
| `@changerawr/markdown ^1.3.0` | CUM markdown engine |
| `@tanstack/react-query ^5.66.0` | Server state management |
| `jose ^5.9.6` | JWT creation/verification |
| `bcryptjs ^3.0.0` | Password hashing |
| `@simplewebauthn/*` | Passkey/WebAuthn |
| `acme-client ^5.4.0` | Let's Encrypt SSL issuance |
| `nodemailer ^8.0.5` | Email sending |
| `framer-motion ^12.5.0` | Animations |
| `recharts ^2.15.4` | Analytics charts |
| `date-fns ^4.1.0` | Date manipulation |
| `adm-zip ^0.5.17` | Extension package handling |
| `express ^5.2.1` | Extension builder + maintenance servers |
