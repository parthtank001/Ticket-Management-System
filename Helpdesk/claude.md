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

## 4. Project Structure & Directory Layout

```
e:\claude_ai\Ticket Management System\
├── .gitignore                  # Git ignore rules for node_modules, environments & test reports
├── claude.md                   # Global workspace memory file & guidelines
└── Helpdesk/
    ├── client/                 # React 18 + Vite frontend
    │   ├── src/
    │   │   ├── components/     # Application components & views
    │   │   │   ├── ui/         # shadcn/ui primitives (badge, button, card, input, label, alert)
    │   │   │   ├── HomePage.tsx  # Main agent ticket workspace dashboard
    │   │   │   ├── LoginPage.tsx # Modernized login screen with role credentials hint
    │   │   │   ├── Navbar.tsx    # App navigation header with session user details & sign-out
    │   │   │   └── UsersPage.tsx # Admin user management directory
    │   │   ├── lib/
    │   │   │   ├── auth-client.ts # Client authentication helper (Better Auth client wrapper)
    │   │   │   └── utils.ts    # Class merging utilities (clsx + tailwind-merge)
    │   │   ├── App.tsx         # Main application root & session router
    │   │   ├── main.tsx        # React DOM entry point
    │   │   └── index.css       # Tailwind directives & global font styles
    │   ├── components.json     # shadcn/ui configuration file
    │   ├── package.json        # Client dependencies & Vite scripts
    │   ├── tailwind.config.js  # Tailwind CSS configuration with Slate theme & UI colors
    │   ├── tsconfig.json       # Client TypeScript configuration with @/* path alias
    │   └── vite.config.ts      # Vite dev server setup & path alias resolver
    ├── server/                 # Express backend API
    │   ├── middleware/
    │   │   ├── auth.ts         # Session verification (requireAuth) & RBAC (requireRole)
    │   │   └── rate-limiter.ts # Production-only rate limiting middleware (express-rate-limit)
    │   ├── auth.ts             # Better Auth server configuration with Prisma adapter
    │   ├── db.ts               # Prisma client instance & PostgreSQL health check
    │   ├── index.ts            # Express server entry point & API route handlers
    │   └── types.ts            # Server-side TypeScript type definitions
    ├── prisma/
    │   ├── schema.prisma       # Database schema models (User, Session, Account, Verification, Ticket, etc.)
    │   └── seed.ts             # Database seeder for default Admin and Agent accounts
    ├── scripts/
    │   ├── create-user.ts      # CLI utility to provision new system users
    │   ├── setup-test-db.ts    # Automated test database synchronization & seeding script
    │   └── verify-rate-limiting.ts # Verification suite for production rate limiting
    ├── e2e/
    │   ├── api.spec.ts         # REST API & protected route authorization tests
    │   ├── auth.spec.ts        # End-to-end authentication & session lifecycle tests
    │   ├── rbac-navigation.spec.ts # Role-based access control and UI navigation tests
    │   └── setup/
    │       └── global-setup.ts # Playwright global database provisioning setup
    ├── package.json            # Root dependencies & execution scripts
    ├── playwright.config.ts    # Playwright E2E configuration with isolated test server
    ├── tsconfig.json           # Shared TypeScript configuration
    ├── project-scope.md        # Comprehensive functional scope specification
    └── tech-stack.md           # Technical architecture specification
```

### Running the Application
From `e:\claude_ai\Ticket Management System\Helpdesk`:
- **Backend API**: `npm run dev:server` (Express server running at `http://localhost:5000`)
- **Frontend Client**: `npm run dev:client` (Vite dev server running at `http://localhost:5173`)
- **Root Dev Script**: `npm run dev` (Runs client & server concurrently)
- **Database Seeding**: `npx prisma db seed` (Seeds default Admin `admin@example.com` and Agent `agent@example.com`)
- **Playwright E2E Tests**: `npm run test:e2e` (Runs automated browser test suite)

---

## 5. Key Conventions & Architecture Rules

