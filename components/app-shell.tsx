"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, type ReactNode } from "react"
import {
  Bell, CircleHelp, Clapperboard, CreditCard, Crown, FolderKanban, Grid2X2,
  LayoutDashboard, Menu, MoreHorizontal, Plus, Settings2, WandSparkles, X, Zap,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const navigation: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/ai-studio", label: "AI Studio", icon: WandSparkles },
  { href: "/content", label: "Content library", icon: FolderKanban },
  { href: "/campaigns", label: "Campaigns", icon: Grid2X2 },
  { href: "/publish", label: "Publish", icon: Clapperboard },
]

const workspaceNavigation: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/billing", label: "Credits & billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings2 },
]

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const currentLabel = [...navigation, ...workspaceNavigation].find(({ href }) => pathname.startsWith(href))?.label ?? "Virally"

  return <div className="min-h-screen bg-[#0b0812] text-white selection:bg-fuchsia-500/40">
    <div className="pointer-events-none fixed inset-0 studio-noise" />
    <div className="pointer-events-none fixed -left-32 top-0 h-[32rem] w-[32rem] rounded-full bg-fuchsia-700/10 blur-[130px]" />
    <Sidebar pathname={pathname} onNavigate={() => setOpen(false)} className="hidden lg:flex" />
    {open && <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}><Sidebar pathname={pathname} onNavigate={() => setOpen(false)} className="flex" close={() => setOpen(false)} /></div>}
    <div className="relative lg:pl-[236px]">
      <header className="sticky top-0 z-30 flex h-[74px] items-center justify-between border-b border-white/[0.07] bg-[#0b0812]/80 px-5 backdrop-blur-xl md:px-8">
        <div className="flex items-center gap-3"><button onClick={() => setOpen(true)} className="rounded-lg p-2 text-white/60 transition hover:bg-white/5 hover:text-white lg:hidden" aria-label="Open navigation"><Menu className="size-5" /></button><div><p className="text-[10px] uppercase tracking-[.14em] text-white/30">Workspace</p><p className="text-sm font-medium text-white/80">{currentLabel}</p></div></div>
        <div className="flex items-center gap-2"><button className="hidden rounded-lg p-2 text-white/45 transition hover:bg-white/5 hover:text-white sm:block" aria-label="Help"><CircleHelp className="size-5" /></button><button className="relative rounded-lg p-2 text-white/45 transition hover:bg-white/5 hover:text-white" aria-label="Notifications"><Bell className="size-5" /><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-fuchsia-400" /></button><Link href="/ai-studio?new=true"><Button size="sm" className="hidden rounded-lg bg-white text-[#160d20] hover:bg-white/90 sm:flex"><Plus className="size-3.5" /> Create</Button></Link></div>
      </header>
      <main>{children}</main>
    </div>
  </div>
}

function Sidebar({ pathname, onNavigate, className, close }: { pathname: string; onNavigate: () => void; className: string; close?: () => void }) {
  return <aside onClick={(event) => event.stopPropagation()} className={`fixed inset-y-0 left-0 z-50 w-[236px] flex-col border-r border-white/[0.07] bg-[#100c19]/95 px-3 py-5 backdrop-blur-xl ${className}`}>
    <div className="mb-9 flex items-center justify-between px-3"><Link href="/overview" onClick={onNavigate} className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-violet-600 shadow-lg shadow-fuchsia-900/50"><Zap className="size-4 fill-white" /></span><span className="font-display text-lg font-bold tracking-tight">Virally</span></Link>{close && <button onClick={close} className="p-1 text-white/45" aria-label="Close navigation"><X className="size-5" /></button>}</div>
    <Link href="/ai-studio?new=true" onClick={onNavigate}><Button className="mb-6 h-11 w-full justify-start rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-3 font-semibold text-white shadow-lg shadow-fuchsia-950/30 hover:from-fuchsia-500 hover:to-violet-600"><Plus className="size-4" /> Create content</Button></Link>
    <nav className="space-y-1" aria-label="Main navigation">{navigation.map((item) => <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)} onClick={onNavigate} />)}</nav>
    <p className="mb-2 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[.15em] text-white/35">Workspace</p>
    <nav className="space-y-1" aria-label="Workspace navigation">{workspaceNavigation.map((item) => <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)} onClick={onNavigate} />)}</nav>
    <div className="mt-auto rounded-2xl border border-white/[0.08] bg-white/[.035] p-3.5"><div className="flex items-center justify-between"><span className="text-xs text-white/55">Credits</span><Crown className="size-3.5 text-amber-300" /></div><p className="mt-1 font-display text-lg font-semibold">Not connected</p><p className="mt-1 text-[11px] leading-relaxed text-white/38">Connect billing data to show a real balance.</p><Link href="/billing" onClick={onNavigate} className="mt-3 block text-xs font-medium text-fuchsia-300 hover:text-white">View billing →</Link></div>
    <div className="mt-4 flex items-center gap-2.5 border-t border-white/[.07] px-2 pt-4"><div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-violet-500 text-xs font-bold text-violet-950">U</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">Your workspace</p><p className="truncate text-[11px] text-white/40">Profile not connected</p></div><MoreHorizontal className="size-4 text-white/40" /></div>
  </aside>
}

function NavLink({ href, label, icon: Icon, active, onClick }: { href: string; label: string; icon: LucideIcon; active: boolean; onClick: () => void }) {
  return <Link href={href} onClick={onClick} aria-current={active ? "page" : undefined} className={`flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition ${active ? "bg-white/[.08] font-medium text-white" : "text-white/52 hover:bg-white/[.05] hover:text-white"}`}><Icon className={`size-4 ${active ? "text-fuchsia-300" : ""}`} />{label}</Link>
}
