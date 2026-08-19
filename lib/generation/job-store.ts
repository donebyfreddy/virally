import "server-only"
import { neon } from "@neondatabase/serverless"
import type { CreditLedgerEntry } from "./credits"
import type { CreativeBrief, GenerationJobStatus, GenerationSettings, SceneJobStatus, SceneQaReport, SceneReviewStatus } from "./domain"
import type { EditPlan } from "./edit-engine"
import type { ProviderErrorDetails } from "./provider-error"

export type StoredSceneVersion = {
  version: number
  modelId: string
  providerModelId: string
  providerRequestId?: string
  outputUrl?: string
  prompt?: string
  createdAt: string
  qa?: SceneQaReport
}

export type StoredSceneJob = {
  sceneId: string
  order: number
  durationSeconds: number
  purpose: string
  spokenText: string
  onScreenText: string
  transition: string
  modelId: string
  providerModelId: string
  providerRequestId?: string
  status: SceneJobStatus
  reviewStatus: SceneReviewStatus
  outputUrl?: string
  error?: string
  providerError?: ProviderErrorDetails
  prompt?: string
  currentVersion: number
  versions: StoredSceneVersion[]
  qa?: SceneQaReport
  regenerationKey?: string
}

export type StoredRenderJob = {
  id: string
  status: "PENDING" | "BUILDING" | "READY" | "EXPORTING" | "COMPLETED" | "FAILED"
  stage: string
  steps: Array<{ key: string; label: string; done: boolean }>
  approvedSignature: string
  outputUrl?: string
  error?: string
  createdAt: string
  updatedAt: string
}

export type StoredGenerationJob = {
  id: string
  idempotencyKey: string
  status: GenerationJobStatus
  stage: string
  createdAt: string
  updatedAt: string
  estimatedCredits: number
  brief?: CreativeBrief
  settings?: GenerationSettings
  scenes: StoredSceneJob[]
  editPlan?: EditPlan
  render?: StoredRenderJob
  creditLedger?: CreditLedgerEntry[]
  archived?: boolean
  published?: boolean
}

type JobRow = {
  id: string
  idempotency_key: string
  status: GenerationJobStatus
  stage: string
  estimated_credits: number
  scenes: StoredSceneJob[] | string
  brief: CreativeBrief | string | null
  settings: GenerationSettings | string | null
  edit_plan: EditPlan | string | null
  render_job: StoredRenderJob | string | null
  credit_ledger: CreditLedgerEntry[] | string | null
  archived: boolean | null
  published: boolean | null
  created_at: string | Date
  updated_at: string | Date
}

let schemaPromise: Promise<void> | undefined

function database() {
  const connectionString = process.env.NEON_CONNECTION_STRING
  if (!connectionString) throw new Error("NEON_CONNECTION_STRING is not configured on the server.")
  return neon(connectionString)
}

