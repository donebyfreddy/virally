"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AlertTriangle, ArrowLeft, Clapperboard, Download, ExternalLink, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

type Job = {
  id: string
  status: string
  scenes: Array<{ sceneId: string; modelId: string; status: string; outputUrl?: string; error?: string }>
}

export function SceneReview({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<Job | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const response = await fetch(`/api/generation/jobs/${jobId}`, { cache: "no-store" })
        const result = await response.json() as { job?: Job; error?: string }
        if (!response.ok || !result.job) throw new Error(result.error ?? "Unable to load generated scenes")
        if (active) setJob(result.job)
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to load generated scenes")
      }
    }
    void load()
    return () => { active = false }
  }, [jobId])

  return <div className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 lg:px-10">
    <Link href={`/generation/${jobId}`} className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"><ArrowLeft className="size-4" /> Back to generation</Link>
    <div className="mt-6 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="flex items-center gap-2 text-xs font-medium text-emerald-300"><Clapperboard className="size-3.5" /> Scene review</p><h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl">Review your generated scenes</h1><p className="mt-2 text-sm text-white/45">Preview every completed scene before you download or move into final composition.</p></div>{job && <a href={`/api/generation/jobs/${job.id}/download`}><Button variant="outline" className="border-white/10 bg-white/[.03] text-white hover:bg-white/10 hover:text-white"><Download className="size-4" /> Download assets</Button></a>}</div>
    {error ? <section className="mt-8 rounded-2xl border border-rose-400/20 bg-rose-500/[.06] p-6"><AlertTriangle className="size-5 text-rose-300" /><h2 className="mt-3 font-display text-lg font-semibold">Scenes unavailable</h2><p className="mt-2 text-sm text-white/50">{error}</p></section> : !job ? <div className="mt-8 flex h-48 items-center justify-center rounded-2xl border border-white/[.08] bg-[#130e1e]/80"><LoaderCircle className="size-5 animate-spin text-fuchsia-300" /></div> : <div className="mt-8 grid gap-4 md:grid-cols-2">{job.scenes.map((scene, index) => <section key={scene.sceneId} className="overflow-hidden rounded-2xl border border-white/[.08] bg-[#130e1e]/80"><div className="flex items-center justify-between gap-3 border-b border-white/[.07] px-5 py-4"><div><p className="text-[10px] uppercase tracking-[.12em] text-white/35">Scene {index + 1}</p><h2 className="mt-1 text-sm font-medium">{scene.modelId}</h2></div><span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-medium text-emerald-200">{scene.status.toLowerCase().replaceAll("_", " ")}</span></div>{scene.outputUrl ? <><video className="aspect-video w-full bg-black object-cover" controls src={scene.outputUrl} /><div className="flex items-center gap-2 px-5 py-4"><a href={scene.outputUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="border-white/10 bg-white/[.03] text-white"><ExternalLink className="size-3.5" /> Open asset</Button></a></div></> : <div className="p-5 text-sm text-white/45">{scene.error ?? "This scene is still being prepared."}</div>}</section>)}</div>}
  </div>
}
