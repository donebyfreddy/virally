'use client'

import { ArrowRight, Brain } from 'lucide-react'
import { recommendations } from '@/lib/dashboard-data'
import { GlassCard, SectionHeading } from './primitives'

const toneColor: Record<string, string> = {
  brand: 'var(--brand)',
  accent: 'var(--accent-2)',
  glow: 'var(--glow)',
}

export function AiRecommendations() {
  return (
    <section>
      <SectionHeading
        title="AI recommendations"
        subtitle="Tuned to your performance this week"
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
            <Brain className="size-3.5" /> Smart
          </span>
        }
      />

      <div className="space-y-3">
        {recommendations.map((r) => {
          const color = toneColor[r.tone]
          return (
            <GlassCard key={r.id} interactive className="p-5">
              <div
                className="absolute left-0 top-0 h-full w-1"
                style={{ background: color }}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      style={{
                        color,
                        backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`,
                      }}
                    >
                      {r.impact}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-foreground">
                    {r.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground text-pretty">
                    {r.detail}
                  </p>
                </div>
                <button
                  className="group flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-white/10"
                  style={{ borderColor: `color-mix(in oklab, ${color} 30%, transparent)` }}
                >
                  {r.action}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </GlassCard>
          )
        })}
      </div>
    </section>
  )
}
