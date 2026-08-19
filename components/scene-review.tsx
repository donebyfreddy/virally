"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Clapperboard, Download, History, LoaderCircle, RefreshCw, RotateCcw, Sparkles, WandSparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RegenerateDialog, type RegenerateResult } from "@/components/regenerate-dialog"

type QaReport = { visualQuality: string; promptAdherence: string; artifactRisk: string; textArtifact: boolean; notes: string[] }
type Version = { version: number; modelId: string; outputUrl?: string; createdAt: string }
type ProviderErrorDetails = { code: string; message: string; response?: string; requestId?: string; timestamp: string; forbidden: boolean; retryable: boolean }
type ReviewScene = {
  sceneId: string; order: number; durationSeconds: number; purpose: string
  modelId: string; status: string; reviewStatus: string; outputUrl?: string; error?: string; providerError?: ProviderErrorDetails
  currentVersion: number; versions: Version[]; qa?: QaReport
}
type ReviewJob = { id: string; status: string; scenes: ReviewScene[] }

const BADGE: Record<string, { label: string; className: string }> = {
  GENERATING: { label: "Generating", className: "bg-fuchsia-400/10 text-fuchsia-200" },
  REGENERATING: { label: "Regenerating", className: "bg-fuchsia-400/10 text-fuchsia-200" },
  READY_FOR_REVIEW: { label: "Ready for review", className: "bg-cyan-400/10 text-cyan-200" },
  APPROVED: { label: "Approved", className: "bg-emerald-400/10 text-emerald-200" },
  REJECTED: { label: "Rejected", className: "bg-amber-400/10 text-amber-200" },
  FAILED: { label: "Failed", className: "bg-rose-400/10 text-rose-200" },
}

const isPending = (status: string) => status === "GENERATING" || status === "REGENERATING"

