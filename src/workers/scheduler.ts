import { Queue, QueueScheduler } from 'bullmq';
import { createBullConnection } from '../lib/redis';
import prisma from '../lib/prisma';
import { QUEUE_NAMES, addSyncJob, addDimensionsJob } from '../lib/queue';

const DAILY_SYNC_CRON = '0 6 * * *'; // 6 AM daily
const INTRADAY_SYNC_CRON = '0 */4 * * *'; // Every 4 hours

/**
 * Initialize the queue scheduler for repeatable jobs
 */
export async function initializeScheduler(): Promise<void> {
  const connection = createBullConnection();
  
  const syncQueue = new Queue(QUEUE_NAMES.SYNC, { connection });

  // Remove existing repeatable jobs to update them
  const repeatableJobs = await syncQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await syncQueue.removeRepeatableByKey(job.key);
  }

  // Add daily sync job
  await syncQueue.add(
    'scheduled_daily_sync',
    { type: 'scheduled', trigger: 'daily' },
    {
      repeat: {
        pattern: DAILY_SYNC_CRON,
      },
      jobId: 'scheduled-daily-sync',
    }
  );

  console.log('Scheduler initialized');
  console.log(`   Daily sync: ${DAILY_SYNC_CRON}`);
}

/**
 * Trigger daily sync for all enabled accounts
 */
export async function triggerDailySync(): Promise<void> {
  console.log('Triggering daily sync for all accounts...');

  const accounts = await prisma.adAccount.findMany({
    where: {
      isEnabled: true,
      connection: {
        status: 'ACTIVE',
      },
    },
    include: {
      connection: true,
    },
  });

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  for (const account of accounts) {
    try {
      // Create sync job record
      const syncJob = await prisma.syncJob.create({
        data: {
          adAccountId: account.id,
          jobType: 'DAILY_SYNC',
          status: 'PENDING',
          dateFrom: yesterday,
          dateTo: today,
        },
      });

      // Queue the sync job
      await addSyncJob({
        type: 'sync_account_daily',
        adAccountId: account.id,
        connectionId: account.connectionId,
        customerId: account.externalId,
        dateFrom: formatDate(yesterday),
        dateTo: formatDate(today),
        provider: account.provider,
        organizationId: account.organizationId,
      }, {
        jobId: syncJob.id,
      });

      // Also queue dimensions sync
      await addDimensionsJob({
        type: 'sync_dimensions',
        adAccountId: account.id,
        connectionId: account.connectionId,
        customerId: account.externalId,
        provider: account.provider,
        organizationId: account.organizationId,
      });

      console.log(`   Queued sync for account: ${account.name}`);
    } catch (error) {
      console.error(`   Failed to queue sync for ${account.name}:`, error);
    }
  }

  console.log(`Daily sync triggered for ${accounts.length} accounts`);
}

/**
 * Trigger intraday sync for accounts with intraday sync enabled
 * This is for near real-time spend tracking
 */
export async function triggerIntradaySync(): Promise<void> {
  console.log('Triggering intraday sync...');

  // For now, intraday sync is the same as daily but just for today
  const accounts = await prisma.adAccount.findMany({
    where: {
      isEnabled: true,
      connection: {
        status: 'ACTIVE',
      },
    },
    include: {
      connection: true,
    },
  });

  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const todayStr = formatDate(today);

  for (const account of accounts) {
    try {
      await addSyncJob({
        type: 'sync_account_intraday',
        adAccountId: account.id,
        connectionId: account.connectionId,
        customerId: account.externalId,
        dateFrom: todayStr,
        dateTo: todayStr,
        provider: account.provider,
        organizationId: account.organizationId,
      });
    } catch (error) {
      console.error(`Failed to queue intraday sync for ${account.name}:`, error);
    }
  }
}

// If running as main module, start the scheduler
if (require.main === module) {
  initializeScheduler().catch(console.error);
}

