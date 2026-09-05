# Memory File & Project Guidelines (`claude.md`)

This memory file contains project architectural specifications, technical stack details, database schema, project structure, backend API endpoints, authentication specifications, development workflow instructions, key conventions, and documentation retrieval rules.

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

### Core Enums & Categories
- **Category (Single Selection)**:
  1. `GENERAL_QUESTION`: Courses, schedules, general policies, and procedures.
  2. `TECHNICAL_QUESTION`: Portal logins, platform bugs, access errors, troubleshooting.
  3. `REFUND_REQUEST`: Billing inquiries, refund claims, payment adjustments.
- **Role**: `ADMIN`, `AGENT`
- **Priority**: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- **TicketStatus**: `NEW`, `ASSIGNED`, `IN_PROGRESS`, `PENDING_STUDENT`, `RESOLVED`, `CLOSED`
- **SenderType**: `STUDENT`, `AGENT`, `SYSTEM`

---

## 3. Technical Stack

| Layer | Technology | Key Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18 + Vite** | Responsive client dashboard, TypeScript, component architecture |
| **UI Components & Styling** | **shadcn/ui + Tailwind CSS** | Custom UI primitives (Button, Card, Input, Label, Badge, Alert) with Slate theme & `@/*` path alias |
| **Data Fetching & State** | **Axios + TanStack React Query** | Centralized HTTP client (`apiClient`) and declarative server-state management (`useQuery`, `useMutation`) with caching |
| **Icons** | **Lucide React** | Clean, modern iconography across client dashboard and authentication pages |
| **Backend API** | **Express.js + Node.js (TypeScript)** | RESTful API server, webhooks, auth middleware, ticket workflow management |
| **Database & ORM** | **PostgreSQL + Prisma ORM + `pgvector`** | Relational data (`User`, `Session`, `Account`, `Verification`, `Ticket`, `TicketMessage`, `KnowledgeBaseDocument`) + vector embeddings |
| **Authentication** | **Better Auth + Database Sessions** | Server-managed session store (`better-auth`), RBAC middleware (`requireAuth`), instant session revocation |
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
    │   │   │   ├── hooks/
    │   │   │   │   ├── useAuth.ts # React Query hooks for session & auth lifecycle
    │   │   │   │   └── useUsers.ts # React Query hooks for user CRUD management
    │   │   │   ├── api-client.ts  # Centralized Axios client instance with credentials
    │   │   │   ├── auth-client.ts # Client authentication helper (Better Auth client wrapper)
    │   │   │   ├── query-client.ts # TanStack React Query client instance & default cache policies
    │   │   │   ├── users-api.ts   # Typed API service for user endpoints using axios
    │   │   │   └── utils.ts       # Class merging utilities (clsx + tailwind-merge)
    │   │   ├── App.tsx         # Main application root & session router
    │   │   ├── main.tsx        # React DOM entry point with QueryClientProvider
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

---

## 5. Authentication Architecture & Specifications

### 5.1 System Overview
Authentication in the Helpdesk application is powered by **Better Auth** (`better-auth`) integrated with **Prisma ORM** (`better-auth/adapters/prisma`) over a PostgreSQL database. It utilizes **server-managed database sessions** stored in the `session` table to enable instant session revocation and full administrative session control.

### 5.2 Backend Configuration (`server/auth.ts` & `server/index.ts`)
- **Library Adapter**: Prisma adapter (`prismaAdapter(prisma, { provider: "postgresql" })`).
- **Security Policy**:
  - `disableSignUp: true`: Public signups are explicitly disabled to prevent unauthorized user registrations.
  - `trustedOrigins`: Configured to allow client origins (`http://localhost:5173`).
- **Express Integration**:
  - Router mounted at `app.all('/api/auth/*', toNodeHandler(auth))` **before** standard Express JSON body parsers (`express.json()`).
  - CORS middleware configured with `origin: 'http://localhost:5173'` and `credentials: true`.

### 5.3 Authentication & RBAC Middleware (`server/middleware/auth.ts`)
- **Session Verification (`requireAuth`)**:
  - Extracts request headers using `fromNodeHeaders(req.headers)`.
  - Verifies session validity against database using `auth.api.getSession()`.
  - Attaches `req.user` and `req.session` to the Express Request object.
  - Returns HTTP 401 Unauthorized if unauthenticated.
- **Role-Based Access Control (`requireRole`)**:
  - Verifies `req.user.role` against required roles (`Role.ADMIN`, `Role.AGENT`).
  - Returns HTTP 403 Forbidden if user lacks required role permissions.

### 5.4 Client Authentication Integration (`client/src/lib/auth-client.ts` & `App.tsx`)
- **`authClient` Helper**:
  - `getSession()`: Queries `/api/auth/get-session` with `credentials: 'include'` to restore user session state.
  - `signIn(email, password)`: Posts to `/api/auth/sign-in/email` with user credentials.
  - `signOut()`: Posts to `/api/auth/sign-out` and clears local state.
