'use client'

import { Check, Plus, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { accounts, platformMeta } from '@/lib/dashboard-data'
import { GlassCard, SectionHeading } from './primitives'

export function ConnectedAccounts() {
  return (
    <GlassCard className="p-5">
      <SectionHeading
        title="Connected accounts"
        subtitle="3 of 4 linked"
      />

      <div className="space-y-2">
        {accounts.map((a) => {
          const meta = platformMeta[a.platform] ?? {
            label: a.platform,
            color: 'var(--brand)',
          }
          return (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3"
            >
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${meta.color}, color-mix(in oklab, ${meta.color} 40%, transparent))`,
                }}
              >
                {meta.label.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium text-foreground">
                    {meta.label}
                  </p>
                  {a.connected && a.health === 'warning' && (
                    <TriangleAlert className="size-3.5 text-amber-400" />
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {a.connected
                    ? `${a.handle} · ${a.followers} · synced ${a.lastSync}`
                    : 'Not connected'}
                </p>
              </div>
              {a.connected ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    a.health === 'good'
                      ? 'bg-emerald-400/15 text-emerald-400'
                      : 'bg-amber-400/15 text-amber-400',
                  )}
                >
                  <Check className="size-3" />
                  {a.health === 'good' ? 'Healthy' : 'Re-auth'}
                </span>
              ) : (
                <button className="inline-flex items-center gap-1 rounded-lg bg-brand/15 px-2.5 py-1 text-[11px] font-semibold text-brand transition-colors hover:bg-brand/25">
                  <Plus className="size-3" /> Connect
                </button>
              )}
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
