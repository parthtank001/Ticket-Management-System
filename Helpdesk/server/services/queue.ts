import { PgBoss } from 'pg-boss';
import dotenv from 'dotenv';
import { prisma } from '../db';
import { classifyTicketInBackground, BackgroundClassifyOptions } from './ai';
import { autoResolveSingleTicket } from './auto-resolve';
import { sendOutboundEmail, SendEmailOptions } from './email-sender';
import { ingestInboundEmail } from './email-ingestion';
import type { AutoResolveTicketInput, TicketStatus } from '@helpdesk/core';

dotenv.config();

export const QUEUE_TICKET_CLASSIFICATION = 'ticket-classification';
export const QUEUE_TICKET_AUTO_RESOLVE = 'ticket-auto-resolve';
export const QUEUE_EMAIL_SEND = 'email-send';
export const QUEUE_EMAIL_INBOUND = 'email-inbound';

export interface SendEmailJobData {
  options: SendEmailOptions;
  ticketId?: number;
  statusUpdate?: TicketStatus;
  userEmail?: string;
  userName?: string;
  skipBodyUpdate?: boolean;
}

export interface InboundEmailJobData {
  payload: any;
  receivedAt?: number;
}

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

    // Create / ensure email-send queue exists
    await boss.createQueue(QUEUE_EMAIL_SEND, {
      retryLimit: 3,
      retryDelay: 5,
      retryBackoff: true,
      expireInSeconds: 300,
    });

    // Create / ensure email-inbound queue exists
    await boss.createQueue(QUEUE_EMAIL_INBOUND, {
      retryLimit: 3,
      retryDelay: 5,
      retryBackoff: true,
      expireInSeconds: 300,
    });

    // Register worker for outbound email sending
    await boss.work<SendEmailJobData>(
      QUEUE_EMAIL_SEND,
      { batchSize: 1 },
      async (jobs) => {
        for (const job of jobs) {
          const { options, ticketId, statusUpdate, userEmail, userName } = job.data;
          console.info(`[pg-boss Worker] Processing outbound email job ${job.id} to ${options.to}...`);
          try {
            const sendResult = await sendOutboundEmail(options);
            if (!sendResult.success) {
              throw new Error(sendResult.error || 'Failed to dispatch email via Mailgun');
            }

            if (ticketId) {
              const existingTicket = await prisma.ticket.findUnique({ where: { id: ticketId } });
              if (existingTicket) {
                const senderEmail = userEmail || 'agent@example.com';
                const updateData: any = {};
                if (!job.data.skipBodyUpdate) {
                  const replyBlock = `\n\n--- [Outbound Email to ${options.to} (${senderEmail})] ---\n${options.text}`;
                  updateData.body = existingTicket.body ? `${existingTicket.body}${replyBlock}` : options.text;
                }
                if (statusUpdate) {
                  updateData.status = statusUpdate;
                }

                if (Object.keys(updateData).length > 0) {
                  await prisma.ticket.update({
                    where: { id: ticketId },
                    data: updateData,
                  });
                }

                await prisma.webhookLog.create({
                  data: {
                    source: 'mailgun_outbound',
                    payload: JSON.stringify({
                      to: options.to,
                      toName: options.toName,
                      subject: options.subject,
                      messageId: sendResult.messageId,
                      senderEmail,
                      senderName: userName,
                    }),
                    status: 'sent',
                    ticketId,
                  },
                });
              }
            }
          } catch (jobErr) {
            console.error(`[pg-boss Worker Error] Outbound email job ${job.id} failed:`, jobErr);
            throw jobErr; // Trigger pg-boss retry policy
          }
        }
      }
    );

    // Register worker for inbound email processing
    await boss.work<InboundEmailJobData>(
      QUEUE_EMAIL_INBOUND,
      { batchSize: 1 },
      async (jobs) => {
        for (const job of jobs) {
          const { payload } = job.data;
          console.info(`[pg-boss Worker] Processing inbound email job ${job.id}...`);
          try {
            const result = await ingestInboundEmail(payload);
            console.info(`[pg-boss Worker] Inbound email job ${job.id} finished with status: ${result.status}`);
          } catch (jobErr) {
            console.error(`[pg-boss Worker Error] Inbound email job ${job.id} failed:`, jobErr);
            throw jobErr;
          }
        }
      }
    );

    console.info(`[pg-boss] Workers registered for queues "${QUEUE_TICKET_CLASSIFICATION}", "${QUEUE_TICKET_AUTO_RESOLVE}", "${QUEUE_EMAIL_SEND}", and "${QUEUE_EMAIL_INBOUND}".`);
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
 * Enqueues an outbound email send job into the pg-boss queue.
 * If pg-boss is unavailable, falls back to non-blocking event loop execution.
 */
