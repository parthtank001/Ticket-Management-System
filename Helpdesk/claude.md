# Memory File & Project Guidelines (`claude.md`)

This memory file contains project architectural specifications, technical stack details, project structure, development workflow instructions, key conventions, and documentation retrieval rules.

---

## 1. Context7 Documentation Retrieval Rules

Use Context7 MCP to fetch current, up-to-date documentation whenever asking or inquiring about any library, framework, SDK, API, CLI tool, or cloud service—even well-known ones like React, Next.js, Prisma, Express, Tailwind, Gemini API, or PostgreSQL. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage.

> **Note**: Do not use for refactoring, writing custom scripts from scratch, debugging business logic, code review, or general programming concepts.

### Steps
1. **`resolve-library-id`**: Search with the library name and specific concept query (unless an exact library ID in `/org/project` format is provided).
2. **Select Match**: Choose the best match based on exact name match, description relevance, snippet count, and benchmark score.
3. **`query-docs`**: Execute with the selected library ID and concept-scoped query. Scope queries to single concepts (run separate queries if spanning multiple topics like routing + auth).
4. **Answer**: Respond using the retrieved documentation context.

---

## 2. Project Overview

The **AI-Powered Ticket Management System (Helpdesk)** automates and streamlines inbound customer support email handling for student inquiries:

- **Problem**: Support teams receive hundreds of daily support emails, requiring manual classification, searching FAQ sources, and writing repetitive responses.
- **Solution**: An AI-powered helpdesk system that ingests support emails, auto-classifies tickets, searches a `pgvector` Knowledge Base via RAG (Retrieval-Augmented Generation), generates bullet summaries and response drafts, and routes tickets to human agents for approval before sending replies.
- **Human-in-the-Loop Model**: No email reply is delivered to a student without explicit human agent review, editing, and approval.

### Core Ticket Categories (Single Selection)
Every ticket must belong to **exactly one** category:
1. `GENERAL_QUESTION`: Courses, schedules, general policies, and procedures.
2. `TECHNICAL_QUESTION`: Portal logins, platform bugs, access errors, troubleshooting.
3. `REFUND_REQUEST`: Billing inquiries, refund claims, payment adjustments.

---

## 3. Technical Stack

| Layer | Technology | Key Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18 + Vite** | Responsive client dashboard, TypeScript, component architecture |
| **Styling & Icons** | **Tailwind CSS + Lucide React** | Modern dark-mode UI with sleek glassmorphism aesthetic |
| **Backend API** | **Express.js + Node.js (TypeScript)** | RESTful API server, webhooks, auth middleware, AI services |
| **Database & ORM** | **PostgreSQL + Prisma ORM + `pgvector`** | Relational data (`User`, `Session`, `Ticket`, `Message`) + vector embeddings search |
| **Authentication** | **Database-backed Sessions (Prisma)** | Server-managed session store enabling instant admin session revocation |
| **AI / LLM Engine** | **Google Gemini API** (`@google/genai`) | `gemini-1.5-flash` for classification, summaries & draft generation; `text-embedding-004` for RAG |
| **Email Gateway** | **SendGrid / Mailgun** | Inbound parse webhooks (`Message-ID`, `In-Reply-To`) & outbound REST API |
| **Runtime & Dev Tools** | **Bun / ts-node / Docker** | High-performance execution & containerized local postgres development |

---

## 4. Project Structure & Development Workflow

```
e:\claude_ai\Ticket Management System\
├── claude.md                   # Global workspace memory file & guidelines
└── Helpdesk/
    ├── client/                 # React 18 + Vite frontend
    │   ├── src/
    │   │   ├── App.tsx         # Main application UI container
    │   │   ├── main.tsx        # React entry point
    │   │   └── index.css       # Tailwind CSS & global styles
    │   ├── package.json        # Client dependencies & Vite scripts
    │   └── vite.config.ts      # Vite dev server configuration
    ├── server/                 # Express backend API
    │   └── index.ts            # Express server entry point & /api/health endpoint
    ├── package.json            # Root dependencies & execution scripts
    ├── tsconfig.json           # Shared TypeScript configuration
    ├── project-scope.md        # Comprehensive functional scope specification
    └── tech-stack.md           # Technical architecture specification
```

### Running the Application
From `e:\claude_ai\Ticket Management System\Helpdesk`:
- **Backend API**: `npm run dev:server` (Express server running at `http://localhost:5000`)
- **Frontend Client**: `npm run dev:client` (Vite dev server running at `http://localhost:5173`)
- **Root Dev Script**: `npm run dev`

---

## 5. Key Conventions & Architecture Rules

### Email Ingestion & Threading
- Extract `From`, `Subject`, `Body`, `Message-ID`, and `In-Reply-To` headers from inbound webhooks.
- Match existing ticket threads using `[Ticket #XXXX]` subject tags or `In-Reply-To` / `References` headers.
- **Anti-Loop Protection**: Always inspect `Auto-Submitted` headers (`auto-generated`, `auto-replied`) and ignore automated emails to prevent infinite loops.

### Authentication & Roles
- **Roles**: `ADMIN` and `AGENT`.
- Primary Admin account is seeded on deployment via `prisma/seed.ts`.
- Admins can create/deactivate agent accounts and revoke sessions from the database.

### UI & Aesthetic Standards
- Dark mode theme (`bg-slate-950`), custom radial gradients, glassmorphism cards, clear state badges, and responsive layouts.
- Always verify client-server communication using health monitoring (`/api/health`).
