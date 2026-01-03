'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  MousePointerClick,
  Eye,
  Target,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { cn, formatCurrency, formatNumber, formatPercent } from '@/src/lib/utils';

// Mock data for demo
const mockMetrics = {
  current: {
    impressions: 2456789,
    clicks: 84234,
    spend: 12450.67,
    conversions: 2341,
    conversionValue: 39876.45,
    cpc: 0.148,
    ctr: 3.43,
    roas: 3.2,
  },
  previous: {
    impressions: 2134567,
    clicks: 76543,
    spend: 10890.23,
    conversions: 1987,
    conversionValue: 32456.78,
  },
};

const mockChartData = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  impressions: Math.floor(Math.random() * 100000) + 50000,
  clicks: Math.floor(Math.random() * 5000) + 2000,
  spend: Math.random() * 500 + 300,
}));

const mockCampaigns = [
  { id: '1', name: 'Brand Awareness - Q4', spend: 4523.45, impressions: 890234, clicks: 23456, roas: 4.2, status: 'ENABLED' },
  { id: '2', name: 'Product Launch - Holiday', spend: 3212.78, impressions: 654321, clicks: 18765, roas: 3.8, status: 'ENABLED' },
  { id: '3', name: 'Retargeting - Cart Abandonment', spend: 2456.12, impressions: 345678, clicks: 12345, roas: 5.1, status: 'ENABLED' },
  { id: '4', name: 'Search - Generic Keywords', spend: 1890.32, impressions: 234567, clicks: 8765, roas: 2.9, status: 'PAUSED' },
  { id: '5', name: 'Display - Interest Targeting', spend: 1367.00, impressions: 432109, clicks: 7654, roas: 2.4, status: 'ENABLED' },
];

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  format = 'number',
}: {
  title: string;
  value: number;
  change?: number;
  icon: React.ElementType;
  format?: 'number' | 'currency' | 'percent';
}) {
  const formattedValue =
    format === 'currency'
      ? formatCurrency(value)
      : format === 'percent'
      ? value.toFixed(2) + '%'
      : formatNumber(value);

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{formattedValue}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {change >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={cn('text-sm font-medium', change >= 0 ? 'text-green-500' : 'text-red-500')}>
                  {change >= 0 ? '+' : ''}
                  {change.toFixed(1)}%
                </span>
                <span className="text-sm text-muted-foreground">vs last period</span>
              </div>
            )}
          </div>
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState('last30');
  const [isLoading, setIsLoading] = useState(false);

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Performance Overview</h1>
          <p className="text-muted-foreground">Track your ad performance across all platforms</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last7">Last 7 days</SelectItem>
              <SelectItem value="last30">Last 30 days</SelectItem>
              <SelectItem value="last90">Last 90 days</SelectItem>
              <SelectItem value="thisMonth">This month</SelectItem>
              <SelectItem value="lastMonth">Last month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Spend"
          value={mockMetrics.current.spend}
          change={calculateChange(mockMetrics.current.spend, mockMetrics.previous.spend)}
          icon={DollarSign}
          format="currency"
        />
        <MetricCard
          title="Impressions"
          value={mockMetrics.current.impressions}
          change={calculateChange(mockMetrics.current.impressions, mockMetrics.previous.impressions)}
          icon={Eye}
        />
        <MetricCard
          title="Clicks"
          value={mockMetrics.current.clicks}
          change={calculateChange(mockMetrics.current.clicks, mockMetrics.previous.clicks)}
          icon={MousePointerClick}
        />
        <MetricCard
          title="Conversions"
          value={mockMetrics.current.conversions}
          change={calculateChange(mockMetrics.current.conversions, mockMetrics.previous.conversions)}
          icon={Target}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Performance Over Time</CardTitle>
            <CardDescription>Daily impressions and clicks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-1">
              {mockChartData.slice(-14).map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-violet-500/20 rounded-t transition-all hover:bg-violet-500/30"
                    style={{ height: `${(day.impressions / 150000) * 100}%` }}
                  />
                  <div
                    className="w-full bg-violet-500 rounded-t transition-all hover:bg-violet-400"
                    style={{ height: `${(day.clicks / 7000) * 100}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              {mockChartData.slice(-14).filter((_, i) => i % 2 === 0).map((day, i) => (
                <span key={i}>{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              ))}
            </div>
            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-violet-500/20" />
                <span className="text-sm text-muted-foreground">Impressions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-violet-500" />
                <span className="text-sm text-muted-foreground">Clicks</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ROAS & Derived Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Key Metrics</CardTitle>
            <CardDescription>Performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">ROAS</span>
                <span className="text-2xl font-bold">{mockMetrics.current.roas.toFixed(1)}x</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${Math.min((mockMetrics.current.roas / 5) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Target: 3.0x</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">CTR</span>
                <span className="text-xl font-bold">{mockMetrics.current.ctr.toFixed(2)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full"
                  style={{ width: `${Math.min((mockMetrics.current.ctr / 5) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">CPC</span>
                <span className="text-xl font-bold">{formatCurrency(mockMetrics.current.cpc)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${Math.min((0.20 / mockMetrics.current.cpc) * 50, 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Conversion Value</span>
                <span className="text-xl font-bold text-green-500">
                  {formatCurrency(mockMetrics.current.conversionValue)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Campaigns Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top Campaigns</CardTitle>
              <CardDescription>Campaigns sorted by spend</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Campaign</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Spend</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Impressions</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Clicks</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {mockCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-medium">{campaign.name}</span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span
                        className={cn(
                          'inline-flex px-2 py-1 rounded-full text-xs font-medium',
                          campaign.status === 'ENABLED'
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-yellow-500/10 text-yellow-500'
                        )}
                      >
                        {campaign.status}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4 font-medium">{formatCurrency(campaign.spend)}</td>
                    <td className="text-right py-3 px-4 text-muted-foreground">{formatNumber(campaign.impressions)}</td>
                    <td className="text-right py-3 px-4 text-muted-foreground">{formatNumber(campaign.clicks)}</td>
                    <td className="text-right py-3 px-4">
                      <span
                        className={cn(
                          'font-medium',
                          campaign.roas >= 3 ? 'text-green-500' : campaign.roas >= 2 ? 'text-yellow-500' : 'text-red-500'
                        )}
                      >
                        {campaign.roas.toFixed(1)}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

