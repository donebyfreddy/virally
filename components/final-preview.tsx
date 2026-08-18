"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AlertTriangle, CalendarClock, Download, LoaderCircle, Pencil, RefreshCw, Send, Sparkles, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RemotionPreview } from "@/components/remotion-preview"
import type { EditPlan } from "@/lib/generation/edit-engine"

type RenderJob = { status: string; stage: string; outputUrl?: string; error?: string }
type EditResponse = { editPlan: EditPlan | null; render: RenderJob | null; stale?: boolean; mp4ExportConfigured?: boolean; error?: string }

const PLATFORM_LABEL: Record<string, string> = { tiktok: "TikTok", instagram_reels: "Instagram Reels", youtube_shorts: "YouTube Shorts", facebook_reels: "Facebook Reels", linkedin: "LinkedIn" }

function aspectLabel(width: number, height: number) {
  const ratio = width / height
  if (Math.abs(ratio - 9 / 16) < 0.02) return "9:16"
  if (Math.abs(ratio - 16 / 9) < 0.02) return "16:9"
  if (Math.abs(ratio - 1) < 0.02) return "1:1"
  return `${width}×${height}`
}

export function FinalPreview({ jobId }: { jobId: string }) {
  const [data, setData] = useState<EditResponse | null>(null)
  const [error, setError] = useState("")
  const [exporting, setExporting] = useState(false)
  const [notice, setNotice] = useState("")

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const response = await fetch(`/api/generation/jobs/${jobId}/edit`, { cache: "no-store" })
        const result = await response.json() as EditResponse
        if (!active) return
        if (!response.ok) throw new Error(result.error ?? "Unable to load your final video")
        setData(result)
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to load your final video")
      }
    }
    void load()
    return () => { active = false }
  }, [jobId])

  async function exportMp4() {
    if (exporting) return
    setExporting(true)
    setNotice("")
    try {
      const response = await fetch(`/api/generation/jobs/${jobId}/render`, { method: "POST" })
      const result = await response.json() as { render?: RenderJob; error?: string }
      if (response.status === 501) { setNotice(result.error ?? "MP4 export isn't configured yet — the preview above is the full edit."); return }
      if (!response.ok || !result.render?.outputUrl) throw new Error(result.error ?? "Export failed")
      window.open(result.render.outputUrl, "_blank")
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Export failed. Your scenes are safe.")
    } finally {
      setExporting(false)
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[720px] px-5 py-16 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-500/10"><AlertTriangle className="size-6 text-rose-300" /></span>
        <h1 className="mt-5 font-display text-2xl font-semibold">Your final video isn’t ready</h1>
        <p className="mt-2 text-sm text-white/50">{error}</p>
        <Link href={`/generation/${jobId}/review`}><Button className="mt-6 rounded-xl bg-white text-[#160d20] hover:bg-white/90">Back to review</Button></Link>
      </div>
    )
  }

  if (!data) return <div className="flex h-[70vh] items-center justify-center"><LoaderCircle className="size-6 animate-spin text-fuchsia-300" /></div>

  if (!data.editPlan) {
    return (
      <div className="mx-auto max-w-[720px] px-5 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">Let’s build your edit</h1>
        <p className="mt-2 text-sm text-white/50">This project hasn’t been composed yet.</p>
        <Link href={`/generation/${jobId}/edit`}><Button className="mt-6 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 font-semibold text-white">Create final video</Button></Link>
      </div>
    )
  }

  const plan = data.editPlan

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 lg:px-10">
      <p className="flex items-center gap-2 text-xs font-medium text-emerald-300"><Sparkles className="size-3.5" /> Final video</p>
      <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl">Your video is ready</h1>
      <p className="mt-2 text-sm text-white/45">A single professionally edited short — unified captions, motion, transitions, sound and branding. Optimized for {PLATFORM_LABEL[plan.platform] ?? plan.platform} pacing.</p>

      {data.stale && <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/[.06] px-4 py-3 text-xs text-amber-100"><AlertTriangle className="size-4" /> A scene changed since this edit was built. <Link href={`/generation/${jobId}/edit`} className="underline">Rebuild the edit</Link>.</div>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div>
          <div className="mx-auto aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-2xl border border-white/10 bg-black">
            <RemotionPreview plan={plan} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Meta label="Platform" value={PLATFORM_LABEL[plan.platform] ?? plan.platform} />
            <Meta label="Duration" value={`${Math.round(plan.durationSeconds)}s`} />
            <Meta label="Aspect" value={aspectLabel(plan.width, plan.height)} />
            <Meta label="Resolution" value={`${Math.min(plan.width, plan.height)}p`} />
          </div>
        </div>

        <div>
          <div className="rounded-2xl border border-white/[.08] bg-[#130e1e]/80 p-5">
            <h2 className="font-display text-lg font-semibold">What Virally added</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Added label="Edit style" value={plan.style.replaceAll("_", " ")} />
              <Added label="Captions" value={plan.captionStyle} />
              <Added label="Music" value={plan.music.mode === "none" ? "None" : plan.music.mood} />
              <Added label="Transitions" value={`${plan.scenes.length} scenes`} />
              <Added label="CTA" value={plan.cta?.text ?? "—"} />
              <Added label="Sound effects" value={`${plan.soundEffects.length}`} />
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-white/40">All captions and CTA text are drawn by the editor, never generated inside the video — so they’re always crisp and correct. {plan.disclaimer}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/generation/${jobId}/review`}><Button variant="outline" className="rounded-xl border-white/10 bg-white/[.03] text-white hover:bg-white/10 hover:text-white"><Pencil className="size-4" /> Edit</Button></Link>
            <Link href={`/generation/${jobId}/review`}><Button variant="ghost" className="text-white/60 hover:text-white"><RefreshCw className="size-4" /> Regenerate scene</Button></Link>
            <Link href="/ai-studio?new=true"><Button variant="ghost" className="text-white/60 hover:text-white"><Wand2 className="size-4" /> Create variation</Button></Link>
            <Button variant="ghost" disabled={exporting} onClick={exportMp4} className="text-white/60 hover:text-white">{exporting ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />} Download</Button>
            <Button variant="ghost" disabled className="text-white/35"><CalendarClock className="size-4" /> Schedule</Button>
            <Button variant="ghost" disabled className="text-white/35"><Send className="size-4" /> Publish</Button>
          </div>
          {notice && <p className="mt-3 rounded-lg border border-white/[.08] bg-white/[.03] px-3 py-2 text-xs text-white/55">{notice} <a className="ml-1 underline" href={`/api/generation/jobs/${jobId}/download`}>Download source assets</a></p>}
        </div>
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/[.08] bg-white/[.025] px-3 py-2"><p className="text-[10px] uppercase tracking-[.1em] text-white/35">{label}</p><p className="mt-0.5 text-sm font-medium text-white/85">{value}</p></div>
}
function Added({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/[.06] bg-white/[.02] px-3 py-2.5"><p className="text-[10px] uppercase tracking-[.1em] text-white/35">{label}</p><p className="mt-0.5 truncate text-xs font-medium capitalize text-white/80" title={value}>{value}</p></div>
}
