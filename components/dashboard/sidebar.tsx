'use client'

import { useState } from 'react'
import {
  BarChart3,
  Calendar,
  Compass,
  LayoutDashboard,
  Library,
  Megaphone,
  Plug,
  Settings,
  Sparkles,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  {
    section: 'Workspace',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, active: true },
      { label: 'Create', icon: Wand2, badge: 'AI' },
      { label: 'Ideas', icon: Sparkles },
      { label: 'Campaigns', icon: Megaphone },
    ],
  },
  {
    section: 'Library',
    items: [
      { label: 'Content', icon: Library },
      { label: 'Scheduler', icon: Calendar },
      { label: 'Trends', icon: Compass, badge: 'Hot' },
    ],
  },
  {
    section: 'Insights',
    items: [
      { label: 'Analytics', icon: BarChart3 },
      { label: 'Accounts', icon: Plug },
      { label: 'AI Studio', icon: Zap },
      { label: 'Settings', icon: Settings },
    ],
  },
]

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center gap-2.5 px-2 pt-1">
        <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-accent-2 shadow-[0_0_20px_-2px_var(--brand)]">
          <Zap className="size-5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="font-display text-base font-bold tracking-tight text-foreground">
            Virally
          </p>
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Content OS
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto">
        {nav.map((group) => (
          <div key={group.section}>
            <p className="mb-2 px-2 text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
              {group.section}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.label}>
                  <button
                    onClick={onNavigate}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                      item.active
                        ? 'bg-gradient-to-r from-brand/20 to-accent-2/10 text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                        : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                    )}
                  >
                    {item.active && (
                      <span className="absolute left-0 h-6 w-1 -translate-x-4 rounded-full bg-brand shadow-[0_0_10px_var(--brand)]" />
                    )}
                    <item.icon
                      className={cn(
                        'size-4.5 shrink-0 transition-colors',
                        item.active
                          ? 'text-brand'
                          : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-md bg-brand/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-brand uppercase">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-brand/15 via-accent-2/10 to-transparent p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">Pro plan</p>
          <span className="text-[10px] text-muted-foreground">1,240 / 2,000</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-brand to-accent-2" />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          62% of monthly credits used
        </p>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/8 bg-background/70 backdrop-blur-xl lg:block">
      <SidebarContent />
    </aside>
  )
}

export function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-y-0 left-0 w-72 border-r border-white/10 bg-background">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground"
          aria-label="Close menu"
        >
          <X className="size-5" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  )
}

// eslint-disable-next-line react-hooks/rules-of-hooks
export function useMobileSidebar() {
  const [open, setOpen] = useState(false)
  return { open, setOpen }
}
