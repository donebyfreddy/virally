'use client'

import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { kpis } from '@/lib/dashboard-data'
import { CountUp, GlassCard, Sparkline } from './primitives'

const accents = [
  'var(--brand)',
  'var(--accent-2)',
  'var(--glow)',
  'var(--brand)',
  'var(--accent-2)',
  'var(--glow)',
]

export function KpiStrip() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi, i) => {
        const decimals = kpi.value % 1 !== 0 ? 1 : 0
        const numericBase = Number(kpi.display)
        return (
          <GlassCard key={kpi.id} interactive className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div
                className="flex size-8 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `color-mix(in oklab, ${accents[i]} 18%, transparent)`,
                }}
              >
                <kpi.icon className="size-4" style={{ color: accents[i] }} />
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-[11px] font-semibold',
                  kpi.trend === 'up' ? 'text-emerald-400' : 'text-rose-400',
                )}
              >
                {kpi.trend === 'up' ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                {kpi.delta}
              </span>
            </div>

            <p className="font-display text-2xl font-bold tracking-tight text-foreground">
              {kpi.prefix}
              <CountUp
                value={numericBase}
                decimals={decimals}
                suffix={kpi.suffix ?? ''}
              />
            </p>
            <p className="mt-0.5 text-xs font-medium text-foreground/70">
              {kpi.label}
            </p>

            <div className="mt-3 -mx-1">
              <Sparkline data={kpi.spark} color={accents[i]} />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{kpi.caption}</p>
          </GlassCard>
        )
      })}
    </div>
  )
}
