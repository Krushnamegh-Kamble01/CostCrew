'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Sparkles,
  ArrowRight,
  Shield,
  Users,
  Receipt,
  Scale,
  Zap,
  Camera,
  CheckCircle2,
  Loader2,
} from 'lucide-react'

export default function LandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setIsAuthenticated(Boolean(user))
      } catch {
        setIsAuthenticated(false)
      }
    }
    checkAuth()
  }, [supabase])

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950 text-gray-100 relative overflow-hidden flex flex-col justify-between">
      {/* Background Lighting Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Navigation Header */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 relative z-10">
        <div className="glass-panel p-3.5 sm:p-4 px-4 sm:px-6 rounded-2xl border border-gray-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-indigo-200">
                CostCrew
              </span>
              <p className="text-[10px] text-gray-400 hidden sm:block">Smart Expense Splitting</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated === null ? (
              <div className="w-24 h-9 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              </div>
            ) : isAuthenticated ? (
              <Link
                href="/dashboard"
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="min-h-[44px] inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-gray-300 hover:text-white glass-panel hover:bg-gray-800/80 border border-gray-800 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Hero & Features */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 relative z-10 space-y-12 sm:space-y-16">
        
        {/* Hero Banner */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI-Powered Expense Management</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-indigo-200">
            Split Expenses Effortlessly. Settle Up Instantly.
          </h1>

          <p className="text-sm sm:text-base lg:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            CostCrew simplifies shared group costs, tracks net balances in real-time, and uses AI receipt scanning so you never argue over bills again.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href={isAuthenticated ? '/dashboard' : '/login'}
              className="w-full sm:w-auto min-h-[48px] px-7 py-3.5 rounded-xl font-bold text-sm sm:text-base text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isAuthenticated ? 'Go to Dashboard' : 'Start Splitting Costs Free'}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          
          <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-gray-800 space-y-4 hover:border-indigo-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">AI Receipt Scanning</h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Snap a picture of your paper receipt. Our Gemini AI automatically extracts total amounts, vendor notes, and category classification.
            </p>
          </div>

          <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-gray-800 space-y-4 hover:border-indigo-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Flexible Group Splits</h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Split bills evenly across all members, select specific participants, or specify exact custom shares without rounding errors.
            </p>
          </div>

          <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-gray-800 space-y-4 hover:border-indigo-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Scale className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Simplified Settlement</h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Minimizes transactions between members with exact net-balance math, keeping everyone settled up with zero stress.
            </p>
          </div>

        </div>

      </section>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10 border-t border-gray-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400/80" />
          <span>CostCrew — End-to-End Expense Management</span>
        </div>
        <p>© 2026 CostCrew. All rights reserved.</p>
      </footer>
    </main>
  )
}
