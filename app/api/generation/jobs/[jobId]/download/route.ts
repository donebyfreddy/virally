import JSZip from "jszip"
import { NextResponse } from "next/server"
import { getJob } from "@/lib/generation/job-store"

export const runtime = "nodejs"

const permittedAssetHosts = ["fal.media", "fal.ai", "storage.googleapis.com", "googleusercontent.com"]

function isPermittedAssetUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && permittedAssetHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
  } catch {
    return false
  }
}

function extensionFor(contentType: string | null) {
  if (contentType?.includes("webm")) return "webm"
  if (contentType?.includes("png")) return "png"
  if (contentType?.includes("jpeg")) return "jpg"
  if (contentType?.includes("gif")) return "gif"
  return "mp4"
}

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const job = await getJob(jobId)
  if (!job) return NextResponse.json({ error: "Generation job was not found." }, { status: 404 })

  const assets = job.scenes
    .map((scene, index) => ({ index, url: scene.outputUrl }))
    .filter((asset): asset is { index: number; url: string } => Boolean(asset.url && isPermittedAssetUrl(asset.url)))
  if (!assets.length) return NextResponse.json({ error: "No generated assets are available to download yet." }, { status: 422 })

  try {
    const zip = new JSZip()
    await Promise.all(assets.map(async ({ index, url }) => {
      const asset = await fetch(url)
      if (!asset.ok) throw new Error(`Unable to retrieve scene ${index + 1}.`)
      zip.file(`virally-scene-${String(index + 1).padStart(2, "0")}.${extensionFor(asset.headers.get("content-type"))}`, await asset.arrayBuffer())
    }))
    const archive = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" })
    return new Response(archive, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="virally-${job.id}-assets.zip"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to prepare the asset download." }, { status: 502 })
  }
}
