import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { planRequestSchema } from "@/lib/generation/domain"
import { estimateGeneration, validateStoryboardTiming } from "@/lib/generation/engine"

export async function POST(request: Request) {
  try {
    const input = planRequestSchema.parse(await request.json())
    return NextResponse.json({ estimate: estimateGeneration(input), timing: validateStoryboardTiming(input) })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid generation plan", issues: error.issues }, { status: 400 })
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to estimate generation" }, { status: 422 })
  }
}
