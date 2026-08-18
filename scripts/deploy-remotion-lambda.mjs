// Deploys the Remotion Lambda render backend: an S3 site bundle + a render
// function. Run once (and again after changing the composition) with AWS creds
// in the environment, then copy the printed env vars into .env.local / Vercel.
//
//   REMOTION_AWS_ACCESS_KEY_ID=... REMOTION_AWS_SECRET_ACCESS_KEY=... \
//   REMOTION_AWS_REGION=us-east-1 node scripts/deploy-remotion-lambda.mjs
//
// Prereqs: an AWS account with the Remotion Lambda IAM policy attached.
// Docs: https://www.remotion.dev/docs/lambda/setup

import path from "node:path"
import { deployFunction, deploySite, getOrCreateBucket } from "@remotion/lambda"

const region = process.env.REMOTION_AWS_REGION ?? "us-east-1"
const siteName = process.env.REMOTION_SITE_NAME ?? "virally-viral-video"
const entryPoint = path.resolve(process.cwd(), "remotion/index.ts")

async function main() {
  console.log(`▶ Deploying Remotion Lambda in ${region}…`)

  const { functionName, alreadyExisted: fnExisted } = await deployFunction({
    region,
    timeoutInSeconds: 240,
    memorySizeInMb: 3009,
    diskSizeInMb: 10240,
    createCloudWatchLogGroup: true,
  })
  console.log(`✓ Function: ${functionName}${fnExisted ? " (existing)" : ""}`)

  const { bucketName } = await getOrCreateBucket({ region })
  console.log(`✓ Bucket: ${bucketName}`)

  const { serveUrl } = await deploySite({
    entryPoint,
    bucketName,
    region,
    siteName,
    options: { onBundleProgress: (p) => process.stdout.write(`\r  bundling ${p}%   `) },
  })
  console.log(`\n✓ Site: ${serveUrl}`)

  console.log("\nAdd these to .env.local (and your Vercel project):\n")
  console.log(`REMOTION_AWS_REGION="${region}"`)
  console.log(`REMOTION_LAMBDA_FUNCTION_NAME="${functionName}"`)
  console.log(`REMOTION_SERVE_URL="${serveUrl}"`)
  console.log(`# plus REMOTION_AWS_ACCESS_KEY_ID / REMOTION_AWS_SECRET_ACCESS_KEY`)
}

main().catch((error) => {
  console.error("\n✗ Deploy failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
