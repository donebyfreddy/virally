import "server-only"
import { fal } from "@fal-ai/client"
import { getModel } from "./model-registry"

export type ProviderSubmission = { providerRequestId: string; modelId: string; submittedAt: string }

export interface VideoGenerationProvider {
  submit(input: { modelId: string; providerInput: Record<string, unknown>; webhookUrl: string }): Promise<ProviderSubmission>
  getStatus(input: { modelId: string; providerRequestId: string }): Promise<unknown>
  getResult(input: { modelId: string; providerRequestId: string }): Promise<unknown>
}

export class FalQueueProvider implements VideoGenerationProvider {
  constructor() {
    const key = process.env.FAL_KEY
    if (!key) throw new Error("FAL_KEY is required on the server")
    fal.config({ credentials: key })
  }

  async submit({ modelId, providerInput, webhookUrl }: { modelId: string; providerInput: Record<string, unknown>; webhookUrl: string }) {
    const model = getModel(modelId)
    if (!model || model.provider !== "fal") throw new Error(`Cannot submit unsupported fal model: ${modelId}`)
    const result = await fal.queue.submit(model.providerModelId, { input: providerInput, webhookUrl })
    return { providerRequestId: result.request_id, modelId, submittedAt: new Date().toISOString() }
  }

  async getStatus({ modelId, providerRequestId }: { modelId: string; providerRequestId: string }) {
    const model = getModel(modelId)
    if (!model || model.provider !== "fal") throw new Error(`Cannot query unsupported fal model: ${modelId}`)
    return fal.queue.status(model.providerModelId, { requestId: providerRequestId, logs: false })
  }

  async getResult({ modelId, providerRequestId }: { modelId: string; providerRequestId: string }) {
    const model = getModel(modelId)
    if (!model || model.provider !== "fal") throw new Error(`Cannot read unsupported fal model: ${modelId}`)
    return fal.queue.result(model.providerModelId, { requestId: providerRequestId })
  }
}
