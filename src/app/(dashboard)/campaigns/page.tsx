'use client';

import { useState } from 'react';
import {
  Search,
  Filter,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { cn, formatCurrency, formatNumber } from '@/src/lib/utils';

// Mock campaign data
const mockCampaigns = [
  {
    id: '1',
    name: 'Brand Awareness - Q4 2024',
    account: 'Main Brand Account',
    status: 'ENABLED',
    type: 'SEARCH',
    budget: 500,
    budgetType: 'DAILY',
    spend: 4523.45,
    impressions: 890234,
    clicks: 23456,
    conversions: 892,
    conversionValue: 18976.50,
    ctr: 2.64,
    cpc: 0.19,
    roas: 4.2,
    change: 12.5,
  },
  {
    id: '2',
    name: 'Product Launch - Holiday Season',
    account: 'Main Brand Account',
    status: 'ENABLED',
    type: 'PERFORMANCE_MAX',
    budget: 1000,
    budgetType: 'DAILY',
    spend: 3212.78,
    impressions: 654321,
    clicks: 18765,
    conversions: 654,
    conversionValue: 12210.45,
    ctr: 2.87,
    cpc: 0.17,
    roas: 3.8,
    change: 8.2,
  },
  {
    id: '3',
    name: 'Retargeting - Cart Abandonment',
    account: 'Main Brand Account',
    status: 'ENABLED',
    type: 'DISPLAY',
    budget: 250,
    budgetType: 'DAILY',
    spend: 2456.12,
    impressions: 345678,
    clicks: 12345,
    conversions: 543,
    conversionValue: 12530.25,
    ctr: 3.57,
    cpc: 0.20,
    roas: 5.1,
    change: 15.3,
  },
  {
    id: '4',
    name: 'Search - Generic Keywords',
    account: 'Performance Max',
    status: 'PAUSED',
    type: 'SEARCH',
    budget: 300,
    budgetType: 'DAILY',
    spend: 1890.32,
    impressions: 234567,
    clicks: 8765,
    conversions: 234,
    conversionValue: 5484.78,
    ctr: 3.74,
    cpc: 0.22,
    roas: 2.9,
    change: -5.2,
  },
  {
    id: '5',
    name: 'Display - Interest Targeting',
    account: 'EU Market Account',
    status: 'ENABLED',
    type: 'DISPLAY',
    budget: 200,
    budgetType: 'DAILY',
    spend: 1367.00,
    impressions: 432109,
    clicks: 7654,
    conversions: 187,
    conversionValue: 3280.80,
    ctr: 1.77,
    cpc: 0.18,
    roas: 2.4,
    change: -2.1,
  },
  {
    id: '6',
    name: 'Video - YouTube Pre-roll',
    account: 'Main Brand Account',
    status: 'ENABLED',
    type: 'VIDEO',
    budget: 400,
    budgetType: 'DAILY',
    spend: 2890.55,
    impressions: 567890,
    clicks: 9876,
    conversions: 321,
    conversionValue: 8025.00,
    ctr: 1.74,
    cpc: 0.29,
    roas: 2.78,
    change: 6.8,
  },
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        status === 'ENABLED'
          ? 'bg-violet-500/10 text-violet-400'
          : status === 'PAUSED'
          ? 'bg-amber-500/10 text-amber-400'
          : 'bg-gray-500/10 text-gray-400'
      )}
    >
      {status === 'ENABLED' ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
      {status}
    </span>
  );
}

function CampaignTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    SEARCH: 'bg-violet-500/10 text-violet-400',
    DISPLAY: 'bg-purple-500/10 text-purple-400',
    VIDEO: 'bg-fuchsia-500/10 text-fuchsia-400',
    PERFORMANCE_MAX: 'bg-indigo-500/10 text-indigo-400',
    SHOPPING: 'bg-pink-500/10 text-pink-400',
  };

  return (
    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', colors[type] || 'bg-muted text-muted-foreground')}>
      {type.replace('_', ' ')}
    </span>
  );
}

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredCampaigns = mockCampaigns.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    const matchesType = typeFilter === 'all' || campaign.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totals = filteredCampaigns.reduce(
    (acc, c) => ({
      spend: acc.spend + c.spend,
      impressions: acc.impressions + c.impressions,
      clicks: acc.clicks + c.clicks,
      conversions: acc.conversions + c.conversions,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">Manage and monitor your ad campaigns</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Spend</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.spend)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Impressions</p>
            <p className="text-2xl font-bold">{formatNumber(totals.impressions)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Clicks</p>
            <p className="text-2xl font-bold">{formatNumber(totals.clicks)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Conversions</p>
            <p className="text-2xl font-bold">{formatNumber(totals.conversions)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ENABLED">Enabled</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Campaign Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="SEARCH">Search</SelectItem>
                <SelectItem value="DISPLAY">Display</SelectItem>
                <SelectItem value="VIDEO">Video</SelectItem>
                <SelectItem value="PERFORMANCE_MAX">Performance Max</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filteredCampaigns.length} Campaign{filteredCampaigns.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Campaign</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Budget</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Spend</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Impr.</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Clicks</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">CTR</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">ROAS</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Change</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">{campaign.account}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={campaign.status} />
                    </td>
                    <td className="py-3 px-4">
                      <CampaignTypeBadge type={campaign.type} />
                    </td>
                    <td className="py-3 px-4 text-right text-sm">
                      {formatCurrency(campaign.budget)}/{campaign.budgetType.toLowerCase()}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(campaign.spend)}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground">
                      {formatNumber(campaign.impressions)}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground">
                      {formatNumber(campaign.clicks)}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground">
                      {campaign.ctr.toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={cn(
                          'font-medium',
                          campaign.roas >= 3 ? 'text-green-500' : campaign.roas >= 2 ? 'text-yellow-500' : 'text-red-500'
                        )}
                      >
                        {campaign.roas.toFixed(1)}x
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {campaign.change >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span
                          className={cn(
                            'text-sm font-medium',
                            campaign.change >= 0 ? 'text-green-500' : 'text-red-500'
                          )}
                        >
                          {campaign.change >= 0 ? '+' : ''}
                          {campaign.change.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCampaigns.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No campaigns found matching your filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

