import "server-only"
import { neon } from "@neondatabase/serverless"
import type { GenerationJobStatus, SceneJobStatus } from "./domain"

export type StoredSceneJob = {
  sceneId: string
  modelId: string
  providerModelId: string
  providerRequestId?: string
  status: SceneJobStatus
  outputUrl?: string
  error?: string
}

export type StoredGenerationJob = {
  id: string
  idempotencyKey: string
  status: GenerationJobStatus
  stage: string
  createdAt: string
  updatedAt: string
  estimatedCredits: number
  scenes: StoredSceneJob[]
}

type JobRow = {
  id: string
  idempotency_key: string
  status: GenerationJobStatus
  stage: string
  estimated_credits: number
  scenes: StoredSceneJob[] | string
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
    schemaPromise = sql`
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
    `.then(() => undefined).catch((error) => { schemaPromise = undefined; throw error })
  }
  return schemaPromise
}

function toJob(row: JobRow): StoredGenerationJob {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    stage: row.stage,
    estimatedCredits: row.estimated_credits,
    scenes: typeof row.scenes === "string" ? JSON.parse(row.scenes) as StoredSceneJob[] : row.scenes,
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
    INSERT INTO virally_generation_jobs (id, idempotency_key, status, stage, estimated_credits, scenes, created_at, updated_at)
    VALUES (${job.id}::uuid, ${job.idempotencyKey}, ${job.status}, ${job.stage}, ${job.estimatedCredits}, ${JSON.stringify(job.scenes)}::jsonb, ${job.createdAt}::timestamptz, ${job.updatedAt}::timestamptz)
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
    SET status = ${job.status}, stage = ${job.stage}, estimated_credits = ${job.estimatedCredits}, scenes = ${JSON.stringify(job.scenes)}::jsonb, updated_at = ${updatedAt}::timestamptz
    WHERE id = ${job.id}::uuid
    RETURNING *
  ` as unknown as JobRow[]
  if (!rows[0]) throw new Error("Generation job was not found")
  return toJob(rows[0])
}

export const JOB_STORE_DURABILITY = "neon-postgres" as const
