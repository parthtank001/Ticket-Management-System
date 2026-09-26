import { PgBoss } from 'pg-boss';
import dotenv from 'dotenv';
import { prisma } from '../db';
import { classifyTicketInBackground, BackgroundClassifyOptions } from './ai';
import { autoResolveSingleTicket } from './auto-resolve';
import type { AutoResolveTicketInput } from '@helpdesk/core';

dotenv.config();

export const QUEUE_TICKET_CLASSIFICATION = 'ticket-classification';
export const QUEUE_TICKET_AUTO_RESOLVE = 'ticket-auto-resolve';

let bossInstance: PgBoss | null = null;
let isStarted = false;

/**
 * Returns the singleton PgBoss instance.
 */
export function getBossInstance(): PgBoss | null {
  return bossInstance;
}

/**
 * Checks whether the pg-boss job queue is started and actively running.
 */
export function isQueueReady(): boolean {
  return isStarted && bossInstance !== null;
}

/**
 * Initializes and starts the pg-boss background job queue, configures queues, and registers workers.
 */
export async function initQueue(): Promise<PgBoss | null> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString || process.env.DISABLE_PG_BOSS === 'true') {
    console.info('[pg-boss] Background queue disabled or DATABASE_URL not found; using direct event-loop fallback.');
    return null;
  }

  if (bossInstance && isStarted) {
    return bossInstance;
  }

  try {
    const boss = new PgBoss(connectionString);

    boss.on('error', (error) => {
      console.error('[pg-boss System Error]:', error?.message || error);
    });

    await boss.start();
    bossInstance = boss;
    isStarted = true;
    console.info('🚀 [pg-boss] Job queue started and connected to PostgreSQL.');

    // Create / ensure ticket-classification queue exists
    await boss.createQueue(QUEUE_TICKET_CLASSIFICATION, {
      retryLimit: 3,
      retryDelay: 5,
      retryBackoff: true,
      expireInSeconds: 180,
    });

    // Create / ensure ticket-auto-resolve queue exists
    await boss.createQueue(QUEUE_TICKET_AUTO_RESOLVE, {
      retryLimit: 3,
      retryDelay: 5,
      retryBackoff: true,
      expireInSeconds: 180,
    });

    // Register worker for ticket classification
    await boss.work<{ ticketId: number; options?: BackgroundClassifyOptions }>(
      QUEUE_TICKET_CLASSIFICATION,
      { batchSize: 1 },
      async (jobs) => {
        for (const job of jobs) {
          const { ticketId, options } = job.data;
          console.info(`[pg-boss Worker] Processing classification job ${job.id} for Ticket #${ticketId}...`);
          try {
            await classifyTicketInBackground(ticketId, options);
          } catch (jobErr) {
            console.error(`[pg-boss Worker Error] Failed processing classification job ${job.id} for Ticket #${ticketId}:`, jobErr);
            try {
              await prisma.ticket.update({
                where: { id: ticketId },
                data: { status: 'OPEN' },
              });
            } catch (statusErr) {
              console.error(`[pg-boss Worker] Failed to update ticket status to OPEN on error for Ticket #${ticketId}:`, statusErr);
            }
            throw jobErr; // Re-throw to trigger pg-boss retry policy
          }
        }
      }
    );

    // Register worker for ticket auto-resolution
    await boss.work<{ ticketId: number; options?: AutoResolveTicketInput }>(
      QUEUE_TICKET_AUTO_RESOLVE,
      { batchSize: 1 },
      async (jobs) => {
        for (const job of jobs) {
          const { ticketId, options } = job.data;
          console.info(`[pg-boss Worker] Processing auto-resolve job ${job.id} for Ticket #${ticketId}...`);
          try {
            await autoResolveSingleTicket(ticketId, options);
          } catch (jobErr) {
            console.error(`[pg-boss Worker Error] Failed processing auto-resolve job ${job.id} for Ticket #${ticketId}:`, jobErr);
            try {
              await prisma.ticket.update({
                where: { id: ticketId },
                data: { status: 'OPEN' },
              });
            } catch (statusErr) {
              console.error(`[pg-boss Worker] Failed to update ticket status to OPEN on error for Ticket #${ticketId}:`, statusErr);
            }
            throw jobErr;
          }
        }
      }
    );

    console.info(`[pg-boss] Workers registered for queues "${QUEUE_TICKET_CLASSIFICATION}" and "${QUEUE_TICKET_AUTO_RESOLVE}".`);
    return boss;
  } catch (err: any) {
    console.error('[pg-boss Init Error] Failed to initialize pg-boss queue:', err?.message || err);
    bossInstance = null;
    isStarted = false;
    return null;
  }
}


