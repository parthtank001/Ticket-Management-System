import { test, expect, APIRequestContext } from '@playwright/test';
import process from 'node:process';

// TypeScript Interfaces for API responses
interface HealthCheckResponse {
  status: string;
  message: string;
  timestamp: string;
  environment: string;
  uptimeSeconds: number;
  services: {
    database: string;
    aiEngine: string;
  };
}

interface UserDirectoryItem {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'AGENT';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TicketMessage {
  id: string;
  ticketId: string;
  senderType: 'STUDENT' | 'AGENT' | 'SYSTEM';
  senderEmail: string;
  body: string;
  isInternalNote: boolean;
  createdAt: string;
}

interface TicketResponse {
  id: string;
  subject: string;
  studentEmail: string;
  studentName: string;
  category: string;
  priority: string;
  status: 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  aiDraftResponse: string | null;
  assignedAgentId: string | null;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

const API_BASE_URL = process.env.API_URL || process.env.VITE_API_URL || 'http://localhost:5001';
const CLIENT_ORIGIN = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

test.describe('Backend REST API & Authorization Suite', () => {

  test.describe('1. Health Check Endpoint', () => {
    test('GET /api/health should return 200 OK with online status and database connectivity', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/health`);
      expect(response.status()).toBe(200);

      const body: HealthCheckResponse = await response.json();
      expect(body.status).toBe('online');
      expect(body.message).toBe('Express Helpdesk API is operational');
      expect(body.services.database).toBe('connected');
      expect(body.services.aiEngine).toBe('ready');
      expect(body.timestamp).toBeDefined();
      expect(typeof body.uptimeSeconds).toBe('number');
    });
  });

  test.describe('2. Protected Route Verification (401 Unauthorized)', () => {
    test('GET /api/me returns 401 Unauthorized without session cookies', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/me`);
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toMatch(/authentication required/i);
    });

    test('GET /api/users returns 401 Unauthorized without session cookies', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/users`);
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    test('GET /api/tickets returns 401 Unauthorized without session cookies', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/tickets`);
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    test('POST /api/tickets/:id/messages returns 401 Unauthorized without session cookies', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/tickets/non-existent-id/messages`, {
        data: { body: 'Unauthorized reply attempt' },
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe('3. Authenticated Role-Based Workflows', () => {
    let adminContext: APIRequestContext;
    let agentContext: APIRequestContext;

    test.beforeAll(async ({ playwright }) => {
      // 1. Authenticate Admin Context
      adminContext = await playwright.request.newContext({
        baseURL: API_BASE_URL,
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
          'Origin': CLIENT_ORIGIN,
        },
      });

      const adminSignIn = await adminContext.post('/api/auth/sign-in/email', {
        data: { email: 'admin@example.com', password: 'password123' },
      });
      expect(adminSignIn.ok()).toBeTruthy();

      // 2. Authenticate Agent Context
      agentContext = await playwright.request.newContext({
        baseURL: API_BASE_URL,
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
          'Origin': CLIENT_ORIGIN,
        },
      });

      const agentSignIn = await agentContext.post('/api/auth/sign-in/email', {
        data: { email: 'agent@example.com', password: 'password123' },
      });
      expect(agentSignIn.ok()).toBeTruthy();
    });

    test.afterAll(async () => {
      await adminContext?.dispose();
      await agentContext?.dispose();
    });

    test('Agent role receives 403 Forbidden on GET /api/users', async () => {
      const response = await agentContext.get('/api/users');
      expect(response.status()).toBe(403);

      const body = await response.json();
      expect(body.error).toBe('Forbidden');
      expect(body.message).toMatch(/access denied|insufficient role permissions/i);
    });

    test('Admin role receives 200 OK on GET /api/users with directory list', async () => {
      const response = await adminContext.get('/api/users');
      expect(response.status()).toBe(200);

      const users: UserDirectoryItem[] = await response.json();
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);

      const adminUser = users.find((u) => u.email === 'admin@example.com');
      expect(adminUser).toBeDefined();
      expect(adminUser?.role).toBe('ADMIN');

      const agentUser = users.find((u) => u.email === 'agent@example.com');
      expect(agentUser).toBeDefined();
      expect(agentUser?.role).toBe('AGENT');
    });

    test('POST /api/tickets creates inbound ticket with AI auto-draft response', async ({ request }) => {
      const newTicketPayload = {
        studentName: 'Jordan Lee',
        studentEmail: 'jordan.lee@example.edu',
        subject: 'Cannot access lecture recordings',
        category: 'TECHNICAL_QUESTION',
        priority: 'HIGH',
        message: 'I am getting a 403 error when clicking on the Week 3 recording link.',
      };

      const response = await request.post(`${API_BASE_URL}/api/tickets`, {
        data: newTicketPayload,
      });

      expect(response.status()).toBe(201);

      const createdTicket: TicketResponse = await response.json();
      expect(createdTicket.id).toBeDefined();
      expect(createdTicket.subject).toBe(newTicketPayload.subject);
      expect(createdTicket.studentEmail).toBe(newTicketPayload.studentEmail.toLowerCase());
      expect(createdTicket.studentName).toBe(newTicketPayload.studentName);
      expect(createdTicket.category).toBe('TECHNICAL_QUESTION');
      expect(createdTicket.priority).toBe('HIGH');
      expect(createdTicket.status).toBe('NEW');

      // Verify AI auto-draft response generation
      expect(createdTicket.aiDraftResponse).toBeTruthy();
      expect(createdTicket.aiDraftResponse).toContain('Jordan Lee');
      expect(createdTicket.aiDraftResponse).toContain('Helpdesk Technical Team');

      // Verify initial message from student
      expect(createdTicket.messages).toHaveLength(1);
      expect(createdTicket.messages[0].senderType).toBe('STUDENT');
      expect(createdTicket.messages[0].senderEmail).toBe(newTicketPayload.studentEmail.toLowerCase());
      expect(createdTicket.messages[0].body).toBe(newTicketPayload.message);
    });

    test('POST /api/tickets/:id/messages adds replies to ticket threads by authenticated support staff', async () => {
      // Step 1: Create a ticket first
      const ticketRes = await adminContext.post('/api/tickets', {
        data: {
          studentName: 'Samantha Green',
          studentEmail: 'samantha.green@example.com',
          subject: 'Billing inquiry on recent invoice',
          category: 'REFUND_REQUEST',
          priority: 'MEDIUM',
          message: 'Can I get an itemized breakdown of the latest charge?',
        },
      });
      expect(ticketRes.status()).toBe(201);
      const ticket: TicketResponse = await ticketRes.json();

      // Step 2: Add Agent reply message to thread
      const replyPayload = {
        body: 'Hello Samantha, here is the breakdown of your account charges.',
        isInternalNote: false,
      };

      const replyRes = await agentContext.post(`/api/tickets/${ticket.id}/messages`, {
        data: replyPayload,
      });

      expect(replyRes.status()).toBe(201);
      const createdMessage: TicketMessage = await replyRes.json();
      expect(createdMessage.id).toBeDefined();
      expect(createdMessage.ticketId).toBe(ticket.id);
      expect(createdMessage.senderType).toBe('AGENT');
      expect(createdMessage.senderEmail).toBe('agent@example.com');
      expect(createdMessage.body).toBe(replyPayload.body);
      expect(createdMessage.isInternalNote).toBe(false);

      // Step 3: Fetch updated tickets list and verify status transition to IN_PROGRESS
      const ticketsListRes = await agentContext.get('/api/tickets');
      expect(ticketsListRes.status()).toBe(200);
      const allTickets: TicketResponse[] = await ticketsListRes.json();
      const updatedTicket = allTickets.find((t) => t.id === ticket.id);
      expect(updatedTicket?.status).toBe('IN_PROGRESS');
      expect(updatedTicket?.messages.length).toBe(2);
    });

    test('POST /api/tickets returns 400 Bad Request when required fields are missing', async ({ request }) => {
      const invalidPayload = {
        studentEmail: '',
        subject: '',
        message: '',
      };

      const response = await request.post(`${API_BASE_URL}/api/tickets`, {
        data: invalidPayload,
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/required strings|cannot be empty/i);
    });
  });
});
