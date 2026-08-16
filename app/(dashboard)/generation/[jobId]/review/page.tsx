import { SceneReview } from "@/components/scene-review"

export default async function Page({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  return <SceneReview jobId={jobId} />
}
