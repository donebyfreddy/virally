import type { LucideIcon } from 'lucide-react'
import {
  Eye,
  Film,
  Flame,
  Heart,
  Clapperboard,
  Send,
  TrendingUp,
  Users,
} from 'lucide-react'

export type Trend = 'up' | 'down'

export interface Kpi {
  id: string
  label: string
  value: number
  display: string
  suffix?: string
  prefix?: string
  delta: string
  trend: Trend
  caption: string
  icon: LucideIcon
  spark: number[]
}

export const kpis: Kpi[] = [
  {
    id: 'views',
    label: 'Total views',
    value: 2400000,
    display: '2.4',
    suffix: 'M',
    delta: '+32.8%',
    trend: 'up',
    caption: 'vs. last 30 days',
    icon: Eye,
    spark: [12, 18, 15, 22, 30, 28, 44, 52, 60],
  },
  {
    id: 'content',
    label: 'Content generated',
    value: 148,
    display: '148',
    delta: '+24',
    trend: 'up',
    caption: 'this week',
    icon: Film,
    spark: [4, 6, 5, 9, 8, 12, 14, 18, 24],
  },
  {
    id: 'engagement',
    label: 'Engagement rate',
    value: 8.6,
    display: '8.6',
    suffix: '%',
    delta: '+1.4pt',
    trend: 'up',
    caption: 'avg across platforms',
    icon: Heart,
    spark: [5, 5.5, 6, 5.8, 6.4, 7, 7.6, 8.1, 8.6],
  },
  {
    id: 'published',
    label: 'Published',
    value: 36,
    display: '36',
    delta: '+9',
    trend: 'up',
    caption: 'posts this week',
    icon: Send,
    spark: [2, 3, 4, 4, 6, 7, 8, 9, 12],
  },
  {
    id: 'watch',
    label: 'Avg watch time',
    value: 11.2,
    display: '11.2',
    suffix: 's',
    delta: '-0.6s',
    trend: 'down',
    caption: 'first 3s retention 68%',
    icon: Clapperboard,
    spark: [14, 13, 13.5, 12.8, 12, 11.9, 11.5, 11.4, 11.2],
  },
  {
    id: 'followers',
    label: 'New followers',
    value: 18400,
    display: '18.4',
    suffix: 'K',
    delta: '+41.2%',
    trend: 'up',
    caption: 'net growth this month',
    icon: Users,
    spark: [8, 10, 9, 14, 16, 20, 24, 30, 38],
  },
]

export type Platform = 'TikTok' | 'Reels' | 'Shorts' | 'LinkedIn'

export interface Campaign {
  id: string
  name: string
  platforms: Platform[]
  status: 'active' | 'scheduled' | 'draft'
  pieces: number
  goal: string
  performance: string
  trend: Trend
  progress: number
  lastActivity: string
  nextAction: string
  accent: string
}

export const campaigns: Campaign[] = [
  {
    id: 'c1',
    name: 'Fitness Coach Launch',
    platforms: ['TikTok', 'Reels'],
    status: 'active',
    pieces: 12,
    goal: 'Leads',
    performance: '+18% above avg',
    trend: 'up',
    progress: 74,
    lastActivity: '2h ago',
    nextAction: 'Generate 3 hook variants',
    accent: 'var(--brand)',
  },
  {
    id: 'c2',
    name: 'SaaS Demo Series',
    platforms: ['Shorts', 'LinkedIn'],
    status: 'active',
    pieces: 8,
    goal: 'Sign ups',
    performance: '+9% above avg',
    trend: 'up',
    progress: 52,
    lastActivity: '5h ago',
    nextAction: 'Review 2 pending scripts',
    accent: 'var(--accent-2)',
  },
  {
    id: 'c3',
    name: 'Skincare UGC Drop',
    platforms: ['TikTok', 'Reels'],
    status: 'scheduled',
    pieces: 15,
    goal: 'Sales',
    performance: 'Launches Fri',
    trend: 'up',
    progress: 90,
    lastActivity: '1d ago',
    nextAction: 'Confirm posting schedule',
    accent: 'var(--glow)',
  },
]

