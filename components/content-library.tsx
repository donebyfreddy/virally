"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Clapperboard, Copy, Download, FolderKanban, LoaderCircle, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type ContentItem = {
  id: string; title: string; platform: string; objective?: string; durationSeconds: number
  status: string; createdAt: string; updatedAt: string; model: string; creditsUsed: number; estimatedCredits: number
  sceneCount: number; approvedScenes: number; thumbnailUrl?: string; finalVideoUrl?: string; campaign?: string
  hasFinalEdit: boolean; failureReason?: string
}

const PLATFORM_LABEL: Record<string, string> = { tiktok: "TikTok", instagram_reels: "Instagram Reels", youtube_shorts: "YouTube Shorts", facebook_reels: "Facebook Reels", linkedin: "LinkedIn" }
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-white/10 text-white/60" },
  GENERATING: { label: "Generating", className: "bg-fuchsia-400/10 text-fuchsia-200" },
  READY_FOR_REVIEW: { label: "Ready for review", className: "bg-cyan-400/10 text-cyan-200" },
  EDITING: { label: "Editing", className: "bg-violet-400/10 text-violet-200" },
  COMPLETED: { label: "Completed", className: "bg-emerald-400/10 text-emerald-200" },
  FAILED: { label: "Failed", className: "bg-rose-400/10 text-rose-200" },
  PUBLISHED: { label: "Published", className: "bg-emerald-400/15 text-emerald-200" },
  ARCHIVED: { label: "Archived", className: "bg-white/[.06] text-white/40" },
}
const FILTERS: Array<{ key: string; label: string; match: (status: string) => boolean }> = [
  { key: "all", label: "All", match: () => true },
  { key: "draft", label: "Drafts", match: (s) => s === "DRAFT" },
  { key: "generating", label: "Generating", match: (s) => s === "GENERATING" },
  { key: "review", label: "Review", match: (s) => s === "READY_FOR_REVIEW" || s === "EDITING" },
  { key: "completed", label: "Completed", match: (s) => s === "COMPLETED" || s === "PUBLISHED" },
  { key: "failed", label: "Failed", match: (s) => s === "FAILED" },
]

function formatDate(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()
  return sameDay ? "Today" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function ContentLibrary() {
  const router = useRouter()
  const [items, setItems] = useState<ContentItem[] | null>(null)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [platform, setPlatform] = useState("all")
  const [busy, setBusy] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const response = await fetch("/api/content", { cache: "no-store" })
        const result = await response.json() as { items?: ContentItem[]; error?: string }
        if (!active) return
        if (!response.ok || !result.items) throw new Error(result.error ?? "Unable to load your content library")
        setItems(result.items)
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to load your content library")
      }
    }
    void load()
    return () => { active = false }
  }, [])

  const platforms = useMemo(() => [...new Set((items ?? []).map((item) => item.platform))], [items])
  const visible = (items ?? []).filter((item) => {
    const activeFilter = FILTERS.find((entry) => entry.key === filter)!
    if (!activeFilter.match(item.status)) return false
    if (platform !== "all" && item.platform !== platform) return false
    if (query && !item.title.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  async function remove(item: ContentItem) {
    if (busy[item.id] || !window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return
    setBusy((current) => ({ ...current, [item.id]: true }))
    try {
      const response = await fetch(`/api/generation/jobs/${item.id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Delete failed")
      setItems((current) => (current ?? []).filter((entry) => entry.id !== item.id))
    } catch {
      setBusy((current) => ({ ...current, [item.id]: false }))
    }
  }

  async function duplicate(item: ContentItem) {
    if (busy[item.id]) return
    setBusy((current) => ({ ...current, [item.id]: true }))
    try {
      const response = await fetch(`/api/content/${item.id}/duplicate`, { method: "POST" })
      const result = await response.json() as { id?: string; error?: string }
      if (!response.ok || !result.id) throw new Error(result.error ?? "Duplicate failed")
      router.push(`/generation/${result.id}`)
    } catch {
      setBusy((current) => ({ ...current, [item.id]: false }))
    }
  }

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 lg:px-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[.12em] text-fuchsia-300">Content library</p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl">Every piece, one organized home</h1>
          <p className="mt-2 text-sm text-white/45">Search, review, continue, and publish everything created with Virally. Projects persist — leave and come back any time.</p>
        </div>
        <Link href="/ai-studio?new=true"><Button className="rounded-xl bg-white text-[#160d20] hover:bg-white/90"><Plus className="size-4" /> Create content</Button></Link>
      </div>

      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/[.08] bg-[#130e1e]/80 p-4 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 size-4 text-white/30" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="studio-input h-10 pl-9" placeholder="Search content" aria-label="Search content" /></div>
        <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="studio-input h-10 w-full sm:w-44" aria-label="Platform filter">
          <option className="bg-[#21172f]" value="all">All platforms</option>
          {platforms.map((value) => <option className="bg-[#21172f]" key={value} value={value}>{PLATFORM_LABEL[value] ?? value}</option>)}
        </select>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((entry) => <button key={entry.key} onClick={() => setFilter(entry.key)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition ${filter === entry.key ? "bg-white text-[#160d20]" : "border border-white/10 text-white/45 hover:text-white"}`}>{entry.label}</button>)}
      </div>

      {error ? (
        <section className="mt-8 rounded-2xl border border-rose-400/20 bg-rose-500/[.06] p-6"><AlertTriangle className="size-5 text-rose-300" /><h2 className="mt-3 font-display text-lg font-semibold">Library unavailable</h2><p className="mt-2 text-sm text-white/50">{error}</p></section>
      ) : items === null ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl border border-white/[.06] bg-white/[.03]" />)}</div>
      ) : visible.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-white/[.08] bg-[#130e1e]/80 p-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-white/[.04]"><FolderKanban className="size-7 text-white/30" /></span>
          <h2 className="mt-5 font-display text-lg font-semibold">{items.length === 0 ? "Your content library is empty" : "No content matches these filters"}</h2>
          <p className="mt-2 max-w-sm text-sm text-white/45">{items.length === 0 ? "Turn your first idea into a short-form video. Every project you generate is saved here automatically." : "Try a different filter or search."}</p>
          {items.length === 0 && <Link href="/ai-studio?new=true"><Button className="mt-6 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 font-semibold text-white"><Plus className="size-4" /> Create content</Button></Link>}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => <ContentCard key={item.id} item={item} busy={Boolean(busy[item.id])} onDelete={() => remove(item)} onDuplicate={() => duplicate(item)} />)}
        </div>
      )}
    </div>
  )
}

