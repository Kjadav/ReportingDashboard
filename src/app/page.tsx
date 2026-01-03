'use client';

import Link from 'next/link';
import { 
  ArrowRight,
  Zap,
  Shield,
  RefreshCw,
  TrendingUp,
  Users,
  Globe,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { MedulaLogo } from '@/src/components/ui/medula-logo';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <MedulaLogo size="md" />
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                How it Works
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-dots opacity-50" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-sm text-primary mb-8 animate-fade-in">
              <Zap className="w-4 h-4" />
              <span>Unified Ads Analytics</span>
              <ChevronRight className="w-4 h-4" />
            </div>
            
            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-in stagger-1">
              All your ad performance.
              <br />
              <span className="gradient-text">One dashboard.</span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in stagger-2">
              Connect Google Ads, sync automatically, and view beautiful metrics. 
              Stop switching between platforms. Start making better decisions.
            </p>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in stagger-3">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto group">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  View Demo
                </Button>
              </Link>
            </div>

            {/* Social Proof */}
            <div className="mt-12 pt-8 border-t border-border animate-fade-in stagger-4">
              <p className="text-sm text-muted-foreground mb-4">Trusted by marketing teams worldwide</p>
              <div className="flex items-center justify-center gap-8 opacity-50">
                {['Company', 'Brand', 'Agency', 'Studio'].map((name) => (
                  <span key={name} className="text-lg font-semibold">{name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-16 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-2xl animate-fade-in stagger-5">
            {/* Browser Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-background text-xs text-muted-foreground">
                  app.medula.io/dashboard
                </div>
              </div>
            </div>
            
            {/* Dashboard Content */}
            <div className="p-6">
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Spend', value: '$12,450', change: '+12.5%' },
                  { label: 'Impressions', value: '2.4M', change: '+8.2%' },
                  { label: 'Clicks', value: '84.2K', change: '+15.3%' },
                  { label: 'ROAS', value: '3.2x', change: '+22.1%' },
                ].map((metric) => (
                  <div key={metric.label} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <p className="text-xl font-bold mt-1">{metric.value}</p>
                    <p className="text-xs text-violet-400 mt-1">{metric.change}</p>
                  </div>
                ))}
              </div>
              <div className="h-48 rounded-xl bg-muted/30 border border-border/50 flex items-end justify-around p-4">
                {[35, 55, 40, 70, 50, 85, 60, 75, 45, 90, 65, 80].map((h, i) => (
                  <div
                    key={i}
                    className="w-8 rounded-t bg-gradient-to-t from-violet-600/60 to-purple-500 transition-all hover:from-violet-600/80 hover:to-purple-400"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for modern marketing teams who need reliable, fast access to their ad performance data.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: RefreshCw,
                title: 'Automated Sync',
                description: 'Data syncs daily at 6 AM. No manual exports, no spreadsheets, no hassle.',
              },
              {
                icon: TrendingUp,
                title: 'Unified Metrics',
                description: 'Compare performance across all platforms with normalized, consistent metrics.',
              },
              {
                icon: Shield,
                title: 'Enterprise Security',
                description: 'OAuth tokens encrypted at rest. Your credentials are never stored in plain text.',
              },
              {
                icon: Zap,
                title: 'Instant Dashboards',
                description: 'Data stored locally for sub-second queries. No waiting for slow API calls.',
              },
              {
                icon: Users,
                title: 'Team Collaboration',
                description: 'Invite your team with role-based access. Admins manage, viewers report.',
              },
              {
                icon: Globe,
                title: 'Multi-Platform',
                description: 'Google Ads today. Meta Ads, TikTok Ads, and LinkedIn Ads coming soon.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all hover-card"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Get started in minutes
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to unified ad analytics
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Connect',
                description: 'Link your Google Ads account with one click using secure OAuth.',
              },
              {
                step: '02',
                title: 'Select',
                description: 'Choose which ad accounts to sync. We fetch 90 days of historical data.',
              },
              {
                step: '03',
                title: 'Analyze',
                description: 'View beautiful dashboards with all your metrics in one place.',
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-bold text-primary/10 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 right-0 translate-x-1/2">
                    <ArrowRight className="w-6 h-6 text-primary/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to unify your ads data?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Start your free trial today. No credit card required.
            </p>
            <Link href="/signup">
              <Button size="lg" className="group">
                Get Started Free
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                Free 14-day trial
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                No credit card
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                Cancel anytime
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <MedulaLogo size="md" />
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Medula. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