export function SceneReview({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [job, setJob] = useState<ReviewJob | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState("")
  const [regenScene, setRegenScene] = useState<ReviewScene | null>(null)
  const [openVersions, setOpenVersions] = useState<string | null>(null)
  const [continuing, setContinuing] = useState(false)
  const [pollNonce, setPollNonce] = useState(0)

  const notify = useCallback((message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3200) }, [])

  // Loads the job and keeps polling every 5s while any scene is still generating.
  // Re-runs (and resumes polling) when a regeneration bumps `pollNonce`.
  useEffect(() => {
    let active = true
    let timer: number | undefined
    async function tick() {
      try {
        const response = await fetch(`/api/generation/jobs/${jobId}`, { cache: "no-store" })
        const result = await response.json() as { job?: ReviewJob; error?: string }
        if (!active) return
        if (!response.ok || !result.job) { setError(result.error ?? "Unable to load generated scenes"); return }
        setJob(result.job)
        setError("")
        if (result.job.scenes.some((scene) => isPending(scene.reviewStatus))) timer = window.setTimeout(() => { void tick() }, 5000)
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to load generated scenes")
      }
    }
    void tick()
    return () => { active = false; window.clearTimeout(timer) }
  }, [jobId, pollNonce])

  const setSceneBusy = (sceneId: string, value: boolean) => setBusy((current) => ({ ...current, [sceneId]: value }))

  async function act(sceneId: string, run: () => Promise<Response>, successMessage?: string) {
    if (busy[sceneId]) return
    setSceneBusy(sceneId, true)
    try {
      const response = await run()
      const result = await response.json() as { job?: ReviewJob; error?: string }
      if (!response.ok || !result.job) throw new Error(result.error ?? "That action could not be completed")
      setJob(result.job)
      if (successMessage) notify(successMessage)
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "That action could not be completed")
    } finally {
      setSceneBusy(sceneId, false)
    }
  }

  const approve = (sceneId: string) => act(sceneId, () => fetch(`/api/generation/jobs/${jobId}/scenes/${sceneId}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve" }) }), "Scene approved")
  const reject = (sceneId: string) => act(sceneId, () => fetch(`/api/generation/jobs/${jobId}/scenes/${sceneId}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reject" }) }))
  const restore = (sceneId: string, version: number) => act(sceneId, () => fetch(`/api/generation/jobs/${jobId}/scenes/${sceneId}/versions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restore", version }) }), `Restored version ${version}`)

  async function submitRegen(scene: ReviewScene, result: RegenerateResult) {
    setRegenScene(null)
    await act(scene.sceneId, () => fetch(`/api/generation/jobs/${jobId}/scenes/${scene.sceneId}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": `regen-${scene.sceneId}-${crypto.randomUUID()}` },
      body: JSON.stringify(result),
    }), "Regenerating scene — your other scenes are safe")
    // Resume polling so the new asset appears when the provider finishes.
    setPollNonce((current) => current + 1)
  }

  async function retry(sceneId: string) {
    await act(sceneId, () => fetch(`/api/generation/jobs/${jobId}/scenes/${sceneId}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": `retry-${sceneId}-${crypto.randomUUID()}` },
      body: JSON.stringify({}),
    }), "Retrying scene — your other scenes are safe")
    setPollNonce((current) => current + 1)
  }

  async function approveAllRemaining() {
    if (!job) return
    for (const scene of job.scenes) {
      if (scene.reviewStatus !== "APPROVED" && scene.outputUrl && !isPending(scene.reviewStatus)) {
        await approve(scene.sceneId)
      }
    }
  }

  async function continueToEdit() {
    if (continuing) return
    setContinuing(true)
    router.push(`/generation/${jobId}/edit`)
  }

  const scenes = job?.scenes ?? []
  const approved = scenes.filter((scene) => scene.reviewStatus === "APPROVED").length
  const total = scenes.length
  const allApproved = total > 0 && approved === total
  const anyPending = scenes.some((scene) => isPending(scene.reviewStatus))

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-8 pb-28 md:px-8 lg:px-10">
      <Link href={`/generation/${jobId}`} className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"><ArrowLeft className="size-4" /> Back to generation</Link>
      <div className="mt-6 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium text-emerald-300"><Clapperboard className="size-3.5" /> Scene review</p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl">Review your scenes</h1>
          <p className="mt-2 text-sm text-white/45">Approve each scene, or regenerate only the ones you want to change. Virally builds the final edit next.</p>
        </div>
        {job && <a href={`/api/generation/jobs/${job.id}/download`}><Button variant="ghost" className="text-white/55 hover:text-white"><Download className="size-4" /> Download source assets</Button></a>}
      </div>

      {error ? (
        <section className="mt-8 rounded-2xl border border-rose-400/20 bg-rose-500/[.06] p-6">
          <AlertTriangle className="size-5 text-rose-300" />
          <h2 className="mt-3 font-display text-lg font-semibold">Scenes unavailable</h2>
          <p className="mt-2 text-sm text-white/50">{error}</p>
        </section>
      ) : !job ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl border border-white/[.06] bg-white/[.03]" />)}</div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {scenes.map((scene) => (
            <SceneCard
              key={scene.sceneId}
              scene={scene}
              busy={Boolean(busy[scene.sceneId])}
              versionsOpen={openVersions === scene.sceneId}
              onToggleVersions={() => setOpenVersions((current) => current === scene.sceneId ? null : scene.sceneId)}
              onApprove={() => approve(scene.sceneId)}
              onReject={() => reject(scene.sceneId)}
              onRegenerate={() => setRegenScene(scene)}
              onRetry={() => retry(scene.sceneId)}
              onRestore={(version) => restore(scene.sceneId, version)}
            />
          ))}
        </div>
      )}

      {regenScene && <RegenerateDialog jobId={jobId} scene={regenScene} onClose={() => setRegenScene(null)} onSubmit={(result) => submitRegen(regenScene, result)} />}

      {job && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/[.08] bg-[#100c19]/95 px-4 py-3 backdrop-blur-xl lg:left-[236px]">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`flex size-9 items-center justify-center rounded-lg ${allApproved ? "bg-emerald-500/15" : "bg-white/[.06]"}`}>{allApproved ? <Check className="size-4 text-emerald-300" /> : <Sparkles className="size-4 text-fuchsia-300" />}</span>
              <div>
                <p className="text-sm font-medium">{approved} / {total} scenes approved</p>
                <p className="text-[11px] text-white/42">{allApproved ? "Ready to build your final edit" : anyPending ? "Some scenes are still generating" : "Approve every scene to continue"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!allApproved && <Button variant="ghost" disabled={anyPending} onClick={approveAllRemaining} className="text-white/60 hover:text-white">Approve all remaining</Button>}
              <Button disabled={!allApproved || continuing} onClick={continueToEdit} className="h-10 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 font-semibold text-white disabled:opacity-40">
                {continuing ? <LoaderCircle className="size-4 animate-spin" /> : <Clapperboard className="size-4" />} Continue to edit <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#21172f] px-4 py-3 text-sm text-white shadow-2xl"><Check className="mr-2 inline size-4 text-emerald-300" />{toast}</div>}
    </div>
  )
}

function SceneCard({ scene, busy, versionsOpen, onToggleVersions, onApprove, onReject, onRegenerate, onRetry, onRestore }: {
  scene: ReviewScene
  busy: boolean
  versionsOpen: boolean
  onToggleVersions: () => void
  onApprove: () => void
  onReject: () => void
  onRegenerate: () => void
  onRetry: () => void
  onRestore: (version: number) => void
}) {
  const [showDetails, setShowDetails] = useState(false)
  const badge = BADGE[scene.reviewStatus] ?? { label: scene.reviewStatus, className: "bg-white/10 text-white/60" }
  const pending = isPending(scene.reviewStatus)
  const approved = scene.reviewStatus === "APPROVED"
  const failed = scene.reviewStatus === "FAILED"
  const qaFlag = scene.qa && (scene.qa.textArtifact || scene.qa.artifactRisk === "high")

  return (
    <section className={`overflow-hidden rounded-2xl border ${approved ? "border-emerald-400/25" : scene.reviewStatus === "FAILED" ? "border-rose-400/20" : "border-white/[.08]"} bg-[#130e1e]/80`}>
      <div className="flex items-center justify-between gap-3 border-b border-white/[.07] px-5 py-4">
        <div>
          <p className="text-[10px] uppercase tracking-[.12em] text-white/35">Scene {scene.order + 1} · {scene.durationSeconds}s</p>
          <h2 className="mt-1 text-sm font-medium">{scene.modelId}{scene.versions.length > 1 ? <span className="ml-1.5 text-white/40">· v{scene.currentVersion}</span> : null}</h2>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${badge.className}`}>{badge.label}</span>
      </div>

      <div className="relative aspect-video w-full bg-black">
        {scene.outputUrl ? <video className="size-full object-cover" controls src={scene.outputUrl} /> : (
          <div className="flex size-full items-center justify-center">{pending ? <LoaderCircle className="size-6 animate-spin text-fuchsia-300" /> : <span className="px-6 text-center text-sm text-white/45">{scene.error ?? "This scene is still being prepared."}</span>}</div>
        )}
        {pending && scene.outputUrl && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><LoaderCircle className="size-6 animate-spin text-fuchsia-300" /></div>}
      </div>

      {scene.qa && (
        <div className="grid grid-cols-3 gap-px border-b border-white/[.07] bg-white/[.02] text-center">
          <QaCell label="Visual" value={scene.qa.visualQuality} />
          <QaCell label="Adherence" value={scene.qa.promptAdherence} />
          <QaCell label="Artifact risk" value={scene.qa.artifactRisk} tone={scene.qa.artifactRisk} />
        </div>
      )}

      {qaFlag && (
        <div className="flex items-start gap-2 border-b border-white/[.07] bg-amber-500/[.06] px-5 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
          <div className="text-xs leading-relaxed text-amber-100/80">
            {scene.qa?.textArtifact ? "Possible malformed on-screen text detected." : "Possible visual artifact detected."} Virally adds captions and CTA text itself — regenerate without embedded text, or keep this take.
          </div>
        </div>
      )}

      {failed && (
        <div className="border-b border-white/[.07] bg-rose-500/[.05] px-5 py-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-rose-200"><AlertTriangle className="size-4" /> Generation failed</p>
          <p className="mt-2 text-xs leading-relaxed text-rose-100/80">Provider: Kling ({scene.modelId}). Reason: {scene.providerError?.message ?? scene.error ?? "The provider could not process this scene."}</p>
          <p className="mt-1 text-[11px] text-rose-100/50">Your other scenes are safe.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={busy} onClick={onRetry} className="rounded-lg bg-white text-[#160d20] hover:bg-white/90">{busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Retry</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={onRegenerate} className="rounded-lg border-white/10 bg-white/[.03] text-white hover:bg-white/10 hover:text-white"><WandSparkles className="size-3.5" /> Change model</Button>
            {scene.providerError && <Button size="sm" variant="ghost" onClick={() => setShowDetails((current) => !current)} className="text-white/55 hover:text-white">{showDetails ? "Hide details" : "View details"}</Button>}
          </div>
          {showDetails && scene.providerError && (
            <dl className="mt-3 space-y-1 rounded-lg border border-white/[.08] bg-black/30 p-3 font-mono text-[11px] text-white/55">
              <div className="flex gap-2"><dt className="text-white/35">code</dt><dd>{scene.providerError.code}</dd></div>
              {scene.providerError.requestId && <div className="flex gap-2"><dt className="text-white/35">request</dt><dd className="break-all">{scene.providerError.requestId}</dd></div>}
              <div className="flex gap-2"><dt className="text-white/35">time</dt><dd>{scene.providerError.timestamp}</dd></div>
              {scene.providerError.response && <div><dt className="text-white/35">response</dt><dd className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-all">{scene.providerError.response}</dd></div>}
            </dl>
          )}
        </div>
      )}

      {!failed && (
        <div className="flex flex-wrap items-center gap-2 px-5 py-4">
          <Button size="sm" disabled={busy || pending || !scene.outputUrl} onClick={onApprove} className={`rounded-lg ${approved ? "bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/20" : "bg-white text-[#160d20] hover:bg-white/90"}`}>
            {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} {approved ? "Approved" : "Approve"}
          </Button>
          <Button size="sm" variant="outline" disabled={busy || pending} onClick={onRegenerate} className="rounded-lg border-white/10 bg-white/[.03] text-white hover:bg-white/10 hover:text-white"><RefreshCw className="size-3.5" /> Regenerate</Button>
          {!approved && scene.outputUrl && <Button size="sm" variant="ghost" disabled={busy || pending} onClick={onReject} className="text-white/55 hover:text-white"><X className="size-3.5" /> Reject</Button>}
          {scene.versions.length > 1 && <Button size="sm" variant="ghost" onClick={onToggleVersions} className="ml-auto text-white/55 hover:text-white"><History className="size-3.5" /> {scene.versions.length} versions</Button>}
        </div>
      )}

      {versionsOpen && scene.versions.length > 1 && (
        <div className="border-t border-white/[.07] bg-black/20 px-5 py-4">
          <p className="text-[10px] uppercase tracking-[.12em] text-white/35">Version history</p>
          <div className="mt-3 space-y-2">
            {[...scene.versions].reverse().map((version) => (
              <div key={version.version} className="flex items-center justify-between gap-3 rounded-lg border border-white/[.07] bg-white/[.02] px-3 py-2">
                <div>
                  <p className="text-xs font-medium">Version {version.version}{version.version === scene.currentVersion ? <span className="ml-1.5 text-emerald-300">· Current</span> : null}</p>
                  <p className="text-[11px] text-white/40">{version.modelId}</p>
                </div>
                <div className="flex items-center gap-1">
                  {version.outputUrl && <a href={version.outputUrl} target="_blank" rel="noreferrer"><Button size="xs" variant="ghost" className="text-white/55">Preview</Button></a>}
                  {version.version !== scene.currentVersion && version.outputUrl && <Button size="xs" variant="ghost" onClick={() => onRestore(version.version)} className="text-fuchsia-200 hover:text-white"><RotateCcw className="size-3" /> Restore</Button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function QaCell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const color = tone === "high" ? "text-rose-200" : tone === "medium" ? "text-amber-200" : value === "good" || value === "high" || value === "low" ? "text-emerald-200" : "text-white/70"
  return (
    <div className="px-2 py-2.5">
      <p className="text-[9px] uppercase tracking-[.1em] text-white/35">{label}</p>
      <p className={`mt-0.5 text-xs font-medium capitalize ${color}`}>{value}</p>
    </div>
  )
}
