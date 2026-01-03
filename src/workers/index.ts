import { Worker, Job } from 'bullmq';
import { createBullConnection } from '../lib/redis';
import { QUEUE_NAMES, SyncJobData, DimensionSyncJobData } from '../lib/queue';
import { processSyncJob } from './sync-processor';
import { processDimensionsJob } from './dimensions-processor';

console.log('Starting Ads Analytics Workers...');

// Create sync worker
const syncWorker = new Worker<SyncJobData>(
  QUEUE_NAMES.SYNC,
  async (job: Job<SyncJobData>) => {
    console.log(`Processing sync job: ${job.id} - ${job.data.type}`);
    return processSyncJob(job);
  },
  {
    connection: createBullConnection(),
    concurrency: 3,
    limiter: {
      max: 10,
      duration: 60000, // 10 jobs per minute max
    },
  }
);

syncWorker.on('completed', (job) => {
  console.log(`Sync job completed: ${job.id}`);
});

syncWorker.on('failed', (job, err) => {
  console.error(`Sync job failed: ${job?.id}`, err.message);
});

syncWorker.on('error', (err) => {
  console.error('Sync worker error:', err);
});

// Create dimensions worker
const dimensionsWorker = new Worker<DimensionSyncJobData>(
  QUEUE_NAMES.DIMENSIONS,
  async (job: Job<DimensionSyncJobData>) => {
    console.log(`Processing dimensions job: ${job.id}`);
    return processDimensionsJob(job);
  },
  {
    connection: createBullConnection(),
    concurrency: 2,
  }
);

dimensionsWorker.on('completed', (job) => {
  console.log(`Dimensions job completed: ${job.id}`);
});

dimensionsWorker.on('failed', (job, err) => {
  console.error(`Dimensions job failed: ${job?.id}`, err.message);
});

dimensionsWorker.on('error', (err) => {
  console.error('Dimensions worker error:', err);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down workers...');
  await Promise.all([
    syncWorker.close(),
    dimensionsWorker.close(),
  ]);
  console.log('Workers stopped');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('Workers started successfully');
console.log(`   Sync worker: ${QUEUE_NAMES.SYNC}`);
console.log(`   Dimensions worker: ${QUEUE_NAMES.DIMENSIONS}`);

