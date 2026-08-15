'use client'

import { ArrowUpRight } from 'lucide-react'
import { growthSeries } from '@/lib/dashboard-data'
import { CountUp, GlassCard, SectionHeading } from './primitives'

const legend = [
  { key: 'tiktok', label: 'TikTok', color: 'var(--brand)' },
  { key: 'reels', label: 'Reels', color: 'var(--accent-2)' },
  { key: 'shorts', label: 'Shorts', color: 'var(--glow)' },
] as const

export function AnalyticsPreview() {
  const max = Math.max(
    ...growthSeries.map((d) => d.tiktok + d.reels + d.shorts),
  )

  return (
    <GlassCard className="p-5">
      <SectionHeading
        title="Growth this week"
        subtitle="Views by platform, in thousands"
        action={
          <button className="flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            Full analytics <ArrowUpRight className="size-3.5" />
          </button>
        }
      />

      <div className="mb-4 flex items-baseline gap-3">
        <p className="font-display text-3xl font-bold text-foreground">
          <CountUp value={1.9} decimals={1} suffix="M" />
        </p>
        <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-emerald-400">
          <ArrowUpRight className="size-4" /> 32.8%
        </span>
        <span className="text-xs text-muted-foreground">vs last week</span>
      </div>

      {/* chart */}
      <div className="flex h-44 items-end gap-2">
        {growthSeries.map((d) => {
          const total = d.tiktok + d.reels + d.shorts
          return (
            <div key={d.label} className="group flex flex-1 flex-col items-center gap-2">
              <div
                className="flex w-full flex-col justify-end overflow-hidden rounded-lg transition-opacity"
                style={{ height: `${(total / max) * 100}%` }}
              >
                <div
                  style={{
                    height: `${(d.shorts / total) * 100}%`,
                    background: 'var(--glow)',
                  }}
                />
                <div
                  style={{
                    height: `${(d.reels / total) * 100}%`,
                    background: 'var(--accent-2)',
                  }}
                />
                <div
                  className="rounded-b-lg"
                  style={{
                    height: `${(d.tiktok / total) * 100}%`,
                    background: 'var(--brand)',
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{d.label}</span>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-white/8 pt-3">
        {legend.map((l) => (
          <div key={l.key} className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ background: l.color }}
            />
            <span className="text-xs text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
