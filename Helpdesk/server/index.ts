import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth';
import { requireAuth } from './middleware/auth';
import { checkDatabaseConnection } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

// Mount Better Auth router before standard body parsing middleware
app.all('/api/auth/*', toNodeHandler(auth));

app.use(express.json());

// Healthcheck API endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  const dbStatus = await checkDatabaseConnection();

  res.json({
    status: 'online',
    message: 'Express Helpdesk API is operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
    services: {
      database: dbStatus.connected ? 'connected' : `disconnected (${dbStatus.message})`,
      aiEngine: 'ready',
    }
  });
});

// Sample protected route using requireAuth middleware
app.get('/api/me', requireAuth, (req: Request, res: Response) => {
  res.json({
    message: 'Authenticated user profile retrieved',
    user: req.user,
    session: req.session,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Express server running at http://localhost:${PORT}`);
});
