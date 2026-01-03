import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { authenticate, requireOrganization, requireAdmin } from '../middleware/auth';
import { addSyncJob, getQueueStats, QUEUE_NAMES } from '../../lib/queue';

const router = Router();

// Validation schemas
const manualSyncSchema = z.object({
  accountId: z.string().uuid(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * GET /api/sync/status
 * Get sync status for all accounts
 */
router.get('/status', authenticate, requireOrganization, async (req: Request, res: Response) => {
  try {
    const accounts = await prisma.adAccount.findMany({
      where: {
        organizationId: req.user!.organizationId!,
        isEnabled: true,
      },
      select: {
        id: true,
        name: true,
        externalId: true,
        syncStatus: true,
        lastSyncedAt: true,
        syncJobs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            jobType: true,
            dateFrom: true,
            dateTo: true,
            startedAt: true,
            completedAt: true,
            errorMessage: true,
          },
        },
      },
    });

    res.json({
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        externalId: a.externalId,
        syncStatus: a.syncStatus,
        lastSyncedAt: a.lastSyncedAt,
        latestJob: a.syncJobs[0] || null,
      })),
    });
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

/**
 * GET /api/sync/jobs
 * Get sync jobs history
 */
router.get('/jobs', authenticate, requireOrganization, async (req: Request, res: Response) => {
  try {
    const { accountId, status, limit = '20', offset = '0' } = z.object({
      accountId: z.string().uuid().optional(),
      status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
      limit: z.string().regex(/^\d+$/).default('20'),
      offset: z.string().regex(/^\d+$/).default('0'),
    }).parse(req.query);

    const jobs = await prisma.syncJob.findMany({
      where: {
        adAccount: {
          organizationId: req.user!.organizationId!,
        },
        ...(accountId && { adAccountId: accountId }),
        ...(status && { status }),
      },
      include: {
        adAccount: {
          select: { name: true, externalId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.syncJob.count({
      where: {
        adAccount: {
          organizationId: req.user!.organizationId!,
        },
        ...(accountId && { adAccountId: accountId }),
        ...(status && { status }),
      },
    });

    res.json({
      jobs: jobs.map((j) => ({
        id: j.id,
        accountId: j.adAccountId,
        accountName: j.adAccount.name,
        accountExternalId: j.adAccount.externalId,
        jobType: j.jobType,
        status: j.status,
        dateFrom: j.dateFrom,
        dateTo: j.dateTo,
        startedAt: j.startedAt,
        completedAt: j.completedAt,
        errorMessage: j.errorMessage,
        metrics: j.metrics,
        createdAt: j.createdAt,
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Get sync jobs error:', error);
    res.status(500).json({ error: 'Failed to get sync jobs' });
  }
});

/**
 * POST /api/sync/manual
 * Trigger a manual sync for an account
 */
router.post('/manual', authenticate, requireOrganization, requireAdmin, async (req: Request, res: Response) => {
  try {
    const data = manualSyncSchema.parse(req.body);
    const organizationId = req.user!.organizationId!;

    // Verify account belongs to org
    const account = await prisma.adAccount.findFirst({
      where: {
        id: data.accountId,
        organizationId,
        isEnabled: true,
      },
      include: {
        connection: true,
      },
    });

    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    if (account.connection.status !== 'ACTIVE') {
      res.status(400).json({ error: 'Connection is not active. Please reconnect.' });
      return;
    }

    // Check for recent running job
    const recentJob = await prisma.syncJob.findFirst({
      where: {
        adAccountId: account.id,
        status: { in: ['PENDING', 'RUNNING'] },
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
      },
    });

    if (recentJob) {
      res.status(400).json({ 
        error: 'A sync is already in progress or queued',
        jobId: recentJob.id,
      });
      return;
    }

    // Create sync job record
    const syncJob = await prisma.syncJob.create({
      data: {
        adAccountId: account.id,
        jobType: 'MANUAL_SYNC',
        status: 'PENDING',
        dateFrom: new Date(data.dateFrom),
        dateTo: new Date(data.dateTo),
      },
    });

    // Update account status
    await prisma.adAccount.update({
      where: { id: account.id },
      data: { syncStatus: 'SYNCING' },
    });

    // Add job to queue
    await addSyncJob({
      type: 'manual_sync',
      adAccountId: account.id,
      connectionId: account.connectionId,
      customerId: account.externalId,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
      provider: account.provider,
      organizationId,
      initiatedBy: req.user!.id,
    }, {
      jobId: syncJob.id,
      priority: 1, // Higher priority for manual syncs
    });

    res.status(201).json({
      message: 'Sync job queued successfully',
      job: {
        id: syncJob.id,
        status: syncJob.status,
        dateFrom: syncJob.dateFrom,
        dateTo: syncJob.dateTo,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Manual sync error:', error);
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

/**
 * GET /api/sync/queue-stats
 * Get queue statistics (admin only)
 */
router.get('/queue-stats', authenticate, requireOrganization, requireAdmin, async (req: Request, res: Response) => {
  try {
    const [syncStats, dimensionsStats] = await Promise.all([
      getQueueStats(QUEUE_NAMES.SYNC),
      getQueueStats(QUEUE_NAMES.DIMENSIONS),
    ]);

    res.json({
      sync: syncStats,
      dimensions: dimensionsStats,
    });
  } catch (error) {
    console.error('Queue stats error:', error);
    res.status(500).json({ error: 'Failed to get queue stats' });
  }
});

/**
 * DELETE /api/sync/jobs/:id
 * Cancel a pending sync job
 */
router.delete('/jobs/:id', authenticate, requireOrganization, requireAdmin, async (req: Request, res: Response) => {
  try {
    const job = await prisma.syncJob.findFirst({
      where: {
        id: req.params.id,
        adAccount: {
          organizationId: req.user!.organizationId!,
        },
        status: { in: ['PENDING', 'RUNNING'] },
      },
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found or already completed' });
      return;
    }

    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    res.json({ success: true, message: 'Job cancelled' });
  } catch (error) {
    console.error('Cancel job error:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

export default router;

