const PARTICLES = [
  { left: "8%", top: "18%", size: 6, delay: "0s", dur: "7s", color: "brand" },
  { left: "22%", top: "62%", size: 4, delay: "1.2s", dur: "9s", color: "glow" },
  { left: "37%", top: "28%", size: 3, delay: "2s", dur: "6s", color: "accent-2" },
  { left: "48%", top: "72%", size: 5, delay: "0.6s", dur: "8s", color: "brand" },
  { left: "63%", top: "22%", size: 4, delay: "1.8s", dur: "7.5s", color: "glow" },
  { left: "74%", top: "58%", size: 6, delay: "0.3s", dur: "9.5s", color: "accent-2" },
  { left: "88%", top: "32%", size: 3, delay: "2.4s", dur: "6.5s", color: "brand" },
  { left: "15%", top: "82%", size: 4, delay: "1s", dur: "8.5s", color: "glow" },
  { left: "55%", top: "12%", size: 3, delay: "2.8s", dur: "7s", color: "accent-2" },
  { left: "82%", top: "78%", size: 5, delay: "0.9s", dur: "9s", color: "brand" },
  { left: "30%", top: "45%", size: 3, delay: "1.6s", dur: "6.8s", color: "glow" },
  { left: "68%", top: "42%", size: 4, delay: "2.2s", dur: "8.2s", color: "accent-2" },
] as const

const colorMap: Record<string, string> = {
  brand: "var(--brand)",
  glow: "var(--glow)",
  "accent-2": "var(--accent-2)",
}

export function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Glow orbs */}
      <div
        className="absolute -left-32 -top-40 h-[36rem] w-[36rem] rounded-full blur-[120px] animate-pulse-glow"
        style={{ background: "radial-gradient(circle, var(--brand), transparent 70%)", opacity: 0.4 }}
      />
      <div
        className="absolute -right-40 top-10 h-[34rem] w-[34rem] rounded-full blur-[130px] animate-pulse-glow"
        style={{
          background: "radial-gradient(circle, var(--accent-2), transparent 70%)",
          opacity: 0.35,
          animationDelay: "1.5s",
        }}
      />
      <div
        className="absolute bottom-[-12rem] left-1/2 h-[30rem] w-[42rem] -translate-x-1/2 rounded-full blur-[140px] animate-pulse-glow"
        style={{
          background: "radial-gradient(circle, var(--glow), transparent 70%)",
          opacity: 0.22,
          animationDelay: "0.8s",
        }}
      />

      {/* Grid */}
      <div className="absolute inset-0 bg-grid" />

      {/* Particles */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full animate-float-slow"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: colorMap[p.color],
            boxShadow: `0 0 12px ${colorMap[p.color]}`,
            animationDelay: p.delay,
            animationDuration: p.dur,
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  )
}