async function ensureSchema() {
  if (!schemaPromise) {
    const sql = database()
    schemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS virally_generation_jobs (
          id UUID PRIMARY KEY,
          idempotency_key TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL,
          stage TEXT NOT NULL,
          estimated_credits INTEGER NOT NULL,
          scenes JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        )
      `
      // Additive migrations: safe to run repeatedly, never destructive to existing rows.
      await sql`ALTER TABLE virally_generation_jobs ADD COLUMN IF NOT EXISTS brief JSONB`
      await sql`ALTER TABLE virally_generation_jobs ADD COLUMN IF NOT EXISTS settings JSONB`
      await sql`ALTER TABLE virally_generation_jobs ADD COLUMN IF NOT EXISTS edit_plan JSONB`
      await sql`ALTER TABLE virally_generation_jobs ADD COLUMN IF NOT EXISTS render_job JSONB`
      await sql`ALTER TABLE virally_generation_jobs ADD COLUMN IF NOT EXISTS credit_ledger JSONB`
      await sql`ALTER TABLE virally_generation_jobs ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE`
      await sql`ALTER TABLE virally_generation_jobs ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT FALSE`
    })().then(() => undefined).catch((error) => { schemaPromise = undefined; throw error })
  }
  return schemaPromise
}

function parseJson<T>(value: T | string | null | undefined): T | undefined {
  if (value === null || value === undefined) return undefined
  return typeof value === "string" ? JSON.parse(value) as T : value
}

/** Backfills fields that predate scene review so older rows keep working. */
function normalizeScene(scene: StoredSceneJob, index: number): StoredSceneJob {
  const reviewStatus: SceneReviewStatus = scene.reviewStatus
    ?? (scene.status === "APPROVED" ? "APPROVED"
      : scene.status === "FAILED" ? "FAILED"
        : scene.status === "REVIEWING" ? "READY_FOR_REVIEW"
          : scene.status === "REGENERATING" ? "REGENERATING" : "GENERATING")
  const versions = scene.versions && scene.versions.length > 0
    ? scene.versions
    : scene.outputUrl
      ? [{ version: 1, modelId: scene.modelId, providerModelId: scene.providerModelId, providerRequestId: scene.providerRequestId, outputUrl: scene.outputUrl, prompt: scene.prompt, createdAt: new Date().toISOString(), qa: scene.qa }]
      : []
  return {
    ...scene,
    order: scene.order ?? index,
    durationSeconds: scene.durationSeconds ?? 3,
    purpose: scene.purpose ?? "",
    spokenText: scene.spokenText ?? "",
    onScreenText: scene.onScreenText ?? "",
    transition: scene.transition ?? "hard cut",
    reviewStatus,
    currentVersion: scene.currentVersion ?? (versions.at(-1)?.version ?? 0),
    versions,
  }
}

function toJob(row: JobRow): StoredGenerationJob {
  const scenes = (parseJson<StoredSceneJob[]>(row.scenes) ?? []).map(normalizeScene)
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    stage: row.stage,
    estimatedCredits: row.estimated_credits,
    brief: parseJson<CreativeBrief>(row.brief),
    settings: parseJson<GenerationSettings>(row.settings),
    scenes,
    editPlan: parseJson<EditPlan>(row.edit_plan),
    render: parseJson<StoredRenderJob>(row.render_job),
    creditLedger: parseJson<CreditLedgerEntry[]>(row.credit_ledger) ?? [],
    archived: row.archived ?? false,
    published: row.published ?? false,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

export async function findJobByIdempotencyKey(key: string) {
  await ensureSchema()
  const sql = database()
  const rows = await sql`SELECT * FROM virally_generation_jobs WHERE idempotency_key = ${key} LIMIT 1` as unknown as JobRow[]
  return rows[0] ? toJob(rows[0]) : undefined
}

export async function createJob(job: StoredGenerationJob) {
  await ensureSchema()
  const sql = database()
  const rows = await sql`
    INSERT INTO virally_generation_jobs (id, idempotency_key, status, stage, estimated_credits, scenes, brief, settings, edit_plan, render_job, credit_ledger, archived, published, created_at, updated_at)
    VALUES (${job.id}::uuid, ${job.idempotencyKey}, ${job.status}, ${job.stage}, ${job.estimatedCredits}, ${JSON.stringify(job.scenes)}::jsonb, ${job.brief ? JSON.stringify(job.brief) : null}::jsonb, ${job.settings ? JSON.stringify(job.settings) : null}::jsonb, ${job.editPlan ? JSON.stringify(job.editPlan) : null}::jsonb, ${job.render ? JSON.stringify(job.render) : null}::jsonb, ${JSON.stringify(job.creditLedger ?? [])}::jsonb, ${job.archived ?? false}, ${job.published ?? false}, ${job.createdAt}::timestamptz, ${job.updatedAt}::timestamptz)
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING *
  ` as unknown as JobRow[]
  if (!rows[0]) throw new Error("Duplicate idempotency key")
  return toJob(rows[0])
}

export async function getJob(id: string) {
  await ensureSchema()
  const sql = database()
  const rows = await sql`SELECT * FROM virally_generation_jobs WHERE id = ${id}::uuid LIMIT 1` as unknown as JobRow[]
  return rows[0] ? toJob(rows[0]) : undefined
}

export async function saveJob(job: StoredGenerationJob) {
  await ensureSchema()
  const sql = database()
  const updatedAt = new Date().toISOString()
  const rows = await sql`
    UPDATE virally_generation_jobs
    SET status = ${job.status}, stage = ${job.stage}, estimated_credits = ${job.estimatedCredits}, scenes = ${JSON.stringify(job.scenes)}::jsonb, brief = ${job.brief ? JSON.stringify(job.brief) : null}::jsonb, settings = ${job.settings ? JSON.stringify(job.settings) : null}::jsonb, edit_plan = ${job.editPlan ? JSON.stringify(job.editPlan) : null}::jsonb, render_job = ${job.render ? JSON.stringify(job.render) : null}::jsonb, credit_ledger = ${JSON.stringify(job.creditLedger ?? [])}::jsonb, archived = ${job.archived ?? false}, published = ${job.published ?? false}, updated_at = ${updatedAt}::timestamptz
    WHERE id = ${job.id}::uuid
    RETURNING *
  ` as unknown as JobRow[]
  if (!rows[0]) throw new Error("Generation job was not found")
  return toJob(rows[0])
}

/** Lists every generation job (the Content Library), newest first. */
export async function listJobs(limit = 100): Promise<StoredGenerationJob[]> {
  await ensureSchema()
  const sql = database()
  const rows = await sql`SELECT * FROM virally_generation_jobs ORDER BY created_at DESC LIMIT ${limit}` as unknown as JobRow[]
  return rows.map(toJob)
}

export async function deleteJob(id: string): Promise<boolean> {
  await ensureSchema()
  const sql = database()
  const rows = await sql`DELETE FROM virally_generation_jobs WHERE id = ${id}::uuid RETURNING id` as unknown as Array<{ id: string }>
  return rows.length > 0
}

export const JOB_STORE_DURABILITY = "neon-postgres" as const
