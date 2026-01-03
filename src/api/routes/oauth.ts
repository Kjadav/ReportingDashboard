import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { authenticate, requireOrganization } from '../middleware/auth';
import {
  generateAuthUrl,
  exchangeCodeForTokens,
  listAccessibleCustomers,
} from '../../lib/google-ads';
import { encryptTokens } from '../../lib/encryption';

const router = Router();

/**
 * GET /api/oauth/google/authorize
 * Generate OAuth authorization URL for Google Ads
 */
router.get('/google/authorize', authenticate, requireOrganization, async (req: Request, res: Response) => {
  try {
    const { organizationId, id: userId } = req.user!;

    // Create state parameter with user and org info
    const state = Buffer.from(
      JSON.stringify({
        userId,
        organizationId,
        timestamp: Date.now(),
      })
    ).toString('base64');

    const authUrl = generateAuthUrl(state);

    res.json({ authUrl });
  } catch (error) {
    console.error('OAuth URL generation error:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * GET /api/oauth/google/callback
 * Handle OAuth callback from Google
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      console.error('OAuth error:', oauthError);
      res.redirect(
        `${process.env.FRONTEND_URL}/settings/connections?error=oauth_denied`
      );
      return;
    }

    if (!code || !state) {
      res.redirect(
        `${process.env.FRONTEND_URL}/settings/connections?error=missing_params`
      );
      return;
    }

    // Decode state
    let stateData: { userId: string; organizationId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    } catch {
      res.redirect(
        `${process.env.FRONTEND_URL}/settings/connections?error=invalid_state`
      );
      return;
    }

    // Check state timestamp (expire after 10 minutes)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      res.redirect(
        `${process.env.FRONTEND_URL}/settings/connections?error=expired_state`
      );
      return;
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code as string);

    // Encrypt tokens
    const encrypted = encryptTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });

    // Check if connection already exists
    const existingConnection = await prisma.connection.findUnique({
      where: {
        organizationId_provider: {
          organizationId: stateData.organizationId,
          provider: 'GOOGLE_ADS',
        },
      },
    });

    if (existingConnection) {
      // Update existing connection
      await prisma.connection.update({
        where: { id: existingConnection.id },
        data: {
          accessTokenEnc: encrypted.accessTokenEnc,
          refreshTokenEnc: encrypted.refreshTokenEnc,
          accessTokenExpiry: new Date(tokens.expiryDate),
          providerEmail: tokens.email,
          status: 'ACTIVE',
          errorMessage: null,
          lastRefreshedAt: new Date(),
        },
      });
    } else {
      // Create new connection
      await prisma.connection.create({
        data: {
          organizationId: stateData.organizationId,
          provider: 'GOOGLE_ADS',
          providerEmail: tokens.email,
          accessTokenEnc: encrypted.accessTokenEnc,
          refreshTokenEnc: encrypted.refreshTokenEnc,
          accessTokenExpiry: new Date(tokens.expiryDate),
          scopes: ['https://www.googleapis.com/auth/adwords'],
          status: 'ACTIVE',
        },
      });
    }

    // Redirect to connections page with success
    res.redirect(
      `${process.env.FRONTEND_URL}/settings/connections?success=google_connected`
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(
      `${process.env.FRONTEND_URL}/settings/connections?error=callback_failed`
    );
  }
});

/**
 * GET /api/oauth/google/status
 * Get current Google Ads connection status
 */
router.get('/google/status', authenticate, requireOrganization, async (req: Request, res: Response) => {
  try {
    const connection = await prisma.connection.findUnique({
      where: {
        organizationId_provider: {
          organizationId: req.user!.organizationId!,
          provider: 'GOOGLE_ADS',
        },
      },
      select: {
        id: true,
        status: true,
        providerEmail: true,
        lastRefreshedAt: true,
        errorMessage: true,
        createdAt: true,
      },
    });

    if (!connection) {
      res.json({ connected: false });
      return;
    }

    res.json({
      connected: connection.status === 'ACTIVE',
      connection: {
        id: connection.id,
        status: connection.status,
        email: connection.providerEmail,
        lastRefreshed: connection.lastRefreshedAt,
        error: connection.errorMessage,
        connectedAt: connection.createdAt,
      },
    });
  } catch (error) {
    console.error('Connection status error:', error);
    res.status(500).json({ error: 'Failed to get connection status' });
  }
});

/**
 * GET /api/oauth/google/customers
 * Get list of accessible Google Ads customers
 */
router.get('/google/customers', authenticate, requireOrganization, async (req: Request, res: Response) => {
  try {
    const connection = await prisma.connection.findUnique({
      where: {
        organizationId_provider: {
          organizationId: req.user!.organizationId!,
          provider: 'GOOGLE_ADS',
        },
      },
    });

    if (!connection || connection.status !== 'ACTIVE') {
      res.status(400).json({ error: 'No active Google Ads connection' });
      return;
    }

    // Get accessible customers
    const customers = await listAccessibleCustomers(connection.id);

    // Get already linked accounts
    const linkedAccounts = await prisma.adAccount.findMany({
      where: {
        organizationId: req.user!.organizationId!,
        provider: 'GOOGLE_ADS',
      },
      select: { externalId: true },
    });

    const linkedIds = new Set(linkedAccounts.map((a) => a.externalId));

    // Mark which customers are already linked
    const customersWithStatus = customers.map((c) => ({
      ...c,
      isLinked: linkedIds.has(c.customerId),
    }));

    res.json({ customers: customersWithStatus });
  } catch (error) {
    console.error('List customers error:', error);
    res.status(500).json({ error: 'Failed to list customers' });
  }
});

/**
 * DELETE /api/oauth/google/disconnect
 * Disconnect Google Ads connection
 */
router.delete('/google/disconnect', authenticate, requireOrganization, async (req: Request, res: Response) => {
  try {
    const connection = await prisma.connection.findUnique({
      where: {
        organizationId_provider: {
          organizationId: req.user!.organizationId!,
          provider: 'GOOGLE_ADS',
        },
      },
    });

    if (!connection) {
      res.status(404).json({ error: 'No connection found' });
      return;
    }

    // Update connection status to disconnected
    await prisma.connection.update({
      where: { id: connection.id },
      data: {
        status: 'DISCONNECTED',
      },
    });

    // Disable all linked ad accounts
    await prisma.adAccount.updateMany({
      where: {
        connectionId: connection.id,
      },
      data: {
        isEnabled: false,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

export default router;

