# Render Deployment Guide: AI Ticket Management & Helpdesk System

This guide outlines how to deploy the **AI Ticket Management & Helpdesk System** to [Render](https://render.com) in production.

---

## 🏗️ Architecture Overview

The system is designed to run as a unified, cost-effective full-stack application on Render:
- **Backend**: Node.js & Express 5 API with Better Auth authentication.
- **Frontend**: React + Vite SPA served directly by the Express server in production.
- **Database**: Managed PostgreSQL with Prisma ORM and automated database migrations.
- **AI Engine**: Vercel AI SDK supporting **Google Gemini** (default: `gemini-3.5-flash-lite` / `gemini-2.5-flash`) and **OpenAI** (`gpt-5-nano` / `gpt-4o-mini`).
- **Background Queue**: `pg-boss` PostgreSQL-backed job queue with automatic event-loop fallback.
- **Error Tracking**: Sentry monitoring on both server and client.

---

## 🚀 Option 1: 1-Click Render Blueprint Deployment (Recommended)

The repository includes a ready-to-use [`render.yaml`](./render.yaml) file that automatically provisions the PostgreSQL database, Web Service, environment variables, secrets, and health checks.

### Steps:
1. Push this repository to your **GitHub** or **GitLab** account.
2. Log in to your [Render Dashboard](https://dashboard.render.com).
3. Click **New +** in the top right and select **Blueprint**.
4. Connect your Git repository and select the `main` branch.
5. Render will detect `render.yaml` and show the resources to create:
   - **`helpdesk-postgres`** (Managed PostgreSQL Database)
   - **`helpdesk-ai-system`** (Node Web Service)
6. Fill in your secret variables when prompted:
   - **`GEMINI_API_KEY`**: Your Google Gemini API Key from Google AI Studio (or set `AI_PROVIDER=openai` and provide `OPENAI_API_KEY`).
   - *(Optional)* **`MAILGUN_API_KEY`**, **`MAILGUN_DOMAIN`**, **`MAILGUN_SIGNING_KEY`**: If using live email ingestion and outbound sending.
   - *(Optional)* **`SENTRY_DSN`**: If using Sentry error tracking.
7. Click **Apply**. Render will automatically build the client, run migrations, and launch your live application!

---

## 🛠️ Option 2: Manual Setup via Render Dashboard

If you prefer to configure services manually via the Render UI:

### Step 1: Create PostgreSQL Database
1. In Render Dashboard, click **New +** -> **PostgreSQL**.
2. Name: `helpdesk-postgres`
3. Database: `helpdesk`
4. User: `helpdesk`
5. Plan: **Free** (or Starter for permanent persistence).
6. Click **Create Database**.
7. Once provisioned, copy the **Internal Database URL** (e.g., `postgres://helpdesk:...@dpg-xxx:5432/helpdesk`).

### Step 2: Create Web Service
1. Click **New +** -> **Web Service**.
2. Select your repository.
3. Configure the service settings:
   - **Name**: `helpdesk-ai-system`
   - **Region**: Same region as your PostgreSQL database (e.g., Frankfurt / Oregon / Ohio).
   - **Branch**: `main`
   - **Root Directory**: `Helpdesk` (or leave blank if using root scripts).
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm start`
   - **Plan**: **Free** (or Starter).

### Step 3: Add Environment Variables
In the **Environment** tab of your Web Service, add:

| Key | Value / Description |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *Paste your Render Internal Database URL* |
| `BETTER_AUTH_SECRET` | *Generate a 32+ character random string or click Generate* |
| `BETTER_AUTH_URL` | `https://your-service-name.onrender.com` |
| `AI_PROVIDER` | `gemini` *(or `openai`)* |
| `GEMINI_API_KEY` | *Your Google AI Studio API Key* |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` |
| `OPENAI_API_KEY` | *(Optional if using OpenAI)* |
| `ADMIN_EMAIL` | `admin@example.com` |
| `ADMIN_PASSWORD` | `password123` *(or choose a secure password)* |
| `AGENT_EMAIL` | `agent@example.com` |
| `AGENT_PASSWORD` | `password123` |
| `AI_AGENT_EMAIL` | `ai@example.com` |
| `AI_AGENT_PASSWORD` | `password123` |
| `SUPPORT_EMAIL` | `support@yourdomain.com` |
| `MAILGUN_API_KEY` | *(Optional) Mailgun Private API Key* |
| `MAILGUN_DOMAIN` | *(Optional) e.g. mg.yourdomain.com* |
| `MAILGUN_SIGNING_KEY` | *(Optional) Mailgun Webhook Signing Key* |
| `SENTRY_DSN` | *(Optional) sentry.io DSN* |

4. Click **Deploy Web Service**.

---

## 🐳 Option 3: Docker Deployment

You can also deploy as a Docker container using the included [`Dockerfile`](./Dockerfile):
1. In Render, select **Docker** as the runtime.
2. Set Docker Build Context to `.` (root) or `Helpdesk`.
3. Add the environment variables listed in the table above.

---

## 🔑 Default Initial Credentials

On initial deployment, the server checks if the user database is empty and automatically provisions initial accounts:

- **Admin Account**:
  - Email: `admin@example.com` (or value of `ADMIN_EMAIL`)
  - Password: `password123` (or value of `ADMIN_PASSWORD`)
  - Role: `ADMIN`
- **Agent Account**:
  - Email: `agent@example.com` (or value of `AGENT_EMAIL`)
  - Password: `password123` (or value of `AGENT_PASSWORD`)
  - Role: `AGENT`
- **AI Agent Account**:
  - Email: `ai@example.com`
  - Password: `password123`
  - Role: `AGENT`

---

## 🩺 Verification & Health Checks

Once deployed, you can verify your service status:

1. **System Health Check**:
   ```
   GET https://your-service-name.onrender.com/api/health
   ```
   Expected response:
   ```json
   {
     "status": "online",
     "message": "Express Helpdesk API is operational",
     "environment": "production",
     "services": {
       "database": "connected",
       "jobQueue": "connected (pg-boss)",
       "aiEngine": "ready"
     }
   }
   ```

2. **Web Portal**:
   - Open `https://your-service-name.onrender.com` in your browser.
   - Log in with `admin@example.com` / `password123`.
   - Submit a test ticket to verify automated AI classification, priority assignment, and draft resolution.

---

## 💡 Production Tips & Mailgun Inbound Routing

- **Free Tier Cold Starts**: Render's free tier spins down after 15 minutes of inactivity. For 24/7 instant response and queue processing, upgrade the Web Service to the Starter tier ($7/mo).
- **Mailgun Inbound Webhook**: To receive emails directly into tickets, configure a Mailgun route to forward to:
  ```
  POST https://your-service-name.onrender.com/api/emails/webhook
  ```
- **Custom Domains**: Add your custom domain (e.g. `helpdesk.yourdomain.com`) in the Render Dashboard under **Settings -> Custom Domains**. Render provides free automatic SSL certificates.