/**
 * Enqueues a ticket classification task into the pg-boss queue.
 * If pg-boss is unavailable or not running, falls back to non-blocking setImmediate execution.
 */
export async function enqueueTicketClassification(
  ticketId: number,
  options?: BackgroundClassifyOptions
): Promise<string | null> {
  if (isQueueReady() && bossInstance) {
    try {
      const jobId = await bossInstance.send(
        QUEUE_TICKET_CLASSIFICATION,
        { ticketId, options },
        {
          retryLimit: 3,
          retryDelay: 5,
          retryBackoff: true,
          expireInSeconds: 180,
        }
      );

      console.info(`[pg-boss Queue] Enqueued classification job ${jobId} for Ticket #${ticketId}`);
      return jobId;
    } catch (sendErr: any) {
      console.warn(`[pg-boss Queue Warning] Failed to send job to queue for Ticket #${ticketId}, using event-loop fallback:`, sendErr?.message || sendErr);
    }
  }

  // Graceful fallback to non-blocking event-loop execution
  setImmediate(() => {
    classifyTicketInBackground(ticketId, options).catch((err) => {
      console.error(`[AI Classification Fallback Exception for Ticket #${ticketId}]:`, err);
    });
  });

  return null;
}

/**
 * Schedules ticket classification by dispatching to the pg-boss queue.
 */
export function scheduleTicketClassification(
  ticketId: number,
  options?: BackgroundClassifyOptions
): void {
  enqueueTicketClassification(ticketId, options).catch((err) => {
    console.error(`[Schedule Classification Error for Ticket #${ticketId}]:`, err);
  });
}

/**
 * Enqueues a ticket auto-resolution task into the pg-boss queue.
 * If pg-boss is unavailable or not running, falls back to non-blocking setImmediate execution.
 */
export async function enqueueTicketAutoResolve(
  ticketId: number,
  options?: AutoResolveTicketInput
): Promise<string | null> {
  if (isQueueReady() && bossInstance) {
    try {
      const jobId = await bossInstance.send(
        QUEUE_TICKET_AUTO_RESOLVE,
        { ticketId, options },
        {
          retryLimit: 3,
          retryDelay: 5,
          retryBackoff: true,
          expireInSeconds: 180,
        }
      );

      console.info(`[pg-boss Queue] Enqueued auto-resolve job ${jobId} for Ticket #${ticketId}`);
      return jobId;
    } catch (sendErr: any) {
      console.warn(`[pg-boss Queue Warning] Failed to send auto-resolve job to queue for Ticket #${ticketId}, using event-loop fallback:`, sendErr?.message || sendErr);
    }
  }

  // Graceful fallback to non-blocking event-loop execution
  setImmediate(() => {
    autoResolveSingleTicket(ticketId, options).catch((err) => {
      console.error(`[Auto-Resolve Fallback Exception for Ticket #${ticketId}]:`, err);
    });
  });

  return null;
}

/**
 * Schedules ticket auto-resolution by dispatching to the pg-boss queue.
 */
export function scheduleTicketAutoResolve(
  ticketId: number,
  options?: AutoResolveTicketInput
): void {
  enqueueTicketAutoResolve(ticketId, options).catch((err) => {
    console.error(`[Schedule Auto-Resolve Error for Ticket #${ticketId}]:`, err);
  });
}

/**
 * Gracefully shuts down the pg-boss job queue instance.
 */
export async function stopQueue(): Promise<void> {
  if (bossInstance && isStarted) {
    try {
      console.info('[pg-boss] Stopping job queue gracefully...');
      await bossInstance.stop({ graceful: true, timeout: 5000 });
      console.info('[pg-boss] Job queue stopped.');
    } catch (err) {
      console.error('[pg-boss Stop Error]:', err);
    } finally {
      bossInstance = null;
      isStarted = false;
    }
  }
}
