import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { authenticate, requireOrganization, requireAdmin } from '../middleware/auth';
import { scheduleInitialSync } from '../../lib/queue';

const router = Router();

// Validation schemas
const linkAccountsSchema = z.object({
  accounts: z.array(
    z.object({
      externalId: z.string(),
      name: z.string(),
      currency: z.string().default('USD'),
      timezone: z.string().default('America/Los_Angeles'),
    })
  ),
});

/**
 * GET /api/accounts
 * Get all ad accounts for the organization
 */
router.get('/', authenticate, requireOrganization, async (req: Request, res: Response) => {
  try {
    const accounts = await prisma.adAccount.findMany({
      where: { organizationId: req.user!.organizationId! },
      include: {
        connection: {
          select: {
            status: true,
            providerEmail: true,
          },
        },
        _count: {
          select: {
            campaigns: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      accounts: accounts.map((a) => ({
        id: a.id,
        externalId: a.externalId,
        name: a.name,
        provider: a.provider,
        currency: a.currency,
        timezone: a.timezone,
        isEnabled: a.isEnabled,
        syncStatus: a.syncStatus,
        lastSyncedAt: a.lastSyncedAt,
        connectionStatus: a.connection.status,
        connectionEmail: a.connection.providerEmail,
        campaignCount: a._count.campaigns,
      })),
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to get accounts' });
  }
});

/**
 * GET /api/accounts/:id
 * Get ad account details
 */
router.get('/:id', authenticate, requireOrganization, async (req: Request, res: Response) => {
  try {
    const account = await prisma.adAccount.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user!.organizationId!,
      },
      include: {
        campaigns: {
          orderBy: { name: 'asc' },
          take: 50,
        },
        syncJobs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    res.json({ account });
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ error: 'Failed to get account' });
  }
});

/**
 * POST /api/accounts/link
 * Link Google Ads accounts to the organization
 */
router.post('/link', authenticate, requireOrganization, requireAdmin, async (req: Request, res: Response) => {
  try {
    const data = linkAccountsSchema.parse(req.body);
    const organizationId = req.user!.organizationId!;

    // Get active connection
    const connection = await prisma.connection.findFirst({
      where: {
        organizationId,
        provider: 'GOOGLE_ADS',
        status: 'ACTIVE',
      },
    });

    if (!connection) {
      res.status(400).json({ error: 'No active Google Ads connection' });
      return;
    }

    // Create accounts
    const createdAccounts = [];

    for (const accountData of data.accounts) {
      // Check if account already exists
      const existing = await prisma.adAccount.findUnique({
        where: {
          organizationId_provider_externalId: {
            organizationId,
            provider: 'GOOGLE_ADS',
            externalId: accountData.externalId,
          },
        },
      });

      if (existing) {
        // Re-enable if disabled
        if (!existing.isEnabled) {
          await prisma.adAccount.update({
            where: { id: existing.id },
            data: { isEnabled: true },
          });
        }
        createdAccounts.push(existing);
        continue;
      }

      // Create new account
      const account = await prisma.adAccount.create({
        data: {
          organizationId,
          connectionId: connection.id,
          provider: 'GOOGLE_ADS',
          externalId: accountData.externalId,
          name: accountData.name,
          currency: accountData.currency,
          timezone: accountData.timezone,
          isEnabled: true,
          syncStatus: 'PENDING',
        },
      });

      createdAccounts.push(account);

      // Schedule initial sync
      try {
        await scheduleInitialSync({
          id: account.id,
          connectionId: connection.id,
          externalId: account.externalId,
          provider: 'GOOGLE_ADS',
          organizationId,
        });
      } catch (e) {
        console.error('Failed to schedule initial sync:', e);
      }
    }

    res.status(201).json({
      accounts: createdAccounts,
      message: `${createdAccounts.length} account(s) linked successfully`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Link accounts error:', error);
    res.status(500).json({ error: 'Failed to link accounts' });
  }
});

/**
 * PATCH /api/accounts/:id
 * Update ad account settings
 */
router.patch('/:id', authenticate, requireOrganization, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { isEnabled, name } = z.object({
      isEnabled: z.boolean().optional(),
      name: z.string().min(1).optional(),
    }).parse(req.body);

    const account = await prisma.adAccount.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user!.organizationId!,
      },
    });

    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    const updated = await prisma.adAccount.update({
      where: { id: req.params.id },
      data: {
        ...(isEnabled !== undefined && { isEnabled }),
        ...(name && { name }),
      },
    });

    res.json({ account: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Update account error:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

/**
 * DELETE /api/accounts/:id
 * Remove an ad account (soft delete - just disable)
 */
router.delete('/:id', authenticate, requireOrganization, requireAdmin, async (req: Request, res: Response) => {
  try {
    const account = await prisma.adAccount.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user!.organizationId!,
      },
    });

    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    // Soft delete - just disable
    await prisma.adAccount.update({
      where: { id: req.params.id },
      data: { isEnabled: false },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

/**
 * GET /api/accounts/:id/campaigns
 * Get campaigns for an ad account
 */
router.get('/:id/campaigns', authenticate, requireOrganization, async (req: Request, res: Response) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: {
        adAccountId: req.params.id,
        adAccount: {
          organizationId: req.user!.organizationId!,
        },
      },
      include: {
        _count: {
          select: { adGroups: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ campaigns });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Failed to get campaigns' });
  }
});

export default router;

