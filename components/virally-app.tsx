"use client"

import { useState } from "react"
import { Hero } from "@/components/hero"
import { StudioWorkspace } from "@/components/studio-workspace"

export function VirallyApp() {
  const [showStudio, setShowStudio] = useState(false)

  if (showStudio) return <StudioWorkspace />

  return <Hero onStartCreating={() => setShowStudio(true)} />
}
