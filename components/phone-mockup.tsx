import { Heart, MessageCircle, Music2, Play, Share2 } from "lucide-react"

export function PhoneMockup() {
  return (
    <div className="relative w-[248px] sm:w-[272px]">
      {/* Phone frame */}
      <div className="relative rounded-[2.6rem] border border-white/15 bg-black p-2 shadow-2xl shadow-brand/20 ring-1 ring-white/5">
        <div className="relative aspect-[9/19] overflow-hidden rounded-[2.1rem] bg-secondary">
          {/* Preview media */}
          <img
            src="/creator-preview.png"
            alt="Content creator recording a short-form video preview inside the Virally app"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

          {/* Notch */}
          <div className="absolute left-1/2 top-2 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />

          {/* Play button */}
          <button
            type="button"
            aria-label="Play preview"
            className="absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/30 animate-pulse-glow"
          >
            <Play className="h-6 w-6 translate-x-0.5 fill-white text-white" />
          </button>

          {/* Right action rail */}
          <div className="absolute bottom-24 right-3 z-10 flex flex-col items-center gap-4 text-white">
            <div className="flex flex-col items-center gap-1">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                <Heart className="h-5 w-5 fill-primary text-primary" />
              </span>
              <span className="text-[11px] font-medium">248K</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                <MessageCircle className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-medium">12.4K</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                <Share2 className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-medium">9.1K</span>
            </div>
          </div>

          {/* Caption */}
          <div className="absolute bottom-4 left-3 right-14 z-10 text-white">
            <p className="text-[13px] font-semibold leading-tight text-balance">
              This hook made me go viral in 3 hours 🚀
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/75">
              <Music2 className="h-3 w-3" />
              Trending audio · Virally
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
