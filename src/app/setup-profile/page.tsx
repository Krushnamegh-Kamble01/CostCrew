'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, CheckCircle2, XCircle, Loader2, ArrowRight, AlertCircle } from 'lucide-react'

export default function SetupProfilePage() {
  const [username, setUsername] = useState('')
  const [formatError, setFormatError] = useState<string | null>(null)
  const [isTaken, setIsTaken] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  // Format validation function
  const validateFormat = (val: string): string | null => {
    if (!val) return 'Username is required'
    if (val.length < 3) return 'Username must be at least 3 characters long'
    if (!/^[A-Za-z0-9_]+$/.test(val)) return 'Only letters, numbers, and underscores are allowed'
    if (!/^[A-Za-z0-9_]{3,}$/.test(val)) return 'Must be at least 3 valid characters'
    return null
  }

  // Live uniqueness check with debounce
  const checkUniqueness = useCallback(async (val: string) => {
    const err = validateFormat(val)
    if (err) {
      setIsTaken(false)
      setIsChecking(false)
      return
    }

    setIsChecking(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', val)
        .maybeSingle()

      if (error) {
        console.error('Error checking username:', JSON.stringify(error, null, 2))
      }

      setIsTaken(Boolean(data))
    } catch (e) {
      console.error('Unexpected error checking username:', JSON.stringify(e, null, 2))
    } finally {
      setIsChecking(false)
    }
  }, [supabase])

  useEffect(() => {
    const trimmed = username.trim()
    const err = validateFormat(trimmed)
    setFormatError(err)

    if (err) {
      setIsTaken(false)
      setIsChecking(false)
      return
    }

    const timer = setTimeout(() => {
      checkUniqueness(trimmed)
    }, 400)

    return () => clearTimeout(timer)
  }, [username, checkUniqueness])

  const isValid = touched && !formatError && !isTaken && !isChecking && username.trim().length >= 3

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || isSubmitting) return

    setIsSubmitting(true)
    setServerError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setServerError('User session not found. Please log in again.')
        setIsSubmitting(false)
        router.push('/login')
        return
      }

      // Insert profile
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: username.trim(),
        })

      if (insertError) {
        if (insertError.code === '23505') {
          setIsTaken(true)
          setServerError('Username was just taken. Please choose another one.')
        } else {
          setServerError(insertError.message || 'Failed to save profile.')
        }
        setIsSubmitting(false)
        return
      }

      // Success -> Redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setServerError('An unexpected error occurred.')
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950 text-gray-100 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md space-y-6 glass-panel p-6 sm:p-10 rounded-2xl relative z-10 border border-gray-800 shadow-2xl">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md mb-2">
            <User className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Choose Your Username
          </h1>
          <p className="text-sm text-gray-400">
            Set a unique handle to complete your CostCrew profile.
          </p>
        </div>

        {serverError && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">Profile Creation Error</p>
              <p className="text-xs text-rose-300/80 mt-0.5">{serverError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-2">
            <label htmlFor="username" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Username
            </label>
            <div className="relative">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setTouched(true)
                  setUsername(e.target.value)
                }}
                placeholder="e.g. alex_dev"
                autoComplete="off"
                className="w-full glass-input px-4 py-3 rounded-xl text-sm sm:text-base placeholder-gray-500 font-mono tracking-wide pr-10"
              />

              {/* Status Icons */}
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                {isChecking && (
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                )}
                {!isChecking && touched && isValid && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}
                {!isChecking && touched && (formatError || isTaken) && (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
              </div>
            </div>

            {/* Validation Feedback Messages */}
            {touched && (
              <div className="min-h-[20px] text-xs font-medium transition-all">
                {isChecking && (
                  <span className="text-indigo-300">Checking availability...</span>
                )}
                {!isChecking && formatError && (
                  <span className="text-rose-400 flex items-center gap-1">
                    • {formatError}
                  </span>
                )}
                {!isChecking && !formatError && isTaken && (
                  <span className="text-rose-400 flex items-center gap-1">
                    • This username is already taken
                  </span>
                )}
                {!isChecking && isValid && (
                  <span className="text-emerald-400 flex items-center gap-1">
                    ✓ Username is available!
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500 space-y-1 bg-gray-900/40 p-3 rounded-lg border border-gray-800/60">
            <p className="font-medium text-gray-400">Username rules:</p>
            <ul className="list-disc list-inside space-y-0.5 text-gray-400/80">
              <li>Minimum 3 characters long</li>
              <li>Only letters, numbers, and underscores (<code>A-Z, a-z, 0-9, _</code>)</li>
              <li>Must be unique</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating Profile...</span>
              </>
            ) : (
              <>
                <span>Complete Profile</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

      </div>
    </main>
  )
}
