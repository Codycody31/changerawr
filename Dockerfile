FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

# Build the app with standalone output
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install all dependencies to satisfy entrypoint requirements
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
# Install Prisma client with exact version match
RUN npm uninstall prisma @prisma/client --legacy-peer-deps
RUN npm install prisma@6.3.1 @prisma/client@6.3.1 --legacy-peer-deps
# Install tsx explicitly
RUN npm install -g tsx

# Install esbuild explicitly
RUN npm install esbuild --legacy-peer-deps

# Install JSDOC
RUN npm install -g jsdoc

# Add bash for the entry script
RUN apk add --no-cache bash

# Copy necessary files and directories directly from the source
COPY widgets ./widgets
COPY scripts ./scripts
COPY prisma ./prisma
COPY public ./public
COPY app/api ./app/api
COPY next.config.ts ./

# Copy the standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy entry point script and make it executable
COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Use entrypoint for running the build scripts before starting the server
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]