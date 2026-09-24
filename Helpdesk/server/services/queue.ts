import { PgBoss } from 'pg-boss';
import dotenv from 'dotenv';
import { classifyTicketInBackground, BackgroundClassifyOptions } from './ai';

dotenv.config();

export const QUEUE_TICKET_CLASSIFICATION = 'ticket-classification';

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

    // Register worker for ticket classification
    await boss.work<{ ticketId: number; options?: BackgroundClassifyOptions }>(
      QUEUE_TICKET_CLASSIFICATION,
      { batchSize: 1 },
      async (jobs) => {
        for (const job of jobs) {
          const { ticketId, options } = job.data;
          console.info(`[pg-boss Worker] Processing job ${job.id} for Ticket #${ticketId}...`);
          try {
            await classifyTicketInBackground(ticketId, options);
          } catch (jobErr) {
            console.error(`[pg-boss Worker Error] Failed processing job ${job.id} for Ticket #${ticketId}:`, jobErr);
            throw jobErr; // Re-throw to trigger pg-boss retry policy
          }
        }
      }
    );

    console.info(`[pg-boss] Worker registered for queue "${QUEUE_TICKET_CLASSIFICATION}".`);
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
