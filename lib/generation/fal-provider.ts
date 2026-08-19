import "server-only"
import { fal } from "@fal-ai/client"
import { getModel } from "./model-registry"
import { describeProviderError, ProviderError } from "./provider-error"

export type ProviderSubmission = { providerRequestId: string; modelId: string; providerModelId: string; submittedAt: string }

export interface VideoGenerationProvider {
  submit(input: { modelId: string; providerInput: Record<string, unknown>; webhookUrl?: string; generationMethod?: string }): Promise<ProviderSubmission>
  getStatus(input: { modelId: string; providerRequestId: string; providerModelId?: string }): Promise<unknown>
  getResult(input: { modelId: string; providerRequestId: string; providerModelId?: string }): Promise<unknown>
}

export class FalQueueProvider implements VideoGenerationProvider {
  constructor() {
    const key = process.env.FAL_KEY
    if (!key) throw new Error("FAL_KEY is required on the server")
    fal.config({ credentials: key })
  }

  async submit({ modelId, providerInput, webhookUrl, generationMethod }: { modelId: string; providerInput: Record<string, unknown>; webhookUrl?: string; generationMethod?: string }) {
    const model = getModel(modelId)
    if (!model || model.provider !== "fal") throw new Error(`Cannot submit unsupported fal model: ${modelId}`)
    const providerModelId = generationMethod === "text_to_video" && modelId === "kling-3-pro"
      ? "fal-ai/kling-video/v3/pro/text-to-video"
      : generationMethod === "text_to_video" && modelId === "seedance-2"
        ? "bytedance/seedance-2.0/text-to-video"
        : model.providerModelId
    try {
      const result = await fal.queue.submit(providerModelId, { input: providerInput, webhookUrl })
      return { providerRequestId: result.request_id, modelId, providerModelId, submittedAt: new Date().toISOString() }
    } catch (error) {
      throw new ProviderError(describeProviderError(error))
    }
  }

  async getStatus({ modelId, providerRequestId, providerModelId }: { modelId: string; providerRequestId: string; providerModelId?: string }) {
    const model = getModel(modelId)
    if (!model || model.provider !== "fal") throw new Error(`Cannot query unsupported fal model: ${modelId}`)
    return fal.queue.status(providerModelId ?? model.providerModelId, { requestId: providerRequestId, logs: false })
  }

  async getResult({ modelId, providerRequestId, providerModelId }: { modelId: string; providerRequestId: string; providerModelId?: string }) {
    const model = getModel(modelId)
    if (!model || model.provider !== "fal") throw new Error(`Cannot read unsupported fal model: ${modelId}`)
    return fal.queue.result(providerModelId ?? model.providerModelId, { requestId: providerRequestId })
  }
}