function ContentCard({ item, busy, onDelete, onDuplicate }: { item: ContentItem; busy: boolean; onDelete: () => void; onDuplicate: () => void }) {
  const badge = STATUS_BADGE[item.status] ?? { label: item.status, className: "bg-white/10 text-white/60" }
  const openHref = item.status === "COMPLETED" || item.status === "PUBLISHED" || item.status === "EDITING" ? `/generation/${item.id}/result` : item.status === "READY_FOR_REVIEW" ? `/generation/${item.id}/review` : `/generation/${item.id}`

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-white/[.08] bg-[#130e1e]/80">
      <Link href={openHref} className="relative block aspect-video bg-black">
        {item.thumbnailUrl ? <video className="size-full object-cover" muted playsInline preload="metadata" src={`${item.thumbnailUrl}#t=0.1`} /> : <div className="flex size-full items-center justify-center"><Clapperboard className="size-7 text-white/20" /></div>}
        <span className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-medium ${badge.className}`}>{badge.label}</span>
        {item.status === "GENERATING" && <span className="absolute right-2 top-2"><LoaderCircle className="size-4 animate-spin text-fuchsia-300" /></span>}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={openHref} className="line-clamp-2 text-sm font-medium hover:text-white/90" title={item.title}>{item.title}</Link>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/40">
          <span>{PLATFORM_LABEL[item.platform] ?? item.platform}</span>
          <span>· {item.durationSeconds}s</span>
          <span>· {item.sceneCount} scenes</span>
          <span>· {formatDate(item.createdAt)}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/35">
          <span>{item.model}</span>
          <span>· {item.creditsUsed || item.estimatedCredits} credits</span>
          {item.campaign && <span>· {item.campaign}</span>}
        </div>

        {item.status === "FAILED" && item.failureReason && <p className="mt-3 rounded-lg border border-rose-400/20 bg-rose-500/[.05] px-2.5 py-2 text-[11px] leading-relaxed text-rose-200">{item.failureReason}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-white/[.06] pt-3">
          {(item.status === "READY_FOR_REVIEW" || item.status === "FAILED") && <Link href={`/generation/${item.id}/review`}><Button size="xs" variant="outline" className="border-white/10 bg-white/[.03] text-white hover:bg-white/10 hover:text-white"><Clapperboard className="size-3" /> Review</Button></Link>}
          {(item.status === "COMPLETED" || item.status === "PUBLISHED" || item.status === "EDITING") && <Link href={`/generation/${item.id}/result`}><Button size="xs" variant="outline" className="border-white/10 bg-white/[.03] text-white hover:bg-white/10 hover:text-white"><Pencil className="size-3" /> Continue</Button></Link>}
          {item.status === "FAILED" && <Link href={`/generation/${item.id}/review`}><Button size="xs" variant="ghost" className="text-white/55 hover:text-white"><RefreshCw className="size-3" /> Regenerate</Button></Link>}
          <a href={item.finalVideoUrl ?? `/api/generation/jobs/${item.id}/download`} target="_blank" rel="noreferrer"><Button size="xs" variant="ghost" className="text-white/55 hover:text-white"><Download className="size-3" /> Download</Button></a>
          <Button size="xs" variant="ghost" disabled={busy} onClick={onDuplicate} className="text-white/55 hover:text-white"><Copy className="size-3" /> Duplicate</Button>
          <Button size="xs" variant="ghost" disabled={busy} onClick={onDelete} className="ml-auto text-rose-200/70 hover:text-rose-100"><Trash2 className="size-3" /></Button>
        </div>
      </div>
    </section>
  )
}
