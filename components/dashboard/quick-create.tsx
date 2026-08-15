'use client'

import { useState } from 'react'
import { ArrowRight, Sparkles, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { quickCreateOptions } from '@/lib/dashboard-data'
import { GlassCard } from './primitives'

type Group = keyof typeof quickCreateOptions

const groups: { key: Group; label: string }[] = [
  { key: 'contentType', label: 'Content type' },
  { key: 'platform', label: 'Platform' },
  { key: 'goal', label: 'Goal' },
  { key: 'audience', label: 'Audience' },
  { key: 'duration', label: 'Duration' },
  { key: 'tone', label: 'Tone' },
]

export function QuickCreate() {
  const [selected, setSelected] = useState<Record<Group, string>>({
    contentType: 'Short video',
    platform: 'TikTok',
    goal: 'Leads',
    audience: 'Founders',
    duration: '30s',
    tone: 'Bold',
  })
  const [topic, setTopic] = useState('')
  const [withCta, setWithCta] = useState(true)

  return (
    <GlassCard className="p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-accent-2 shadow-[0_0_20px_-4px_var(--brand)]">
          <Wand2 className="size-5 text-white" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            Quick create
          </h2>
          <p className="text-sm text-muted-foreground">
            Idea to viral-ready in seconds
          </p>
        </div>
      </div>

      {/* topic input */}
      <div className="relative mb-5">
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={2}
          placeholder="What's the idea? e.g. “Why most founders fail at content”"
          className="w-full resize-none rounded-2xl border border-white/10 bg-background/50 p-4 text-base text-foreground placeholder:text-muted-foreground focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/20 md:text-sm"
        />
        <button
          className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          type="button"
        >
          <Sparkles className="size-3 text-brand" />
          Suggest
        </button>
      </div>

      {/* option groups */}
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.key}>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {g.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {quickCreateOptions[g.key].map((opt) => {
                const active = selected[g.key] === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setSelected((prev) => ({ ...prev, [g.key]: opt }))
                    }
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                      active
                        ? 'border-brand/40 bg-brand/15 text-foreground shadow-[0_0_16px_-6px_var(--brand)]'
                        : 'border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground',
                    )}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {/* CTA toggle */}
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Include a CTA</p>
            <p className="text-xs text-muted-foreground">
              Adds a call-to-action tuned to your goal
            </p>
          </div>
          <button
            type="button"
            onClick={() => setWithCta((v) => !v)}
            role="switch"
            aria-checked={withCta}
            className={cn(
              'relative h-6 w-11 shrink-0 rounded-full transition-colors',
              withCta ? 'bg-gradient-to-r from-brand to-accent-2' : 'bg-white/15',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 size-5 rounded-full bg-white transition-transform',
                withCta ? 'translate-x-5' : 'translate-x-0.5',
              )}
            />
          </button>
        </div>
      </div>

      <button className="group mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-accent-2 py-3.5 text-sm font-semibold text-white shadow-[0_12px_32px_-12px_var(--brand)] transition-transform hover:scale-[1.01] active:scale-[0.99]">
        <Wand2 className="size-4" />
        Generate {selected.contentType.toLowerCase()}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </GlassCard>
  )
}
