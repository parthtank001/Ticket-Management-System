# Memory File & Project Guidelines (`claude.md`)

> **CRITICAL DIRECTIVE: ALWAYS USE AND MAINTAIN `claude.md`**
> - **Primary Source of Truth**: All AI agents, assistants, and developers working on this project **MUST** strictly read, consult, and adhere to `claude.md` before making changes, generating code, or planning refactors.
> - **Strict Architectural Compliance**: Never deviate from the core rules, coding patterns, data schemas, tech stack constraints, or explicit string union types defined in this document without explicit user request.
> - **Continuous Updates**: Whenever new features, components, API endpoints, schema fields, or architectural patterns are added, modified, or removed, **always update both `claude.md` and `Helpdesk/claude.md`** immediately to keep project memory synchronized.

---

## 1. Core Development Directives & Rules

### 1.0 Mandatory Guidelines Adherence: Follow `claude.md`
> **CRITICAL INSTRUCTION**: Every task executed on this repository must strictly conform to the specifications recorded in `claude.md`.
> - **Pre-Flight Check**: Always review relevant sections of `claude.md` prior to modifying code or adding new functionality.
> - **Memory Synchronization**: Keep `claude.md` current and updated at the conclusion of every feature, bugfix, schema adjustment, or refactor.
> - **Pattern Enforcement**: Reject any ad-hoc implementations that violate documented project rules (such as using native fetch, raw useState for forms, or TypeScript runtime enums).

### 1.1 Mandatory Frontend Data Fetching: Axios + TanStack React Query
> **CRITICAL INSTRUCTION**: All client-side HTTP communication, REST API requests, and server-state management **MUST** strictly use **Axios** and **TanStack React Query** (`@tanstack/react-query`).

- **Strict Prohibitions**:
  - ❌ **NO Native Fetch / XHR**: Never use native `fetch()`, `window.fetch`, or `XMLHttpRequest`.
  - ❌ **NO Ad-hoc Axios Instances**: Never call `axios.create()`, `axios.get()`, or `axios.post()` directly inside React UI components.
  - ❌ **NO Manual `useEffect` Data Fetching**: Never fetch server data inside `useEffect` or store asynchronous server response state in raw `useState` / `useReducer`.
