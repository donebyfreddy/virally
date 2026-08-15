import type { Metadata } from 'next'
import { AppShell } from '@/components/dashboard/app-shell'
import { DashboardHero } from '@/components/dashboard/dashboard-hero'
import { KpiStrip } from '@/components/dashboard/kpi-strip'
import { QuickCreate } from '@/components/dashboard/quick-create'
import { ActiveCampaigns } from '@/components/dashboard/active-campaigns'
import { ContentPipeline } from '@/components/dashboard/content-pipeline'
import { AiRecommendations } from '@/components/dashboard/ai-recommendations'
import { TopContent } from '@/components/dashboard/top-content'
import { ConnectedAccounts } from '@/components/dashboard/connected-accounts'
import { TrendOpportunities } from '@/components/dashboard/trend-opportunities'
import { AnalyticsPreview } from '@/components/dashboard/analytics-preview'
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist'

export const metadata: Metadata = {
  title: 'Dashboard · Virally',
  description: 'Your viral content command center.',
}

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <DashboardHero />

        <KpiStrip />

        {/* Create + right rail */}
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <QuickCreate />
          </div>
          <div className="space-y-6">
            <OnboardingChecklist />
            <ConnectedAccounts />
          </div>
        </div>

        <ActiveCampaigns />

        <ContentPipeline />

        {/* Recommendations + analytics */}
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <AiRecommendations />
          </div>
          <div className="space-y-6">
            <AnalyticsPreview />
            <TrendOpportunities />
          </div>
        </div>

        <TopContent />
      </div>
    </AppShell>
  )
}
