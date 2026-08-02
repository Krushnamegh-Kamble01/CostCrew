'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import {
  Sparkles,
  Shield,
  ArrowRight,
  AlertCircle,
  Loader2,
  Users,
  Camera,
  Zap,
  ChevronDown,
  CheckCircle2,
  Receipt,
  Scale,
  DollarSign,
  ArrowUpRight
} from 'lucide-react'

/* ==========================================
   Shooting Stars Canvas Background Component
   ========================================== */
function ShootingStarsCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    // Generate static twinkling stars
    const starCount = Math.floor((width * height) / 9000)
    const backgroundStars = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.2 + 0.3,
      alpha: Math.random() * 0.7 + 0.2,
      twinkleSpeed: Math.random() * 0.01 + 0.003,
    }))

    // Shooting stars array
    interface ShootingStar {
      x: number
      y: number
      length: number
      speed: number
      angle: number // radians
      opacity: number
      maxLife: number
      life: number
      color: string
    }

    const shootingStars: ShootingStar[] = []
    let lastSpawnTime = 0

    const spawnShootingStar = (now: number) => {
      // Spawn roughly every 1.2s to 2s
      if (now - lastSpawnTime > 1200 + Math.random() * 800) {
        lastSpawnTime = now

        // Start somewhere along top edge or top-right side
        const startFromTop = Math.random() > 0.4
        const startX = startFromTop
          ? Math.random() * (width * 0.9)
          : width + 20
        const startY = startFromTop
          ? -20
          : Math.random() * (height * 0.4)

        // Angle: traveling down and left (approx 135 deg to 150 deg radians)
        const angle = Math.PI * (0.7 + Math.random() * 0.1)

        shootingStars.push({
          x: startX,
          y: startY,
          length: Math.random() * 120 + 80,
          speed: Math.random() * 6 + 7,
          angle,
          opacity: 1,
          maxLife: Math.random() * 60 + 60,
          life: 0,
          color: Math.random() > 0.3 ? '#818cf8' : '#c084fc', // Indigo or Purple hue
        })
      }
    }

    const animate = (now: number) => {
      ctx.clearRect(0, 0, width, height)

      // 1. Draw static background stars
      backgroundStars.forEach((star) => {
        star.alpha += star.twinkleSpeed
        if (star.alpha > 0.9 || star.alpha < 0.2) {
          star.twinkleSpeed = -star.twinkleSpeed
        }
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(226, 232, 240, ${Math.abs(star.alpha)})`
        ctx.fill()
      })

      // 2. Spawn and render shooting stars
      spawnShootingStar(now)

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const star = shootingStars[i]
        star.life++

        // Update position
        star.x += Math.cos(star.angle) * star.speed
        star.y += Math.sin(star.angle) * star.speed

        // Calculate tail end position
        const tailX = star.x - Math.cos(star.angle) * star.length
        const tailY = star.y - Math.sin(star.angle) * star.length

        // Fade out near end of life
        const currentOpacity =
          star.life > star.maxLife * 0.7
            ? (1 - (star.life - star.maxLife * 0.7) / (star.maxLife * 0.3))
            : 1

        if (currentOpacity <= 0 || star.x < -100 || star.y > height + 100) {
          shootingStars.splice(i, 1)
          continue
        }

        // Draw gradient streak tail
        const gradient = ctx.createLinearGradient(star.x, star.y, tailX, tailY)
        gradient.addColorStop(0, `rgba(255, 255, 255, ${currentOpacity})`)
        gradient.addColorStop(0.3, `rgba(165, 180, 252, ${currentOpacity * 0.8})`)
        gradient.addColorStop(1, 'rgba(165, 180, 252, 0)')

        ctx.beginPath()
        ctx.moveTo(star.x, star.y)
        ctx.lineTo(tailX, tailY)
        ctx.strokeStyle = gradient
        ctx.lineWidth = 1.8
        ctx.lineCap = 'round'
        ctx.stroke()

        // Glowing head dot
        ctx.beginPath()
        ctx.arc(star.x, star.y, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`
        ctx.shadowColor = star.color
        ctx.shadowBlur = 8
        ctx.fill()
        ctx.shadowBlur = 0
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  )
}

/* ==========================================
   Scroll Reveal Wrapper Component
   ========================================== */
function ScrollReveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.15 }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </div>
  )
}

/* ==========================================
   Main Login Content Component
   ========================================== */
