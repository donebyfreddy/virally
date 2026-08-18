import { buildEditPlan, approvedSignature, type Branding, type EditableScene, type EditPlan } from "./edit-engine"
import type { StoredGenerationJob, StoredRenderJob } from "./job-store"
import { readyForEdit } from "./review"

/**
 * Runs the deterministic auto-edit pipeline for a job. Every step here is a real
 * computation (no percentages, no placeholders): analyse the script, choose a
 * style, lay out scene timing, generate captions and emphasis, add motion,
 * transitions, music, SFX, CTA and branding — then persist the validated plan.
 */

const STEP_LABELS: Array<{ key: string; label: string }> = [
  { key: "timing", label: "Building edit timing" },
  { key: "captions", label: "Creating captions" },
  { key: "emphasis", label: "Highlighting keywords" },
  { key: "motion", label: "Adding motion" },
  { key: "transitions", label: "Placing transitions" },
  { key: "audio", label: "Sound design" },
  { key: "branding", label: "Applying brand" },
]

export function composeEditForJob(job: StoredGenerationJob, options?: { branding?: Branding; hookText?: string }): { plan: EditPlan; render: StoredRenderJob } {
  if (!readyForEdit(job)) throw new Error("Every scene must be approved before creating the final video.")
  if (!job.brief || !job.settings) throw new Error("This project is missing the creative brief needed to build an edit.")

  const scenes: EditableScene[] = job.scenes
    .filter((scene) => scene.reviewStatus === "APPROVED" && scene.outputUrl)
    .map((scene) => ({
      sceneId: scene.sceneId,
      order: scene.order,
      durationSeconds: scene.durationSeconds,
      purpose: scene.purpose,
      spokenText: scene.spokenText,
      onScreenText: scene.onScreenText,
      transition: scene.transition,
      outputUrl: scene.outputUrl!,
    }))

  const plan = buildEditPlan({ brief: job.brief, settings: job.settings, scenes, hookText: options?.hookText, branding: options?.branding })

  const now = new Date().toISOString()
  const render: StoredRenderJob = {
    id: job.render?.id ?? crypto.randomUUID(),
    status: "READY",
    stage: "Preview ready",
    steps: STEP_LABELS.map((step) => ({ ...step, done: true })),
    approvedSignature: approvedSignature(job.scenes),
    outputUrl: job.render?.outputUrl,
    createdAt: job.render?.createdAt ?? now,
    updatedAt: now,
  }
  return { plan, render }
}

/** True when approved scenes changed since the stored plan was built, so a re-render is needed. */
export function editPlanIsStale(job: StoredGenerationJob): boolean {
  if (!job.editPlan || !job.render) return true
  return job.render.approvedSignature !== approvedSignature(job.scenes)
}
