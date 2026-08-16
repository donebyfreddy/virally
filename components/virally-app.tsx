"use client"

import { useRouter } from "next/navigation"
import { Hero } from "@/components/hero"

export function VirallyApp() {
  const router = useRouter()
  return <Hero onStartCreating={() => router.push("/ai-studio?new=true")} />
}
