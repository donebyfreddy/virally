'use client'

import { ArrowRight, Check, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils'
import { onboardingSteps } from '@/lib/dashboard-data'
import { GlassCard } from './primitives'

export function OnboardingChecklist() {
  const done = onboardingSteps.filter((s) => s.done).length
  const pct = Math.round((done / onboardingSteps.length) * 100)

  return (
    <GlassCard className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-glow to-accent-2">
          <Rocket className="size-4.5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="font-display font-semibold text-foreground">
            Finish your setup
          </h2>
          <p className="text-xs text-muted-foreground">
            {done} of {onboardingSteps.length} complete
          </p>
        </div>
        <span className="font-display text-lg font-bold text-foreground">
          {pct}%
        </span>
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand to-accent-2 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="space-y-1.5">
        {onboardingSteps.map((s) => (
          <li key={s.id}>
            <button
              className={cn(
                'group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors',
                s.done ? 'opacity-60' : 'hover:bg-white/5',
              )}
            >
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full border',
                  s.done
                    ? 'border-transparent bg-gradient-to-br from-brand to-accent-2'
                    : 'border-white/20',
                )}
              >
                {s.done && <Check className="size-3 text-white" strokeWidth={3} />}
              </span>
              <span
                className={cn(
                  'flex-1 text-sm',
                  s.done
                    ? 'text-muted-foreground line-through'
                    : 'font-medium text-foreground',
                )}
              >
                {s.label}
              </span>
              {!s.done && (
                <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}
