import { test, expect, APIRequestContext } from '@playwright/test';
import process from 'node:process';
import { Role } from '@helpdesk/core';

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
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Environment & Configuration variables
const API_BASE_URL = process.env.API_BASE_URL || process.env.API_URL || process.env.VITE_API_URL!;
const CLIENT_ORIGIN: string = process.env.PLAYWRIGHT_BASE_URL!;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;
const AGENT_EMAIL = process.env.AGENT_EMAIL!;
const AGENT_PASSWORD = process.env.AGENT_PASSWORD!;

// API Endpoints
const HEALTH_ENDPOINT = '/api/health';
const ME_ENDPOINT = '/api/me';
const USERS_ENDPOINT = '/api/users';
const AUTH_SIGN_IN_ENDPOINT = '/api/auth/sign-in/email';

test.describe('Backend REST API & Authorization Suite', () => {

  test.describe('1. Health Check Endpoint', () => {
    test('GET /api/health should return 200 OK with online status and database connectivity', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}${HEALTH_ENDPOINT}`);
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
      const response = await request.get(`${API_BASE_URL}${ME_ENDPOINT}`);
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toMatch(/authentication required/i);
    });

    test('GET /api/users returns 401 Unauthorized without session cookies', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}${USERS_ENDPOINT}`);
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
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

      const adminSignIn = await adminContext.post(AUTH_SIGN_IN_ENDPOINT, {
        data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
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

      const agentSignIn = await agentContext.post(AUTH_SIGN_IN_ENDPOINT, {
        data: { email: AGENT_EMAIL, password: AGENT_PASSWORD },
      });
      expect(agentSignIn.ok()).toBeTruthy();
    });

    test.afterAll(async () => {
      await adminContext?.dispose();
      await agentContext?.dispose();
    });

    test('Agent role receives 403 Forbidden on GET /api/users', async () => {
      const response = await agentContext.get(USERS_ENDPOINT);
      expect(response.status()).toBe(403);

      const body = await response.json();
      expect(body.error).toBe('Forbidden');
      expect(body.message).toMatch(/access denied|insufficient role permissions/i);
    });

    test('Agent role receives 403 Forbidden on POST /api/users', async () => {
      const response = await agentContext.post(USERS_ENDPOINT, {
        data: {
          name: 'Forbidden User',
          email: 'forbidden@example.com',
          password: 'password123',
          role: 'AGENT',
        },
      });
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Forbidden');
    });

    test('Admin role receives 200 OK on GET /api/users with directory list', async () => {
      const response = await adminContext.get(USERS_ENDPOINT);
      expect(response.status()).toBe(200);

      const users: UserDirectoryItem[] = await response.json();
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);

      const adminUser = users.find((u) => u.email === ADMIN_EMAIL);
      expect(adminUser).toBeDefined();
      expect(adminUser?.role).toBe('ADMIN');

      const agentUser = users.find((u) => u.email === AGENT_EMAIL);
      expect(agentUser).toBeDefined();
      expect(agentUser?.role).toBe('AGENT');
    });

    test('Admin role successfully creates new user via POST /api/users', async () => {
      const timestamp = Date.now();
      const payload = {
        name: `API Created Agent ${timestamp}`,
        email: `api.agent.${timestamp}@example.com`,
        password: 'password12345',
        role: 'AGENT',
      };

      const response = await adminContext.post(USERS_ENDPOINT, {
        data: payload,
      });

      expect(response.status()).toBe(201);
      const createdUser: UserDirectoryItem = await response.json();
      expect(createdUser.id).toBeDefined();
      expect(createdUser.name).toBe(payload.name);
      expect(createdUser.email).toBe(payload.email);
      expect(createdUser.role).toBe('AGENT');
      expect(createdUser.isActive).toBe(true);
    });

    test('POST /api/users returns 409 Conflict when attempting to create duplicate user', async () => {
      const response = await adminContext.post(USERS_ENDPOINT, {
        data: {
          name: 'Duplicate Admin',
          email: ADMIN_EMAIL,
          password: 'password12345',
          role: 'ADMIN',
        },
      });

      expect(response.status()).toBe(409);
      const body = await response.json();
      expect(body.error).toMatch(/already exists/i);
    });

    test('POST /api/users returns 400 Bad Request on invalid payloads', async () => {
      // 1. Password too short (< 8 chars)
      const shortPassRes = await adminContext.post(USERS_ENDPOINT, {
        data: {
          name: 'Valid Name',
          email: 'valid@example.com',
          password: 'short',
        },
      });
      expect(shortPassRes.status()).toBe(400);

      // 2. Invalid email format
      const badEmailRes = await adminContext.post(USERS_ENDPOINT, {
        data: {
          name: 'Valid Name',
          email: 'not-an-email',
          password: 'password123',
        },
      });
      expect(badEmailRes.status()).toBe(400);

      // 3. Name too short (< 3 chars)
      const shortNameRes = await adminContext.post(USERS_ENDPOINT, {
        data: {
          name: 'A',
          email: 'valid2@example.com',
          password: 'password123',
        },
      });
      expect(shortNameRes.status()).toBe(400);
    });

    test('DELETE /api/users/:id on an Admin account returns 400 Bad Request', async () => {
      // 1. Get current users to find Admin ID
      const usersRes = await adminContext.get(USERS_ENDPOINT);
      const users: UserDirectoryItem[] = await usersRes.json();
      const adminUser = users.find((u) => u.email === ADMIN_EMAIL);
      expect(adminUser).toBeDefined();

      // 2. Attempt to delete Admin account
      const deleteRes = await adminContext.delete(`${USERS_ENDPOINT}/${adminUser!.id}`);
      expect(deleteRes.status()).toBe(400);
      const body = await deleteRes.json();
      expect(body.error).toMatch(/cannot delete|administrator/i);
    });

    test('DELETE /api/users/:id on Agent account performs soft deletion', async () => {
      // 1. Create an Agent user to delete
      const timestamp = Date.now();
      const createRes = await adminContext.post(USERS_ENDPOINT, {
        data: {
          name: `Soft Delete Test Agent ${timestamp}`,
          email: `soft.delete.${timestamp}@example.com`,
          password: 'password12345',
          role: 'AGENT',
        },
      });
      expect(createRes.status()).toBe(201);
      const createdAgent: UserDirectoryItem = await createRes.json();

      // 2. Delete the created Agent
      const deleteRes = await adminContext.delete(`${USERS_ENDPOINT}/${createdAgent.id}`);
      expect(deleteRes.status()).toBe(200);
      const deleteBody = await deleteRes.json();
      expect(deleteBody.message).toMatch(/user deleted successfully/i);

      // 3. Soft-deleted user should not appear in GET /api/users directory
      const listRes = await adminContext.get(USERS_ENDPOINT);
      const listUsers: UserDirectoryItem[] = await listRes.json();
      const foundInList = listUsers.find((u) => u.id === createdAgent.id);
      expect(foundInList).toBeUndefined();
    });

    test('Agent role receives 403 Forbidden on DELETE /api/users/:id', async () => {
      const response = await agentContext.delete(`${USERS_ENDPOINT}/some-user-id`);
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Forbidden');
    });
  });
});
