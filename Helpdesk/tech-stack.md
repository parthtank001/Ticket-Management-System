# Technical Stack Specification

## Overview
This document specifies the technical stack, architecture, database strategy, authentication mechanisms, AI pipelines, and deployment infrastructure for the AI-Powered Ticket Management System.

---

## Architecture Summary

| Layer | Technology | Specification / Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 14+ (App Router)** | React 18, Server Components, Server Actions, TypeScript |
| **Styling & UI** | **Tailwind CSS + Lucide Icons** | Component-driven responsive dashboard design |
| **Database** | **PostgreSQL 16+** | Relational data + `pgvector` vector extension |
| **ORM** | **Prisma ORM** | Type-safe queries, migration management, and vector extensions |
| **Authentication** | **NextAuth.js (Auth.js v5) with Database Sessions** | Database-backed session strategy stored in PostgreSQL (`Session` & `User` tables), supporting session revocation and role-based permissions (`ADMIN`, `AGENT`). Initial deployment includes a seeded primary Admin. |
| **AI / LLM Engine** | **Google Gemini API** | `gemini-1.5-flash` for classification, ticket summaries & draft responses; `text-embedding-004` for RAG vector search |
| **Email Gateway** | **SendGrid / Mailgun** | Inbound parse webhooks (`In-Reply-To`/`Message-ID` extraction) & outbound transactional email API |
| **Containerization** | **Docker & Docker Compose** | Multi-stage `Dockerfile` + `docker-compose.yml` with `pgvector/pgvector` image |
| **Hosting & Cloud** | **Cloud Provider (AWS / Render / Railway / GCP / VPS)** | Flexible cloud deployment options |

---

## 1. Authentication & Session Management Strategy

### Database Session Model (Database Strategy)
Unlike stateless JWTs, sessions are stored and managed directly in the PostgreSQL database using Prisma and NextAuth (or Lucia).

- **Why Database Sessions?**:
  - **Instant Revocation**: Admins can instantly invalidate an agent's session or force logout across devices.
  - **Session Auditing**: Active agent sessions can be listed, audited, and monitored in the Admin dashboard.
  - **Security**: Reduces risk of stolen persistent tokens; session cookies hold a secure, HTTP-only session token linked to a database row.

### Database Session Schema (Prisma)
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  passwordHash  String
  role          Role      @default(AGENT) // ADMIN | AGENT
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sessions      Session[]
  tickets       Ticket[]  @relation("AssignedAgent")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

enum Role {
  ADMIN
  AGENT
}
```

### Initial Admin Seeding
- On initial deployment, a database seed script (`prisma/seed.ts`) automatically creates the default **Admin** user if no admin account exists.
- The Admin can log into the dashboard and navigate to the User Management page to invite/create additional **Support Agent** accounts.

---

## 2. AI & RAG Knowledge Base Pipeline

### Single Category Classification
- Every ticket is classified into **exactly one** of three categories by `gemini-1.5-flash`:
  1. `GENERAL_QUESTION`
  2. `TECHNICAL_QUESTION`
  3. `REFUND_REQUEST`

### RAG (Retrieval-Augmented Generation) Strategy
1. **Embedding Model**: `text-embedding-004` converts Knowledge Base articles and incoming emails into vector embeddings (768 dimensions).
2. **Vector Storage**: Stored in PostgreSQL using the `pgvector` extension via Prisma raw queries (`cosine_distance` / `<=>`).
3. **Context Injection & Draft Generation**: Top-$K$ relevant KB chunks are retrieved and passed into `gemini-1.5-flash` to craft a human-friendly draft response.

---

## 3. Email Gateway Integration (SendGrid / Mailgun)

### Inbound Email Processing
- Student sends email to `support@yourdomain.com`.
- **SendGrid / Mailgun** posts an HTTP POST webhook to `/api/webhooks/email`.
- The webhook parser extracts `From`, `Subject`, `Body`, `Message-ID`, and `In-Reply-To`.
- Header regex checks for existing `[Ticket #XXXX]` or `In-Reply-To` to append the email to an existing ticket thread; otherwise, a new ticket is created.

### Outbound Response Delivery
- Agent approves/edits draft reply and clicks **Send**.
- System uses SendGrid/Mailgun REST API to send the email, setting `In-Reply-To` and `References` headers to maintain native student email threading.

---

## 4. Containerization & Deployment Setup

### `Dockerfile` (Multi-Stage Next.js Build)
- Base stage with Node 20.
- Dependencies & build stage.
- Production runner stage with standalone Next.js server output.

### `docker-compose.yml`
- Service 1: `web` (Next.js application).
- Service 2: `db` (`pgvector/pgvector:pg16` database with vector extensions pre-loaded).
