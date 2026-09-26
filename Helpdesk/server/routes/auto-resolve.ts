import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  evaluateInquirySchema,
  autoResolveTicketSchema,
  batchAutoResolveSchema,
} from '../schemas';
import {
  evaluateInquiryForAutoResolve,
  autoResolveSingleTicket,
  batchAutoResolveTickets,
  getAutoResolveMetrics,
  getAvailableAutoResolveRules,
} from '../services/auto-resolve';
import { scheduleTicketAutoResolve } from '../services/queue';

const router = Router();

/**
 * POST /api/auto-resolve/evaluate
 * Evaluates an inquiry (subject, body, studentName, studentEmail) against the Knowledge Base
 * and returns auto-resolution matching details without altering the database.
 */
router.post('/evaluate', requireAuth, async (req: Request, res: Response) => {
  const validationResult = evaluateInquirySchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ error: validationResult.error.issues[0].message });
  }

  const result = evaluateInquiryForAutoResolve(validationResult.data);
  res.json(result);
});

/**
 * POST /api/auto-resolve/ticket/:id
 * Evaluates and auto-resolves a single ticket by its ID.
 */
router.post('/ticket/:id', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  const validationResult = autoResolveTicketSchema.safeParse(req.body || {});
  if (!validationResult.success) {
    return res.status(400).json({ error: validationResult.error.issues[0].message });
  }

  const isAsync = req.query.async === 'true' || req.body?.async === true;
  if (isAsync) {
    scheduleTicketAutoResolve(id, validationResult.data);
    return res.json({
      message: 'Ticket auto-resolution queued in background',
      ticketId: id,
    });
  }

  const result = await autoResolveSingleTicket(id, validationResult.data);
  if (!result.success && result.reason.includes('does not exist')) {
    return res.status(404).json({ error: result.reason });
  }

  res.json(result);
});

/**
 * POST /api/auto-resolve/batch
 * Batch evaluates and auto-resolves tickets in the queue matching specified filters.
 */
router.post('/batch', requireAuth, async (req: Request, res: Response) => {
  const validationResult = batchAutoResolveSchema.safeParse(req.body || {});
  if (!validationResult.success) {
    return res.status(400).json({ error: validationResult.error.issues[0].message });
  }

  const result = await batchAutoResolveTickets(validationResult.data);
  res.json(result);
});

/**
 * GET /api/auto-resolve/stats
 * Returns aggregate metrics and performance analytics on auto-resolved tickets.
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  const stats = await getAutoResolveMetrics();
  res.json(stats);
});

/**
 * GET /api/auto-resolve/rules
 * Returns active auto-resolution rules and escalation policies supported by the system.
 */
router.get('/rules', requireAuth, async (req: Request, res: Response) => {
  const rules = getAvailableAutoResolveRules();
  res.json(rules);
});

export default router;