### 5.1 Email Ingestion & Threading
- Extract `From`, `Subject`, `Body`, `Message-ID`, and `In-Reply-To` headers from inbound webhooks.
- Match existing ticket threads using `[Ticket #XXXX]` subject tags or `In-Reply-To` / `References` headers.
- **Anti-Loop Protection**: Always inspect `Auto-Submitted` headers (`auto-generated`, `auto-replied`) and ignore automated emails to prevent infinite loops.

### 5.2 Authentication & Roles
- **Roles**: `ADMIN` and `AGENT`.
- **Database Sessions**: Managed by Better Auth via PostgreSQL `session` table; supports instant session revocation.
- Primary Admin (`admin@example.com` / `password123`) and Agent (`agent@example.com` / `password123`) seeded on deployment.
- Admins have exclusive access to `/api/users` and the Users directory in the UI.

### 5.3 Rate Limiting & Production Security (`server/middleware/rate-limiter.ts`)
- **Production-Only Enforcement**: Rate limiters strictly enforce request ceilings when `NODE_ENV === 'production'`. In `development` and `test` environments, all rate limit checks are completely bypassed (`skip` returning `true`).
- **Reverse Proxy Trust**: When running in production, Express sets `trust proxy: 1` to resolve client IPs behind load balancers/proxies.
- **Limiters Configured**:
  - `apiLimiter`: Standard 100 req/15 min on `/api/` (configurable via `RATE_LIMIT_MAX`). Health endpoint (`/api/health`) is exempted from rate limiting to prevent uptime monitoring interference.
  - `authLimiter`: 20 req/15 min on `/api/auth/*` (configurable via `AUTH_RATE_LIMIT_MAX`) to mitigate brute-force credential attacks.
  - `ticketCreationLimiter`: 10 req/min on `POST /api/tickets` (configurable via `TICKET_RATE_LIMIT_MAX`) to prevent spam submissions.
- **Headers**: Conforms to IETF `draft-7` standards (`RateLimit-*` headers) and disables legacy `X-RateLimit-*` headers.

### 5.4 UI & Aesthetic Standards
- Dark mode theme (`bg-slate-950`), custom radial gradients, glassmorphism cards, clear state badges, and responsive layouts.
- Always verify client-server communication using health monitoring (`/api/health`).

---

## 6. Testing Architecture (Playwright E2E)

- **Isolated Test Database**: Tests execute against an isolated database (`helpdesk_test`) specified in `.env.test`.
- **Dedicated Test Server Port**: Backend test server runs on `PORT=5001` via Playwright `webServer` config.
- **Global Test Setup**: `e2e/setup/global-setup.ts` creates the test database, pushes Prisma migrations, and seeds test accounts before test execution.
- **Test Specs**:
  - `e2e/auth.spec.ts`: Sign-in, sign-out, session lifecycle, invalid credentials alerts, and client Zod validation.
  - `e2e/rbac-navigation.spec.ts`: Admin directory access vs. Agent restricted access views and return navigation.
  - `e2e/api.spec.ts`: Health check, 401 unauthenticated security, 403 Agent forbidden checks, inbound ticket creation with AI draft response, and message replies.

### 6.1 Instructions for Using `e2e-test-writer` Subagent
When creating, maintaining, or refactoring Playwright E2E tests:
1. **Delegate to Subagent**: Invoke `playwright-e2e-tester` / `e2e-test-writer` via `invoke_subagent`.
2. **Directory Standard**: All test specs must be authored in `Helpdesk/e2e/*.spec.ts`.
3. **Best Practices**:
   - Use semantic selectors (`page.getByRole`, `page.getByText`, `page.locator`).
   - Use web-first assertions with auto-waiting (`expect(locator).toBeVisible({ timeout: ... })`) without manual sleeps.
   - Clean state and cookies before each test case (`test.beforeEach`).
   - Use default seeded accounts (`admin@example.com` / `password123` and `agent@example.com` / `password123`).


