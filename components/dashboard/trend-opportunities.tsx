'use client'

import { ArrowUpRight, Flame } from 'lucide-react'
import { trends } from '@/lib/dashboard-data'
import { GlassCard, SectionHeading } from './primitives'

export function TrendOpportunities() {
  return (
    <GlassCard className="p-5">
      <SectionHeading
        title="Trend opportunities"
        subtitle="Hot formats in your niche"
        action={<Flame className="size-4 text-brand" />}
      />

      <div className="space-y-2">
        {trends.map((t) => (
          <button
            key={t.id}
            className="group flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-left transition-all hover:border-white/20 hover:bg-white/[0.06]"
          >
            <div className="relative flex size-10 shrink-0 items-center justify-center">
              <svg className="size-10 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="var(--brand)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${(t.heat / 100) * 94.2} 94.2`}
                />
              </svg>
              <span className="absolute text-[10px] font-bold text-foreground">
                {t.heat}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-brand">
                {t.tag}
              </span>
              <p className="truncate text-sm font-medium text-foreground">
                {t.title}
              </p>
              <p className="text-xs text-muted-foreground">{t.metric}</p>
            </div>
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
          </button>
        ))}
      </div>
    </GlassCard>
  )
}
