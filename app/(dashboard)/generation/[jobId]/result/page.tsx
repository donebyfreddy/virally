import { FinalPreview } from "@/components/final-preview"

export default async function Page({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  return <FinalPreview jobId={jobId} />
}
