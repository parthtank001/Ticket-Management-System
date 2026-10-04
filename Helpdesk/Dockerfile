# Production Dockerfile for AI Ticket Management System (Helpdesk context)
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

# Copy workspace packages
COPY package*.json ./
COPY core/package*.json ./core/
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN npm --prefix client install --legacy-peer-deps

# Copy source code
COPY . .

# Build
RUN npx prisma generate
RUN npm --prefix client run build

# ----------------------------------------------------
# Production Runner Image
# ----------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=builder /app /app

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && npx ts-node server/index.ts"]
