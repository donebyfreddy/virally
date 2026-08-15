"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowRight, PlayCircle, Sparkles, TrendingUp, Wand2, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HeroBackground } from "@/components/hero-background"
import { PhoneMockup } from "@/components/phone-mockup"

export function Hero() {
  const stageRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (window.matchMedia("(pointer: coarse)").matches) return

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      setOffset({ x, y })
    }
    el.addEventListener("mousemove", onMove)
    el.addEventListener("mouseleave", () => setOffset({ x: 0, y: 0 }))
    return () => el.removeEventListener("mousemove", onMove)
  }, [])

  const parallax = (depth: number) => ({
    transform: `translate3d(${offset.x * depth}px, ${offset.y * depth}px, 0)`,
  })

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      <HeroBackground />

      {/* Nav */}
      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
        <a href="#" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-accent-2 shadow-lg shadow-brand/40">
            <Zap className="h-4.5 w-4.5 fill-white text-white" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">Virally</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#" className="transition-colors hover:text-foreground">Features</a>
          <a href="#" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#" className="transition-colors hover:text-foreground">Pricing</a>
        </nav>
        <Button asChild size="sm" className="rounded-full bg-foreground text-background hover:bg-foreground/90">
          <Link href="/dashboard">Start free</Link>
        </Button>
      </header>

      {/* Content */}
      <div
        ref={stageRef}
        className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 pb-24 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:pt-16"
      >
        {/* Left copy */}
        <div className="flex flex-col items-start">
          <div
            className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur"
            style={{ animationDelay: "0.05s" }}
          >
            <span className="flex h-1.5 w-1.5 rounded-full bg-glow shadow-[0_0_8px_var(--glow)]" />
            AI content engine for creators &amp; brands
          </div>

          <h1
            className="animate-fade-up mt-6 font-display text-5xl font-bold leading-[0.98] tracking-tight text-balance sm:text-6xl lg:text-7xl"
            style={{ animationDelay: "0.12s" }}
          >
            Turn any idea into <span className="text-gradient animate-shimmer">viral content</span>.
          </h1>

          <p
            className="animate-fade-up mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty"
            style={{ animationDelay: "0.2s" }}
          >
            Virally generates scroll-stopping hooks, scripts and posts for TikTok, Reels and Shorts in
            seconds. Go from raw idea to ready-to-post content and grow faster than ever.
          </p>

          <div
            className="animate-fade-up mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            style={{ animationDelay: "0.28s" }}
          >
            <Button
              asChild
              size="lg"
              className="group h-12 rounded-full bg-gradient-to-r from-brand to-accent-2 px-7 text-base font-semibold text-white shadow-lg shadow-brand/30 transition-transform hover:scale-[1.03] hover:from-brand hover:to-accent-2"
            >
              <Link href="/dashboard">
                Start creating
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="group h-12 rounded-full border border-white/15 bg-white/5 px-6 text-base font-medium backdrop-blur hover:bg-white/10"
            >
              <PlayCircle className="mr-1.5 h-5 w-5" />
              See how it works
            </Button>
          </div>

          {/* Trust stats */}
          <div
            className="animate-fade-up mt-12 flex items-center gap-8"
            style={{ animationDelay: "0.36s" }}
          >
            <div>
              <p className="font-display text-2xl font-bold">2.4M+</p>
              <p className="text-xs text-muted-foreground">Posts generated</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="font-display text-2xl font-bold">78K+</p>
              <p className="text-xs text-muted-foreground">Active creators</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="font-display text-2xl font-bold">12x</p>
              <p className="text-xs text-muted-foreground">Faster output</p>
            </div>
          </div>
        </div>

        {/* Right visual */}
        <div className="relative flex min-h-[520px] items-center justify-center">
          {/* Phone */}
          <div
            className="animate-fade-up relative animate-float"
            style={{ animationDelay: "0.3s", ...parallax(14) }}
          >
            <PhoneMockup />
          </div>

          {/* Floating: Viral score */}
          <div
            className="animate-fade-up absolute -left-2 top-6 animate-float sm:left-0"
            style={{ animationDelay: "0.5s", animationDuration: "7s", ...parallax(30) }}
          >
            <div className="w-40 rounded-2xl border border-white/10 bg-card/80 p-4 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-glow" />
                Viral score
              </div>
              <p className="mt-1 font-display text-3xl font-bold text-gradient">98</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-brand to-glow" />
              </div>
            </div>
          </div>

          {/* Floating: Hook generator */}
          <div
            className="animate-fade-up absolute -right-2 top-24 animate-float sm:right-0"
            style={{ animationDelay: "0.65s", animationDuration: "8.5s", ...parallax(24) }}
          >
            <div className="w-52 rounded-2xl border border-white/10 bg-card/80 p-4 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-brand to-accent-2">
                  <Wand2 className="h-3.5 w-3.5 text-white" />
                </span>
                Hook generated
              </div>
              <p className="mt-2 text-sm leading-snug text-pretty">
                &ldquo;Stop scrolling — this changes everything about how you post.&rdquo;
              </p>
            </div>
          </div>

          {/* Floating: Reach badge */}
          <div
            className="animate-fade-up absolute bottom-10 -left-4 animate-float sm:left-2"
            style={{ animationDelay: "0.8s", animationDuration: "6.5s", ...parallax(36) }}
          >
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-card/80 p-3 pr-4 shadow-xl backdrop-blur-md">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-glow/15">
                <Sparkles className="h-4.5 w-4.5 text-glow" />
              </span>
              <div>
                <p className="font-display text-sm font-bold text-glow">+248%</p>
                <p className="text-[11px] text-muted-foreground">Reach this week</p>
              </div>
            </div>
          </div>

          {/* Floating: platform chips */}
          <div
            className="animate-fade-up absolute right-1 bottom-16 flex flex-col gap-2 lg:right-0"
            style={{ animationDelay: "0.95s", ...parallax(20) }}
          >
            {["TikTok", "Reels", "Shorts"].map((p, i) => (
              <span
                key={p}
                className="animate-float rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium backdrop-blur"
                style={{ animationDelay: `${i * 0.4}s`, animationDuration: "7s" }}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Logo marquee */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-14">
        <p className="mb-6 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Trusted by fast-growing creators &amp; brands
        </p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="flex w-max animate-marquee items-center gap-14 pr-14">
            {[...BRANDS, ...BRANDS].map((b, i) => (
              <span
                key={i}
                className="font-display text-lg font-semibold text-muted-foreground/70 whitespace-nowrap"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

const BRANDS = ["NovaMedia", "PulseLabs", "Creatorly", "Hypewave", "Studio9", "Boldcast", "Trendly"]
