import { Job } from 'bullmq';
import prisma from '../lib/prisma';
import { DimensionSyncJobData } from '../lib/queue';
import { queryGoogleAds } from '../lib/google-ads';

interface DimensionSyncResult {
  campaigns: number;
  adGroups: number;
  ads: number;
}

/**
 * Process a dimensions sync job - fetch campaign/ad group/ad metadata
 */
export async function processDimensionsJob(
  job: Job<DimensionSyncJobData>
): Promise<DimensionSyncResult> {
  const { adAccountId, connectionId, customerId, provider } = job.data;

  let campaignsUpdated = 0;
  let adGroupsUpdated = 0;
  let adsUpdated = 0;

  try {
    // Sync campaigns
    const campaignQuery = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros,
        campaign.start_date,
        campaign.end_date
      FROM campaign
      WHERE campaign.status != 'REMOVED'
    `;

    const campaigns = await queryGoogleAds(connectionId, customerId, campaignQuery);

    for (const row of campaigns) {
      const campaign = row.campaign;
      
      await prisma.campaign.upsert({
        where: {
          adAccountId_externalId: {
            adAccountId,
            externalId: campaign.id,
          },
        },
        create: {
          adAccountId,
          externalId: campaign.id,
          name: campaign.name,
          status: mapCampaignStatus(campaign.status),
          type: campaign.advertisingChannelType,
          budget: row.campaignBudget?.amountMicros
            ? row.campaignBudget.amountMicros / 1000000
            : null,
          startDate: campaign.startDate ? new Date(campaign.startDate) : null,
          endDate: campaign.endDate ? new Date(campaign.endDate) : null,
        },
        update: {
          name: campaign.name,
          status: mapCampaignStatus(campaign.status),
          type: campaign.advertisingChannelType,
          budget: row.campaignBudget?.amountMicros
            ? row.campaignBudget.amountMicros / 1000000
            : null,
          startDate: campaign.startDate ? new Date(campaign.startDate) : null,
          endDate: campaign.endDate ? new Date(campaign.endDate) : null,
        },
      });

      campaignsUpdated++;
    }

    await job.updateProgress(33);

    // Sync ad groups
    const adGroupQuery = `
      SELECT
        campaign.id,
        ad_group.id,
        ad_group.name,
        ad_group.status
      FROM ad_group
      WHERE ad_group.status != 'REMOVED'
    `;

    const adGroups = await queryGoogleAds(connectionId, customerId, adGroupQuery);

    for (const row of adGroups) {
      const campaignExtId = row.campaign.id;
      const adGroup = row.adGroup;

      // Get campaign internal ID
      const campaign = await prisma.campaign.findUnique({
        where: {
          adAccountId_externalId: {
            adAccountId,
            externalId: campaignExtId,
          },
        },
      });

      if (!campaign) continue;

      await prisma.adGroup.upsert({
        where: {
          adAccountId_externalId: {
            adAccountId,
            externalId: adGroup.id,
          },
        },
        create: {
          adAccountId,
          campaignId: campaign.id,
          externalId: adGroup.id,
          name: adGroup.name,
          status: mapAdGroupStatus(adGroup.status),
        },
        update: {
          name: adGroup.name,
          status: mapAdGroupStatus(adGroup.status),
          campaignId: campaign.id,
        },
      });

      adGroupsUpdated++;
    }

    await job.updateProgress(66);

    // Sync ads
    const adsQuery = `
      SELECT
        campaign.id,
        ad_group.id,
        ad_group_ad.ad.id,
        ad_group_ad.ad.name,
        ad_group_ad.ad.type,
        ad_group_ad.status,
        ad_group_ad.ad.final_urls
      FROM ad_group_ad
      WHERE ad_group_ad.status != 'REMOVED'
      LIMIT 1000
    `;

    try {
      const ads = await queryGoogleAds(connectionId, customerId, adsQuery);

      for (const row of ads) {
        const campaignExtId = row.campaign.id;
        const adGroupExtId = row.adGroup.id;
        const ad = row.adGroupAd.ad;

        // Get campaign and ad group internal IDs
        const campaign = await prisma.campaign.findUnique({
          where: {
            adAccountId_externalId: {
              adAccountId,
              externalId: campaignExtId,
            },
          },
        });

        const adGroup = await prisma.adGroup.findUnique({
          where: {
            adAccountId_externalId: {
              adAccountId,
              externalId: adGroupExtId,
            },
          },
        });

        if (!campaign || !adGroup) continue;

        await prisma.ad.upsert({
          where: {
            adAccountId_externalId: {
              adAccountId,
              externalId: ad.id,
            },
          },
          create: {
            adAccountId,
            campaignId: campaign.id,
            adGroupId: adGroup.id,
            externalId: ad.id,
            name: ad.name,
            type: ad.type,
            status: mapAdStatus(row.adGroupAd.status),
            finalUrl: ad.finalUrls?.[0] || null,
          },
          update: {
            name: ad.name,
            type: ad.type,
            status: mapAdStatus(row.adGroupAd.status),
            finalUrl: ad.finalUrls?.[0] || null,
            campaignId: campaign.id,
            adGroupId: adGroup.id,
          },
        });

        adsUpdated++;
      }
    } catch (err) {
      console.warn('Failed to sync ads:', err);
      // Continue without ads
    }

    await job.updateProgress(100);

    return {
      campaigns: campaignsUpdated,
      adGroups: adGroupsUpdated,
      ads: adsUpdated,
    };
  } catch (error) {
    console.error('Dimensions sync error:', error);
    throw error;
  }
}

function mapCampaignStatus(status: string): 'ENABLED' | 'PAUSED' | 'REMOVED' | 'UNKNOWN' {
  switch (status) {
    case 'ENABLED':
      return 'ENABLED';
    case 'PAUSED':
      return 'PAUSED';
    case 'REMOVED':
      return 'REMOVED';
    default:
      return 'UNKNOWN';
  }
}

function mapAdGroupStatus(status: string): 'ENABLED' | 'PAUSED' | 'REMOVED' | 'UNKNOWN' {
  switch (status) {
    case 'ENABLED':
      return 'ENABLED';
    case 'PAUSED':
      return 'PAUSED';
    case 'REMOVED':
      return 'REMOVED';
    default:
      return 'UNKNOWN';
  }
}

function mapAdStatus(status: string): 'ENABLED' | 'PAUSED' | 'REMOVED' | 'UNKNOWN' {
  switch (status) {
    case 'ENABLED':
      return 'ENABLED';
    case 'PAUSED':
      return 'PAUSED';
    case 'REMOVED':
      return 'REMOVED';
    default:
      return 'UNKNOWN';
  }
}

