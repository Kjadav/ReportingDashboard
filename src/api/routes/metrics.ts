import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { authenticate, requireOrganization } from '../middleware/auth';
import { cache } from '../../lib/redis';

const router = Router();

// Validation schemas
const metricsQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  granularity: z.enum(['day', 'week', 'month']).default('day'),
  groupBy: z.enum(['account', 'campaign', 'adGroup', 'ad']).optional(),
  provider: z.enum(['GOOGLE_ADS', 'META_ADS', 'TIKTOK_ADS']).optional(),
  accountIds: z.string().optional(), // Comma-separated
  campaignIds: z.string().optional(), // Comma-separated
  metrics: z.string().optional(), // Comma-separated list
});

// Available metrics
const AVAILABLE_METRICS = [
  'impressions',
  'clicks',
  'spend',
  'conversions',
  'conversionValue',
  'cpc',
  'cpm',
  'ctr',
  'roas',
];

interface MetricsRow {
  date: Date;
  impressions: bigint;
  clicks: bigint;
  spend: Prisma.Decimal;
  conversions: Prisma.Decimal;
  conversionValue: Prisma.Decimal;
  adAccountId?: string;
  campaignId?: string;
  adGroupId?: string;
  adId?: string;
  accountName?: string;
  campaignName?: string;
  adGroupName?: string;
}

/**
 * Calculate derived metrics
 */
function calculateDerivedMetrics(row: {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversionValue: number;
}) {
  const cpc = row.clicks > 0 ? row.spend / row.clicks : 0;
  const cpm = row.impressions > 0 ? (row.spend / row.impressions) * 1000 : 0;
  const ctr = row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0;
  const roas = row.spend > 0 ? row.conversionValue / row.spend : 0;

  return { cpc, cpm, ctr, roas };
}

/**
 * GET /api/metrics
 * Get aggregated metrics for dashboards
 */
