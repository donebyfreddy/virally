'use client'

import { CheckCircle2, Clock, Eye, Loader2, PenLine, Send } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { pipeline, pipelineStages, type PipelineStage } from '@/lib/dashboard-data'
import { PlatformBadge, SectionHeading } from './primitives'

const stageMeta: Record<
  PipelineStage,
  { icon: LucideIcon; color: string }
> = {
  Drafting: { icon: PenLine, color: 'var(--muted-foreground)' },
  Generating: { icon: Loader2, color: 'var(--accent-2)' },
  Review: { icon: Eye, color: 'var(--glow)' },
  Scheduled: { icon: Clock, color: 'oklch(0.7 0.14 230)' },
  Published: { icon: CheckCircle2, color: 'oklch(0.72 0.17 155)' },
}

export function ContentPipeline() {
  return (
    <section>
      <SectionHeading
        title="Content pipeline"
        subtitle="Everything in flight, from idea to published"
        action={
          <button className="flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            <Send className="size-3.5" /> Publish queue
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {pipelineStages.map(({ stage, hint }) => {
          const items = pipeline.filter((p) => p.stage === stage)
          const meta = stageMeta[stage]
          return (
            <div
              key={stage}
              className="flex flex-col rounded-2xl border border-white/8 bg-white/[0.03] p-3"
            >
              <div className="mb-3 flex items-center gap-2">
                <meta.icon
                  className={
                    'size-4' + (stage === 'Generating' ? ' animate-spin-slow' : '')
                  }
                  style={{ color: meta.color }}
                />
                <span className="text-sm font-semibold text-foreground">
                  {stage}
                </span>
                <span className="ml-auto rounded-md bg-white/8 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {items.length}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-2">
                {items.length === 0 && (
                  <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-[11px] text-muted-foreground">
                    {hint}
                  </p>
                )}
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="group cursor-pointer rounded-xl border border-white/8 bg-card/70 p-3 transition-all hover:-translate-y-0.5 hover:border-white/20"
                  >
                    <p className="line-clamp-2 text-xs font-medium text-foreground text-pretty">
                      {item.title}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <PlatformBadge platform={item.platform} />
                      <span className="text-[10px] text-muted-foreground">
                        {item.type}
                      </span>
                    </div>
                    <p
                      className="mt-2 text-[10px] font-medium"
                      style={{ color: meta.color }}
                    >
                      {item.meta}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