- **Application State & Routing (`App.tsx`)**:
  - Full-screen loading spinner (`Loader2`) rendered while `getSession()` resolves.
  - Unauthenticated users are routed to `LoginPage`.
  - Authenticated users are routed to `Navbar` + `HomePage` dashboard.

### 5.5 Database Seeding & Credential Hashing (`prisma/seed.ts`)
- **Credential Storage**: Account credentials are stored in the `account` table with `providerId: 'credential'` and `issuer: 'local:credential'`.
- **Password Security**: Passwords are hashed using Better Auth's native `hashPassword` function from `better-auth/crypto`.
- **Default Seed Accounts**:
  - **Admin**: `admin@example.com` (Password: `password123`, Role: `ADMIN`)
  - **Agent**: `agent@example.com` (Password: `password123`, Role: `AGENT`)

### 5.6 Rate Limiting Architecture (`server/middleware/rate-limiter.ts`)
- **Production-Only Enforcement**: Rate limiters strictly enforce request ceilings when `NODE_ENV === 'production'`. In `development` and `test` environments, all rate limit checks are completely bypassed (`skip` returning `true`).
- **Reverse Proxy Trust**: When running in production, Express sets `trust proxy: 1` to resolve client IPs behind load balancers/proxies.
- **Limiters Configured**:
  - `apiLimiter`: Standard 100 req/15 min on `/api/` (configurable via `RATE_LIMIT_MAX`). Health endpoint (`/api/health`) is exempted from rate limiting to prevent uptime monitoring interference.
  - `authLimiter`: 20 req/15 min on `/api/auth/*` (configurable via `AUTH_RATE_LIMIT_MAX`) to mitigate brute-force credential attacks.
  - `ticketCreationLimiter`: 10 req/min on `POST /api/tickets` (configurable via `TICKET_RATE_LIMIT_MAX`) to prevent spam submissions.
- **Headers**: Conforms to IETF `draft-7` standards (`RateLimit-*` headers) and disables legacy `X-RateLimit-*` headers.

---

## 6. Client Data Fetching & Server-State Architecture (Axios + React Query)

All frontend network communication and server-state caching must strictly adhere to the following conventions:

### 6.1 Centralized Axios Client (`client/src/lib/api-client.ts`)
- **HTTP Client**: Always import and use the centralized `apiClient` instance from `src/lib/api-client`. Do **NOT** use native `fetch()` or construct ad-hoc `axios.create()` instances across components.
- **Session Credentials**: The `apiClient` is preconfigured with `withCredentials: true` and default JSON headers to ensure Better Auth session cookies are sent on every request.
- **API Services Layer**: All API endpoint interactions must be organized into typed service objects in `client/src/lib/*-api.ts` (e.g., `usersApi` in `client/src/lib/users-api.ts`, `authClient` in `client/src/lib/auth-client.ts`). Keep UI components decoupled from HTTP transport details.
- **Standardized Error Handling**: Extract backend error messages uniformly in API service methods:
  ```ts
  const message = error.response?.data?.error || error.response?.data?.message || error.message || 'An unexpected error occurred';
  throw new Error(message);
  ```

### 6.2 TanStack React Query (`@tanstack/react-query`)
- **Custom Hooks Pattern**: Always encapsulate queries and mutations into dedicated custom hooks under `client/src/lib/hooks/` (e.g., `useUsers.ts`, `useAuth.ts`, `useTickets.ts`). Do **NOT** call `useQuery` / `useMutation` directly inside raw view components without dedicated hook abstractions.
- **Query Key Conventions**:
  - Define query keys as typed `const` arrays:
    ```ts
    export const USERS_QUERY_KEY = ['users'] as const;
    export const TICKETS_QUERY_KEY = ['tickets'] as const;
    ```
  - For parameterized queries (filters, search, pagination), append the parameter object to the key array to ensure automatic cache segregation and reactive re-fetching:
    ```ts
    export function useUsers(params?: { search?: string; role?: string; status?: string }) {
      return useQuery({
        queryKey: [...USERS_QUERY_KEY, params],
        queryFn: () => usersApi.listUsers(params),
      });
    }
    ```
- **Mutations & Cache Invalidation**:
  - Perform all write/update/delete operations via `useMutation`.
  - Invalidate affected query keys in `onSuccess` using `queryClient.invalidateQueries({ queryKey: ... })` to keep client UI synchronized with the database:
    ```ts
    export function useCreateUser() {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: (payload: CreateUserPayload) => usersApi.createUser(payload),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
        },
      });
    }
    ```
  - For immediate state updates (e.g., login/logout session transitions), use `queryClient.setQueryData` to optimistically update the cache.
