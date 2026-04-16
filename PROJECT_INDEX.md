# Project Index: Changerawr

Generated: 2026-04-15

## Overview

Changerawr is a self-hosted changelog management platform with AI assistance, custom domains, SSO/SAML, Slack/GitHub integrations, and embeddable widgets.

**License**: CNC OSL (Non-Commercial Open Source)

---

## 📁 Project Structure

```
changerawr/
├── app/                    # Next.js App Router (pages + API routes)
│   ├── (auth)/             # Auth page group (login, register, setup, 2FA)
│   ├── (email)/            # Email-related pages (unsubscribed)
│   ├── api/                # 145+ API route handlers
│   ├── dashboard/          # Authenticated dashboard
│   │   ├── admin/          # Admin panel (users, system config, SSO, audit)
│   │   ├── projects/       # Project management & changelog editor
│   │   └── settings/       # User settings
│   ├── changelog/          # Public changelog pages + RSS feeds
│   └── .well-known/        # ACME challenge routes
├── components/             # React UI components by feature
├── lib/                    # Business logic, utils, auth, services
├── hooks/                  # 13 custom React hooks
├── prisma/schema/          # Modular Prisma schema (6 files)
├── emails/                 # Email template components
├── context/                # React context providers (auth, setup)
├── widgets/                # Embeddable changelog widget source
├── scripts/                # Build & maintenance scripts
└── public/                 # Static assets
```

---

## 🚀 Entry Points

| Path | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout with providers |
| `app/page.tsx` | Root redirect |
| `app/(auth)/setup/page.tsx` | First-run setup wizard |
| `lib/api/middleware.ts` | API request middleware (auth, permissions) |
| `next.config.ts` | Next.js config (React Compiler, Turbopack) |
| `docker-entrypoint.sh` | Container startup |

---

## 🔐 Authentication System

- **Token**: JWT in `accessToken` cookie — verified via `verifyAccessToken` from `lib/auth/tokens`
- **Methods**: Password, OAuth, SAML/SSO, Passkey/WebAuthn
- **Roles**: `ADMIN`, `STAFF`, `VIEWER`
- **2FA Modes**: `NONE`, `PASSKEY_PLUS_PASSWORD`, `PASSWORD_PLUS_PASSKEY`
- **CLI Auth**: Token-based code flow at `/api/auth/cli/*`

Key auth files:
- `lib/auth/tokens.ts` — JWT generation/verification
- `lib/auth/oauth.ts` — OAuth 2.0 provider integration
- `lib/auth/saml.ts` — SAML implementation
- `lib/auth/webauthn.ts` — Passkey/WebAuthn
- `lib/api/permissions.ts` — Permission checking
- `lib/api/route-permissions.ts` — Route-level permission config

---

## 📦 Core Modules

### API Layer (`app/api/`)
Route groups:
- `auth/` — Login, register, OAuth, SAML, passkeys, CLI, password reset
- `admin/` — Config, users, AI settings, SSO providers, API keys, audit logs
- `projects/[projectId]/` — CRUD, changelog entries, integrations, analytics
- `changelog/` — Public access, subscriptions, RSS
- `custom-domains/` — Domain verify, SSL management, browser rules
- `acme/` — Let's Encrypt certificate issuance/renewal
- `integrations/slack/` — Slack OAuth callback
- `config/timezone` — Public effective timezone (no auth)
- `health` — Health check

### Services Layer (`lib/services/`)
Business logic separated from API handlers:
- `analytics/` — Analytics data processing
- `changelog/` — Entry CRUD, publishing, scheduling
- `email/` — SMTP sending, newsletter management
- `github/` — Commit sync, tag creation
- `slack/` — Slack bot notifications
- `jobs/` — Background job execution (ScheduledJob queue)
- `projects/` — Project operations
- `sponsor/` — License/sponsor management
- `telemetry/` — Telemetry tracking
- `search/` — Full-text PostgreSQL search
- `core/markdown/` — Markdown parsing & custom extensions

### Auth (`lib/auth/`)
See Authentication System above.

### Utils (`lib/utils/`)
- `format-date.ts` — Timezone-aware date formatting
- `cookies.ts` — Cookie helpers
- `encryption.ts` — Encryption utilities
- `auditLog.ts` — Audit log helpers
- `api.ts` — API utilities

### Custom Domains (`lib/custom-domains/`)
- `service.ts` — Domain management
- `ssl/` — ACME/Let's Encrypt logic
- `dns.ts` — DNS verification utilities

---

## 🗄️ Database (Prisma + PostgreSQL)

Schema split across `prisma/schema/`:
- `base.prisma` — Datasource & generator
- `users.prisma` — User, OAuth, SAML, Passkey, 2FA, Invite, PasswordReset
- `projects.prisma` — Project, Changelog, ChangelogEntry, ChangelogTag, Widget
- `system.prisma` — SystemConfig, ApiKey, AuditLog, ScheduledJob, Analytics, CustomDomain
- `integrations.prisma` — EmailConfig, SlackIntegration, GitHubIntegration, Subscribers
- `enums.prisma` — All enum definitions

