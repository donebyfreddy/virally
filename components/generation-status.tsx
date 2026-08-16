"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AlertTriangle, Check, Clapperboard, Download, LoaderCircle, RefreshCw, Sparkles, WandSparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

type Job = {
  id: string
  status: string
  stage: string
  createdAt: string
  estimatedCredits: number
  scenes: Array<{ sceneId: string; modelId: string; status: string; outputUrl?: string; error?: string }>
}

const terminalStatuses = new Set(["COMPLETED", "FAILED", "CANCELLED", "QUALITY_CHECK"])

export function GenerationStatus({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<Job | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const response = await fetch(`/api/generation/jobs/${jobId}`, { cache: "no-store" })
        const result = await response.json() as { job?: Job; error?: string }
        if (!response.ok || !result.job) throw new Error(result.error ?? "Unable to read generation status")
        if (active) { setJob(result.job); setError("") }
        if (active && !terminalStatuses.has(result.job.status)) window.setTimeout(load, 5000)
      } catch (caught) { if (active) setError(caught instanceof Error ? caught.message : "Unable to read generation status") }
    }
    void load()
    return () => { active = false }
  }, [jobId])

  return <div className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 lg:px-10">
    <p className="flex items-center gap-2 text-xs font-medium text-fuchsia-300"><Sparkles className="size-3.5" /> Generation project</p>
    <div className="mt-2 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><h1 className="font-display text-2xl font-semibold md:text-3xl">Your video is taking shape</h1><p className="mt-2 text-sm text-white/45">You can leave this page. Provider jobs continue independently.</p></div><Link href="/content"><Button variant="outline" className="border-white/10 bg-white/[.03] text-white hover:bg-white/10 hover:text-white">View content library</Button></Link></div>
    {error ? <section className="mt-8 rounded-2xl border border-rose-400/20 bg-rose-500/[.06] p-6"><AlertTriangle className="size-5 text-rose-300" /><h2 className="mt-3 font-display text-lg font-semibold">Generation status unavailable</h2><p className="mt-2 text-sm text-white/50">{error}</p><Link href="/ai-studio"><Button className="mt-5 rounded-xl bg-white text-[#160d20] hover:bg-white/90">Return to AI Studio</Button></Link></section> : !job ? <GenerationSkeleton /> : <>
      <section className="mt-8 rounded-2xl border border-white/[.08] bg-[#130e1e]/80 p-5 md:p-7"><div className="flex items-start gap-4"><span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${job.status === "FAILED" ? "bg-rose-500/10" : job.status === "QUALITY_CHECK" || job.status === "COMPLETED" ? "bg-emerald-500/10" : "bg-fuchsia-500/10"}`}>{job.status === "FAILED" ? <AlertTriangle className="size-5 text-rose-300" /> : job.status === "QUALITY_CHECK" || job.status === "COMPLETED" ? <Check className="size-5 text-emerald-300" /> : <LoaderCircle className="size-5 animate-spin text-fuchsia-300" />}</span><div className="flex-1"><p className="text-xs uppercase tracking-[.12em] text-white/35">Current stage</p><h2 className="mt-1 font-display text-xl font-semibold">{job.stage}</h2><p className="mt-2 text-xs text-white/40">Job {job.id.slice(0, 8)} · estimated reservation {job.estimatedCredits} credits</p></div></div><div className="mt-6 flex gap-1.5">{["Planning", "Keyframes", "Scenes", "Quality review", "Composition", "Render"].map((stage, index) => <div key={stage} className="flex-1"><div className={`h-1 rounded-full ${index <= (job.status === "QUALITY_CHECK" ? 3 : job.status === "GENERATING_VIDEO" ? 2 : 0) ? "bg-fuchsia-400" : "bg-white/10"}`} /><p className="mt-2 hidden text-[9px] text-white/30 sm:block">{stage}</p></div>)}</div></section>
      <div className="mt-6 grid gap-3 md:grid-cols-2">{job.scenes.map((scene, index) => <section key={scene.sceneId} className={`rounded-2xl border p-4 ${scene.status === "FAILED" ? "border-rose-400/20 bg-rose-500/[.05]" : "border-white/[.08] bg-[#130e1e]/80"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.12em] text-white/35">Scene {index + 1}</p><p className="mt-1 text-sm font-medium">{scene.modelId}</p></div><SceneStatus status={scene.status} /></div>{scene.error && <p className="mt-3 text-xs leading-relaxed text-rose-200">{scene.error}. Your other scenes are safe.</p>}{scene.outputUrl && <video className="mt-4 aspect-video w-full rounded-xl bg-black object-cover" controls src={scene.outputUrl} />}{scene.status === "FAILED" && <div className="mt-4 flex gap-2"><Button size="sm" variant="outline" className="border-white/10 bg-white/[.03] text-white"><RefreshCw className="size-3.5" /> Retry</Button><Link href="/ai-studio?step=storyboard"><Button size="sm" variant="ghost" className="text-white/55"><WandSparkles className="size-3.5" /> Edit scene</Button></Link></div>}</section>)}</div>
      {(job.status === "QUALITY_CHECK" || job.status === "COMPLETED") && <section className="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-500/[.05] p-5"><Clapperboard className="size-5 text-emerald-300" /><h2 className="mt-3 font-display text-lg font-semibold">Generated scenes are ready for review</h2><p className="mt-2 text-sm text-white/45">Final composition and durable asset storage require the rendering and storage services to be connected.</p><div className="mt-4 flex gap-2"><Button className="rounded-xl bg-white text-[#160d20] hover:bg-white/90"><Clapperboard className="size-4" /> Review scenes</Button><Button variant="ghost" className="text-white/55"><Download className="size-4" /> Download assets</Button></div></section>}
    </>}
  </div>
}

function SceneStatus({ status }: { status: string }) { const done = status === "APPROVED" || status === "REVIEWING"; return <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${status === "FAILED" ? "bg-rose-400/10 text-rose-200" : done ? "bg-emerald-400/10 text-emerald-200" : "bg-fuchsia-400/10 text-fuchsia-200"}`}>{status.toLowerCase().replaceAll("_", " ")}</span> }
function GenerationSkeleton() { return <div className="mt-8 space-y-4"><div className="h-40 animate-pulse rounded-2xl border border-white/[.06] bg-white/[.03]" /><div className="grid gap-3 md:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl border border-white/[.06] bg-white/[.03]" />)}</div></div> }