- **Global QueryClient Defaults (`client/src/lib/query-client.ts`)**:
  - `staleTime: 1000 * 60 * 2` (2 minutes): Avoids unnecessary duplicate network requests while navigating.
  - `gcTime: 1000 * 60 * 10` (10 minutes): Keeps inactive data cached in memory.
  - `retry: 1`: Single retry for network failures.
  - `refetchOnWindowFocus: false`: Prevents jarring re-renders when switching browser tabs.
- **UI State Handling**:
  - Always handle `isLoading` / `isPending` states with visual feedback (`Loader2` spinner, skeleton loaders).
  - Handle `isError` / `error` states gracefully with user-friendly alerts.

---

## 7. Key Conventions & API Summary

### API Endpoints Summary
- **Health & Auth**:
  - `GET /api/health`: Server and PostgreSQL database connectivity check.
  - `ALL /api/auth/*`: Better Auth endpoints (`/api/auth/sign-in/email`, `/api/auth/sign-out`, `/api/auth/get-session`).
  - `GET /api/me`: Authenticated user profile and session data (protected by `requireAuth`).
- **Agents & Tickets**:
  - `GET /api/agents`: Retrieves list of active support agents for ticket assignment.
  - `GET /api/tickets`: Retrieves all tickets with assigned agent details and message history.
  - `POST /api/tickets`: Ingests/creates a new ticket and generates initial AI draft response.
  - `PATCH /api/tickets/:id`: Updates ticket status (`NEW`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, etc.) or assigns agent.
  - `POST /api/tickets/:id/messages`: Appends student/agent message or internal note to ticket thread.

### Frontend UI & Aesthetic Standards
- **Design System**: Built on shadcn/ui primitives (`@/components/ui/`) with Tailwind CSS.
- **Theme & Styling**: Default Slate theme palette, clean card borders (`border-slate-200`), accessible color contrast, and responsive layout.
- **State Handling**: Interactive loading states (`Loader2` spinners), badge indicators for ticket status/priority, and notification alerts.

---

## 8. Playwright E2E Testing & Test Database Configuration

### 8.1 Architecture & Isolation
- **Separate Database**: Tests execute against an isolated PostgreSQL database (`helpdesk_test`) specified in `.env.test` (`DATABASE_URL="postgresql://postgres:...@localhost:5432/helpdesk_test?schema=public"`).
- **Test Server Port**: The test backend server runs on `PORT=5001` (to avoid conflicting with the development server on port 5000).
- **Global Setup (`e2e/setup/global-setup.ts`)**:
  - Automatically provisions the `helpdesk_test` database if not present.
  - Pushes the Prisma schema to `helpdesk_test` (`npx prisma db push`).
  - Seeds default test accounts (`admin@example.com` / `password123` and `agent@example.com` / `password123`).
- **WebServers (`playwright.config.ts`)**:
  - Playwright coordinates starting both the isolated Express test server (`PORT=5001`) and Vite client (`http://localhost:5173`) with proxy routing to the test server.

### 7.2 Testing Commands
From `Helpdesk/`:
- `npm run test:e2e`: Runs all Playwright E2E tests in headless mode.
- `npm run test:e2e:ui`: Launches interactive Playwright UI Test Runner.
- `npm run test:e2e:headed`: Runs tests with visible browser window.
- `npm run db:test:setup`: Manually syncs and seeds the `helpdesk_test` database.
- `npm run db:test:reset`: Resets the test database schema using Prisma migrate.

### 7.3 Instructions for Using `e2e-test-writer` Subagent
When writing, updating, or maintaining Playwright E2E tests, delegate the task to the specialized **`e2e-test-writer`** (or `playwright-e2e-tester`) subagent.

- **Role & Capabilities**:
  - Authored for Playwright + TypeScript test automation across frontend UI and backend REST API endpoints.
  - Generates resilient tests using semantic locators (`page.getByRole`, `page.getByText`, `page.locator`).
  - Implements auto-waiting assertions (`expect(locator).toBeVisible({ timeout: ... })`) without arbitrary sleep calls.
  - Implements multi-role context tests (Admin vs. Agent) with session isolation (`test.beforeEach`).
- **Invocation Guidelines**:
  - Invoke the subagent using `invoke_subagent` with `TypeName: "playwright-e2e-tester"` or `"e2e-test-writer"`.
  - Provide a clear prompt detailing the feature to test (e.g., UI forms, API routes, RBAC boundaries, state transitions).
  - Target all new test specs to the [`Helpdesk/e2e/`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/e2e) directory.
- **Key Test Standards for the Subagent**:
  - Test specs must be saved inside `Helpdesk/e2e/*.spec.ts`.
  - Rely on the isolated test environment (`.env.test`, test server on `PORT=5001`, client on `PORT=5173`).
  - Use seeded test accounts (`admin@example.com` / `password123` and `agent@example.com` / `password123`).
  - Keep test cases atomic and parallel-safe.


