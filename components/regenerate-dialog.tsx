"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, LoaderCircle, RefreshCw, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"

type ModelOption = { id: string; label: string; qualityTier: string }
type Estimate = { modelId: string; modelLabel: string; durationSeconds: number; credits: number; providerCostUsd: number; disclaimer: string }

const PRESETS = ["fast", "quality", "cinematic", "ultra"] as const
const PRESET_LABELS: Record<string, string> = { fast: "Fast", quality: "Quality", cinematic: "Cinematic", ultra: "Ultra" }

export type RegenerateResult = { overrides: { modelId?: string; preset?: string; prompt?: string; durationSeconds?: number } }

export function RegenerateDialog({ jobId, scene, onClose, onSubmit }: {
  jobId: string
  scene: { sceneId: string; order: number; durationSeconds: number; modelId: string }
  onClose: () => void
  onSubmit: (result: RegenerateResult) => void
}) {
  const [prompt, setPrompt] = useState("")
  const [modelId, setModelId] = useState("auto")
  const [preset, setPreset] = useState("quality")
  const [models, setModels] = useState<ModelOption[]>([])
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Load current prompt + compatible models once.
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const response = await fetch(`/api/generation/jobs/${jobId}/scenes/${scene.sceneId}/regenerate`, { cache: "no-store" })
        const result = await response.json() as { prompt?: string; models?: ModelOption[]; estimate?: Estimate; error?: string }
        if (!response.ok) throw new Error(result.error ?? "Unable to load regeneration options")
        if (!active) return
        setPrompt(result.prompt ?? "")
        setModels(result.models ?? [])
        setEstimate(result.estimate ?? null)
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to load regeneration options")
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [jobId, scene.sceneId])

  // Recalculate the server-side cost whenever model or preset changes.
  useEffect(() => {
    if (loading) return
    let active = true
    const query = new URLSearchParams()
    if (modelId !== "auto") query.set("modelId", modelId)
    query.set("preset", preset)
    fetch(`/api/generation/jobs/${jobId}/scenes/${scene.sceneId}/regenerate?${query.toString()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { estimate?: Estimate }) => { if (active && result.estimate) setEstimate(result.estimate) })
      .catch(() => {})
    return () => { active = false }
  }, [modelId, preset, loading, jobId, scene.sceneId])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-t-2xl border border-white/10 bg-[#160f22] shadow-2xl sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/[.08] px-5 py-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium text-fuchsia-300"><Sparkles className="size-3.5" /> Regenerate scene {scene.order + 1}</p>
            <h2 className="mt-1 font-display text-lg font-semibold text-white">Improve this scene</h2>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} className="text-white/50"><X className="size-4" /></Button>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center"><LoaderCircle className="size-5 animate-spin text-fuchsia-300" /></div>
        ) : (
          <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-5">
            {error && <p className="rounded-lg border border-rose-400/20 bg-rose-500/[.06] p-3 text-xs text-rose-200">{error}</p>}

            <label className="block text-sm">
              <span className="font-medium text-white">Visual prompt</span>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} className="studio-input mt-2 resize-none text-sm leading-relaxed" placeholder="Describe the visual. Text is added by the editor afterwards, so avoid on-screen words here." />
              <span className="mt-1.5 block text-[11px] text-white/40">Captions and CTA are drawn by Virally’s editor — keep them out of the AI visual.</span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-white">Model</span>
                <select value={modelId} onChange={(event) => setModelId(event.target.value)} className="studio-input mt-2 h-10 text-sm">
                  <option className="bg-[#21172f]" value="auto">Auto — Recommended</option>
                  {models.map((model) => <option className="bg-[#21172f]" key={model.id} value={model.id}>{model.label}</option>)}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-white">Generation quality</span>
                <select value={preset} onChange={(event) => setPreset(event.target.value)} className="studio-input mt-2 h-10 text-sm">
                  {PRESETS.map((option) => <option className="bg-[#21172f]" key={option} value={option}>{PRESET_LABELS[option]}</option>)}
                </select>
              </label>
            </div>

            <div className="rounded-xl border border-fuchsia-400/15 bg-fuchsia-500/[.05] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/55">Model</span>
                <span className="font-medium text-white">{estimate?.modelLabel ?? "—"}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-white/55">Duration</span>
                <span className="font-medium text-white">{estimate?.durationSeconds ?? scene.durationSeconds} seconds</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-white/55">Estimated cost</span>
                <span className="font-semibold text-white">{estimate ? `${estimate.credits} credits` : "—"}</span>
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-white/40"><AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-300/70" /> Only this scene is charged. {estimate?.disclaimer}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-white/[.08] px-5 py-4">
          <Button variant="ghost" onClick={onClose} className="text-white/60 hover:text-white">Cancel</Button>
          <Button
            disabled={loading}
            onClick={() => onSubmit({ overrides: { modelId: modelId === "auto" ? undefined : modelId, preset, prompt: prompt.trim() || undefined, durationSeconds: scene.durationSeconds } })}
            className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 font-semibold text-white"
          >
            <RefreshCw className="size-4" /> Regenerate ({estimate?.credits ?? "—"} credits)
          </Button>
        </div>
      </div>
    </div>
  )
}
