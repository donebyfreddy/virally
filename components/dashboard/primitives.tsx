'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { platformMeta } from '@/lib/dashboard-data'

/* -------------------------------------------------------------------------- */
/*  useInView - trigger animations when element enters viewport               */
/* -------------------------------------------------------------------------- */
export function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, inView }
}

/* -------------------------------------------------------------------------- */
/*  CountUp - animated number that counts up when in view                     */
/* -------------------------------------------------------------------------- */
export function CountUp({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const { ref, inView } = useInView<HTMLSpanElement>()
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const duration = 1400
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(value * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  Sparkline - tiny inline area chart                                        */
/* -------------------------------------------------------------------------- */
export function Sparkline({
  data,
  color = 'var(--brand)',
  className,
}: {
  data: number[]
  color?: string
  className?: string
}) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 100
  const h = 32
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((d - min) / range) * h
    return `${x},${y}`
  })
  const line = pts.map((p, i) => (i === 0 ? `M${p}` : `L${p}`)).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`
  const id = `spark-${color.replace(/[^a-z]/gi, '')}`

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn('h-8 w-full', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/* -------------------------------------------------------------------------- */
/*  GlassCard - the signature surface                                         */
/* -------------------------------------------------------------------------- */
export function GlassCard({
  children,
  className,
  interactive = false,
}: {
  children: React.ReactNode
  className?: string
  interactive?: boolean
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl',
        'shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_20px_40px_-24px_rgba(0,0,0,0.8)]',
        interactive &&
          'transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-card/80',
        className,
      )}
    >
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  PlatformBadge                                                             */
/* -------------------------------------------------------------------------- */
export function PlatformBadge({
  platform,
  className,
}: {
  platform: string
  className?: string
}) {
  const meta = platformMeta[platform] ?? { label: platform, color: 'var(--brand)' }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-foreground/80',
        className,
      )}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: meta.color, boxShadow: `0 0 8px ${meta.color}` }}
      />
      {meta.label}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  SectionHeading                                                            */
/* -------------------------------------------------------------------------- */
export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  )
}
