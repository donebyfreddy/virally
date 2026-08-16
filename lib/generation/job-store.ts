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

type JobState = { jobs: Map<string, StoredGenerationJob>; idempotency: Map<string, string> }
const globalJobs = globalThis as typeof globalThis & { __virallyJobs?: JobState }
const state: JobState = globalJobs.__virallyJobs ?? { jobs: new Map<string, StoredGenerationJob>(), idempotency: new Map<string, string>() }
globalJobs.__virallyJobs = state

export function findJobByIdempotencyKey(key: string) {
  const id = state.idempotency.get(key)
  return id ? state.jobs.get(id) : undefined
}

export function createJob(job: StoredGenerationJob) {
  if (state.idempotency.has(job.idempotencyKey)) throw new Error("Duplicate idempotency key")
  state.jobs.set(job.id, job)
  state.idempotency.set(job.idempotencyKey, job.id)
  return job
}

export function getJob(id: string) { return state.jobs.get(id) }
export function saveJob(job: StoredGenerationJob) { job.updatedAt = new Date().toISOString(); state.jobs.set(job.id, job); return job }

export const JOB_STORE_DURABILITY = "process-memory" as const
