'use client'

import { Bell, ChevronDown, Menu, Plus, Search, Sparkles } from 'lucide-react'

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/8 bg-background/70 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <button
          onClick={onMenuClick}
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>

        {/* Workspace selector */}
        <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-white/10">
          <span className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-brand to-accent-2 text-[11px] font-bold text-white">
            V
          </span>
          <span className="hidden sm:inline">Virally Brand</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>

        {/* Search */}
        <div className="relative hidden flex-1 md:block">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search content, campaigns, ideas…"
            className="h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-16 text-base text-foreground placeholder:text-muted-foreground focus:border-brand/40 focus:bg-white/8 focus:outline-none focus:ring-2 focus:ring-brand/20 md:text-sm"
          />
          <kbd className="absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground lg:inline">
            ⌘K
          </kbd>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Credits pill */}
          <div className="hidden items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground sm:flex">
            <Sparkles className="size-3.5 text-brand" />
            <span>760 credits</span>
          </div>

          {/* Notifications */}
          <button
            className="relative flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="size-4.5" />
            <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-brand shadow-[0_0_8px_var(--brand)]" />
          </button>

          {/* Create CTA */}
          <button className="flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand to-accent-2 px-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_var(--brand)] transition-transform hover:scale-[1.02] active:scale-95 sm:px-4">
            <Plus className="size-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Create</span>
          </button>

          {/* Avatar */}
          <button
            className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-2 to-brand text-sm font-bold text-white"
            aria-label="Account"
          >
            F
          </button>
        </div>
      </div>
    </header>
  )
}