export async function enqueueEmailSend(data: SendEmailJobData): Promise<string | null> {
  if (isQueueReady() && bossInstance) {
    try {
      const jobId = await bossInstance.send(
        QUEUE_EMAIL_SEND,
        data,
        {
          retryLimit: 3,
          retryDelay: 5,
          retryBackoff: true,
          expireInSeconds: 300,
        }
      );

      console.info(`[pg-boss Queue] Enqueued outbound email job ${jobId} to ${data.options.to}`);
      return jobId;
    } catch (sendErr: any) {
      console.warn(`[pg-boss Queue Warning] Failed to enqueue outbound email job, using event-loop fallback:`, sendErr?.message || sendErr);
    }
  }

  // Graceful fallback to non-blocking event-loop execution
  setImmediate(async () => {
    try {
      const sendResult = await sendOutboundEmail(data.options);
      if (data.ticketId && sendResult.success) {
        const existingTicket = await prisma.ticket.findUnique({ where: { id: data.ticketId } });
        if (existingTicket) {
          const senderEmail = data.userEmail || 'agent@example.com';
          const updateData: any = {};
          if (!data.skipBodyUpdate) {
            const replyBlock = `\n\n--- [Outbound Email to ${data.options.to} (${senderEmail})] ---\n${data.options.text}`;
            updateData.body = existingTicket.body ? `${existingTicket.body}${replyBlock}` : data.options.text;
          }
          if (data.statusUpdate) updateData.status = data.statusUpdate;
          if (Object.keys(updateData).length > 0) {
            await prisma.ticket.update({ where: { id: data.ticketId }, data: updateData });
          }
          await prisma.webhookLog.create({
            data: {
              source: 'mailgun_outbound',
              payload: JSON.stringify({
                to: data.options.to,
                toName: data.options.toName,
                subject: data.options.subject,
                messageId: sendResult.messageId,
                senderEmail,
                senderName: data.userName,
              }),
              status: 'sent',
              ticketId: data.ticketId,
            },
          });
        }
      }
    } catch (err) {
      console.error('[Email Send Fallback Exception]:', err);
    }
  });

  return null;
}

/**
 * Schedules an outbound email send job to the pg-boss queue.
 */
export function scheduleEmailSend(data: SendEmailJobData): void {
  enqueueEmailSend(data).catch((err) => {
    console.error('[Schedule Email Send Error]:', err);
  });
}

/**
 * Enqueues an inbound email ingestion task into the pg-boss queue.
 * If pg-boss is unavailable, falls back to non-blocking event-loop execution.
 */
export async function enqueueInboundEmail(data: InboundEmailJobData): Promise<string | null> {
  if (isQueueReady() && bossInstance) {
    try {
      const jobId = await bossInstance.send(
        QUEUE_EMAIL_INBOUND,
        data,
        {
          retryLimit: 3,
          retryDelay: 5,
          retryBackoff: true,
          expireInSeconds: 300,
        }
      );

      console.info(`[pg-boss Queue] Enqueued inbound email job ${jobId}`);
      return jobId;
    } catch (sendErr: any) {
      console.warn(`[pg-boss Queue Warning] Failed to enqueue inbound email job, using event-loop fallback:`, sendErr?.message || sendErr);
    }
  }

  // Graceful fallback to non-blocking event-loop execution
  setImmediate(() => {
    ingestInboundEmail(data.payload).catch((err) => {
      console.error('[Inbound Email Fallback Exception]:', err);
    });
  });

  return null;
}

/**
 * Schedules inbound email processing by dispatching to the pg-boss queue.
 */
export function scheduleInboundEmail(data: InboundEmailJobData): void {
  enqueueInboundEmail(data).catch((err) => {
    console.error('[Schedule Inbound Email Error]:', err);
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