router.get('/', authenticate, requireOrganization, async (req: Request, res: Response) => {
  try {
    const query = metricsQuerySchema.parse(req.query);
    const organizationId = req.user!.organizationId!;

    // Build cache key
    const cacheKey = `metrics:${organizationId}:${JSON.stringify(query)}`;

    // Check cache (5 min TTL for metrics)
    const cached = await cache.get<any>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    // Parse account and campaign IDs
    const accountIds = query.accountIds?.split(',').filter(Boolean);
    const campaignIds = query.campaignIds?.split(',').filter(Boolean);
    const requestedMetrics = query.metrics?.split(',').filter(Boolean) || AVAILABLE_METRICS;

    // Get authorized account IDs for this org
    const authorizedAccounts = await prisma.adAccount.findMany({
      where: {
        organizationId,
        isEnabled: true,
        ...(accountIds?.length ? { id: { in: accountIds } } : {}),
        ...(query.provider ? { provider: query.provider } : {}),
      },
      select: { id: true, name: true },
    });

    const authorizedAccountIds = authorizedAccounts.map((a) => a.id);
    const accountNameMap = new Map(authorizedAccounts.map((a) => [a.id, a.name]));

    if (authorizedAccountIds.length === 0) {
      res.json({ data: [], totals: {}, meta: { startDate: query.startDate, endDate: query.endDate } });
      return;
    }

    // Build where clause
    const whereClause: Prisma.MetricsFactWhereInput = {
      adAccountId: { in: authorizedAccountIds },
      date: {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      },
      ...(query.provider ? { provider: query.provider } : {}),
      ...(campaignIds?.length ? { campaignId: { in: campaignIds } } : {}),
    };

    // Determine grouping
    let groupByFields: (keyof MetricsRow)[] = ['date'];
    if (query.groupBy === 'account') groupByFields.push('adAccountId');
    if (query.groupBy === 'campaign') groupByFields.push('adAccountId', 'campaignId');
    if (query.groupBy === 'adGroup') groupByFields.push('adAccountId', 'campaignId', 'adGroupId');
    if (query.groupBy === 'ad') groupByFields.push('adAccountId', 'campaignId', 'adGroupId', 'adId');

    // Fetch raw metrics
    const rawMetrics = await prisma.metricsFact.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
    });

    // Aggregate by date and group
    const aggregatedMap = new Map<string, {
      date: string;
      impressions: number;
      clicks: number;
      spend: number;
      conversions: number;
      conversionValue: number;
      adAccountId?: string;
      campaignId?: string;
      adGroupId?: string;
      adId?: string;
    }>();

    for (const row of rawMetrics) {
      const dateStr = row.date.toISOString().split('T')[0];
      let key = dateStr;

      const groupData: any = { date: dateStr };

      if (query.groupBy === 'account' || query.groupBy === 'campaign' || query.groupBy === 'adGroup' || query.groupBy === 'ad') {
        key += `:${row.adAccountId}`;
        groupData.adAccountId = row.adAccountId;
        groupData.accountName = accountNameMap.get(row.adAccountId);
      }
      if (query.groupBy === 'campaign' || query.groupBy === 'adGroup' || query.groupBy === 'ad') {
        key += `:${row.campaignId}`;
        groupData.campaignId = row.campaignId;
      }
      if (query.groupBy === 'adGroup' || query.groupBy === 'ad') {
        key += `:${row.adGroupId}`;
        groupData.adGroupId = row.adGroupId;
      }
      if (query.groupBy === 'ad') {
        key += `:${row.adId}`;
        groupData.adId = row.adId;
      }

      const existing = aggregatedMap.get(key);
      if (existing) {
        existing.impressions += Number(row.impressions);
        existing.clicks += Number(row.clicks);
        existing.spend += Number(row.spend);
        existing.conversions += Number(row.conversions);
        existing.conversionValue += Number(row.conversionValue);
      } else {
        aggregatedMap.set(key, {
          ...groupData,
          impressions: Number(row.impressions),
          clicks: Number(row.clicks),
          spend: Number(row.spend),
          conversions: Number(row.conversions),
          conversionValue: Number(row.conversionValue),
        });
      }
    }

    // Convert to array and calculate derived metrics
    const data = Array.from(aggregatedMap.values()).map((row) => {
      const derived = calculateDerivedMetrics(row);
      
      // Filter to requested metrics
      const result: any = { date: row.date };
      
      if (row.adAccountId) result.adAccountId = row.adAccountId;
      if (row.campaignId) result.campaignId = row.campaignId;
      if (row.adGroupId) result.adGroupId = row.adGroupId;
      if (row.adId) result.adId = row.adId;
      if ((row as any).accountName) result.accountName = (row as any).accountName;

      // Add requested metrics
      for (const metric of requestedMetrics) {
        if (metric in row) {
          result[metric] = (row as any)[metric];
        } else if (metric in derived) {
          result[metric] = (derived as any)[metric];
        }
      }

      return result;
    });

    // Calculate totals
    const totals = data.reduce(
      (acc, row) => ({
        impressions: acc.impressions + (row.impressions || 0),
        clicks: acc.clicks + (row.clicks || 0),
        spend: acc.spend + (row.spend || 0),
        conversions: acc.conversions + (row.conversions || 0),
        conversionValue: acc.conversionValue + (row.conversionValue || 0),
      }),
      { impressions: 0, clicks: 0, spend: 0, conversions: 0, conversionValue: 0 }
    );

    const derivedTotals = calculateDerivedMetrics(totals);

    const response = {
      data,
      totals: { ...totals, ...derivedTotals },
      meta: {
        startDate: query.startDate,
        endDate: query.endDate,
        granularity: query.granularity,
        groupBy: query.groupBy,
        rowCount: data.length,
      },
    };

    // Cache response
    await cache.set(cacheKey, response, 300); // 5 minutes

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Metrics error:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

/**
 * GET /api/metrics/summary
 * Get summary metrics for dashboard cards
 */
router.get('/summary', authenticate, requireOrganization, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, compareStartDate, compareEndDate } = z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      compareStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      compareEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }).parse(req.query);

    const organizationId = req.user!.organizationId!;

    // Get authorized accounts
    const accounts = await prisma.adAccount.findMany({
      where: { organizationId, isEnabled: true },
      select: { id: true },
    });

    const accountIds = accounts.map((a) => a.id);

    if (accountIds.length === 0) {
      res.json({
        current: { impressions: 0, clicks: 0, spend: 0, conversions: 0, conversionValue: 0 },
        previous: null,
        changes: null,
      });
      return;
    }

    // Get current period metrics
    const currentMetrics = await prisma.metricsFact.aggregate({
      where: {
        adAccountId: { in: accountIds },
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      _sum: {
        impressions: true,
        clicks: true,
        spend: true,
        conversions: true,
        conversionValue: true,
      },
    });

    const current = {
      impressions: Number(currentMetrics._sum.impressions || 0),
      clicks: Number(currentMetrics._sum.clicks || 0),
      spend: Number(currentMetrics._sum.spend || 0),
      conversions: Number(currentMetrics._sum.conversions || 0),
      conversionValue: Number(currentMetrics._sum.conversionValue || 0),
    };

    // Get comparison period if requested
    let previous = null;
    let changes = null;

    if (compareStartDate && compareEndDate) {
      const previousMetrics = await prisma.metricsFact.aggregate({
        where: {
          adAccountId: { in: accountIds },
          date: {
            gte: new Date(compareStartDate),
            lte: new Date(compareEndDate),
          },
        },
        _sum: {
          impressions: true,
          clicks: true,
          spend: true,
          conversions: true,
          conversionValue: true,
        },
      });

      previous = {
        impressions: Number(previousMetrics._sum.impressions || 0),
        clicks: Number(previousMetrics._sum.clicks || 0),
        spend: Number(previousMetrics._sum.spend || 0),
        conversions: Number(previousMetrics._sum.conversions || 0),
        conversionValue: Number(previousMetrics._sum.conversionValue || 0),
      };

      // Calculate percentage changes
      changes = {
        impressions: previous.impressions ? ((current.impressions - previous.impressions) / previous.impressions) * 100 : 0,
        clicks: previous.clicks ? ((current.clicks - previous.clicks) / previous.clicks) * 100 : 0,
        spend: previous.spend ? ((current.spend - previous.spend) / previous.spend) * 100 : 0,
        conversions: previous.conversions ? ((current.conversions - previous.conversions) / previous.conversions) * 100 : 0,
        conversionValue: previous.conversionValue ? ((current.conversionValue - previous.conversionValue) / previous.conversionValue) * 100 : 0,
      };
    }

    // Add derived metrics
    const currentDerived = calculateDerivedMetrics(current);
    const previousDerived = previous ? calculateDerivedMetrics(previous) : null;

    res.json({
      current: { ...current, ...currentDerived },
      previous: previous ? { ...previous, ...previousDerived } : null,
      changes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Summary metrics error:', error);
    res.status(500).json({ error: 'Failed to get summary metrics' });
  }
});

