# Memory File & Project Guidelines (`claude.md`)

This memory file contains project architectural specifications, technical stack details, database schema, project structure, backend API endpoints, authentication specifications, development workflow instructions, key conventions, and documentation retrieval rules.

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
  - Maintain centralized Zod schemas in [`server/schemas.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/server/schemas.ts) for every mutable REST endpoint (`POST /api/users`, `PATCH /api/users/:id`, `POST /api/tickets`, `PATCH /api/tickets/:id`, `POST /api/tickets/:id/messages`).
  - Validate incoming payloads using `schema.safeParse(req.body)`.
  - On validation error, return HTTP 400 Bad Request with the primary issue message: `return res.status(400).json({ error: result.error.issues[0].message });`.
  - Infer and export TypeScript types directly from schemas using `z.infer<typeof schema>`.

### 1.3 Mandatory Enum Usage: Role Enum Enforcement
> **CRITICAL INSTRUCTION**: All references to user roles across the frontend application, backend services, validation schemas, unit/integration tests, and database scripts **MUST** strictly use the strongly-typed **`Role` enum** (`Role.ADMIN`, `Role.AGENT`) rather than raw hardcoded magic strings (`"ADMIN"`, `"AGENT"`).

- **Strict Prohibitions**:
  - ❌ **NO Raw Role Strings**: Never hardcode `"ADMIN"` or `"AGENT"` strings in JSX badges, component comparisons, form payloads, query filters, API client signatures, custom hooks, route handlers, schema defaults, or test assertions.
- **Mandatory Enforced Architecture**:
  1. **Frontend App & Components**: Always import `Role` from [`client/src/lib/types.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/client/src/lib/types.ts) (or `@helpdesk/core`). Use `Role.ADMIN` and `Role.AGENT` everywhere:
     - **Component Role Checks & RBAC**: e.g., `user?.role === Role.ADMIN`, `item.role !== Role.ADMIN`.
     - **JSX Text & Badge Rendering**: e.g., `<span>{Role.ADMIN}</span>`, `<span>{Role.AGENT}</span>`.
     - **Form Payloads & Mutations**: e.g., `role: Role.AGENT`, `role: userToEdit.role`.
     - **API Service & React Query Hook Parameters**: e.g., `role?: Role | 'ALL' | string` in `usersApi.listUsers` and `useUsers`.
     - **Frontend Interfaces**: e.g., `AuthUser`, `ManagedUser`, `CreateUserPayload`, `UpdateUserPayload`, `TicketAgent`.
     - **Unit & Component Tests**: Assert rendered role labels using `{Role.ADMIN}` and `{Role.AGENT}` (e.g., `expect(screen.getByText(Role.ADMIN)).toBeInTheDocument()`).
  2. **Backend Schemas & Validation**: In [`server/schemas.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/server/schemas.ts) and [`core/src/schemas/user.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/core/src/schemas/user.ts), use `z.nativeEnum(Role)` with `.default(Role.AGENT)` to guarantee type-safe parsing.
  3. **Route Handlers & Auth**: In [`server/index.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/server/index.ts), [`server/routes/users.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/server/routes/users.ts), and [`server/auth.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/server/auth.ts), reference `Role.ADMIN` and `Role.AGENT` for permission enforcement (`requireRole(Role.ADMIN)`), session initialization, and database queries.
  4. **Scripts & Seeders**: In database seeds ([`prisma/seed.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/prisma/seed.ts)) and CLI management scripts ([`scripts/create-user.ts`](file:///E:/claude_ai/Ticket%20Management%20System/Helpdesk/scripts/create-user.ts)), always use `Role.AGENT` and `Role.ADMIN`.

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

## 4. Technical Stack

| Layer | Technology | Key Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18 + Vite** | Responsive client dashboard, TypeScript, component architecture |
| **UI Components & Styling** | **shadcn/ui + Tailwind CSS** | Custom UI primitives (Button, Card, Input, Label, Badge, Alert) with Slate theme & `@/*` path alias |
| **Data Validation** | **Zod** | TypeScript-first schema validation for client-side forms & backend API request bodies with static type inference |
| **Data Fetching & State** | **Axios + TanStack React Query** | Centralized HTTP client (`apiClient`) and declarative server-state management (`useQuery`, `useMutation`) with caching |
| **Icons** | **Lucide React** | Clean, modern iconography across client dashboard and authentication pages |
| **Backend API** | **Express.js + Node.js (TypeScript)** | RESTful API server, webhooks, auth middleware, ticket workflow management |
| **Database & ORM** | **PostgreSQL + Prisma ORM + `pgvector`** | Relational data (`User`, `Session`, `Account`, `Verification`, `Ticket`, `TicketMessage`, `KnowledgeBaseDocument`) + vector embeddings |
| **Authentication** | **Better Auth + Database Sessions** | Server-managed session store (`better-auth`), RBAC middleware (`requireAuth`), instant session revocation |
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

## 6. Authentication Architecture & Specifications

### 6.1 System Overview
Authentication in the Helpdesk application is powered by **Better Auth** (`better-auth`) integrated with **Prisma ORM** (`better-auth/adapters/prisma`) over a PostgreSQL database. It utilizes **server-managed database sessions** stored in the `session` table to enable instant session revocation and full administrative session control.

### 6.2 Backend Configuration (`server/auth.ts` & `server/index.ts`)
- **Library Adapter**: Prisma adapter (`prismaAdapter(prisma, { provider: "postgresql" })`).
- **Security Policy**:
  - `disableSignUp: true`: Public signups are explicitly disabled to prevent unauthorized user registrations.
  - `trustedOrigins`: Configured to allow client origins (`http://localhost:5173`).
- **Express Integration**:
  - Router mounted at `app.all('/api/auth/*', toNodeHandler(auth))` **before** standard Express JSON body parsers (`express.json()`).
  - CORS middleware configured with `origin: 'http://localhost:5173'` and `credentials: true`.

### 6.3 Authentication & RBAC Middleware (`server/middleware/auth.ts`)
- **Session Verification (`requireAuth`)**:
  - Extracts request headers using `fromNodeHeaders(req.headers)`.
  - Verifies session validity against database using `auth.api.getSession()`.
  - Attaches `req.user` and `req.session` to the Express Request object.
  - Returns HTTP 401 Unauthorized if unauthenticated.
- **Role-Based Access Control (`requireRole`)**:
  - Verifies `req.user.role` against required roles (`Role.ADMIN`, `Role.AGENT`).
  - Returns HTTP 403 Forbidden if user lacks required role permissions.

### 6.4 Client Authentication Integration (`client/src/lib/auth-client.ts` & `App.tsx`)
- **`authClient` Helper**:
  - `getSession()`: Queries `/api/auth/get-session` with `credentials: 'include'` to restore user session state.
  - `signIn(email, password)`: Posts to `/api/auth/sign-in/email` with user credentials.
  - `signOut()`: Posts to `/api/auth/sign-out` and clears local state.
- **Application State & Routing (`App.tsx`)**:
  - Full-screen loading spinner (`Loader2`) rendered while `getSession()` resolves.
  - Unauthenticated users are routed to `LoginPage`.
  - Authenticated users are routed to `Navbar` + `HomePage` dashboard.

### 6.5 Database Seeding & Credential Hashing (`prisma/seed.ts`)
- **Credential Storage**: Account credentials are stored in the `account` table with `providerId: 'credential'` and `issuer: 'local:credential'`.
- **Password Security**: Passwords are hashed using Better Auth's native `hashPassword` function from `better-auth/crypto`.
- **Default Seed Accounts**:
  - **Admin**: `admin@example.com` (Password: `password123`, Role: `ADMIN`)
  - **Agent**: `agent@example.com` (Password: `password123`, Role: `AGENT`)

### 6.6 Rate Limiting Architecture (`server/middleware/rate-limiter.ts`)
- **Production-Only Enforcement**: Rate limiters strictly enforce request ceilings when `NODE_ENV === 'production'`. In `development` and `test` environments, all rate limit checks are completely bypassed (`skip` returning `true`).
- **Reverse Proxy Trust**: When running in production, Express sets `trust proxy: 1` to resolve client IPs behind load balancers/proxies.
- **Limiters Configured**:
  - `apiLimiter`: Standard 100 req/15 min on `/api/` (configurable via `RATE_LIMIT_MAX`). Health endpoint (`/api/health`) is exempted from rate limiting to prevent uptime monitoring interference.
  - `authLimiter`: 20 req/15 min on `/api/auth/*` (configurable via `AUTH_RATE_LIMIT_MAX`) to mitigate brute-force credential attacks.
  - `ticketCreationLimiter`: 10 req/min on `POST /api/tickets` (configurable via `TICKET_RATE_LIMIT_MAX`) to prevent spam submissions.
- **Headers**: Conforms to IETF `draft-7` standards (`RateLimit-*` headers) and disables legacy `X-RateLimit-*` headers.

---

## 7. Client Data Fetching & Server-State Architecture (Axios + React Query)

All frontend network communication and server-state caching must strictly adhere to the following conventions:

### 7.1 Centralized Axios Client (`client/src/lib/api-client.ts`)
- **HTTP Client**: Always import and use the centralized `apiClient` instance from `src/lib/api-client`. Do **NOT** use native `fetch()` or construct ad-hoc `axios.create()` instances across components.
- **Session Credentials**: The `apiClient` is preconfigured with `withCredentials: true` and default JSON headers to ensure Better Auth session cookies are sent on every request.
- **API Services Layer**: All API endpoint interactions must be organized into typed service objects in `client/src/lib/*-api.ts` (e.g., `usersApi` in `client/src/lib/users-api.ts`, `authClient` in `client/src/lib/auth-client.ts`). Keep UI components decoupled from HTTP transport details.
- **Standardized Error Handling**: Extract backend error messages uniformly in API service methods:
  ```ts
  const message = error.response?.data?.error || error.response?.data?.message || error.message || 'An unexpected error occurred';
  throw new Error(message);
  ```

### 7.2 TanStack React Query (`@tanstack/react-query`)
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

## 8. Data Validation Architecture (Zod)

All runtime data validation across the Helpdesk application is centralized and enforced using **Zod** (`zod`).

### 8.1 Server-Side Payload Validation (`server/schemas.ts`)
- **Central Schema Repository**: All API request bodies are validated against centralized Zod schemas before database interactions or business logic execution.
- **Safe Parsing (`safeParse`)**: Route handlers invoke `schema.safeParse(req.body)` to guarantee runtime type safety without unhandled exceptions.
- **Standardized Error Formatting**: If validation fails, the API immediately responds with HTTP 400 Bad Request:
  ```ts
  const validationResult = createUserSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ error: validationResult.error.issues[0].message });
  }
  const validatedData = validationResult.data;
  ```
- **Registered Backend Schemas**:
  - `createUserSchema`: Validates `name` (min 3 chars), `email` (valid email), `password` (min 8 chars), `role` (`ADMIN` | `AGENT`), and `isActive` boolean.
  - `updateUserSchema`: Validates optional user updates (`name`, `role`, `isActive`, `password`).
  - `createTicketSchema`: Validates student inquiries (`studentEmail`, `subject`, `message`, `category`, `priority`).
  - `updateTicketSchema`: Validates status transitions (`status`) and agent assignments (`assignedAgentId`).
  - `createTicketMessageSchema`: Validates thread messages (`body` required, `isInternalNote`).

### 8.2 Client-Side Form Validation (`zod` + `@hookform/resolvers/zod`)
- **Integration with React Hook Form**: Complex forms (such as `LoginPage.tsx`) bind Zod schemas via `zodResolver(schema)`.
- **Static Type Inference**: Form types are inferred directly from schemas using `type FormValues = z.infer<typeof schema>;`.
- **Immediate Inline User Feedback**: Input fields dynamically display validation issue messages on blur/change without requiring roundtrips to the server.

---

## 9. Key Conventions & API Summary

### API Endpoints Summary
- **Health & Auth**:
  - `GET /api/health`: Server and PostgreSQL database connectivity check.
  - `ALL /api/auth/*`: Better Auth endpoints (`/api/auth/sign-in/email`, `/api/auth/sign-out`, `/api/auth/get-session`).
  - `GET /api/me`: Authenticated user profile and session data (protected by `requireAuth`).
- **Agents & Tickets**:
  - `GET /api/agents`: Retrieves list of active support agents for ticket assignment.
  - `GET /api/tickets`: Retrieves all tickets with assigned agent details and message history.
  - `POST /api/tickets`: Ingests/creates a new ticket and generates initial AI draft response (validated by Zod).
  - `PATCH /api/tickets/:id`: Updates ticket status or assigns agent (validated by Zod).
  - `POST /api/tickets/:id/messages`: Appends student/agent message or internal note to ticket thread (validated by Zod).
- **Admin Directory**:
  - `GET /api/users`: Retrieves all users (Admin only).
  - `POST /api/users`: Creates new user account (Admin only, validated by Zod).
  - `PATCH /api/users/:id`: Updates user details/role/password (Admin only, validated by Zod).
  - `DELETE /api/users/:id`: Deletes user account (Admin only).

### Frontend UI & Aesthetic Standards
- **Design System**: Built on shadcn/ui primitives (`@/components/ui/`) with Tailwind CSS.
- **Theme & Styling**: Default Slate theme palette, clean card borders (`border-slate-200`), accessible color contrast, and responsive layout.
- **State Handling**: Interactive loading states (`Loader2` spinners), badge indicators for ticket status/priority, and notification alerts.

---

## 10. Playwright E2E Testing & Test Database Configuration

### 10.1 Architecture & Isolation
- **Separate Database**: Tests execute against an isolated PostgreSQL database (`helpdesk_test`) specified in `.env.test` (`DATABASE_URL="postgresql://postgres:...@localhost:5432/helpdesk_test?schema=public"`).
- **Test Server Port**: The test backend server runs on `PORT=5001` (to avoid conflicting with the development server on port 5000).
- **Global Setup (`e2e/setup/global-setup.ts`)**:
  - Automatically provisions the `helpdesk_test` database if not present.
  - Pushes the Prisma schema to `helpdesk_test` (`npx prisma db push`).
  - Seeds default test accounts (`admin@example.com` / `password123` and `agent@example.com` / `password123`).
- **WebServers (`playwright.config.ts`)**:
  - Playwright coordinates starting both the isolated Express test server (`PORT=5001`) and Vite client (`http://localhost:5173`) with proxy routing to the test server.
- **Test Specs (`Helpdesk/e2e/*.spec.ts`)**:
  - `e2e/auth.spec.ts`: Sign-in, sign-out, session lifecycle, invalid credentials alerts, and client Zod validation.
  - `e2e/users.spec.ts`: Happy path CRUD operations for user management (Create user, Read directory, Update profile & password, Delete user, Full CRUD lifecycle).
  - `e2e/rbac-navigation.spec.ts`: Admin directory access vs. Agent restricted access views and return navigation.
  - `e2e/api.spec.ts`: Health check, 401 unauthenticated security, 403 Agent forbidden checks, inbound ticket creation with AI draft response, and message replies.

### 10.2 Testing Commands
From `Helpdesk/`:
- `npm run test:client`: Runs all Vitest + React Testing Library frontend component tests.
- `npm run test:client:watch`: Runs Vitest in interactive watch mode for component test writing / TDD.
- `npm run test:client:ui`: Opens interactive visual Vitest UI in browser.
- `npm run test:e2e`: Runs all Playwright E2E tests in headless mode.
- `npm run test:e2e:ui`: Launches interactive Playwright UI Test Runner.
- `npm run test:e2e:headed`: Runs tests with visible browser window.
- `npm run db:test:setup`: Manually syncs and seeds the `helpdesk_test` database.
- `npm run db:test:reset`: Resets the test database schema using Prisma migrate.

### 10.3 Instructions for Using `e2e-test-writer` Subagent
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


