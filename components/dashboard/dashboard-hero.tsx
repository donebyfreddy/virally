'use client'

import { ArrowUpRight, Megaphone, Sparkles, TrendingUp, Wand2 } from 'lucide-react'
import { CountUp } from './primitives'

const heroStats = [
  { label: 'Content this week', value: 148, decimals: 0, suffix: '' },
  { label: 'Posts published', value: 36, decimals: 0, suffix: '' },
  { label: 'Views generated', value: 2.4, decimals: 1, suffix: 'M' },
  { label: 'Engagement', value: 8.6, decimals: 1, suffix: '%' },
]

export function DashboardHero() {
  return (
    <section className="animate-fade-up relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand/12 via-accent-2/8 to-transparent p-6 md:p-8">
      {/* glow orbs */}
      <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-brand/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-accent-2/20 blur-3xl" />

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_theme(colors.emerald.400)]" />
            Command center · live
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-balance text-foreground md:text-4xl">
            Good morning, Federico.
          </h1>
          <p className="mt-2 text-pretty text-base text-muted-foreground md:text-lg">
            Let&apos;s turn today&apos;s ideas into viral content.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-accent-2 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_var(--brand)] transition-transform hover:scale-[1.02] active:scale-95">
              <Wand2 className="size-4" />
              Create content
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
            <button className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-white/10">
              <Megaphone className="size-4 text-accent-2" />
              Start a campaign
            </button>
            <button className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-white/10">
              <Sparkles className="size-4 text-glow" />
              Generate ideas
            </button>
          </div>
        </div>

        {/* stat grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto lg:grid-cols-2 xl:grid-cols-4">
          {heroStats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/10 bg-background/40 px-4 py-3 backdrop-blur-sm"
            >
              <p className="font-display text-2xl font-bold text-foreground">
                <CountUp value={s.value} decimals={s.decimals} suffix={s.suffix} />
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI insight bar */}
      <div className="relative mt-6 flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand/8 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-accent-2">
          <TrendingUp className="size-4.5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-foreground">
            <span className="font-semibold text-brand">AI insight · </span>
            TikTok educational hooks are outperforming your Reels by{' '}
            <span className="font-semibold text-foreground">28%</span> this week.
            Consider shifting 2 pieces from your SaaS series to that format.
          </p>
        </div>
        <button className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-brand hover:underline sm:flex">
          Act on it
          <ArrowUpRight className="size-3.5" />
        </button>
      </div>
    </section>
  )
}