/**
 * GET /api/metrics/top-campaigns
 * Get top performing campaigns
 */
router.get('/top-campaigns', authenticate, requireOrganization, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, metric = 'spend', limit = '10' } = z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      metric: z.enum(['spend', 'impressions', 'clicks', 'conversions']).default('spend'),
      limit: z.string().regex(/^\d+$/).default('10'),
    }).parse(req.query);

    const organizationId = req.user!.organizationId!;

    // Get authorized accounts
    const accounts = await prisma.adAccount.findMany({
      where: { organizationId, isEnabled: true },
      select: { id: true },
    });

    const accountIds = accounts.map((a) => a.id);

    if (accountIds.length === 0) {
      res.json({ campaigns: [] });
      return;
    }

    // Get top campaigns
    const campaigns = await prisma.metricsFact.groupBy({
      by: ['campaignId'],
      where: {
        adAccountId: { in: accountIds },
        campaignId: { not: null },
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      _sum: {
        impressions: true,
        clicks: true,
        spend: true,
        conversions: true,
        conversionValue: true,
      },
      orderBy: {
        _sum: {
          [metric]: 'desc',
        },
      },
      take: parseInt(limit),
    });

    // Get campaign names
    const campaignIds = campaigns.map((c) => c.campaignId).filter(Boolean) as string[];
    const campaignDetails = await prisma.campaign.findMany({
      where: { id: { in: campaignIds } },
      select: { id: true, name: true, status: true },
    });

    const campaignMap = new Map(campaignDetails.map((c) => [c.id, c]));

    const result = campaigns.map((c) => {
      const details = campaignMap.get(c.campaignId!);
      const metrics = {
        impressions: Number(c._sum.impressions || 0),
        clicks: Number(c._sum.clicks || 0),
        spend: Number(c._sum.spend || 0),
        conversions: Number(c._sum.conversions || 0),
        conversionValue: Number(c._sum.conversionValue || 0),
      };

      return {
        id: c.campaignId,
        name: details?.name || 'Unknown Campaign',
        status: details?.status || 'UNKNOWN',
        ...metrics,
        ...calculateDerivedMetrics(metrics),
      };
    });

    res.json({ campaigns: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Top campaigns error:', error);
    res.status(500).json({ error: 'Failed to get top campaigns' });
  }
});

export default router;

