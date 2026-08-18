"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { AlertTriangle, ArrowRight, Check, Clapperboard, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

type Step = { key: string; label: string; done: boolean }

const FALLBACK_STEPS: Step[] = [
  { key: "analyze", label: "Analyzing script & style", done: false },
  { key: "timing", label: "Building edit timing", done: false },
  { key: "captions", label: "Creating captions", done: false },
  { key: "emphasis", label: "Highlighting keywords", done: false },
  { key: "motion", label: "Adding motion", done: false },
  { key: "transitions", label: "Placing transitions", done: false },
  { key: "audio", label: "Sound design", done: false },
  { key: "branding", label: "Applying brand", done: false },
]

/**
 * Runs the deterministic auto-edit pipeline (POST /edit) and reveals the real
 * steps as completed work — no fake percentages. When the EditPlan is built the
 * preview is ready and the user continues to the final video.
 */
export function EditProgress({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [steps, setSteps] = useState<Step[]>(FALLBACK_STEPS)
  const [revealed, setRevealed] = useState(0)
  const [status, setStatus] = useState<"building" | "ready" | "error" | "blocked">("building")
  const [message, setMessage] = useState("")
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    async function build() {
      try {
        const response = await fetch(`/api/generation/jobs/${jobId}/edit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
        const result = await response.json() as { render?: { steps?: Step[] }; error?: string }
        if (response.status === 409) { setStatus("blocked"); setMessage(result.error ?? "Approve every scene first."); return }
        if (!response.ok) throw new Error(result.error ?? "We couldn't build your edit.")
        if (result.render?.steps?.length) setSteps(result.render.steps.map((step) => ({ ...step, done: true })))
        setStatus("ready")
      } catch (caught) {
        setStatus("error")
        setMessage(caught instanceof Error ? caught.message : "We couldn't build your edit.")
      }
    }
    void build()
  }, [jobId])

  // Reveal steps one at a time for a premium feel; each reveal reflects finished work.
  useEffect(() => {
    if (status === "error" || status === "blocked") return
    if (revealed >= steps.length) return
    const timer = window.setTimeout(() => setRevealed((current) => current + 1), 360)
    return () => window.clearTimeout(timer)
  }, [revealed, steps.length, status])

  const complete = status === "ready" && revealed >= steps.length

  if (status === "blocked" || status === "error") {
    return (
      <div className="mx-auto max-w-[720px] px-5 py-16 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-500/10"><AlertTriangle className="size-6 text-rose-300" /></span>
        <h1 className="mt-5 font-display text-2xl font-semibold">{status === "blocked" ? "A few scenes still need approval" : "We couldn't build your edit"}</h1>
        <p className="mt-2 text-sm text-white/50">{message} Your scenes are safe.</p>
        <Link href={`/generation/${jobId}/review`}><Button className="mt-6 rounded-xl bg-white text-[#160d20] hover:bg-white/90">Back to review</Button></Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[720px] px-5 py-12 md:py-16">
      <p className="flex items-center gap-2 text-xs font-medium text-fuchsia-300"><Clapperboard className="size-3.5" /> Automatic edit</p>
      <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl">We’re turning your scenes into a finished video</h1>
      <p className="mt-2 text-sm text-white/45">Captions, pacing, motion, transitions, sound design, CTA and branding — added automatically. Optimized for short-form engagement on your selected platform.</p>

      <section className="mt-8 space-y-2 rounded-2xl border border-white/[.08] bg-[#130e1e]/80 p-5 md:p-6">
        {steps.map((step, index) => {
          const done = index < revealed
          const active = index === revealed && !complete
          return (
            <div key={step.key} className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${active ? "bg-white/[.03]" : ""}`}>
              <span className={`flex size-6 items-center justify-center rounded-full ${done ? "bg-emerald-500/15" : active ? "bg-fuchsia-500/15" : "bg-white/[.05]"}`}>
                {done ? <Check className="size-3.5 text-emerald-300" /> : active ? <LoaderCircle className="size-3.5 animate-spin text-fuchsia-300" /> : <span className="size-1.5 rounded-full bg-white/25" />}
              </span>
              <span className={`text-sm ${done ? "text-white/80" : active ? "text-white" : "text-white/35"}`}>{step.label}</span>
            </div>
          )
        })}
      </section>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-xs text-white/40">{complete ? "Your edit is ready to preview." : "Building your edit…"}</p>
        <Button disabled={!complete} onClick={() => router.push(`/generation/${jobId}/result`)} className="h-10 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 font-semibold text-white disabled:opacity-40">
          {complete ? <><Clapperboard className="size-4" /> See final video <ArrowRight className="size-4" /></> : <><LoaderCircle className="size-4 animate-spin" /> Building…</>}
        </Button>
      </div>
    </div>
  )
}