export type PipelineStage =
  | 'Drafting'
  | 'Generating'
  | 'Review'
  | 'Scheduled'
  | 'Published'

export interface PipelineItem {
  id: string
  title: string
  platform: Platform
  type: string
  stage: PipelineStage
  meta: string
}

export const pipeline: PipelineItem[] = [
  { id: 'p1', title: 'POV: your first 10k followers', platform: 'TikTok', type: 'Hook pack', stage: 'Drafting', meta: '6 hooks' },
  { id: 'p2', title: '3 mistakes killing your reach', platform: 'Reels', type: 'Full script', stage: 'Drafting', meta: '30s' },
  { id: 'p3', title: 'How we got 1M views', platform: 'Shorts', type: 'Storyboard', stage: 'Generating', meta: '62% done' },
  { id: 'p4', title: 'Founder day-in-the-life', platform: 'LinkedIn', type: 'Short video', stage: 'Generating', meta: '38% done' },
  { id: 'p5', title: 'Skincare routine that went viral', platform: 'TikTok', type: 'UGC concept', stage: 'Review', meta: 'Needs approval' },
  { id: 'p6', title: 'Before / after transformation', platform: 'Reels', type: 'Final video', stage: 'Review', meta: 'Ready to publish' },
  { id: 'p7', title: 'Q&A: pricing objections', platform: 'Shorts', type: 'Full script', stage: 'Scheduled', meta: 'Tomorrow 6pm' },
  { id: 'p8', title: 'The 15s framework', platform: 'TikTok', type: 'Short video', stage: 'Published', meta: '412K views' },
]

export const pipelineStages: { stage: PipelineStage; hint: string }[] = [
  { stage: 'Drafting', hint: 'Ideas taking shape' },
  { stage: 'Generating', hint: 'AI is working' },
  { stage: 'Review', hint: 'Needs your eyes' },
  { stage: 'Scheduled', hint: 'Queued to post' },
  { stage: 'Published', hint: 'Live now' },
]

export interface Recommendation {
  id: string
  title: string
  detail: string
  impact: string
  action: string
  tone: 'brand' | 'accent' | 'glow'
}

export const recommendations: Recommendation[] = [
  {
    id: 'r1',
    title: 'Educational hooks are outperforming',
    detail:
      'Your TikTok educational content beats product posts by 28% on watch time. Lean into it this week.',
    impact: '+28% watch time',
    action: 'Generate 5 educational hooks',
    tone: 'brand',
  },
  {
    id: 'r2',
    title: 'Repurpose your top TikTok',
    detail:
      '“The 15s framework” hit 412K views. Turn it into 3 Reels variants with fresh hooks.',
    impact: '412K views source',
    action: 'Create 3 variants',
    tone: 'accent',
  },
  {
    id: 'r3',
    title: 'Add a CTA to the SaaS series',
    detail:
      'Campaigns with a “book a call” CTA convert 2.1x better for your audience. This series has none.',
    impact: '2.1x conversions',
    action: 'Add CTA to campaign',
    tone: 'glow',
  },
]

export interface TopContent {
  id: string
  title: string
  platform: Platform
  thumb: string
  views: string
  engagement: string
  shares: string
  trend: Trend
}

export const topContent: TopContent[] = [
  {
    id: 't1',
    title: 'The 15s framework that changed my content',
    platform: 'TikTok',
    thumb: '/content/thumb-1.png',
    views: '412K',
    engagement: '12.4%',
    shares: '8.9K',
    trend: 'up',
  },
  {
    id: 't2',
    title: 'How I plan a month of content in 1 hour',
    platform: 'Reels',
    thumb: '/content/thumb-2.png',
    views: '286K',
    engagement: '10.1%',
    shares: '5.2K',
    trend: 'up',
  },
  {
    id: 't3',
    title: 'This skincare routine broke the internet',
    platform: 'TikTok',
    thumb: '/content/thumb-3.png',
    views: '198K',
    engagement: '9.7%',
    shares: '4.1K',
    trend: 'up',
  },
]

