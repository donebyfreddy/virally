'use client'

import { useState } from 'react'
import { MobileSidebar, Sidebar } from './sidebar'
import { Topbar } from './topbar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-background">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 size-96 rounded-full bg-brand/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 size-96 rounded-full bg-accent-2/10 blur-[120px]" />
        <div className="bg-grid absolute inset-0 opacity-40" />
      </div>

      <Sidebar />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="relative lg:pl-64">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