function LoginContent() {
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setErrorMessage(null)
      const supabase = createClient()

      const nextParam = searchParams.get('next')
      const callbackUrl = nextParam
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextParam)}`
        : `${window.location.origin}/auth/callback`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        },
      })

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  const scrollToFeatures = () => {
    const element = document.getElementById('features-section')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="w-full flex flex-col items-center">

      {/* ==========================================
          HERO SECTION (Top Viewport)
          ========================================== */}
      <section className="relative w-full min-h-screen flex flex-col justify-between items-center px-4 sm:px-6 lg:px-8 pt-12 pb-8 overflow-hidden z-10">

        {/* Shooting Stars Canvas Background */}
        <ShootingStarsCanvas />

        {/* Ambient Gradient Glow Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/15 blur-[140px] rounded-full pointer-events-none z-0" />
        <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none z-0" />
        <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none z-0" />

        {/* Top Header Nav / Logo */}
        <header className="w-full max-w-6xl mx-auto flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-indigo-200">
              CostCrew
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-medium">
              v2.0 Beta
            </span>
          </div>
        </header>

        {/* Hero Center Card & Action */}
        <div className="w-full max-w-xl mx-auto text-center space-y-8 my-auto pt-8 pb-12 z-10">
          
          {/* Badge Tagline */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-900/80 border border-indigo-500/30 text-xs font-semibold text-indigo-300 shadow-lg shadow-indigo-500/5 backdrop-blur-md animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Smart Group Expenses & AI Receipt Scanner</span>
          </div>

          {/* Main Title & Subtitle */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Split Expenses.{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400">
                Zero Stress.
              </span>
            </h1>
            <p className="text-base sm:text-lg text-gray-300 max-w-lg mx-auto leading-relaxed">
              Track shared trip bills, scan receipts instantly with AI, and settle group balances seamlessly with zero math.
            </p>
          </div>

          {/* Authentication Container */}
          <div className="w-full max-w-md mx-auto space-y-4 glass-panel p-6 sm:p-8 rounded-2xl border border-gray-800/90 shadow-2xl backdrop-blur-xl relative">
            
            {/* Error Message Display */}
            {(errorMessage || errorParam) && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-left">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-200">Authentication Failed</p>
                  <p className="text-xs text-red-300/80 mt-0.5">
                    {errorMessage || decodeURIComponent(errorParam || '')}
                  </p>
                </div>
              </div>
            )}

            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full relative group flex items-center justify-center gap-3 py-3.5 px-5 rounded-xl font-semibold text-gray-100 bg-gray-900/90 hover:bg-gray-800/90 border border-gray-700 hover:border-indigo-500/60 shadow-lg hover:shadow-indigo-500/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span className="text-sm">
                {loading ? 'Connecting to Google...' : 'Sign in with Google'}
              </span>
              {!loading && (
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all ml-auto" />
              )}
            </button>

            {/* Security Badge */}
            <div className="pt-2 flex items-center justify-center gap-2 text-xs text-gray-400">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Secured with Supabase Authentication</span>
            </div>
          </div>
        </div>

        {/* Scroll Down Indicator */}
        <div className="z-10 flex flex-col items-center gap-2 text-gray-400 text-xs font-medium animate-bounce cursor-pointer" onClick={scrollToFeatures}>
          <span>Scroll to explore features</span>
          <ChevronDown className="w-4 h-4 text-indigo-400" />
        </div>
      </section>

      {/* ==========================================
          SCENIC LANDSCAPE BACKDROP & FEATURE SECTIONS
          ========================================== */}
      <div id="features-section" className="relative w-full bg-slate-950 text-gray-100 z-10 pt-16 pb-24 border-t border-gray-800/80">
        
        {/* Subtle Mountain Landscape SVG Backdrop */}
        <div className="absolute top-0 left-0 right-0 w-full overflow-hidden leading-none pointer-events-none opacity-25 z-0">
          <svg className="w-full h-48 sm:h-64 lg:h-80" viewBox="0 0 1200 320" preserveAspectRatio="none">
            <defs>
              <linearGradient id="mountainGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="mountainGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#9333ea" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#020617" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Background Ridge */}
            <path
              fill="url(#mountainGrad2)"
              d="M0,192L60,170.7C120,149,240,107,360,112C480,117,600,171,720,186.7C840,203,960,181,1080,154.7C1200,128,1320,96,1380,80L1440,64L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
            />
            {/* Foreground Ridge */}
            <path
              fill="url(#mountainGrad1)"
              d="M0,224L80,213.3C160,203,320,181,480,186.7C640,192,800,224,960,213.3C1120,203,1280,149,1360,122.7L1440,96L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
            />
          </svg>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-24 sm:space-y-32">
          
          {/* Section Heading */}
          <ScrollReveal className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
              Built for Friends, Crews & Roommates
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Everything you need for effortless expense management
            </h2>
            <p className="text-gray-400 text-sm sm:text-base">
              Say goodbye to awkward money conversations and messy spreadsheets.
            </p>
          </ScrollReveal>

          {/* Feature 1: Group Expense Splitting */}
          <ScrollReveal>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              <div className="lg:col-span-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  1. Transparent Group Splitting
                </h3>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  Split expenses evenly or assign custom shares per member. Everyone in the group gets a clear, real-time breakdown of paid amounts and exact splits.
                </p>
                <ul className="space-y-2 pt-2 text-xs sm:text-sm text-gray-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Equal or unequal custom percentage splits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Instant invite links for quick crew onboarding</span>
                  </li>
                </ul>
              </div>

              {/* Mock UI Graphic */}
              <div className="lg:col-span-6 glass-panel p-5 rounded-2xl border border-gray-800/90 shadow-xl space-y-3 bg-gray-900/60 backdrop-blur-md">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800 text-xs">
                  <span className="font-semibold text-gray-200">Weekend Beach Trip</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Active</span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700/50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                        A
                      </div>
                      <div>
                        <p className="font-medium text-gray-200">Alex paid Dinner</p>
                        <p className="text-[11px] text-gray-400">Split evenly between 4 members</p>
                      </div>
                    </div>
                    <span className="font-bold text-indigo-300 text-sm">₹2,400.00</span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700/50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                        M
                      </div>
                      <div>
                        <p className="font-medium text-gray-200">Maya paid Fuel</p>
                        <p className="text-[11px] text-gray-400">Custom shares (Alex & Maya)</p>
                      </div>
                    </div>
                    <span className="font-bold text-purple-300 text-sm">₹1,250.00</span>
                  </div>
                </div>
              </div>

            </div>
          </ScrollReveal>

          {/* Feature 2: AI Receipt Scanner */}
          <ScrollReveal>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              {/* Mock UI Graphic */}
              <div className="lg:col-span-6 order-2 lg:order-1 glass-panel p-5 rounded-2xl border border-gray-800/90 shadow-xl space-y-3 bg-gray-900/60 backdrop-blur-md">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800 text-xs">
                  <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                    <Camera className="w-4 h-4" />
                    <span>AI Receipt Parser</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-mono">100% Extracted</span>
                </div>
                <div className="p-4 rounded-xl bg-gray-800/40 border border-dashed border-indigo-500/30 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-300 font-mono">
                    <span>Detected Category:</span>
                    <span className="text-indigo-300 font-bold">Food & Dining</span>
                  </div>
                  <div className="flex justify-between text-gray-300 font-mono">
                    <span>Extracted Total:</span>
                    <span className="text-emerald-400 font-bold">₹1,840.00</span>
                  </div>
                  <div className="flex justify-between text-gray-400 text-[11px] border-t border-gray-700/60 pt-2">
                    <span>Note Auto-filled:</span>
                    <span className="italic">"Team Lunch at Bistro"</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 order-1 lg:order-2 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Camera className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  2. AI-Powered Receipt Scanner
                </h3>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  Snap a picture of any paper receipt or invoice. CostCrew automatically detects amounts, categories, and descriptions so you never have to type manually.
                </p>
                <ul className="space-y-2 pt-2 text-xs sm:text-sm text-gray-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Extract total amounts & merchant notes instantly</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Smart categorization for Food, Travel, Utilities & more</span>
                  </li>
                </ul>
              </div>

            </div>
          </ScrollReveal>

          {/* Feature 3: Simplified Debt Settlement */}
          <ScrollReveal>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              <div className="lg:col-span-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  3. Minimal Debt Settlement Algorithm
                </h3>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  No one wants to make 5 different transfers to 5 people. CostCrew simplifies complex group debts into the absolute minimum number of payments.
                </p>
                <ul className="space-y-2 pt-2 text-xs sm:text-sm text-gray-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Automated minimal transaction calculation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>One-tap settlement confirmation & history tracking</span>
                  </li>
                </ul>
              </div>

              {/* Mock UI Graphic */}
              <div className="lg:col-span-6 glass-panel p-5 rounded-2xl border border-gray-800/90 shadow-xl space-y-3 bg-gray-900/60 backdrop-blur-md">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800 text-xs">
                  <span className="font-semibold text-gray-200">Optimal Settlement Plan</span>
                  <span className="text-[11px] text-indigo-400 font-mono">1 Transfer Needed</span>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-200">Rahul</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-gray-200">Sarah</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-300 text-sm">₹450.00</span>
                    <p className="text-[10px] text-gray-400">Settles all group debts</p>
                  </div>
                </div>
              </div>

            </div>
          </ScrollReveal>

        </div>
      </div>

      {/* ==========================================
          FOOTER SECTION
          ========================================== */}
      <footer className="w-full bg-gray-950 border-t border-gray-800/80 py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-gray-500 z-10 relative">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-gray-300">CostCrew</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors font-medium cursor-pointer"
          >
            <span>Back to Sign In</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>

    </div>
  )
}

/* ==========================================
   Page Wrapper Component with Suspense
   ========================================== */
export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-gray-100 relative overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      <Suspense
        fallback={
          <div className="min-h-screen flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm text-gray-400">Loading authentication...</p>
          </div>
        }
      >
        <LoginContent />
      </Suspense>
    </main>
  )
}