export interface Account {
  id: string
  platform: Platform | 'YouTube' | 'Instagram'
  handle: string
  connected: boolean
  followers: string
  health: 'good' | 'warning'
  lastSync: string
}

export const accounts: Account[] = [
  { id: 'a1', platform: 'TikTok', handle: '@virally.co', connected: true, followers: '128K', health: 'good', lastSync: '3m ago' },
  { id: 'a2', platform: 'Instagram', handle: '@virally', connected: true, followers: '84K', health: 'good', lastSync: '3m ago' },
  { id: 'a3', platform: 'YouTube', handle: 'Virally', connected: true, followers: '41K', health: 'warning', lastSync: '2d ago' },
  { id: 'a4', platform: 'LinkedIn', handle: 'Virally', connected: false, followers: '—', health: 'good', lastSync: '—' },
]

export interface TrendItem {
  id: string
  tag: string
  title: string
  metric: string
  heat: number
}

export const trends: TrendItem[] = [
  { id: 'tr1', tag: 'Format', title: 'Talking-head with bold captions', metric: '+64% reach', heat: 92 },
  { id: 'tr2', tag: 'Hook', title: '“Nobody talks about this, but…”', metric: '+41% saves', heat: 78 },
  { id: 'tr3', tag: 'Topic', title: 'AI workflows for small teams', metric: 'Rising fast', heat: 71 },
  { id: 'tr4', tag: 'Angle', title: 'Before / after in first 3 seconds', metric: '+38% retention', heat: 66 },
]

export const growthSeries = [
  { label: 'Mon', tiktok: 32, reels: 20, shorts: 12 },
  { label: 'Tue', tiktok: 40, reels: 24, shorts: 16 },
  { label: 'Wed', tiktok: 38, reels: 30, shorts: 18 },
  { label: 'Thu', tiktok: 52, reels: 34, shorts: 22 },
  { label: 'Fri', tiktok: 60, reels: 40, shorts: 28 },
  { label: 'Sat', tiktok: 72, reels: 46, shorts: 30 },
  { label: 'Sun', tiktok: 84, reels: 54, shorts: 38 },
]

export const onboardingSteps = [
  { id: 'o1', label: 'Connect a social account', done: true },
  { id: 'o2', label: 'Define your brand voice', done: true },
  { id: 'o3', label: 'Choose your niche & goals', done: true },
  { id: 'o4', label: 'Generate your first hooks', done: false },
  { id: 'o5', label: 'Launch your first campaign', done: false },
]

export const platformMeta: Record<string, { label: string; color: string }> = {
  TikTok: { label: 'TikTok', color: 'var(--brand)' },
  Reels: { label: 'Reels', color: 'var(--accent-2)' },
  Shorts: { label: 'Shorts', color: 'var(--glow)' },
  LinkedIn: { label: 'LinkedIn', color: 'oklch(0.7 0.14 230)' },
  Instagram: { label: 'Instagram', color: 'var(--accent-2)' },
  YouTube: { label: 'YouTube', color: 'var(--brand)' },
}

export const quickCreateOptions = {
  contentType: ['Short video', 'Hook pack', 'Full script', 'UGC concept', 'Carousel', 'Ad creative', 'Repurpose'],
  platform: ['TikTok', 'Reels', 'Shorts', 'LinkedIn'],
  goal: ['Views', 'Followers', 'Leads', 'Clicks', 'Engagement', 'Sales', 'Awareness'],
  audience: ['Founders', 'Creators', 'Ecommerce', 'Local business', 'Coaches', 'SaaS', 'Agencies'],
  duration: ['10s', '15s', '20s', '30s', '45s', '60s'],
  tone: ['Bold', 'Direct', 'Funny', 'Premium', 'Educational', 'Emotional', 'Energetic'],
} as const

export const dashboardStats = {
  overview: [
    { label: 'Created this week', value: '148' },
    { label: 'Published', value: '36' },
    { label: 'Views generated', value: '2.4M' },
    { label: 'Engagement', value: '8.6%' },
    { label: 'Top platform', value: 'TikTok' },
    { label: 'Active campaigns', value: '3' },
  ],
}
