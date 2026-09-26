import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  evaluateClassificationSchema,
  classifyTicketSchema,
  batchClassifySchema,
} from '../schemas';
import {
  evaluateInquiryForClassification,
  classifySingleTicket,
  batchClassifyTickets,
  getClassificationMetrics,
  getAvailableClassificationCategories,
} from '../services/classification';
import { scheduleTicketClassification } from '../services/queue';

const router = Router();

/**
 * POST /api/classify/evaluate
 * Evaluates an inquiry (subject, body, studentName, studentEmail) against the AI & heuristic classifiers
 * and returns predicted category, priority, summary, draft, confidence, and tags without database alteration.
 */
router.post('/evaluate', requireAuth, async (req: Request, res: Response) => {
  const validationResult = evaluateClassificationSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ error: validationResult.error.issues[0].message });
  }

  const result = await evaluateInquiryForClassification(validationResult.data);
  res.json(result);
});

/**
 * POST /api/classify/ticket/:id
 * Evaluates and classifies a single ticket by its ID.
 */
router.post('/ticket/:id', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  const validationResult = classifyTicketSchema.safeParse(req.body || {});
  if (!validationResult.success) {
    return res.status(400).json({ error: validationResult.error.issues[0].message });
  }

  const isAsync = req.query.async === 'true' || validationResult.data.async;
  if (isAsync) {
    scheduleTicketClassification(id, { force: validationResult.data.force });
    return res.json({
      message: 'Ticket classification queued in background',
      ticketId: id,
    });
  }

  try {
    const result = await classifySingleTicket(id, validationResult.data);
    res.json(result);
  } catch (err: any) {
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    throw err;
  }
});

/**
 * POST /api/classify/batch
 * Batch evaluates and classifies tickets in the queue matching specified filters.
 */
router.post('/batch', requireAuth, async (req: Request, res: Response) => {
  const validationResult = batchClassifySchema.safeParse(req.body || {});
  if (!validationResult.success) {
    return res.status(400).json({ error: validationResult.error.issues[0].message });
  }

  const result = await batchClassifyTickets(validationResult.data);
  res.json(result);
});

/**
 * GET /api/classify/stats
 * Returns aggregate metrics and performance analytics on classified tickets.
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  const stats = await getClassificationMetrics();
  res.json(stats);
});

/**
 * GET /api/classify/categories
 * Returns active classification categories, keywords, and priority guidelines.
 */
router.get('/categories', requireAuth, async (req: Request, res: Response) => {
  const categories = getAvailableClassificationCategories();
  res.json(categories);
});

export default router;
