'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Link2,
  ListChecks,
  Rocket,
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { cn } from '@/src/lib/utils';
import { MedulaLogo } from '@/src/components/ui/medula-logo';

const steps = [
  {
    id: 1,
    title: 'Connect Google Ads',
    description: 'Link your Google Ads account to start syncing data',
    icon: Link2,
  },
  {
    id: 2,
    title: 'Select Accounts',
    description: 'Choose which ad accounts to include in your dashboard',
    icon: ListChecks,
  },
  {
    id: 3,
    title: 'Start Syncing',
    description: 'Your data will start syncing automatically',
    icon: Rocket,
  },
];

// Mock accessible accounts
const mockAccounts = [
  { id: '123-456-7890', name: 'Main Brand Account', currency: 'USD' },
  { id: '234-567-8901', name: 'Performance Max', currency: 'USD' },
  { id: '345-678-9012', name: 'EU Market Account', currency: 'EUR' },
  { id: '456-789-0123', name: 'Asia Pacific', currency: 'JPY' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    // Simulate OAuth flow
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsConnecting(false);
    setIsConnected(true);
  };

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleStartSync = async () => {
    setIsSyncing(true);
    // Simulate initial sync
    await new Promise((resolve) => setTimeout(resolve, 2000));
    router.push('/dashboard');
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 3));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left sidebar - Progress */}
      <div className="hidden lg:flex w-80 bg-card border-r border-border flex-col">
        <div className="p-6 border-b border-border">
          <MedulaLogo size="md" />
        </div>

        <div className="flex-1 p-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-6">GETTING STARTED</h2>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-3">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : currentStep === step.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {currentStep > step.id ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                <div>
                  <p
                    className={cn(
                      'font-medium',
                      currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Need help?{' '}
            <a href="#" className="text-primary hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-xl">
          {/* Step 1: Connect */}
          {currentStep === 1 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Link2 className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Connect Google Ads</h1>
                <p className="text-muted-foreground">
                  Link your Google Ads account to start syncing your advertising data
                </p>
              </div>

              <Card>
                <CardContent className="p-6">
                  {!isConnected ? (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
                        <svg viewBox="0 0 24 24" className="w-10 h-10">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                      </div>
                      <Button size="lg" onClick={handleConnectGoogle} disabled={isConnecting}>
                        {isConnecting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          'Connect Google Ads'
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-4">
                        You'll be redirected to Google to authorize access
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                      </div>
                      <h3 className="text-lg font-semibold mb-1">Connected Successfully!</h3>
                      <p className="text-muted-foreground">
                        Your Google Ads account is now linked
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end mt-6">
                <Button onClick={nextStep} disabled={!isConnected}>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Select Accounts */}
          {currentStep === 2 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <ListChecks className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Select Ad Accounts</h1>
                <p className="text-muted-foreground">
                  Choose which accounts to sync. You can change this later.
                </p>
              </div>

              <Card>
                <CardContent className="p-2">
                  <div className="space-y-1">
                    {mockAccounts.map((account) => (
                      <button
                        key={account.id}
                        onClick={() => handleAccountToggle(account.id)}
                        className={cn(
                          'w-full flex items-center justify-between p-4 rounded-lg transition-colors',
                          selectedAccounts.includes(account.id)
                            ? 'bg-primary/10 border-2 border-primary'
                            : 'hover:bg-muted border-2 border-transparent'
                        )}
                      >
                        <div className="text-left">
                          <p className="font-medium">{account.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ID: {account.id} • {account.currency}
                          </p>
                        </div>
                        <div
                          className={cn(
                            'w-6 h-6 rounded-full border-2 flex items-center justify-center',
                            selectedAccounts.includes(account.id)
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground'
                          )}
                        >
                          {selectedAccounts.includes(account.id) && (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={nextStep} disabled={selectedAccounts.length === 0}>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Start Syncing */}
          {currentStep === 3 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Rocket className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Ready to Launch!</h1>
                <p className="text-muted-foreground">
                  Your setup is complete. Start syncing to see your data.
                </p>
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span>Google Ads connected</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span>{selectedAccounts.length} account(s) selected</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span>Initial sync will fetch last 90 days of data</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button variant="gradient" onClick={handleStartSync} disabled={isSyncing}>
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting sync...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4 mr-2" />
                      Go to Dashboard
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

