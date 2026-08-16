import { GenerationStatus } from "@/components/generation-status"

export default async function Page({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  return <GenerationStatus jobId={jobId} />
}
