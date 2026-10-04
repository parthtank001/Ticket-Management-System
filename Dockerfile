# Production Dockerfile for AI Ticket Management System on Render (Root context)
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

# Copy workspace packages
COPY Helpdesk/package*.json ./Helpdesk/
COPY Helpdesk/core/package*.json ./Helpdesk/core/
COPY Helpdesk/client/package*.json ./Helpdesk/client/

# Install dependencies
WORKDIR /app/Helpdesk
RUN npm install
RUN npm --prefix client install --legacy-peer-deps

# Copy source code
WORKDIR /app
COPY Helpdesk ./Helpdesk

# Build
WORKDIR /app/Helpdesk
RUN npx prisma generate
RUN npm --prefix client run build

# ----------------------------------------------------
# Production Runner Image
# ----------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app/Helpdesk

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=builder /app/Helpdesk /app/Helpdesk

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx server/index.ts"]
