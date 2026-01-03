import { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { SyncJobData } from '../lib/queue';
import { fetchCampaignPerformance, fetchAdGroupPerformance } from '../lib/google-ads';
import { cache } from '../lib/redis';

interface SyncResult {
  rowsProcessed: number;
  dateRange: { from: string; to: string };
  duration: number;
}

/**
 * Process a sync job - fetch data from Google Ads and store in warehouse
 */
export async function processSyncJob(job: Job<SyncJobData>): Promise<SyncResult> {
  const startTime = Date.now();
  const { adAccountId, connectionId, customerId, dateFrom, dateTo, provider } = job.data;

  try {
    // Update job status to running
    await prisma.syncJob.updateMany({
      where: {
        adAccountId,
        status: 'PENDING',
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
      },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // Update account status
    await prisma.adAccount.update({
      where: { id: adAccountId },
      data: { syncStatus: 'SYNCING' },
    });

    let totalRows = 0;

    // Fetch campaign-level metrics
    const campaignMetrics = await fetchCampaignPerformance(
      connectionId,
      customerId,
      dateFrom,
      dateTo
    );

    // Upsert campaign data and metrics
    for (const metric of campaignMetrics) {
      // Ensure campaign exists
      await prisma.campaign.upsert({
        where: {
          adAccountId_externalId: {
            adAccountId,
            externalId: metric.campaignId,
          },
        },
        create: {
          adAccountId,
          externalId: metric.campaignId,
          name: metric.campaignName,
          status: 'UNKNOWN',
        },
        update: {
          name: metric.campaignName,
        },
      });

      // Get campaign internal ID
      const campaign = await prisma.campaign.findUnique({
        where: {
          adAccountId_externalId: {
            adAccountId,
            externalId: metric.campaignId,
          },
        },
      });

      if (!campaign) continue;

      // Upsert metrics
      await prisma.metricsFact.upsert({
        where: {
          date_provider_adAccountId_campaignId_adGroupId_adId: {
            date: new Date(metric.date),
            provider,
            adAccountId,
            campaignId: campaign.id,
            adGroupId: null,
            adId: null,
          },
        },
        create: {
          date: new Date(metric.date),
          provider,
          adAccountId,
          campaignId: campaign.id,
          impressions: BigInt(metric.impressions),
          clicks: BigInt(metric.clicks),
          spend: new Prisma.Decimal(metric.cost),
          conversions: new Prisma.Decimal(metric.conversions),
          conversionValue: new Prisma.Decimal(metric.conversionValue),
        },
        update: {
          impressions: BigInt(metric.impressions),
          clicks: BigInt(metric.clicks),
          spend: new Prisma.Decimal(metric.cost),
          conversions: new Prisma.Decimal(metric.conversions),
          conversionValue: new Prisma.Decimal(metric.conversionValue),
        },
      });

      totalRows++;
    }

    // Update progress
    await job.updateProgress(50);

    // Fetch ad group level metrics
    try {
      const adGroupMetrics = await fetchAdGroupPerformance(
        connectionId,
        customerId,
        dateFrom,
        dateTo
      );

      for (const metric of adGroupMetrics) {
        if (!metric.adGroupId) continue;

        // Get campaign internal ID
        const campaign = await prisma.campaign.findUnique({
          where: {
            adAccountId_externalId: {
              adAccountId,
              externalId: metric.campaignId,
            },
          },
        });

        if (!campaign) continue;

        // Ensure ad group exists
        await prisma.adGroup.upsert({
          where: {
            adAccountId_externalId: {
              adAccountId,
              externalId: metric.adGroupId,
            },
          },
          create: {
            adAccountId,
            campaignId: campaign.id,
            externalId: metric.adGroupId,
            name: metric.adGroupName || 'Unknown Ad Group',
            status: 'UNKNOWN',
          },
          update: {
            name: metric.adGroupName || 'Unknown Ad Group',
          },
        });

        // Get ad group internal ID
        const adGroup = await prisma.adGroup.findUnique({
          where: {
            adAccountId_externalId: {
              adAccountId,
              externalId: metric.adGroupId,
            },
          },
        });

        if (!adGroup) continue;

        // Upsert metrics at ad group level
        await prisma.metricsFact.upsert({
          where: {
            date_provider_adAccountId_campaignId_adGroupId_adId: {
              date: new Date(metric.date),
              provider,
              adAccountId,
              campaignId: campaign.id,
              adGroupId: adGroup.id,
              adId: null,
            },
          },
          create: {
            date: new Date(metric.date),
            provider,
            adAccountId,
            campaignId: campaign.id,
            adGroupId: adGroup.id,
            impressions: BigInt(metric.impressions),
            clicks: BigInt(metric.clicks),
            spend: new Prisma.Decimal(metric.cost),
            conversions: new Prisma.Decimal(metric.conversions),
            conversionValue: new Prisma.Decimal(metric.conversionValue),
          },
          update: {
            impressions: BigInt(metric.impressions),
            clicks: BigInt(metric.clicks),
            spend: new Prisma.Decimal(metric.cost),
            conversions: new Prisma.Decimal(metric.conversions),
            conversionValue: new Prisma.Decimal(metric.conversionValue),
          },
        });

        totalRows++;
      }
    } catch (err) {
      console.warn('Failed to fetch ad group metrics:', err);
      // Continue without ad group data
    }

    // Update progress
    await job.updateProgress(100);

    const duration = Date.now() - startTime;

    // Update job status to completed
    await prisma.syncJob.updateMany({
      where: {
        adAccountId,
        status: 'RUNNING',
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        metrics: {
          rowsProcessed: totalRows,
          durationMs: duration,
        },
      },
    });

    // Update account status
    await prisma.adAccount.update({
      where: { id: adAccountId },
      data: {
        syncStatus: 'SYNCED',
        lastSyncedAt: new Date(),
      },
    });

    // Invalidate metrics cache for this account
    await cache.delPattern(`metrics:*${adAccountId}*`);

    return {
      rowsProcessed: totalRows,
      dateRange: { from: dateFrom, to: dateTo },
      duration,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update job status to failed
    await prisma.syncJob.updateMany({
      where: {
        adAccountId,
        status: { in: ['PENDING', 'RUNNING'] },
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
      },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage,
      },
    });

    // Update account status
    await prisma.adAccount.update({
      where: { id: adAccountId },
      data: { syncStatus: 'ERROR' },
    });

    throw error;
  }
}

/**
 * Split a date range into smaller chunks for large syncs
 */
export function splitDateRange(
  startDate: string,
  endDate: string,
  maxDaysPerChunk: number = 30
): Array<{ from: string; to: string }> {
  const chunks: Array<{ from: string; to: string }> = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  let chunkStart = new Date(start);

  while (chunkStart <= end) {
    const chunkEnd = new Date(chunkStart);
    chunkEnd.setDate(chunkEnd.getDate() + maxDaysPerChunk - 1);

    if (chunkEnd > end) {
      chunkEnd.setTime(end.getTime());
    }

    chunks.push({
      from: chunkStart.toISOString().split('T')[0],
      to: chunkEnd.toISOString().split('T')[0],
    });

    chunkStart = new Date(chunkEnd);
    chunkStart.setDate(chunkStart.getDate() + 1);
  }

  return chunks;
}

