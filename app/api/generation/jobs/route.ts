import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { planRequestSchema } from "@/lib/generation/domain"
import { createGenerationPlan } from "@/lib/generation/engine"
import { FalQueueProvider } from "@/lib/generation/fal-provider"
import { createJob, findJobByIdempotencyKey, JOB_STORE_DURABILITY, saveJob, type StoredGenerationJob } from "@/lib/generation/job-store"

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === "production" && process.env.VIRALLY_ALLOW_ANONYMOUS_GENERATION !== "true") {
      return NextResponse.json({ error: "Live generation is locked until authentication and a durable credit ledger are configured." }, { status: 503 })
    }
    if (!process.env.FAL_KEY) return NextResponse.json({ error: "FAL_KEY is not configured on the server." }, { status: 503 })
    const idempotencyKey = request.headers.get("Idempotency-Key")
    if (!idempotencyKey || idempotencyKey.length < 16) return NextResponse.json({ error: "A valid Idempotency-Key header is required." }, { status: 400 })
    const existing = findJobByIdempotencyKey(idempotencyKey)
    if (existing) return NextResponse.json({ job: existing, duplicate: true })

    const input = planRequestSchema.parse(await request.json())
    const plan = createGenerationPlan(input)
    const now = new Date().toISOString()
    const job: StoredGenerationJob = createJob({
      id: crypto.randomUUID(), idempotencyKey, status: "QUEUED", stage: "Planning generation", createdAt: now, updatedAt: now,
      estimatedCredits: plan.estimate.credits,
      scenes: plan.scenes.map((scene) => ({ sceneId: scene.sceneId, modelId: scene.modelId, providerModelId: scene.providerModelId, status: scene.modelId === "virally-motion" ? "APPROVED" : "PENDING" })),
    })
    const provider = new FalQueueProvider()
    for (const plannedScene of plan.scenes) {
      const storedScene = job.scenes.find(({ sceneId }) => sceneId === plannedScene.sceneId)!
      if (plannedScene.modelId === "virally-motion") continue
      const scene = input.scenes.find(({ id }) => id === plannedScene.sceneId)!
      try {
        const providerInput: Record<string, unknown> = { prompt: plannedScene.prompt, duration: String(scene.durationSeconds), aspect_ratio: input.settings.aspectRatio, generate_audio: input.settings.audio === "native" }
        if (scene.referenceUrls[0]) providerInput.start_image_url = scene.referenceUrls[0]
        const submission = await provider.submit({ modelId: plannedScene.modelId, generationMethod: scene.generationMethod, providerInput })
        storedScene.providerRequestId = submission.providerRequestId
        storedScene.providerModelId = submission.providerModelId
        storedScene.status = "QUEUED"
      } catch (error) {
        storedScene.status = "FAILED"
        storedScene.error = error instanceof Error ? error.message : "Provider submission failed"
      }
    }
    job.status = job.scenes.some(({ status }) => status === "FAILED") ? "FAILED" : "GENERATING_VIDEO"
    job.stage = job.status === "FAILED" ? "A scene failed during provider submission" : "Generating scenes"
    saveJob(job)
    return NextResponse.json({ job, durability: JOB_STORE_DURABILITY }, { status: 202 })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid generation request", issues: error.issues }, { status: 400 })
    return NextResponse.json({ error: error instanceof Error ? error.message : "Generation submission failed" }, { status: 422 })
  }
}
