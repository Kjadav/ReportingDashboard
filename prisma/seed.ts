import { PrismaClient, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const passwordHash = await argon2.hash('demo123456', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      passwordHash,
      firstName: 'Demo',
      lastName: 'User',
      emailVerified: true,
    },
  });

  console.log('✅ Created demo user:', user.email);

  // Create organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
    },
  });

  console.log('✅ Created organization:', organization.name);

  // Create membership
  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: organization.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      organizationId: organization.id,
      role: 'ADMIN',
    },
  });

  console.log('✅ Created membership');

  // Create mock connection (for demo purposes - tokens are fake)
  const connection = await prisma.connection.upsert({
    where: {
      organizationId_provider: {
        organizationId: organization.id,
        provider: 'GOOGLE_ADS',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      provider: 'GOOGLE_ADS',
      providerEmail: 'ads@example.com',
      accessTokenEnc: 'demo-access-token-encrypted',
      refreshTokenEnc: 'demo-refresh-token-encrypted',
      accessTokenExpiry: new Date(Date.now() + 3600000),
      scopes: ['https://www.googleapis.com/auth/adwords'],
      status: 'ACTIVE',
    },
  });

  console.log('✅ Created mock connection');

  // Create mock ad accounts
  const accounts = [
    { name: 'Main Brand Account', externalId: '123-456-7890', currency: 'USD' },
    { name: 'Performance Max', externalId: '234-567-8901', currency: 'USD' },
    { name: 'EU Market Account', externalId: '345-678-9012', currency: 'EUR' },
  ];

  for (const accountData of accounts) {
    const account = await prisma.adAccount.upsert({
      where: {
        organizationId_provider_externalId: {
          organizationId: organization.id,
          provider: 'GOOGLE_ADS',
          externalId: accountData.externalId,
        },
      },
      update: {},
      create: {
        organizationId: organization.id,
        connectionId: connection.id,
        provider: 'GOOGLE_ADS',
        externalId: accountData.externalId,
        name: accountData.name,
        currency: accountData.currency,
        isEnabled: true,
        syncStatus: 'SYNCED',
        lastSyncedAt: new Date(),
      },
    });

    // Create mock campaigns
    const campaigns = [
      { name: 'Brand Awareness - Q4', status: 'ENABLED' as const },
      { name: 'Product Launch', status: 'ENABLED' as const },
      { name: 'Retargeting', status: 'PAUSED' as const },
    ];

    for (const campaignData of campaigns) {
      const campaign = await prisma.campaign.upsert({
        where: {
          adAccountId_externalId: {
            adAccountId: account.id,
            externalId: `campaign-${account.externalId}-${campaignData.name.slice(0, 5)}`,
          },
        },
        update: {},
        create: {
          adAccountId: account.id,
          externalId: `campaign-${account.externalId}-${campaignData.name.slice(0, 5)}`,
          name: campaignData.name,
          status: campaignData.status,
          type: 'SEARCH',
        },
      });

      // Create mock metrics for the last 30 days
      const today = new Date();
      for (let i = 30; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const baseImpressions = Math.floor(Math.random() * 50000) + 10000;
        const baseClicks = Math.floor(baseImpressions * (Math.random() * 0.04 + 0.02));
        const baseSpend = baseClicks * (Math.random() * 0.5 + 0.1);
        const baseConversions = Math.floor(baseClicks * (Math.random() * 0.1 + 0.02));

        await prisma.metricsFact.upsert({
          where: {
            date_provider_adAccountId_campaignId_adGroupId_adId: {
              date,
              provider: 'GOOGLE_ADS',
              adAccountId: account.id,
              campaignId: campaign.id,
              adGroupId: null,
              adId: null,
            },
          },
          update: {},
          create: {
            date,
            provider: 'GOOGLE_ADS',
            adAccountId: account.id,
            campaignId: campaign.id,
            impressions: BigInt(baseImpressions),
            clicks: BigInt(baseClicks),
            spend: new Prisma.Decimal(baseSpend.toFixed(2)),
            conversions: new Prisma.Decimal(baseConversions),
            conversionValue: new Prisma.Decimal((baseConversions * (Math.random() * 50 + 20)).toFixed(2)),
          },
        });
      }
    }

    console.log(`✅ Created account with campaigns and metrics: ${account.name}`);
  }

  console.log('');
  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('Demo credentials:');
  console.log('  Email: demo@example.com');
  console.log('  Password: demo123456');
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

