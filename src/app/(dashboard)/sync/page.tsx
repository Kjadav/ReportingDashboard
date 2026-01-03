'use client';

import { useState } from 'react';
import {
  RefreshCw,
  Check,
  AlertCircle,
  Clock,
  Loader2,
  Calendar,
  Play,
  Pause,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Progress } from '@/src/components/ui/progress';
import { cn, formatDate } from '@/src/lib/utils';

// Mock data
const mockSyncJobs = [
  {
    id: '1',
    accountName: 'Main Brand Account',
    accountExternalId: '123-456-7890',
    jobType: 'DAILY_SYNC',
    status: 'COMPLETED',
    dateFrom: '2024-12-16',
    dateTo: '2024-12-17',
    startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    metrics: { rowsProcessed: 156, durationMs: 45000 },
  },
  {
    id: '2',
    accountName: 'Performance Max',
    accountExternalId: '234-567-8901',
    jobType: 'MANUAL_SYNC',
    status: 'RUNNING',
    dateFrom: '2024-12-01',
    dateTo: '2024-12-17',
    startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    completedAt: null,
    metrics: null,
  },
  {
    id: '3',
    accountName: 'EU Market Account',
    accountExternalId: '345-678-9012',
    jobType: 'DAILY_SYNC',
    status: 'FAILED',
    dateFrom: '2024-12-16',
    dateTo: '2024-12-17',
    startedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    errorMessage: 'Rate limit exceeded. Will retry automatically.',
    metrics: null,
  },
  {
    id: '4',
    accountName: 'Main Brand Account',
    accountExternalId: '123-456-7890',
    jobType: 'BACKFILL',
    status: 'PENDING',
    dateFrom: '2024-09-01',
    dateTo: '2024-12-01',
    startedAt: null,
    completedAt: null,
    metrics: null,
  },
];

const queueStats = {
  sync: { waiting: 2, active: 1, completed: 1547, failed: 23, delayed: 0 },
  dimensions: { waiting: 0, active: 0, completed: 89, failed: 2, delayed: 0 },
};

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ElementType; label: string; className: string }> = {
    COMPLETED: { icon: Check, label: 'Completed', className: 'bg-emerald-500/10 text-emerald-400' },
    RUNNING: { icon: Loader2, label: 'Running', className: 'bg-violet-500/10 text-violet-400' },
    PENDING: { icon: Clock, label: 'Pending', className: 'bg-amber-500/10 text-amber-400' },
    FAILED: { icon: AlertCircle, label: 'Failed', className: 'bg-red-500/10 text-red-400' },
    CANCELLED: { icon: Pause, label: 'Cancelled', className: 'bg-gray-500/10 text-gray-400' },
  };

  const { icon: Icon, label, className } = config[status] || config.PENDING;

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', className)}>
      <Icon className={cn('w-3.5 h-3.5', status === 'RUNNING' && 'animate-spin')} />
      {label}
    </span>
  );
}

function JobTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    INITIAL_SYNC: 'Initial',
    DAILY_SYNC: 'Daily',
    INTRADAY_SYNC: 'Intraday',
    BACKFILL: 'Backfill',
    MANUAL_SYNC: 'Manual',
  };

  return (
    <span className="px-2 py-0.5 rounded bg-muted text-xs font-medium text-muted-foreground">
      {labels[type] || type}
    </span>
  );
}

export default function SyncPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const runningJobs = mockSyncJobs.filter((j) => j.status === 'RUNNING');
  const pendingJobs = mockSyncJobs.filter((j) => j.status === 'PENDING');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sync Status</h1>
          <p className="text-muted-foreground">Monitor data synchronization jobs</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sync Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-amber-400">{queueStats.sync.waiting}</p>
                <p className="text-xs text-muted-foreground">Waiting</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-violet-400">{queueStats.sync.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{queueStats.sync.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{queueStats.sync.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-muted-foreground">{queueStats.sync.delayed}</p>
                <p className="text-xs text-muted-foreground">Delayed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dimensions Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-amber-400">{queueStats.dimensions.waiting}</p>
                <p className="text-xs text-muted-foreground">Waiting</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-violet-400">{queueStats.dimensions.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{queueStats.dimensions.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{queueStats.dimensions.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-muted-foreground">{queueStats.dimensions.delayed}</p>
                <p className="text-xs text-muted-foreground">Delayed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Running Jobs */}
      {runningJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
              Running Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {runningJobs.map((job) => (
              <div key={job.id} className="p-4 rounded-lg border border-violet-500/20 bg-violet-500/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">{job.accountName}</h3>
                    <JobTypeBadge type={job.jobType} />
                  </div>
                  <StatusBadge status={job.status} />
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Syncing {job.dateFrom} to {job.dateTo}</span>
                    <span>In progress...</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Started {new Date(job.startedAt!).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Job History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Job History</CardTitle>
              <CardDescription>Recent synchronization jobs</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              View All
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Account</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date Range</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Duration</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Rows</th>
                </tr>
              </thead>
              <tbody>
                {mockSyncJobs.map((job) => {
                  const duration = job.startedAt && job.completedAt
                    ? Math.round((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000)
                    : null;

                  return (
                    <tr key={job.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{job.accountName}</p>
                          <p className="text-xs text-muted-foreground">{job.accountExternalId}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <JobTypeBadge type={job.jobType} />
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {job.dateFrom} → {job.dateTo}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {duration ? `${duration}s` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-sm">
                        {job.metrics?.rowsProcessed?.toLocaleString() || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Sync Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-medium mb-1">Daily Sync</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Runs every day at 6:00 AM UTC
              </p>
              <p className="text-xs text-muted-foreground">
                Syncs yesterday's and today's data
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-medium mb-1">Initial Sync</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Triggered when accounts are linked
              </p>
              <p className="text-xs text-muted-foreground">
                Fetches last 90 days of historical data
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-medium mb-1">Manual Sync</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Triggered by admins from the UI
              </p>
              <p className="text-xs text-muted-foreground">
                Can specify custom date ranges
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

