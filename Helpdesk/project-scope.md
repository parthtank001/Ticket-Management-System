# AI-Powered Ticket Management System

## Problem
We receive hundreds of support emails daily. Support agents manually read, classify, and respond to each ticket—a slow process that leads to delayed turnaround times and impersonal, canned responses.

## Solution
An AI-powered helpdesk management system that automatically ingests support emails, classifies tickets, searches a managed Knowledge Base, and generates personalized draft responses for human agent approval. This delivers faster, high-quality responses to students while freeing up agents to handle complex issues.

---

## Ticket Categories (Single Selection)
Each ticket must belong to **exactly one** of the following categories:
1. **General Question**: Inquiries about courses, schedules, general policies, and procedures.
2. **Technical Question**: Issues with portal logins, platform bugs, access errors, or technical troubleshooting.
3. **Refund Request**: Billing inquiries, refund claims, and payment adjustments.

---

## User Roles & Administration

### System Deployment & Initial Admin
- The system is deployed with a pre-seeded primary **Admin** user.
- **Admin Capabilities**:
  - Create, manage, and deactivate **Support Agent** accounts.
  - Upload, manage, and re-index Knowledge Base documents for RAG search.
  - View overall ticket metrics, agent productivity, and AI performance.

### Support Agent Role
- **Agent Capabilities**:
  - Filter and view assigned, unassigned, and department-specific ticket queues.
  - Review, edit, and approve AI-generated draft responses before sending email replies to students.
  - Manually override ticket category, priority, or assignment.
  - Add private **Internal Agent Notes** on ticket threads (invisible to students).
  - Change ticket status (`New`, `Assigned`, `In Progress`, `Pending Student`, `Resolved`, `Closed`).

---

## Core System Features & Architecture

### 1. Inbound & Outbound Email Processing
- **Email Ingestion**: Ingest incoming support emails from students to create new tickets automatically.
- **Thread Management**: Match student email replies to existing tickets using `Message-ID` / `In-Reply-To` headers and `[Ticket #XXXX]` subject tags.
- **Anti-Loop Protection**: Ignore auto-responders (`Auto-Submitted` headers) to prevent infinite reply loops.

### 2. Human-in-the-Loop AI Engine
- **AI Classification & Routing**: Automatically analyze incoming email content to tag the ticket category (*General Question*, *Technical Question*, or *Refund Request*), set priority (*Low*, *Medium*, *High*, *Urgent*), and route to appropriate agent queues.
- **RAG Knowledge Base Search**: Retrieve relevant FAQ chunks and documentation matching the student's query.
- **AI Draft Replies & Summaries**: Generate a human-friendly draft response and bulleted issue summary for the agent to review.
- **Agent Approval**: No email is sent to the student until an agent explicitly reviews, edits (if needed), and approves the draft.

### 3. Knowledge Base Management (RAG)
- Admin UI to upload, update, and manage FAQ articles and reference documentation.
- Vector database embedding index (`pgvector`) for fast semantic retrieval.

### 4. Agent Dashboard & Analytics
- Responsive web interface featuring ticket lists with search, category filtering, priority sorting, detailed thread view, and draft editor.
- Real-time status updates and ticket assignment management.

---

## Confirmed Tech Stack & Architecture

| Layer | Technology | Key Features & Purpose |
| :--- | :--- | :--- |
| **Framework & UI** | **Next.js 14+ (App Router)** + **Tailwind CSS** + **Lucide Icons** | Full-stack TypeScript framework with React Server Components, Server Actions, and responsive UI |
| **Database & ORM** | **PostgreSQL** + **Prisma ORM** + **`pgvector`** | Relational DB for users, tickets, and messages + vector embeddings index for RAG search |
| **Authentication** | **NextAuth.js (Auth.js) + Database Sessions** | Database-backed session strategy in PostgreSQL (`Session` table). Admin & Support Agent roles, seeded admin on deployment. See [tech-stack.md](file:///e:/claude_ai/Ticket%20Management%20System/Helpdesk/tech-stack.md) |
| **AI & Embeddings** | **Google Gemini API** (`gemini-1.5-flash` + `text-embedding-004`) | AI ticket classification, RAG context search, ticket bullet summaries, & response drafting |
| **Email Gateway** | **SendGrid / Mailgun** | Inbound email webhook parsing (`In-Reply-To`/`Message-ID` extraction) & outbound transactional email API |
| **Deployment** | **Docker + Cloud Provider** | Multi-stage Docker container (`Dockerfile` & `docker-compose.yml`) deployable to AWS, Render, Railway, DigitalOcean, or GCP |
| **File Storage** | **Local / Cloud Storage (UploadThing / S3)** | Storing Knowledge Base document uploads (PDFs, TXT, Markdown) |

---

## Deployment & Infrastructure Strategy

### 1. Docker Containerization
- **Multi-Stage `Dockerfile`**: Optimized production build for Next.js 14, caching dependencies and outputting a lightweight standalone Node.js server.
- **`docker-compose.yml`**: Includes local services for the Next.js web application and PostgreSQL database with the `pgvector` extension pre-enabled (`ankane/pgvector:v0.5.1` or `pgvector/pgvector`).

### 2. Cloud Provider Deployment
- **Container Registry**: Push production Docker image to Docker Hub, GitHub Container Registry (GHCR), or AWS ECR.
- **Hosting Target Options**:
  - **Option A (Container Service)**: AWS App Runner / ECS, GCP Cloud Run, or Render / Railway for zero-downtime container deployments.
  - **Option B (Managed Database)**: AWS RDS PostgreSQL, Supabase PostgreSQL, or Neon with `pgvector` support enabled.
  - **Option C (VPS Deploy)**: DigitalOcean / Hetzner VPS running Docker Compose with Nginx reverse proxy & SSL via Certbot.

