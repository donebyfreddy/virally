'use client'

import { ArrowUpRight, BarChart3, Plus, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { campaigns } from '@/lib/dashboard-data'
import { GlassCard, PlatformBadge, SectionHeading } from './primitives'

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/20',
  scheduled: 'bg-glow/15 text-glow border-glow/20',
  draft: 'bg-white/10 text-muted-foreground border-white/15',
}

export function ActiveCampaigns() {
  return (
    <section>
      <SectionHeading
        title="Active campaigns"
        subtitle="3 running · 1 launching this week"
        action={
          <button className="flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            View all <ArrowUpRight className="size-3.5" />
          </button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {campaigns.map((c) => (
          <GlassCard key={c.id} interactive className="flex flex-col p-5">
            <div
              className="absolute inset-x-0 top-0 h-0.5"
              style={{
                background: `linear-gradient(90deg, ${c.accent}, transparent)`,
              }}
            />
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display font-semibold text-foreground text-pretty">
                  {c.name}
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.platforms.map((p) => (
                    <PlatformBadge key={p} platform={p} />
                  ))}
                </div>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize',
                  statusStyles[c.status],
                )}
              >
                {c.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Pieces</p>
                <p className="font-semibold text-foreground">{c.pieces}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Goal</p>
                <p className="font-semibold text-foreground">{c.goal}</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 font-medium text-emerald-400">
                  <TrendingUp className="size-3" />
                  {c.performance}
                </span>
                <span className="text-muted-foreground">{c.progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${c.progress}%`,
                    background: `linear-gradient(90deg, ${c.accent}, var(--accent-2))`,
                  }}
                />
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/8 bg-white/5 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Next best action</p>
              <p className="text-xs font-medium text-foreground">{c.nextAction}</p>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/8 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-white/12">
                Open
              </button>
              <button
                className="flex size-8 items-center justify-center rounded-lg bg-white/8 text-muted-foreground transition-colors hover:bg-white/12 hover:text-foreground"
                aria-label="Generate more content"
              >
                <Plus className="size-4" />
              </button>
              <button
                className="flex size-8 items-center justify-center rounded-lg bg-white/8 text-muted-foreground transition-colors hover:bg-white/12 hover:text-foreground"
                aria-label="View analytics"
              >
                <BarChart3 className="size-4" />
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  )
}
