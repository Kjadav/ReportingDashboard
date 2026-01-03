import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { decrypt, encrypt } from './encryption';
import prisma from './prisma';
import { googleAdsRateLimiter } from './redis';

const GOOGLE_ADS_SCOPES = ['https://www.googleapis.com/auth/adwords'];

// Create OAuth2 client
function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate OAuth authorization URL for Google Ads
 */
export function generateAuthUrl(state: string): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_ADS_SCOPES,
    prompt: 'consent', // Force consent to always get refresh token
    state,
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  email?: string;
}> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to get tokens from Google');
  }

  // Get user info
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date || Date.now() + 3600000,
    email: data.email || undefined,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiryDate: number;
}> {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token');
  }

  return {
    accessToken: credentials.access_token,
    expiryDate: credentials.expiry_date || Date.now() + 3600000,
  };
}

/**
 * Get valid access token for a connection, refreshing if necessary
 */
export async function getValidAccessToken(connectionId: string): Promise<string> {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    throw new Error('Connection not found');
  }

  const accessToken = decrypt(connection.accessTokenEnc);
  const refreshToken = decrypt(connection.refreshTokenEnc);

  // Check if token needs refresh (5 min buffer)
  const expiryBuffer = 5 * 60 * 1000;
  const isExpired =
    !connection.accessTokenExpiry ||
    connection.accessTokenExpiry.getTime() < Date.now() + expiryBuffer;

  if (isExpired) {
    try {
      const { accessToken: newAccessToken, expiryDate } = await refreshAccessToken(refreshToken);

      // Update connection with new access token
      await prisma.connection.update({
        where: { id: connectionId },
        data: {
          accessTokenEnc: encrypt(newAccessToken),
          accessTokenExpiry: new Date(expiryDate),
          lastRefreshedAt: new Date(),
          status: 'ACTIVE',
          errorMessage: null,
        },
      });

      return newAccessToken;
    } catch (error) {
      // Mark connection as expired
      await prisma.connection.update({
        where: { id: connectionId },
        data: {
          status: 'EXPIRED',
          errorMessage: error instanceof Error ? error.message : 'Token refresh failed',
        },
      });
      throw error;
    }
  }

  return accessToken;
}

/**
 * Google Ads API client interface
 */
export interface GoogleAdsMetrics {
  date: string;
  customerId: string;
  campaignId: string;
  campaignName: string;
  adGroupId?: string;
  adGroupName?: string;
  adId?: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
}

/**
 * Make a Google Ads API request using GAQL
 * Note: This is a simplified implementation. In production, use the google-ads-api package.
 */
export async function queryGoogleAds(
  connectionId: string,
  customerId: string,
  query: string
): Promise<any[]> {
  // Rate limit check
  const canProceed = await googleAdsRateLimiter.waitForToken(1, 30000);
  if (!canProceed) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  const accessToken = await getValidAccessToken(connectionId);
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

  if (!developerToken) {
    throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN is required');
  }

  // Make request to Google Ads API
  const response = await fetch(
    `https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Ads API error: ${error}`);
  }

  const data = await response.json();
  return data.results || [];
}

/**
 * Get list of accessible customer IDs
 */
export async function listAccessibleCustomers(connectionId: string): Promise<
  Array<{
    customerId: string;
    descriptiveName: string;
    currencyCode: string;
    timeZone: string;
  }>
> {
  const accessToken = await getValidAccessToken(connectionId);
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

  if (!developerToken) {
    throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN is required');
  }

  // First, get list of customer IDs
  const listResponse = await fetch(
    'https://googleads.googleapis.com/v14/customers:listAccessibleCustomers',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
      },
    }
  );

  if (!listResponse.ok) {
    const error = await listResponse.text();
    throw new Error(`Failed to list customers: ${error}`);
  }

  const { resourceNames } = await listResponse.json();
  const customerIds = (resourceNames || []).map((name: string) => name.replace('customers/', ''));

  // Get details for each customer
  const customers: Array<{
    customerId: string;
    descriptiveName: string;
    currencyCode: string;
    timeZone: string;
  }> = [];

  for (const customerId of customerIds) {
    try {
      const canProceed = await googleAdsRateLimiter.waitForToken(1, 30000);
      if (!canProceed) continue;

      const query = `
        SELECT
          customer.id,
          customer.descriptive_name,
          customer.currency_code,
          customer.time_zone
        FROM customer
        LIMIT 1
      `;

      const response = await fetch(
        `https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:search`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': developerToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.results?.[0]?.customer) {
          const customer = data.results[0].customer;
          customers.push({
            customerId: customer.id,
            descriptiveName: customer.descriptiveName || `Account ${customer.id}`,
            currencyCode: customer.currencyCode || 'USD',
            timeZone: customer.timeZone || 'America/Los_Angeles',
          });
        }
      }
    } catch (e) {
      console.error(`Error fetching customer ${customerId}:`, e);
    }
  }

  return customers;
}

/**
 * Fetch campaign performance data
 */
export async function fetchCampaignPerformance(
  connectionId: string,
  customerId: string,
  startDate: string,
  endDate: string
): Promise<GoogleAdsMetrics[]> {
  const query = `
    SELECT
      segments.date,
      customer.id,
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY segments.date DESC
  `;

  const results = await queryGoogleAds(connectionId, customerId, query);

  return results.map((row: any) => ({
    date: row.segments.date,
    customerId: row.customer.id,
    campaignId: row.campaign.id,
    campaignName: row.campaign.name,
    impressions: parseInt(row.metrics.impressions || '0'),
    clicks: parseInt(row.metrics.clicks || '0'),
    cost: parseInt(row.metrics.costMicros || '0') / 1000000,
    conversions: parseFloat(row.metrics.conversions || '0'),
    conversionValue: parseFloat(row.metrics.conversionsValue || '0'),
  }));
}

/**
 * Fetch ad group performance data
 */
export async function fetchAdGroupPerformance(
  connectionId: string,
  customerId: string,
  startDate: string,
  endDate: string
): Promise<GoogleAdsMetrics[]> {
  const query = `
    SELECT
      segments.date,
      customer.id,
      campaign.id,
      campaign.name,
      ad_group.id,
      ad_group.name,
      ad_group.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM ad_group
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY segments.date DESC
  `;

  const results = await queryGoogleAds(connectionId, customerId, query);

  return results.map((row: any) => ({
    date: row.segments.date,
    customerId: row.customer.id,
    campaignId: row.campaign.id,
    campaignName: row.campaign.name,
    adGroupId: row.adGroup.id,
    adGroupName: row.adGroup.name,
    impressions: parseInt(row.metrics.impressions || '0'),
    clicks: parseInt(row.metrics.clicks || '0'),
    cost: parseInt(row.metrics.costMicros || '0') / 1000000,
    conversions: parseFloat(row.metrics.conversions || '0'),
    conversionValue: parseFloat(row.metrics.conversionsValue || '0'),
  }));
}

