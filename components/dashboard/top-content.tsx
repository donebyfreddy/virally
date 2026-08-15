'use client'

import Image from 'next/image'
import { Copy, Eye, Heart, Play, Repeat2, Share2, Sparkles } from 'lucide-react'
import { topContent } from '@/lib/dashboard-data'
import { GlassCard, PlatformBadge, SectionHeading } from './primitives'

export function TopContent() {
  return (
    <section>
      <SectionHeading
        title="Top performers"
        subtitle="Your best content this month"
        action={
          <button className="text-sm font-medium text-brand hover:underline">
            See all
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {topContent.map((c) => (
          <GlassCard key={c.id} interactive className="group flex flex-col p-3">
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
              <Image
                src={c.thumb}
                alt={c.title}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute left-2 top-2">
                <PlatformBadge platform={c.platform} />
              </div>
              <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                <Eye className="size-3" /> {c.views}
              </div>
              <button
                className="absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full bg-white/90 text-black opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Preview"
              >
                <Play className="size-4 fill-current" />
              </button>
            </div>

            <p className="mt-3 line-clamp-2 text-sm font-medium text-foreground text-pretty">
              {c.title}
            </p>

            <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Heart className="size-3 text-brand" /> {c.engagement}
              </span>
              <span className="inline-flex items-center gap-1">
                <Share2 className="size-3 text-accent-2" /> {c.shares}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-1.5 border-t border-white/8 pt-3">
              <button className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand/12 py-1.5 text-[11px] font-semibold text-brand transition-colors hover:bg-brand/20">
                <Sparkles className="size-3" /> Variants
              </button>
              <button
                className="flex size-7 items-center justify-center rounded-lg bg-white/8 text-muted-foreground transition-colors hover:bg-white/12 hover:text-foreground"
                aria-label="Repurpose"
              >
                <Repeat2 className="size-3.5" />
              </button>
              <button
                className="flex size-7 items-center justify-center rounded-lg bg-white/8 text-muted-foreground transition-colors hover:bg-white/12 hover:text-foreground"
                aria-label="Duplicate"
              >
                <Copy className="size-3.5" />
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  )
}
