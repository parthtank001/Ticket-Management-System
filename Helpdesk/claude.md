# Memory File & Project Guidelines (`claude.md`)

This memory file contains project architectural specifications, technical stack details, project structure, development workflow instructions, key conventions, and documentation retrieval rules.

---

## 1. Core Development Directives & Rules

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
> **CRITICAL INSTRUCTION**: All domain enums across the shared core library, frontend application, backend services, validation schemas, unit/integration tests, and database scripts **MUST** strictly use strongly-typed **explicit string union types** (`Role = 'ADMIN' | 'AGENT'`, `Category = 'GENERAL_QUESTION' | ...`, `Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'`, `TicketStatus = 'OPEN' | 'RESOLVED' | 'CLOSED'`, `SenderType = 'STUDENT' | 'AGENT' | 'SYSTEM'`) defined in [`core/src/enums.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/core/src/enums.ts).

- **Architecture Standards**:
  1. **Core Package**: [`core/src/enums.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/core/src/enums.ts) contains pure explicit string union types without duplicate companion runtime objects.
  2. **Zod Validation Schemas**: Schemas use `z.enum(['ADMIN', 'AGENT'])` and `z.enum([...])` with appropriate typed defaults (e.g. `'AGENT'`, `'MEDIUM'`).
  3. **TypeScript Types & Interfaces**: Components, services, and models use explicit string union types (`type Role`, `type Category`, `type Priority`, etc.).
  4. **Direct Literal Constants**: Literals like `'ADMIN'`, `'AGENT'`, `'OPEN'`, `'RESOLVED'`, `'CLOSED'`, etc. are validated directly against the union types at compile time.

### 1.4 Mandatory Error Handling: Express 5 Automatic Async Promise Rejection
> **CRITICAL INSTRUCTION**: In **Express 5**, route handlers and middleware that return a Promise **automatically forward rejected promises and unhandled exceptions** to the centralized error handling middleware (`next(err)`). Therefore, wrapping route handlers in manual `try { ... } catch (error) { ... }` blocks is **unnecessary and discouraged**.

- **Strict Prohibitions**:
  - ❌ **NO Boilerplate `try/catch` Blocks in Route Handlers**: Do not wrap standard async route logic in `try/catch` merely to call `res.status(500).json(...)` or `next(err)`.
