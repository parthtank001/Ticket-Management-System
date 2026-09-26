import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getDashboardStats } from '../services/dashboard';

const router = Router();

/**
 * GET /api/dashboard/stats
 * Returns comprehensive operational metrics, ticket volumes, AI resolution ratios,
 * and average resolution time analytics.
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  const stats = await getDashboardStats();
  res.json(stats);
});

export default router;
