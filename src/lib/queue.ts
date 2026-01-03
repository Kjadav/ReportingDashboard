import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { createBullConnection } from './redis';

// Job types
export type SyncJobData = {
  type: 'sync_account_daily' | 'sync_account_intraday' | 'backfill_range' | 'manual_sync';
  adAccountId: string;
  connectionId: string;
  customerId: string;
  dateFrom: string;
  dateTo: string;
  provider: 'GOOGLE_ADS' | 'META_ADS' | 'TIKTOK_ADS';
  organizationId: string;
  initiatedBy?: string;
};

export type DimensionSyncJobData = {
  type: 'sync_dimensions';
  adAccountId: string;
  connectionId: string;
  customerId: string;
  provider: 'GOOGLE_ADS' | 'META_ADS' | 'TIKTOK_ADS';
  organizationId: string;
};

export type JobData = SyncJobData | DimensionSyncJobData;

// Queue names
export const QUEUE_NAMES = {
  SYNC: 'ads-sync',
  DIMENSIONS: 'ads-dimensions',
} as const;

// Queue instances
let syncQueue: Queue<SyncJobData> | null = null;
let dimensionsQueue: Queue<DimensionSyncJobData> | null = null;

// Get or create sync queue
export function getSyncQueue(): Queue<SyncJobData> {
  if (!syncQueue) {
    syncQueue = new Queue<SyncJobData>(QUEUE_NAMES.SYNC, {
      connection: createBullConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          count: 1000,
          age: 24 * 3600, // 24 hours
        },
        removeOnFail: {
          count: 5000,
          age: 7 * 24 * 3600, // 7 days
        },
      },
    });
  }
  return syncQueue;
}

// Get or create dimensions queue
export function getDimensionsQueue(): Queue<DimensionSyncJobData> {
  if (!dimensionsQueue) {
    dimensionsQueue = new Queue<DimensionSyncJobData>(QUEUE_NAMES.DIMENSIONS, {
      connection: createBullConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: {
          count: 500,
          age: 12 * 3600,
        },
        removeOnFail: {
          count: 1000,
          age: 3 * 24 * 3600,
        },
      },
    });
  }
  return dimensionsQueue;
}

// Add job to sync queue
export async function addSyncJob(data: SyncJobData, options?: {
  delay?: number;
  priority?: number;
  jobId?: string;
}): Promise<Job<SyncJobData>> {
  const queue = getSyncQueue();
  return queue.add(data.type, data, {
    delay: options?.delay,
    priority: options?.priority,
    jobId: options?.jobId,
  });
}

// Add job to dimensions queue
export async function addDimensionsJob(data: DimensionSyncJobData): Promise<Job<DimensionSyncJobData>> {
  const queue = getDimensionsQueue();
  return queue.add(data.type, data);
}

// Schedule daily sync for all active accounts
export async function scheduleDailySyncForAccount(account: {
  id: string;
  connectionId: string;
  externalId: string;
  provider: 'GOOGLE_ADS' | 'META_ADS' | 'TIKTOK_ADS';
  organizationId: string;
}): Promise<Job<SyncJobData>> {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  return addSyncJob({
    type: 'sync_account_daily',
    adAccountId: account.id,
    connectionId: account.connectionId,
    customerId: account.externalId,
    dateFrom: formatDate(yesterday),
    dateTo: formatDate(today),
    provider: account.provider,
    organizationId: account.organizationId,
  });
}

// Schedule initial backfill for a new account
export async function scheduleInitialSync(account: {
  id: string;
  connectionId: string;
  externalId: string;
  provider: 'GOOGLE_ADS' | 'META_ADS' | 'TIKTOK_ADS';
  organizationId: string;
}, daysBack: number = 90): Promise<Job<SyncJobData>> {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - daysBack);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  return addSyncJob({
    type: 'backfill_range',
    adAccountId: account.id,
    connectionId: account.connectionId,
    customerId: account.externalId,
    dateFrom: formatDate(startDate),
    dateTo: formatDate(today),
    provider: account.provider,
    organizationId: account.organizationId,
  });
}

// Get queue stats
export async function getQueueStats(queueName: string): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const queue = queueName === QUEUE_NAMES.SYNC ? getSyncQueue() : getDimensionsQueue();
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

// Pause queue
export async function pauseQueue(queueName: string): Promise<void> {
  const queue = queueName === QUEUE_NAMES.SYNC ? getSyncQueue() : getDimensionsQueue();
  await queue.pause();
}

// Resume queue
export async function resumeQueue(queueName: string): Promise<void> {
  const queue = queueName === QUEUE_NAMES.SYNC ? getSyncQueue() : getDimensionsQueue();
  await queue.resume();
}

// Clean old jobs
export async function cleanOldJobs(queueName: string, gracePeriodMs: number = 24 * 3600 * 1000): Promise<void> {
  const queue = queueName === QUEUE_NAMES.SYNC ? getSyncQueue() : getDimensionsQueue();
  await queue.clean(gracePeriodMs, 1000, 'completed');
  await queue.clean(gracePeriodMs * 7, 1000, 'failed');
}

