'use client';

import { useState } from 'react';
import {
  Plus,
  ExternalLink,
  MoreVertical,
  RefreshCw,
  Check,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Progress } from '@/src/components/ui/progress';
import { cn, formatDate } from '@/src/lib/utils';

// Mock data
const mockAccounts = [
  {
    id: '1',
    name: 'Main Brand Account',
    externalId: '123-456-7890',
    provider: 'GOOGLE_ADS',
    currency: 'USD',
    isEnabled: true,
    syncStatus: 'SYNCED',
    lastSyncedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    campaignCount: 12,
  },
  {
    id: '2',
    name: 'Performance Max Campaigns',
    externalId: '234-567-8901',
    provider: 'GOOGLE_ADS',
    currency: 'USD',
    isEnabled: true,
    syncStatus: 'SYNCING',
    lastSyncedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    campaignCount: 5,
  },
  {
    id: '3',
    name: 'EU Market Account',
    externalId: '345-678-9012',
    provider: 'GOOGLE_ADS',
    currency: 'EUR',
    isEnabled: true,
    syncStatus: 'ERROR',
    lastSyncedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    campaignCount: 8,
  },
  {
    id: '4',
    name: 'Legacy Account (Disabled)',
    externalId: '456-789-0123',
    provider: 'GOOGLE_ADS',
    currency: 'USD',
    isEnabled: false,
    syncStatus: 'PENDING',
    lastSyncedAt: null,
    campaignCount: 3,
  },
];

const mockConnection = {
  connected: true,
  email: 'ads@company.com',
  status: 'ACTIVE',
  lastRefreshed: new Date().toISOString(),
};

function SyncStatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ElementType; label: string; className: string }> = {
    SYNCED: { icon: Check, label: 'Synced', className: 'bg-emerald-500/10 text-emerald-400' },
    SYNCING: { icon: Loader2, label: 'Syncing', className: 'bg-violet-500/10 text-violet-400' },
    PENDING: { icon: Clock, label: 'Pending', className: 'bg-amber-500/10 text-amber-400' },
    ERROR: { icon: AlertCircle, label: 'Error', className: 'bg-red-500/10 text-red-400' },
  };

  const { icon: Icon, label, className } = config[status] || config.PENDING;

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', className)}>
      <Icon className={cn('w-3.5 h-3.5', status === 'SYNCING' && 'animate-spin')} />
      {label}
    </span>
  );
}

export default function AccountsPage() {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    // In a real app, this would redirect to OAuth
    setTimeout(() => {
      setIsConnecting(false);
      window.location.href = '/api/v1/oauth/google/authorize';
    }, 500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ad Accounts</h1>
          <p className="text-muted-foreground">Manage your connected advertising accounts</p>
        </div>
        <Button onClick={handleConnectGoogle} disabled={isConnecting}>
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Connect Account
            </>
          )}
        </Button>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Google Ads Connection</CardTitle>
        </CardHeader>
        <CardContent>
          {mockConnection.connected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">{mockConnection.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Connected • Last refreshed {formatDate(mockConnection.lastRefreshed)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Token
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No Google Ads account connected</p>
              <Button onClick={handleConnectGoogle}>
                <Plus className="w-4 h-4 mr-2" />
                Connect Google Ads
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Linked Accounts</CardTitle>
          <CardDescription>
            {mockAccounts.filter((a) => a.isEnabled).length} active accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockAccounts.map((account) => (
              <div
                key={account.id}
                className={cn(
                  'p-4 rounded-lg border transition-colors',
                  account.isEnabled
                    ? 'border-border hover:border-primary/50'
                    : 'border-border/50 bg-muted/30'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        account.isEnabled ? 'bg-violet-500/10' : 'bg-muted'
                      )}
                    >
                      <span className="text-xs font-bold text-violet-400">GA</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={cn('font-medium', !account.isEnabled && 'text-muted-foreground')}>
                          {account.name}
                        </h3>
                        {!account.isEnabled && (
                          <span className="text-xs text-muted-foreground">(Disabled)</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ID: {account.externalId} • {account.currency} • {account.campaignCount} campaigns
                      </p>
                      {account.lastSyncedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last synced: {formatDate(account.lastSyncedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <SyncStatusBadge status={account.syncStatus} />
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {account.syncStatus === 'SYNCING' && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Syncing data...</span>
                      <span>45%</span>
                    </div>
                    <Progress value={45} className="h-1" />
                  </div>
                )}

                {account.syncStatus === 'ERROR' && (
                  <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-500">Sync Failed</p>
                        <p className="text-xs text-red-500/80 mt-0.5">
                          Rate limit exceeded. Will retry automatically in 15 minutes.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add More Platforms */}
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <div className="max-w-sm mx-auto">
            <h3 className="font-semibold mb-2">More Platforms Coming Soon</h3>
            <p className="text-sm text-muted-foreground mb-4">
              We're working on adding support for Meta Ads, TikTok Ads, and more.
            </p>
            <div className="flex justify-center gap-4 opacity-50">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <span className="text-xs font-bold">META</span>
              </div>
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <span className="text-xs font-bold">TT</span>
              </div>
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <span className="text-xs font-bold">LI</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

