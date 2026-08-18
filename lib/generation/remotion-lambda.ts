import "server-only"
import type { EditPlan } from "./edit-engine"

/**
 * Concrete render backend: Remotion Lambda. Renders the "ViralVideo" composition
 * on AWS Lambda with the job's EditPlan as inputProps and returns the S3 MP4 URL.
 *
 * Requires a deployed site + function (see scripts/deploy-remotion-lambda.mjs) and:
 *   REMOTION_AWS_REGION, REMOTION_LAMBDA_FUNCTION_NAME, REMOTION_SERVE_URL,
 *   REMOTION_AWS_ACCESS_KEY_ID, REMOTION_AWS_SECRET_ACCESS_KEY
 *
 * `@remotion/lambda` is imported dynamically so it never enters the client bundle
 * and is only loaded when Lambda rendering is actually configured.
 */

export function isLambdaConfigured(): boolean {
  return Boolean(
    process.env.REMOTION_AWS_REGION &&
    process.env.REMOTION_LAMBDA_FUNCTION_NAME &&
    process.env.REMOTION_SERVE_URL &&
    (process.env.REMOTION_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID),
  )
}

const sleep = (ms: number) => new Promise((resolve) => { setTimeout(resolve, ms) })

export async function exportViaLambda(input: { jobId: string; plan: EditPlan }): Promise<{ status: "COMPLETED" | "FAILED"; outputUrl?: string; error?: string }> {
  const { renderMediaOnLambda, getRenderProgress } = await import("@remotion/lambda/client")
  const region = process.env.REMOTION_AWS_REGION as Parameters<typeof renderMediaOnLambda>[0]["region"]
  const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME!
  const serveUrl = process.env.REMOTION_SERVE_URL!

  const { renderId, bucketName } = await renderMediaOnLambda({
    region,
    functionName,
    serveUrl,
    composition: "ViralVideo",
    inputProps: { plan: input.plan },
    codec: "h264",
    imageFormat: "jpeg",
    privacy: "public",
    downloadBehavior: { type: "download", fileName: `virally-${input.jobId}.mp4` },
    maxRetries: 1,
  })

  // Poll to completion. Route sets maxDuration=300s; short-form clips finish well within it.
  const deadline = Date.now() + 280_000
  while (Date.now() < deadline) {
    const progress = await getRenderProgress({ renderId, bucketName, functionName, region })
    if (progress.fatalErrorEncountered) return { status: "FAILED", error: progress.errors?.[0]?.message ?? "Remotion Lambda render failed." }
    if (progress.done) return { status: "COMPLETED", outputUrl: progress.outputFile ?? undefined }
    await sleep(3_000)
  }
  return { status: "FAILED", error: "Render is taking longer than expected. Retry export in a moment." }
}