Key models:
- `User` — Core user with role, timezone
- `SystemConfig` — Global app config (timezone, email, AI, Slack OAuth, customDateTemplates as JSONB)
- `Project` / `Changelog` / `ChangelogEntry` — Main content models
- `ScheduledJob` — Background job queue (publish, email, SSL renewal, telemetry)
- `CustomDomain` / `DomainCertificate` — Domain management with SSL

---

## 🧩 Components

```
components/
├── changelog/editor/       # Entry editor (AI, versioning, scheduling)
│   └── VersionSelector.tsx # Version/date template picker
├── markdown-editor/        # Custom markdown editor with AI
│   ├── MarkdownEditor.tsx
│   ├── MarkdownToolbar.tsx
│   ├── MarkdownPreview.tsx
│   └── ai/                # AI assistant panel
├── admin/                  # Admin UI (API keys, audit logs, requests)
├── analytics/              # Chart components
├── project/                # Project sidebar, navigation, settings
│   └── catch-up/          # Feature recap display
├── sso/                   # SSO configuration UI
├── setup/                 # First-run setup wizard
├── settings/              # User security settings
├── ui/                    # Shadcn/Radix UI primitives
├── CommandPalette.tsx      # Global command palette
└── Logo.tsx
```

---

## 🪝 Hooks (`hooks/`)

| Hook | Purpose |
|------|---------|
| `use-timezone.ts` | Resolves effective timezone (user → system → UTC) |
| `useAIAssistant.ts` | AI writing assistant |
| `useMarkdownState.ts` | Markdown editor state management |
| `useEditorHistory.ts` | Undo/redo for editor |
| `useSlashCommands.ts` | Slash command handling |
| `useCommandPalette.ts` | Command palette state |
| `useBookmarks.ts` | Bookmark management |
| `useChunkedData.ts` | Data chunking for large lists |
| `useTelemetry.ts` | Telemetry tracking |
| `useWhatsNew.ts` | What's new modal |

---

## ⚙️ Configuration

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js (React Compiler on, strictMode off, Turbopack) |
| `tailwind.config.ts` | Tailwind CSS |
| `components.json` | shadcn/ui component config |
| `tsconfig.json` | TypeScript (strict, `@/*` alias) |
| `prisma/schema/` | Database schema |
| `.env.example` | Required environment variables |
| `Dockerfile` + `docker-compose.yml` | Container deployment |
| `Caddyfile` / `nginx.conf` | Reverse proxy configs |

---

## 📚 Documentation

| File | Topic |
|------|-------|
| `README.md` | Features, quick start, deployment |
| `CHANGELOG.md` | Version history |
| `APIDOCGUIDE.md` | API documentation guide |
| `ideas.md` | Feature ideas/roadmap |
| `issues.md` | Known issues |
| `useful-information-for-development/` | Dev notes (Slack scopes, etc.) |

---

## 🔗 Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.1.6 | Framework |
| react | 19.2.4 | UI library |
| prisma | 6.7.0 | ORM |
| jose | — | JWT tokens |
| @node-saml/node-saml | — | SAML/SSO |
| @simplewebauthn/* | — | Passkeys |
| @tiptap/react | — | Rich text editing |
| @tanstack/react-query | — | Server state |
| @scalar/nextjs-api-reference | — | API docs UI |
| recharts | — | Analytics charts |
| framer-motion | — | Animations |
| zod | — | Schema validation |
| react-hook-form | — | Form handling |
| nodemailer | — | Email sending |
| @slack/bolt | — | Slack integration |

---

## 📝 Quick Start

1. `cp .env.example .env` and fill in required vars
2. `npm install`
3. `npx prisma migrate dev` — run DB migrations
4. `npx prisma generate` — generate Prisma client
5. `npm run dev` — starts on port 3001
6. Visit `/setup` on first run

**Build widget**: `npm run build:widget`
**API docs**: `npm run generate-swagger` → visit `/api-docs`

---

## 🏗️ Architectural Patterns

1. **Auth**: JWT in `accessToken` cookie; `verifyAccessToken` from `lib/auth/tokens`
2. **Permissions**: Role-based, configured in `lib/api/route-permissions.ts`
3. **Services**: Business logic in `lib/services/`, not in route handlers
4. **Timezone**: User.timezone → SystemConfig.timezone → UTC; use `useTimezone()` hook client-side
5. **Admin layout**: `/^\/dashboard\/admin\/system/` pattern catches sub-pages
6. **SystemConfig**: Single row, full object sent on PATCH — new fields need defaults
7. **Background jobs**: `ScheduledJob` model polled by cron endpoints
8. **Custom domains**: DNS verification + Let's Encrypt via ACME protocol