- **Mandatory Enforced Architecture**:
  1. **Centralized HTTP Client**: Always use the preconfigured `apiClient` from [`client/src/lib/api-client.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/client/src/lib/api-client.ts) (which includes `withCredentials: true` and standardized error handling).
  2. **Dedicated API Service Layer**: Group all backend API endpoint calls into typed service objects inside `client/src/lib/*-api.ts` (e.g., `usersApi` in [`users-api.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/client/src/lib/users-api.ts), `ticketsApi` in [`tickets-api.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/client/src/lib/tickets-api.ts)).
  3. **Custom React Query Hooks**: Always wrap queries (`useQuery`) and mutations (`useMutation`) into custom hook files inside `client/src/lib/hooks/` (e.g., `useUsers.ts`, `useTickets.ts`, `useAuth.ts`). Components must consume these custom hooks rather than calling React Query primitives directly.
  4. **Query Keys & Invalidation**: Use strongly typed `const` arrays for query keys (e.g., `const USERS_QUERY_KEY = ['users'] as const;`). Invalidate affected query keys on successful mutations using `queryClient.invalidateQueries`.

### 1.2 Mandatory Form Management & Data Validation: React Hook Form + Zod
> **CRITICAL INSTRUCTION**: All client-side UI forms (e.g., user authentication in `LoginPage.tsx`, adding new users in `UsersPage.tsx`, ticket submission) **MUST** strictly use **React Hook Form** (`react-hook-form`) integrated with **Zod** (`zod`) schemas via `@hookform/resolvers/zod`. All backend REST API request bodies **MUST** strictly use **Zod** schemas for payload validation.

- **Strict Prohibitions**:
  - ❌ **NO Raw `useState` Form State**: Never manage multi-field form inputs or validation errors with ad-hoc `useState` object dictionaries.
  - ❌ **NO Manual Field Parsing**: Always use `zodResolver(schema)` with `useForm<T>()` instead of ad-hoc event-handling state manipulation.
- **Frontend Form Management Architecture**:
  - Define declarative Zod schemas (e.g., `createUserFormSchema`, `loginSchema`) with specific validation constraints and messages.
  - Initialize forms with `const { register, handleSubmit, reset, formState: { errors } } = useForm<T>({ resolver: zodResolver(schema), defaultValues: { ... } })`.
  - Bind inputs using `{...register('fieldName')}` and surface field-specific error messages via `{errors.fieldName?.message}`.
  - Handle form submissions through `handleSubmit(onSubmitHandler)` and reset modal forms on close with `reset()`.
- **Backend API Payload Validation**:
  - Define and export centralized Zod schemas in [`server/schemas.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/server/schemas.ts) for all endpoints (`POST /api/users`, `PATCH /api/users/:id`, `POST /api/tickets`, `PATCH /api/tickets/:id`, `POST /api/tickets/:id/messages`).
  - Route handlers must validate inputs using `schema.safeParse(req.body)` and reject invalid payloads with HTTP 400 Bad Request: `return res.status(400).json({ error: result.error.issues[0].message });`.
  - Infer and export TypeScript types directly from schemas using `z.infer<typeof schema>`.

### 1.3 Mandatory Type Definitions: Pure Explicit String Union Types
> **CRITICAL INSTRUCTION**: All domain enums and category classifications across the shared core library, frontend application, backend services, validation schemas, unit/integration tests, and database scripts **MUST** strictly use strongly-typed **explicit string union types** defined in [`core/src/enums.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/core/src/enums.ts):
> - `type Role = 'ADMIN' | 'AGENT'` (and alias `type UserRole = Role`)
> - `type Category = 'GENERAL_QUESTION' | 'TECHNICAL_QUESTION' | 'REFUND_REQUEST'` (and alias `type TicketCategory = Category`)
> - `type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'` (and alias `type TicketPriority = Priority`)
> - `type TicketStatus = 'OPEN' | 'RESOLVED' | 'CLOSED'` (and alias `type TicketStatusType = TicketStatus`)
> - `type SenderType = 'STUDENT' | 'AGENT' | 'SYSTEM'`

- **Architecture Standards**:
  1. **Core Package (`core/src/enums.ts`)**: Contains pure explicit string union type declarations without duplicate companion runtime `as const` objects.
  2. **Zod Validation Schemas**: Schemas use `z.enum(['ADMIN', 'AGENT'])`, `z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])`, and `z.enum(['OPEN', 'RESOLVED', 'CLOSED'])` with typed defaults (`.default('AGENT')`, `.default('MEDIUM')`).
  3. **Frontend Type Centralization (`client/src/lib/types.ts`)**: Re-exports pure type definitions (`export type { Role, Category, Priority, TicketStatus, SenderType } from '@helpdesk/core'`) to prevent value-import errors in consumers.
  4. **Component & Service Consumption**: UI switch statements, select dropdown options, state filters, and API payload properties use direct typed string literals (`'ADMIN'`, `'OPEN'`, `'TECHNICAL_QUESTION'`, etc.) that are checked directly against the union types at compile time.
  5. **Direct Interface Usage (No `Pick` Types)**: Do not create fragmented or subset types using TypeScript utility types like `Pick<Ticket, ...>`. Directly use the primary [`Ticket`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/core/src/schemas/ticket.ts) interface across all components, props, hooks, and service functions.

### 1.4 Mandatory Error Handling: Express 5 Automatic Async Promise Rejection
> **CRITICAL INSTRUCTION**: In **Express 5**, route handlers and middleware that return a Promise **automatically forward rejected promises and unhandled exceptions** to the centralized error handling middleware (`next(err)`). Therefore, wrapping route handlers in manual `try { ... } catch (error) { ... }` blocks is **unnecessary and discouraged**.

- **Strict Prohibitions**:
  - ❌ **NO Boilerplate `try/catch` Blocks in Route Handlers**: Do not wrap standard async route logic in `try/catch` merely to call `res.status(500).json(...)` or `next(err)`.
- **Mandatory Enforced Architecture**:
  1. **Clean Route Handlers**: Write direct, declarative async route handlers without `try/catch` boilerplate. Handle known domain/validation errors explicitly (e.g., Zod safe parsing returning 400 Bad Request, or entity not found returning 404), and let unexpected errors reject naturally.
  2. **Centralized Error Middleware**: Rely on the global Express 5 error handler (`app.use((err, req, res, next) => { ... })`) at the bottom of [`server/index.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/server/index.ts) to log errors and format standardized 500 JSON error responses.
  3. **Express 5 Route Wildcards**: Use named parameter wildcard syntax (`/*splat` e.g., `/api/auth/*splat`) instead of bare `*` for route matching.

### 1.5 Mandatory Shared Schema Architecture: Core Package (`@helpdesk/core`)
> **CRITICAL INSTRUCTION**: All shared data validation schemas (`createUserSchema`, `updateUserSchema`, `createTicketSchema`, `updateTicketSchema`, `createTicketMessageSchema`, `inboundEmailSchema`), domain union types (`Role`, `Category`, `Priority`, `TicketStatus`, `SenderType`), and their inferred TypeScript types **MUST** be defined in the dedicated **`@helpdesk/core`** package (`core/src/schemas/*`, `core/src/enums.ts`, `core/src/email-parser.ts`) and referenced by both the **client** and **server**. Never duplicate schema definitions across client and server.

- **Strict Prohibitions**:
  - ❌ **NO Duplicate Schema Definitions**: Never duplicate, recreate, or re-define Zod validation schemas across client UI components and backend server routes.
  - ❌ **NO Direct Relative Cross-Package Imports**: Do not import across subproject boundaries using relative file paths (e.g., `../../server/...` or `../../client/...`). Always import shared schemas and types through the `@helpdesk/core` package.
- **Mandatory Enforced Architecture**:
  1. **Core Package Structure**:
     - `core/src/enums.ts`: Pure explicit string union types (`Role`, `Category`, `Priority`, `TicketStatus`, `SenderType`).
     - `core/src/schemas/user.ts`: User Zod validation schemas (`createUserSchema`, `updateUserSchema`) and exported input/output types (`CreateUserInput`, `CreateUserOutput`, `UpdateUserInput`, `UpdateUserOutput`).
     - `core/src/schemas/ticket.ts`: Ticket schemas (`createTicketSchema`, `updateTicketSchema`, `createTicketMessageSchema`, `inboundEmailSchema`, `getTicketsQuerySchema`) supporting `assignedAgentId` / `assignedToId` and interfaces (`Ticket`, `TicketAgent`, `TicketMessage`).
     - `core/src/email-parser.ts`: RFC 2822 / 5322 header parsing, `[Ticket #XXXX]` subject parsing, threading extraction, and loop detection utilities.
     - `core/src/index.ts`: Central barrel exporting all enums, schemas, and email utilities.
  2. **Server-Side Consumption & Assigned User Verification**:
     - Route handlers and schemas (e.g., [`server/routes/users.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/server/routes/users.ts), [`server/routes/emails.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/server/routes/emails.ts), [`server/schemas.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/server/schemas.ts)) import schemas directly from `@helpdesk/core`.
     - Validate incoming request bodies using `schema.safeParse(req.body)` which returns the transformed output data with defaults applied.
     - Enforce that any assigned user ID (`assignedToId` / `assignedAgentId`) on `POST /api/tickets` and `PATCH /api/tickets/:id` corresponds to a valid, existing user in the database (`deletedAt: null`). Reject invalid or non-existent user assignments with HTTP 400 Bad Request.
  3. **Client-Side Consumption**:
     - React forms (e.g., [`UsersPage.tsx`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/client/src/components/UsersPage.tsx), [`UserForm.tsx`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/client/src/components/UserForm.tsx), [`CreateTicketModal.tsx`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/client/src/components/CreateTicketModal.tsx)) import schemas and types from `@helpdesk/core` and `client/src/lib/types.ts`.
     - Initialize forms using `useForm<T>({ resolver: zodResolver(schema) })` to guarantee 100% type safety and identical validation logic across frontend and backend.

### 1.6 Mandatory Testing Hierarchy: Component-First Testing Standard
> **CRITICAL INSTRUCTION**: All UI features, user interactions, form validation rules, modal lifecycles, filters, tabs, tables, badge styling, and client hooks **MUST** primarily and preferentially be tested using **Vitest + React Testing Library (`@testing-library/react`)** as **Component/Unit Tests**. End-to-End (E2E) tests with **Playwright** must **ONLY** be written when strictly necessary.

- **Strict Prioritization Standard**:
  - 🥇 **Primary / Default Testing Approach**: **Component & Unit Tests** (`client/src/**/__tests__/*.test.tsx`).
    - Author focused component tests in jsdom using `renderWithQuery` and typed mocked API services (`vi.mock('../../lib/tickets-api')`, `vi.mock('../../lib/users-api')`).
    - Test all UI states (loading skeleton, empty state, error alerts, success feedback), user interactions (form input, submission, whitespace trimming, button clicks, modal open/close, sorting, filtering), and edge cases.
    - Fast, deterministic, isolated, and instant feedback without requiring a running backend server or PostgreSQL database.
  - 🥈 **Secondary / Restricted Approach**: **Playwright E2E Tests** (`Helpdesk/e2e/*.spec.ts`).
    - **Use E2E ONLY when strictly necessary** for multi-tier, full-stack integration boundaries that cannot be verified in jsdom:
      1. Complete browser cookie authentication lifecycles (cross-origin cookie issuance, Set-Cookie headers, session persistence across page reloads).
      2. Server-side middleware & database migration integration (PostgreSQL schema constraints, database seeding, table relations).
      3. Critical multi-page RBAC route security navigation (ensuring unauthorized users are redirected at the HTTP/browser routing layer).
      4. End-to-end inbound email webhook delivery pipelines (real HTTP webhook ingest -> database persistence).
  - ❌ **Strict Prohibitions**:
    - Do NOT write E2E tests for basic form validation, modal toggling, filter dropdown changes, button clicks, table sorting, or individual UI rendering logic that can be tested rapidly and deterministically via RTL component tests.

---

## 2. Context7 Documentation Retrieval Rules

Use Context7 MCP to fetch current, up-to-date documentation whenever asking or inquiring about any library, framework, SDK, API, CLI tool, or cloud service—even well-known ones like React, Next.js, Prisma, Express, Tailwind, Gemini API, or PostgreSQL. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage.

> **Note**: Do not use for refactoring, writing custom scripts from scratch, debugging business logic, code review, or general programming concepts.

### Steps
1. **`resolve-library-id`**: Search with the library name and specific concept query (unless an exact library ID in `/org/project` format is provided).
2. **Select Match**: Choose the best match based on exact name match, description relevance, snippet count, and benchmark score.
3. **`query-docs`**: Execute with the selected library ID and concept-scoped query. Scope queries to single concepts (run separate queries if spanning multiple topics like routing + auth).
4. **Answer**: Respond using the retrieved documentation context.

---

## 3. Project Overview

The **AI-Powered Ticket Management System (Helpdesk)** automates and streamlines inbound customer support email handling for student inquiries:

- **Problem**: Support teams receive hundreds of daily support emails, requiring manual classification, searching FAQ sources, and writing repetitive responses.
- **Solution**: An AI-powered helpdesk system that ingests support emails, auto-classifies tickets, searches a `pgvector` Knowledge Base via RAG (Retrieval-Augmented Generation), generates bullet summaries and response drafts, and routes tickets to human agents for approval before sending replies.
- **Human-in-the-Loop Model**: No email reply is delivered to a student without explicit human agent review, editing, and approval.

### Core Ticket Categories (Single Selection)
Every ticket belongs to **exactly one** category:
1. `GENERAL_QUESTION`: Courses, schedules, general policies, and procedures.
2. `TECHNICAL_QUESTION`: Portal logins, platform bugs, access errors, troubleshooting.
3. `REFUND_REQUEST`: Billing inquiries, refund claims, payment adjustments.

---

## 4. Technical Stack

| Layer | Technology | Key Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18 + Vite** | Responsive client dashboard, TypeScript, component architecture |
| **Data Validation** | **Zod** | TypeScript-first schema validation for client forms & backend API payloads with static type inference |
| **Data Fetching & State** | **Axios + TanStack React Query** | Centralized HTTP client (`apiClient`) and declarative server-state management (`useQuery`, `useMutation`) with caching |
| **Styling & Icons** | **Tailwind CSS + Lucide React** | Modern dark-mode UI with sleek glassmorphism aesthetic |
| **Backend API** | **Express.js 5 + Node.js (TypeScript)** | RESTful API server, webhooks, auth middleware, AI services |
| **Database & ORM** | **PostgreSQL + Prisma ORM + `pgvector`** | Relational data (`User`, `Session`, `Ticket`, `TicketMessage`, `WebhookLog`) + vector embeddings search |
| **Authentication** | **Better Auth + Database-backed Sessions** | Server-managed session store enabling instant admin session revocation and RBAC |
| **AI / LLM Engine** | **Google Gemini API** (`@google/genai`) | `gemini-1.5-flash` for classification, summaries & draft generation; `text-embedding-004` for RAG |
| **Email Gateway** | **Inbound Webhooks & Direct Ingestion** | Inbound parse webhooks (`Message-ID`, `In-Reply-To`), threading, and audit logging |
| **Runtime & Dev Tools** | **Bun / ts-node / Docker / Vitest** | High-performance execution, test suite (144 tests), and local development |

---

## 5. Project Structure & Directory Layout

```
e:\claude_ai\Ticket Management System\
├── .gitignore                  # Git ignore rules for node_modules, environments & test reports
├── claude.md                   # Global workspace memory file & guidelines
└── Helpdesk/
    ├── core/                   # Shared TypeScript package (@helpdesk/core)
    │   ├── src/
    │   │   ├── enums.ts        # Pure explicit string union types (Role, Category, Priority, TicketStatus, SenderType)
    │   │   ├── schemas/        # Shared domain Zod validation schemas
    │   │   │   ├── user.ts     # User validation schemas & types (createUserSchema, updateUserSchema)
    │   │   │   └── ticket.ts   # Ticket validation schemas & types (createTicketSchema, inboundEmailSchema, etc.)
    │   │   ├── email-parser.ts # Email header parsing, threading tag extraction, loop protection
    │   │   └── index.ts        # Central export entrypoint
    │   ├── package.json        # Core package definition (@helpdesk/core)
    │   └── tsconfig.json       # Core TypeScript configuration
    ├── client/                 # React 18 + Vite frontend
    │   ├── src/
    │   │   ├── components/     # Application components & views
    │   │   │   ├── ui/         # shadcn/ui primitives (badge, button, card, input, label, skeleton)
    │   │   │   ├── HomePage.tsx      # Main agent ticket workspace dashboard
    │   │   │   ├── LoginPage.tsx     # Modernized login screen with role credentials hint (Zod validation)
    │   │   │   ├── Navbar.tsx        # App navigation header with session user details & sign-out
    │   │   │   ├── Pagination.tsx    # Reusable smart pagination component with range summary & page size selector
    │   │   │   ├── TicketsPage.tsx   # Tickets dashboard with search, filters, sorting, page state & quick actions
    │   │   │   ├── TicketsTable.tsx  # Interactive tickets list table with skeleton loading, sorting, badges & pagination footer
    │   │   │   ├── TicketBadges.tsx  # Reusable status, priority, and category badge components
    │   │   │   ├── TicketDetailPage.tsx  # Standalone 2-column ticket details view with thread & status actions
    │   │   │   ├── TicketDetailModal.tsx # Full ticket view dialog with conversation thread & reply composer
    │   │   │   ├── UpdateTicket.tsx      # Reusable ticket status quick actions & properties dropdowns (Category, Assignee, Priority)
    │   │   │   ├── TicketReplyForm.tsx   # Reusable reply composer form with Agent reply posting, validation & error alerts
    │   │   │   ├── ReplyThred.tsx        # Reusable conversation thread component displaying chronological messages, sender role badges & empty state
    │   │   │   ├── ErrorMessage.tsx      # Reusable error banner component with AlertCircle icon, styling variants, and optional dismiss
    │   │   │   ├── CreateTicketModal.tsx # Inbound manual ticket creation modal dialog
    │   │   │   ├── UsersPage.tsx     # Admin user management directory (Zod validation)
    │   │   │   ├── UsersTable.tsx    # Admin user listing table with role badges & actions
    │   │   │   └── UserForm.tsx      # Reusable create/edit user modal dialog with Zod validation
    │   │   ├── lib/
    │   │   │   ├── hooks/
    │   │   │   │   ├── useAuth.ts    # React Query hooks for session & auth lifecycle
    │   │   │   │   ├── useTickets.ts # React Query hooks for tickets, agents & messaging with reactive pagination & filter params
    │   │   │   │   └── useUsers.ts   # React Query hooks for user CRUD management
    │   │   │   ├── api-client.ts     # Centralized Axios client instance with credentials
    │   │   │   ├── auth-client.ts    # Client authentication helper (Better Auth client wrapper)
    │   │   │   ├── query-client.ts   # TanStack React Query client instance & default cache policies
    │   │   │   ├── tickets-api.ts    # Typed API service for tickets, agents & replies with search and filter params
    │   │   │   ├── users-api.ts      # Typed API service for user endpoints using axios
    │   │   │   ├── types.ts          # Centralized client type re-exports from @helpdesk/core
    │   │   │   └── utils.ts          # Class merging utilities (clsx + tailwind-merge)
    │   │   ├── App.tsx         # Main application root & session router
    │   │   ├── main.tsx        # React DOM entry point with QueryClientProvider
    │   │   └── index.css       # Tailwind directives & global styles
    │   ├── package.json        # Client dependencies & Vite scripts (zod, @hookform/resolvers, vitest)
    │   ├── tsconfig.json       # Client TypeScript configuration with @/* path alias
    │   └── vite.config.ts      # Vite dev server setup & path alias resolver
    ├── server/                 # Express 5 backend API
    │   ├── middleware/
    │   │   ├── auth.ts         # Session verification (requireAuth) & RBAC (requireRole)
    │   │   ├── webhook-auth.ts # Webhook secret header validation (verifyWebhookSecret)
    │   │   └── rate-limiter.ts # Production-only rate limiting middleware (express-rate-limit)
    │   ├── routes/
    │   │   ├── users.ts        # Modular Express router for /api/users CRUD endpoints (Admin only)
    │   │   └── emails.ts       # Inbound email webhook (/api/webhooks/email), support-address & audit logs
    │   ├── services/
    │   │   ├── ai.ts           # Google Gemini AI classification, summarization & RAG draft response service
    │   │   └── email-ingestion.ts # Inbound email processing, threading matching & ticket creation
    │   ├── auth.ts             # Better Auth server configuration with Prisma adapter
    │   ├── db.ts               # Prisma client instance & PostgreSQL health check
    │   ├── index.ts            # Express server entry point, middleware & route mounting (GET /api/tickets filtering & sorting)
    │   ├── schemas.ts          # Centralized Zod validation schemas for all API payloads
    │   └── types.ts            # Server-side TypeScript type definitions
    ├── prisma/
    │   ├── schema.prisma       # Database schema models (User, Session, Account, Ticket, TicketMessage, WebhookLog)
    │   └── seed.ts             # Database seeder for default Admin and Agent accounts
    ├── scripts/
    │   ├── create-user.ts      # CLI utility to provision new system users
    │   ├── setup-test-db.ts    # Automated test database synchronization & seeding script
    │   └── verify-rate-limiting.ts # Verification suite for production rate limiting
    ├── e2e/
    │   ├── api.spec.ts         # REST API & protected route authorization tests
    │   ├── auth.spec.ts        # End-to-end authentication & session lifecycle tests
    │   ├── users.spec.ts       # Full user management CRUD tests
    │   └── rbac-navigation.spec.ts # Role-based access control and UI navigation tests
    ├── package.json            # Root dependencies & execution scripts
    ├── playwright.config.ts    # Playwright E2E configuration with isolated test server
    ├── tsconfig.json           # Shared TypeScript configuration
    └── project-scope.md        # Comprehensive functional scope specification
```

### Running the Application
From `e:\claude_ai\Ticket Management System\Helpdesk`:
- **Backend API**: `npm run dev:server` (Express server running at `http://localhost:5000`)
- **Frontend Client**: `npm run dev:client` (Vite dev server running at `http://localhost:5173`)
- **Root Dev Script**: `npm run dev` (Runs client & server concurrently)
- **Database Seeding**: `npx prisma db seed` (Seeds default Admin `admin@example.com` and Agent `agent@example.com`)
- **Playwright E2E Tests**: `npm run test:e2e` (Runs automated browser test suite)

---

## 6. Key Conventions & Architecture Rules

### 6.1 Email Ingestion & Threading
- Extract `From`, `Subject`, `Body`, `Message-ID`, and `In-Reply-To` headers from inbound webhooks.
- Match existing ticket threads using `[Ticket #XXXX]` subject tags or `In-Reply-To` / `References` headers.
- **Anti-Loop Protection**: Always inspect `Auto-Submitted` headers (`auto-generated`, `auto-replied`) and ignore automated emails to prevent infinite loops.

### 6.2 Authentication & Roles
- **Roles**: `ADMIN` and `AGENT`.
- **Database Sessions**: Managed by Better Auth via PostgreSQL `session` table; supports instant session revocation.
- Primary Admin (`admin@example.com` / `password123`) and Agent (`agent@example.com` / `password123`) seeded on deployment.
- Admins have exclusive access to `/api/users` and the Users directory in the UI.

### 6.3 Rate Limiting & Production Security (`server/middleware/rate-limiter.ts`)
- **Production-Only Enforcement**: Rate limiters strictly enforce request ceilings when `NODE_ENV === 'production'`. In `development` and `test` environments, all rate limit checks are completely bypassed (`skip` returning `true`).
- **Reverse Proxy Trust**: When running in production, Express sets `trust proxy: 1` to resolve client IPs behind load balancers/proxies.
- **Limiters Configured**:
  - `apiLimiter`: Standard 100 req/15 min on `/api/` (configurable via `RATE_LIMIT_MAX`). Health endpoint (`/api/health`) is exempted from rate limiting to prevent uptime monitoring interference.
  - `authLimiter`: 20 req/15 min on `/api/auth/*` (configurable via `AUTH_RATE_LIMIT_MAX`) to mitigate brute-force credential attacks.
  - `ticketCreationLimiter`: 10 req/min on `POST /api/tickets` (configurable via `TICKET_RATE_LIMIT_MAX`) to prevent spam submissions.
- **Headers**: Conforms to IETF `draft-7` standards (`RateLimit-*` headers) and disables legacy `X-RateLimit-*` headers.

### 6.4 UI & Aesthetic Standards
- Dark mode theme (`bg-slate-950`), custom radial gradients, glassmorphism cards, clear state badges, and responsive layouts.
- Always verify client-server communication using health monitoring (`/api/health`).

### 6.5 Client Data Fetching & Server-State Architecture (Axios + React Query)
- **Centralized Axios Client (`client/src/lib/api-client.ts`)**:
  - Always use the shared `apiClient` instance configured with `withCredentials: true` and JSON headers.
  - Never use native `fetch()` or instantiate ad-hoc `axios` clients directly inside UI components.
  - Structure all API endpoints as strongly-typed service objects in `client/src/lib/*-api.ts` (e.g., `usersApi` in `users-api.ts`, `ticketsApi` in `tickets-api.ts`).
  - Standardize error extraction: parse `error.response?.data?.error || error.response?.data?.message || error.message` before throwing.
- **TanStack React Query (`@tanstack/react-query`)**:
  - Encapsulate server-state queries and mutations within dedicated custom hooks inside `client/src/lib/hooks/` (e.g., `useUsers.ts`, `useTickets.ts`, `useAuth.ts`).
  - Query Keys: Define typed tuple constants (e.g., `export const TICKETS_QUERY_KEY = ['tickets'] as const;`). Append parameters (filters, sorting, search) to the query key array (`[...TICKETS_QUERY_KEY, params]`) to trigger automatic reactive re-fetching.
  - Mutations (`useMutation`): Execute all write/update/delete operations with `useMutation` and invalidate corresponding query keys on success (`queryClient.invalidateQueries({ queryKey: ... })`).
  - Cache Policies (`client/src/lib/query-client.ts`): Set to `staleTime: 2 minutes`, `gcTime: 10 minutes`, `retry: 1`, and `refetchOnWindowFocus: false`.
  - **UI States**: Always handle `isLoading` / `isPending` and `isError` / `error` states gracefully with loaders and alert banners.

### 6.6 Data Validation Architecture (Zod)
- **Centralized Backend Schemas (`server/schemas.ts`)**:
  - Request validation across all Express routes (`POST /api/users`, `PATCH /api/users/:id`, `POST /api/tickets`, `PATCH /api/tickets/:id`, `POST /api/tickets/:id/messages`, `GET /api/tickets`) is handled via `schema.safeParse(req.body)` and `getTicketsQuerySchema`.
  - Schema errors return HTTP 400 Bad Request with the primary validation issue message (`res.status(400).json({ error: result.error.issues[0].message })`).
### 6.7 Reusable UI & Formatting Utilities (`client/src/lib/utils.ts`)
- **Explicit Title Formatters**:
  - `formatStatusTitle(status)`: Maps `'OPEN'`, `'RESOLVED'`, `'CLOSED'` to Title Case using `STATUS_LABELS`.
  - `formatCategoryTitle(category)`: Maps `'GENERAL_QUESTION'`, `'TECHNICAL_QUESTION'`, `'REFUND_REQUEST'` using `CATEGORY_LABELS` (defaults to `'Uncategorized'`).
  - `formatPriorityTitle(priority)`: Maps `'LOW'`, `'MEDIUM'`, `'HIGH'`, `'URGENT'` using `PRIORITY_LABELS` (defaults to `'Medium'`).
  - `formatRoleTitle(role)`: Maps `'ADMIN'`, `'AGENT'` using `ROLE_LABELS` (defaults to `'Agent'`).
  - `formatSenderTypeTitle(senderType)`: Maps `'STUDENT'` -> `'Customer'`, `'AGENT'` -> `'Support Agent'`, `'SYSTEM'` -> `'System'` using `SENDER_TYPE_LABELS`.
- **Date & Time Formatting Utilities**:
  - `formatDateTime(date, options)`: Safe timestamp formatter using `Intl.DateTimeFormat` / `toLocaleString` with fallback handling for null/invalid values.
  - `formatDateMedium(date)`: Formats date with medium date style and short time (e.g., `"Sep 17, 2026, 7:45 PM"`) for ticket headers.
  - `formatDateShort(date)`: Formats date with short date style and short time (e.g., `"9/17/26, 7:45 PM"`) for conversation thread messages.
  - `formatDateCompact(date)`: Formats month, day, 2-digit hour, and 2-digit minute for table cells (e.g., `"Sep 17, 07:45 PM"`).
  - `formatDateOnly(date)`: Formats month, day, and year for user tables without time components.
- **String & Avatar Utilities**:
  - `getInitials(name)`: Safely extracts uppercase 1-2 letter avatar initials from single-word or multi-word user names.
  - `cn(...inputs)`: Merges Tailwind CSS classes resolving conflicts with `clsx` and `tailwind-merge`.

### 6.8 Reusable Error Banner Component (`client/src/components/ErrorMessage.tsx`)
- **Centralized Error Display**: Reusable `<ErrorMessage message={...} />` component with `role="alert"`, `AlertCircle` icon, and flexible styling.
- **Null Safety**: Returns `null` if both `message` and `children` are empty/null.
- **Variants**: Supports `'rose'` (default), `'amber'`, and `'red'` themes with `'sm'` (default 11px) and `'md'` (12px) sizes.
- **Dismissible**: Optional `onDismiss` prop renders a clean dismiss button (`X` icon).

### 6.9 Reusable Conversation Thread Component (`client/src/components/ReplyThred.tsx`)
- **Conversation Timeline Rendering**: Reusable `<ReplyThred messages={...} />` component displaying ticket messages chronologically with role badges (`TicketSenderBadge`), sender email headers, formatted short timestamps (`formatDateShort`), and message body text.
- **Base Tailwind Component Layer (`client/src/index.css`)**: Encapsulates common thread styles in `@layer components` (`.thread-container`, `.thread-header`, `.thread-header-title`, `.thread-header-count`, `.thread-message-item`, `.thread-message-note`, `.thread-message-student`, `.thread-message-agent`, `.thread-meta-header`, `.thread-meta-email`, `.thread-meta-date`, `.thread-message-body`, `.thread-empty-state`) removing inline string duplication across thread elements.
- **Visual Distinction & Roles**: Applies distinct color palettes for sender types (`amber` border/background for internal notes, `indigo` for Support Agents, `slate` for Customers/Students).
- **Customization & State Handling**:
  - `showHeader`: Boolean toggle (defaults to `true`) displaying thread icon, message count badge, and header.
  - `emptyMessage`: Customizable fallback text (defaults to `"No messages in thread yet."`) shown when message list is empty.
  - `className`: Custom style merging support via `cn`.
  - Also re-exports alias `ReplyThread`.

### 6.10 Reusable Ticket Update Component (`client/src/components/UpdateTicket.tsx`)
- **Centralized Status & Property Management**: Reusable `<UpdateTicket ticket={...} />` component encapsulating the right column ticket actions and properties.
- **Status Quick Action Buttons**: Provides quick action buttons (Open, Resolved, Closed) disabling the active status and updating ticket status via `useUpdateTicket`.
- **Properties Dropdown Lists**: Houses Category (`GENERAL_QUESTION`, `TECHNICAL_QUESTION`, `REFUND_REQUEST`), Assignee (Agent selector with automatic `useAgents` hook integration or optional `agents` prop), and Priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) selectors.
- **Styling Variants & Error Handling**: Supports `'white'` (default) and `'slate'` container variants, customizable `idPrefix` (e.g. `'ticket'` or `'modal'`), optional `onError` callback for bubbling action errors up to parent banner, and standalone `showErrorBanner` support.

---

## 7. Testing Architecture (Component-First: Vitest + React Testing Library & Selective Playwright E2E)

The project enforces a **Component-First Testing Philosophy**: The vast majority of test coverage (**252/252 tests, 100% pass rate**) is maintained via fast, deterministic Vitest + React Testing Library tests in jsdom, reserving Playwright E2E tests strictly for critical full-stack integration validation.

### 7.1 Client Component & Unit Test Suite (Vitest + RTL)
- **Test Framework**: Vitest (`vitest`), React Testing Library (`@testing-library/react`, `@testing-library/user-event`), `@testing-library/jest-dom`, and jsdom.
- **Test Directory**: `client/src/**/__tests__/*.test.tsx` and `client/src/test/*.test.ts`.
- **Current Coverage**: **252/252 tests passing (100%)** across 19 test suites:
  1. `client/src/components/__tests__/UpdateTicket.test.tsx` (9 tests): Dedicated unit tests covering initial rendering, active status disable, status transitions (`OPEN`, `RESOLVED`, `CLOSED`), category changes & uncategorized reset, agent assignment & unassignment, priority changes, error callbacks, standalone error banner display, and custom variant/idPrefix styling.
  2. `client/src/components/__tests__/TicketReplyForm.test.tsx` (12 tests): Dedicated reply composer unit tests across 4 suites covering layout modes (header toggle, card wrapper, className propagation), empty/whitespace validations with dynamic error clearing, Agent reply submission with whitespace trimming, loading state spinner, input clearing, and modal close action.
  3. `client/src/components/__tests__/ErrorMessage.test.tsx` (10 tests): Dedicated error banner unit tests for null handling, alert role, text rendering, children rendering, rose/amber/red variants, sm/md sizing, dismiss callback, and custom className merging.
  4. `client/src/components/__tests__/ReplyThred.test.tsx` (7 tests): Dedicated conversation thread unit tests covering empty state fallback, custom empty text, message list rendering, sender role badge mapping, timestamp formatting, header toggling, and custom className merging.
  5. `client/src/test/utils.test.ts` (15 tests): `cn` class merging, explicit title formatters (`formatStatusTitle`, `formatCategoryTitle`, `formatPriorityTitle`, `formatRoleTitle`, `formatSenderTypeTitle`), date formatters (`formatDateTime`, `formatDateMedium`, `formatDateShort`, `formatDateCompact`, `formatDateOnly`), and `getInitials` avatar helper.
  6. `client/src/components/__tests__/TicketDetailModal.test.tsx` (16 tests): Modal open/close, ticket metadata rendering, status updates (`OPEN`, `RESOLVED`, `CLOSED`), category, assignee, and priority updates, conversation thread rendering with role badges, public reply composer, submission whitespace trimming, and API error alerts.
  7. `client/src/components/__tests__/TicketDetailPage.test.tsx` (15 tests): 2-column layout, standalone ticket details view, navigation return callbacks, status updates (`OPEN`, `RESOLVED`, `CLOSED`), category modifications and uncategorized resets, priority updates, assignee updates, conversation/reply thread rendering, public reply composer, clear textarea action, and API error alerts.
  8. `client/src/components/__tests__/CreateTicketModal.test.tsx` (11 tests): Modal visibility, input validations, form submission with whitespace trimming, category mapping, and API error banners.
  9. `client/src/components/__tests__/TicketsPage.test.tsx` (13 tests): Table rows rendering, default newest-first sorting, server-side TanStack column sorting, search query filtering, status/category/priority/assignee filtering, filter reset with active count, and ticket modal interactions.
  10. `client/src/components/__tests__/TicketsTable.test.tsx` (11 tests): Skeleton loading, sorting callbacks, badge rendering, pagination integration, filter empty state, and row selection callbacks.
  11. `client/src/components/__tests__/Pagination.test.tsx` (9 tests): Page navigation, edge buttons disabling on first/last pages, page size dropdown selections, and range summary calculations.
  12. `client/src/components/__tests__/TicketBadges.test.tsx` (15 tests): Status, Priority, Category, and SenderType badge styling and labels (Student, Support Agent, Internal Note, System).
  13. `client/src/components/__tests__/UserForm.test.tsx` (23 tests): Create and edit user form validations, role selection, password requirements, and submission.
  14. `client/src/components/__tests__/UsersPage.test.tsx` (23 tests): Admin user directory listing, create user modal trigger, delete confirmation, and edit user workflows.
  15. `client/src/components/__tests__/UsersTable.test.tsx` (6 tests): User list rendering, role badges, action buttons, and empty state.
  16. `client/src/components/__tests__/Navbar.test.tsx` (5 tests): Navigation links, session user display, and sign-out handler.
  17. `client/src/test/ticket-schema.test.ts` (14 tests): Zod validation schema tests for `createTicketSchema`, `updateTicketSchema`, `getTicketsQuerySchema`, and `createTicketMessageSchema` with `senderType` validation, defaults, nullability, and input constraints.
  18. `client/src/test/tickets-api.test.ts` (19 tests): Typed `ticketsApi` service methods unit tests (`listTickets`, `getTicket`, `listAgents`, `createTicket`, `updateTicket`, `addTicketMessage` with `senderType`), query param serializations, array response normalizations, and API error extractions.
  19. `client/src/test/email-parser.test.ts` (19 tests): RFC 2822 header parsing, subject ticket tag extraction, and anti-loop detection.
- **Testing Utilities & Standards**:
  - `renderWithQuery`: Custom test helper wrapping components with `QueryClientProvider` configured with zero retries.
  - Typed Mocking: Mock API modules using `vi.mock('../../lib/tickets-api')` and `vi.mock('../../lib/users-api')`.
  - Form Testing: Always use `noValidate` on `<form>` elements in components to ensure programmatic Zod / React Hook Form validations trigger reliably in jsdom.
- **Execution Commands**:
  - `npm run test:client` (from root or `Helpdesk`): Runs all client component tests in run mode.
  - `npm --prefix client run test:watch`: Runs tests in interactive watch mode.
  - `npm --prefix client run test:ui`: Opens the Vitest graphical test runner.

### 7.2 Selective Playwright End-to-End (E2E) Test Suite
- **Purpose**: Strictly reserved for end-to-end multi-tier integration boundaries that cannot be verified in jsdom.
- **Isolated Test Environment**: Tests execute against an isolated database (`helpdesk_test`) specified in `.env.test` with backend running on `PORT=5001`.
- **Global Setup**: `e2e/setup/global-setup.ts` creates the test database, runs Prisma migrations, and seeds test accounts before test execution.
- **Active E2E Specs**:
  - `e2e/auth.spec.ts`: End-to-end authentication lifecycle (cookie session creation, session persistence across reloads, logout session invalidation).
  - `e2e/users.spec.ts`: Full-stack database CRUD lifecycle for user provisioning.
  - `e2e/rbac-navigation.spec.ts`: Multi-page role-based access control and navigation guard verification (Admin vs. Agent).
  - `e2e/api.spec.ts`: Health check endpoint and unauthenticated / unauthorized REST API security barriers.
- **Execution Command**: `npm run test:e2e` (Runs automated Playwright browser test suite).

### 7.3 Instructions for Using `e2e-test-writer` Subagent
When creating, maintaining, or refactoring Playwright E2E tests:
1. **Delegate to Subagent**: Invoke `playwright-e2e-tester` / `e2e-test-writer` via `invoke_subagent`.
2. **Directory Standard**: All test specs must be authored in `Helpdesk/e2e/*.spec.ts`.
3. **Best Practices**:
   - Use semantic selectors (`page.getByRole`, `page.getByText`, `page.locator`).
   - Use web-first assertions with auto-waiting (`expect(locator).toBeVisible({ timeout: ... })`) without manual sleeps.
   - Clean state and cookies before each test case (`test.beforeEach`).
   - Use default seeded accounts (`admin@example.com` / `password123` and `agent@example.com` / `password123`).
