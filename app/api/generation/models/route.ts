import { NextResponse } from "next/server"
import { listAvailableModels } from "@/lib/generation/model-registry"

export function GET() {
  return NextResponse.json({ models: listAvailableModels().map((model) => ({
    id: model.id,
    label: model.label,
    provider: model.provider,
    type: model.type,
    modes: model.modes,
    resolutions: model.resolutions,
    aspectRatios: model.aspectRatios,
    duration: model.duration,
    audio: model.audio,
    referenceImages: model.referenceImages,
    referenceVideos: model.referenceVideos,
    qualityTier: model.qualityTier,
    status: model.status,
  })) })
}
