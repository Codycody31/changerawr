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

# Run build
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install all depdendencies to satisfy entrypoint requirements
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
# Install Prisma client
RUN npm install prisma --legacy-peer-deps

# Install JSDOC
RUN npm install -g jsdoc

# Add bash for the entry script
RUN apk add --no-cache bash

# Add dev dependencies for widget build and swagger generation
COPY --from=builder /app/node_modules ./node_modules

# Copy built app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/widget ./widget
COPY --from=builder /app/next.config.ts ./

# Copy entry point script and make it executable
COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Use entrypoint for running the build scripts before starting the server
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["npm", "start"]