- **Mandatory Enforced Architecture**:
  1. **Clean Route Handlers**: Write direct, declarative async route handlers without `try/catch` boilerplate. Handle known domain/validation errors explicitly (e.g., Zod safe parsing returning 400 Bad Request, or entity not found returning 404), and let unexpected errors reject naturally.
  2. **Centralized Error Middleware**: Rely on the global Express 5 error handler (`app.use((err, req, res, next) => { ... })`) at the bottom of [`server/index.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/server/index.ts) to log errors and format standardized 500 JSON error responses.
  3. **Express 5 Route Wildcards**: Use named parameter wildcard syntax (`/*splat` e.g., `/api/auth/*splat`) instead of bare `*` for route matching.

### 1.5 Mandatory Shared Schema Architecture: Core Package (`@helpdesk/core`)
> **CRITICAL INSTRUCTION**: All shared data validation schemas (e.g., `createUserSchema`, `updateUserSchema`), domain enums (`Role`, `UserRole`), and their inferred TypeScript types **MUST** be defined in the dedicated **`@helpdesk/core`** package (`core/src/schemas/*`) and referenced by both the **client** and **server**. Never duplicate schema definitions across client and server.

- **Strict Prohibitions**:
  - ❌ **NO Duplicate Schema Definitions**: Never duplicate, recreate, or re-define Zod validation schemas across client UI components and backend server routes.
  - ❌ **NO Direct Relative Cross-Package Imports**: Do not import across subproject boundaries using relative file paths (e.g., `../../server/...` or `../../client/...`). Always import shared schemas and types through the `@helpdesk/core` package.
- **Mandatory Enforced Architecture**:
  1. **Core Package Structure**:
     - `core/src/enums.ts`: Domain enums (`Role`, `UserRole`).
     - `core/src/schemas/user.ts`: Domain-specific Zod validation schemas (`createUserSchema`, `updateUserSchema`) and exported input/output types (`CreateUserInput = z.input<typeof createUserSchema>`, `CreateUserOutput = z.output<typeof createUserSchema>`).
     - `core/src/index.ts`: Central barrel exporting all enums and schemas.
  2. **Server-Side Consumption**:
     - Route handlers and schemas (e.g., [`server/routes/users.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/server/routes/users.ts), [`server/schemas.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/server/schemas.ts)) import schemas directly from `@helpdesk/core`.
     - Validate incoming request bodies using `createUserSchema.safeParse(req.body)` which returns the transformed `CreateUserOutput` data with defaults applied.
  3. **Client-Side Consumption**:
     - React forms (e.g., [`UsersPage.tsx`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/client/src/components/UsersPage.tsx)) import schemas and types directly from `@helpdesk/core` (`import { createUserSchema, CreateUserInput, Role } from '@helpdesk/core';`).
     - Initialize forms using `useForm<CreateUserInput>({ resolver: zodResolver(createUserSchema) })` (using `z.input` to match the resolver's input schema signature and avoid type mismatches with default values) to guarantee 100% type safety and identical validation logic across frontend and backend.

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
Every ticket must belong to **exactly one** category:
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
| **Backend API** | **Express.js + Node.js (TypeScript)** | RESTful API server, webhooks, auth middleware, AI services |
| **Database & ORM** | **PostgreSQL + Prisma ORM + `pgvector`** | Relational data (`User`, `Session`, `Ticket`, `Message`) + vector embeddings search |
| **Authentication** | **Database-backed Sessions (Prisma)** | Server-managed session store enabling instant admin session revocation |
| **AI / LLM Engine** | **Google Gemini API** (`@google/genai`) | `gemini-1.5-flash` for classification, summaries & draft generation; `text-embedding-004` for RAG |
| **Email Gateway** | **SendGrid / Mailgun** | Inbound parse webhooks (`Message-ID`, `In-Reply-To`) & outbound REST API |
| **Runtime & Dev Tools** | **Bun / ts-node / Docker** | High-performance execution & containerized local postgres development |

---

## 5. Project Structure & Directory Layout

```
e:\claude_ai\Ticket Management System\
├── .gitignore                  # Git ignore rules for node_modules, environments & test reports
├── claude.md                   # Global workspace memory file & guidelines
└── Helpdesk/
    ├── core/                   # Shared TypeScript package (@helpdesk/core)
    │   ├── src/
    │   │   ├── enums.ts        # Shared domain enums (Role, UserRole)
    │   │   ├── schemas/        # Shared domain Zod validation schemas (user.ts, etc.)
    │   │   └── index.ts        # Central export entrypoint
    │   ├── package.json        # Core package definition (@helpdesk/core)
    │   └── tsconfig.json       # Core TypeScript configuration
    ├── client/                 # React 18 + Vite frontend
    │   ├── src/
    │   │   ├── components/     # Application components & views
    │   │   │   ├── ui/         # shadcn/ui primitives (badge, button, card, input, label, alert)
    │   │   │   ├── HomePage.tsx  # Main agent ticket workspace dashboard
    │   │   │   ├── LoginPage.tsx # Modernized login screen with role credentials hint (Zod validation)
    │   │   │   ├── Navbar.tsx    # App navigation header with session user details & sign-out
    │   │   │   └── UsersPage.tsx # Admin user management directory (Zod validation)
    │   │   ├── lib/
    │   │   │   ├── hooks/
    │   │   │   │   ├── useAuth.ts # React Query hooks for session & auth lifecycle
    │   │   │   │   ├── useTickets.ts # React Query hooks for tickets, agents & messaging
    │   │   │   │   └── useUsers.ts # React Query hooks for user CRUD management
    │   │   │   ├── api-client.ts  # Centralized Axios client instance with credentials
    │   │   │   ├── auth-client.ts # Client authentication helper (Better Auth client wrapper)
    │   │   │   ├── query-client.ts # TanStack React Query client instance & default cache policies
    │   │   │   ├── tickets-api.ts # Typed API service for tickets, agents & replies
    │   │   │   ├── users-api.ts   # Typed API service for user endpoints using axios
    │   │   │   └── utils.ts       # Class merging utilities (clsx + tailwind-merge)
    │   │   ├── App.tsx         # Main application root & session router
    │   │   ├── main.tsx        # React DOM entry point with QueryClientProvider
    │   │   └── index.css       # Tailwind directives & global font styles
    │   ├── components.json     # shadcn/ui configuration file
    │   ├── package.json        # Client dependencies & Vite scripts (zod, @hookform/resolvers)
    │   ├── tailwind.config.js  # Tailwind CSS configuration with Slate theme & UI colors
    │   ├── tsconfig.json       # Client TypeScript configuration with @/* path alias
    │   └── vite.config.ts      # Vite dev server setup & path alias resolver
    ├── server/                 # Express backend API
    │   ├── middleware/
    │   │   ├── auth.ts         # Session verification (requireAuth) & RBAC (requireRole)
    │   │   └── rate-limiter.ts # Production-only rate limiting middleware (express-rate-limit)
    │   ├── routes/
    │   │   └── users.ts        # Modular Express router for /api/users CRUD endpoints
    │   ├── auth.ts             # Better Auth server configuration with Prisma adapter
    │   ├── db.ts               # Prisma client instance & PostgreSQL health check
    │   ├── index.ts            # Express server entry point, middleware & route mounting
    │   ├── schemas.ts          # Centralized Zod validation schemas for all API payloads
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
    ├── package.json            # Root dependencies & execution scripts (zod installed)
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
  - Structure all API endpoints as strongly-typed service objects in `client/src/lib/*-api.ts` (e.g., `usersApi` in `users-api.ts`).
  - Standardize error extraction: parse `error.response?.data?.error || error.response?.data?.message || error.message` before throwing.
- **TanStack React Query (`@tanstack/react-query`)**:
  - Encapsulate server-state queries and mutations within dedicated custom hooks inside `client/src/lib/hooks/` (e.g., `useUsers.ts`, `useAuth.ts`).
  - Query Keys: Define typed tuple constants (e.g., `export const USERS_QUERY_KEY = ['users'] as const;`). Append parameters (filters, pagination) to the query key array (`[...USERS_QUERY_KEY, params]`) to trigger automatic reactive re-fetching.
  - Mutations (`useMutation`): Execute all write/update/delete operations with `useMutation` and invalidate corresponding query keys on success (`queryClient.invalidateQueries({ queryKey: ... })`).
  - Cache Policies (`client/src/lib/query-client.ts`): Set to `staleTime: 2 minutes`, `gcTime: 10 minutes`, `retry: 1`, and `refetchOnWindowFocus: false`.
  - **UI States**: Always handle `isLoading` / `isPending` and `isError` / `error` states gracefully with loaders and alert banners.

### 6.6 Data Validation Architecture (Zod)
- **Centralized Backend Schemas (`server/schemas.ts`)**:
  - Request validation across all Express routes (`POST /api/users`, `PATCH /api/users/:id`, `POST /api/tickets`, `PATCH /api/tickets/:id`, `POST /api/tickets/:id/messages`) is handled via `schema.safeParse(req.body)`.
  - Schema errors return HTTP 400 Bad Request with the primary validation issue message (`res.status(400).json({ error: result.error.issues[0].message })`).
  - Schemas provide inferred TypeScript types via `z.infer<typeof schema>`.
- **Client-Side Form Validation (`zod` + `@hookform/resolvers/zod`)**:
  - React Hook Form integrations bind schemas via `zodResolver(schema)`.
  - Form validation errors are mapped directly to input field alerts without server roundtrips.

---

## 7. Testing Architecture (Playwright E2E & React Testing Library)

- **Component Tests**: Authored using Vitest + React Testing Library under `client/src/**/__tests__/*.test.tsx`. Run with `npm run test:client` or watch mode `npm run test:client:watch` (UI mode: `npm run test:client:ui`).
- **Isolated Test Database**: Tests execute against an isolated database (`helpdesk_test`) specified in `.env.test`.
- **Dedicated Test Server Port**: Backend test server runs on `PORT=5001` via Playwright `webServer` config.
- **Global Test Setup**: `e2e/setup/global-setup.ts` creates the test database, pushes Prisma migrations, and seeds test accounts before test execution.
- **Test Specs**:
  - `e2e/auth.spec.ts`: Sign-in, sign-out, session lifecycle, invalid credentials alerts, and client Zod validation.
  - `e2e/users.spec.ts`: Happy path CRUD operations for user management (Create user, Read directory, Update profile & password, Delete user, Full CRUD lifecycle).
  - `e2e/rbac-navigation.spec.ts`: Admin directory access vs. Agent restricted access views and return navigation.
  - `e2e/api.spec.ts`: Health check, 401 unauthenticated security, 403 Agent forbidden checks, inbound ticket creation with AI draft response, and message replies.

### 7.1 Instructions for Using `e2e-test-writer` Subagent
When creating, maintaining, or refactoring Playwright E2E tests:
1. **Delegate to Subagent**: Invoke `playwright-e2e-tester` / `e2e-test-writer` via `invoke_subagent`.
2. **Directory Standard**: All test specs must be authored in `Helpdesk/e2e/*.spec.ts`.
3. **Best Practices**:
   - Use semantic selectors (`page.getByRole`, `page.getByText`, `page.locator`).
   - Use web-first assertions with auto-waiting (`expect(locator).toBeVisible({ timeout: ... })`) without manual sleeps.
   - Clean state and cookies before each test case (`test.beforeEach`).
   - Use default seeded accounts (`admin@example.com` / `password123` and `agent@example.com` / `password123`).


