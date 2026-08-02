'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  User,
  Mail,
  ShieldCheck,
  ArrowLeft,
  LogOut,
  Sparkles,
  Loader2,
  Users,
  ArrowRight,
  Edit3,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Scale,
  Check,
  X,
  AlertCircle
} from 'lucide-react'

interface UserProfile {
  id: string
  username: string
  avatar_url?: string
}

interface GroupSummary {
  id: string
  name: string
  netBalancePaisa: number
  netBalance: number
}

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [groupSummaries, setGroupSummaries] = useState<GroupSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  // Edit Username State
  const [showEditUsernameModal, setShowEditUsernameModal] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [formatError, setFormatError] = useState<string | null>(null)
  const [isTaken, setIsTaken] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  // Format validation function (reusing rules from setup-profile)
  const validateFormat = (val: string): string | null => {
    if (!val) return 'Username is required'
    if (val.length < 3) return 'Username must be at least 3 characters long'
    if (!/^[A-Za-z0-9_]+$/.test(val)) return 'Only letters, numbers, and underscores are allowed'
    if (!/^[A-Za-z0-9_]{3,}$/.test(val)) return 'Must be at least 3 valid characters'
    return null
  }

  // Live uniqueness check with debounce
  const checkUniqueness = useCallback(
    async (val: string, currentUsername?: string) => {
      const err = validateFormat(val)
      if (err) {
        setIsTaken(false)
        setIsChecking(false)
        return
      }

      if (currentUsername && val.toLowerCase() === currentUsername.toLowerCase()) {
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
    },
    [supabase]
  )

  useEffect(() => {
    if (!showEditUsernameModal) return

    const trimmed = newUsername.trim()
    const err = validateFormat(trimmed)
    setFormatError(err)

    if (err) {
      setIsTaken(false)
      setIsChecking(false)
      return
    }

    const timer = setTimeout(() => {
      checkUniqueness(trimmed, profile?.username)
    }, 400)

    return () => clearTimeout(timer)
  }, [newUsername, showEditUsernameModal, checkUniqueness, profile?.username])

  // Load all user profile and group balances
  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true)

      // 1. Get user session
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()

      if (userErr || !user) {
        router.push('/login')
        return
      }

      setUserId(user.id)
      setUserEmail(user.email || 'Authenticated User')

      // 2. Get profile
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profileErr || !profileData) {
        router.push('/setup-profile')
        return
      }

      setProfile(profileData)

      // 3. Fetch all groups user belongs to
      const { data: memberRows, error: memberErr } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups (
            id,
            name
          )
        `)
        .eq('user_id', user.id)

      if (memberErr || !memberRows || memberRows.length === 0) {
        setGroupSummaries([])
        setLoading(false)
        return
      }

      const groupsList: any[] = memberRows
        .map((r: any) => (Array.isArray(r.groups) ? r.groups[0] : r.groups))
        .filter(Boolean)

      // 4. Calculate Net Balance for each group
      const summaries: GroupSummary[] = await Promise.all(
        groupsList.map(async (grp) => {
          const gId = grp.id

          // Fetch expenses in group
          const { data: expData } = await supabase
            .from('expenses')
            .select(`
              id,
              paid_by,
              amount,
              expense_splits (
                user_id,
                share_amount
              )
            `)
            .eq('group_id', gId)

          // Fetch settlements in group
          const { data: setArr } = await supabase
            .from('settlements')
            .select('from_user, to_user, amount')
            .eq('group_id', gId)

          let paidPaisa = 0
          let sharePaisa = 0
          let settlementAdjPaisa = 0

          ;(expData || []).forEach((exp: any) => {
            const expAmountPaisa = Math.round(exp.amount * 100)
            if (exp.paid_by === user.id) {
              paidPaisa += expAmountPaisa
            }
            if (exp.expense_splits) {
              exp.expense_splits.forEach((sp: any) => {
                if (sp.user_id === user.id) {
                  sharePaisa += Math.round(sp.share_amount * 100)
                }
              })
            }
          })

          ;(setArr || []).forEach((st: any) => {
            const stAmountPaisa = Math.round(st.amount * 100)
            if (st.from_user === user.id) {
              settlementAdjPaisa += stAmountPaisa
            }
            if (st.to_user === user.id) {
              settlementAdjPaisa -= stAmountPaisa
            }
          })

          const netPaisa = paidPaisa - sharePaisa + settlementAdjPaisa
          const netVal = Number((netPaisa / 100).toFixed(2))

          return {
            id: grp.id,
            name: grp.name,
            netBalancePaisa: netPaisa,
            netBalance: netVal,
          }
        })
      )

      setGroupSummaries(summaries)
    } catch (err) {
      console.error('Failed to load profile page:', JSON.stringify(err, null, 2))
    } finally {
      setLoading(false)
    }
  }, [supabase, router])

  useEffect(() => {
    loadProfileData()
  }, [loadProfileData])

  // Handle Logout
  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await supabase.auth.signOut()
      router.push('/login')
    } catch (err) {
      console.error('Sign out error:', err)
      setLoggingOut(false)
    }
  }

  // Handle Change Username submit
  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newUsername.trim()
    const isSame = profile && trimmed.toLowerCase() === profile.username.toLowerCase()
    
    if (formatError || isTaken || isChecking || !trimmed || isSubmitting) return

    setIsSubmitting(true)
    setServerError(null)

    try {
      if (isSame) {
        setShowEditUsernameModal(false)
        setIsSubmitting(false)
        return
      }

      // Update profiles table
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ username: trimmed })
        .eq('id', userId)

      if (updateErr) {
        if (updateErr.code === '23505') {
          setIsTaken(true)
          setServerError('Username is already taken by another user.')
        } else {
          setServerError(updateErr.message || 'Failed to update username.')
        }
        setIsSubmitting(false)
        return
      }

      // Success
      setProfile((prev) => (prev ? { ...prev, username: trimmed } : null))
      setShowEditUsernameModal(false)
      setSuccessToast(`Username updated to @${trimmed}!`)
      setTimeout(() => setSuccessToast(null), 4000)
    } catch (err) {
      console.error('Error updating username:', JSON.stringify(err, null, 2))
      setServerError('An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate Overall Totals across all groups
  const overallTotals = useCallback(() => {
    let totalOwedToUserPaisa = 0 // positive sum
    let totalUserOwesPaisa = 0 // negative sum

    groupSummaries.forEach((g) => {
      if (g.netBalancePaisa > 0) {
        totalOwedToUserPaisa += g.netBalancePaisa
      } else if (g.netBalancePaisa < 0) {
        totalUserOwesPaisa += Math.abs(g.netBalancePaisa)
      }
    })

    return {
      owedToUser: Number((totalOwedToUserPaisa / 100).toFixed(2)),
      userOwes: Number((totalUserOwesPaisa / 100).toFixed(2)),
    }
  }, [groupSummaries])()

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm text-gray-400 font-medium">Loading your profile...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950 text-gray-100 p-4 sm:p-6 lg:p-10">
      
      {/* Top Navbar */}
      <header className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between p-4 sm:px-6 glass-panel rounded-2xl mb-6 sm:mb-8 border border-gray-800 gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold glass-panel hover:bg-gray-800 border border-gray-800 text-gray-300 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <span className="text-xs text-gray-500">•</span>
          <h1 className="font-bold text-base text-white">Your Profile</h1>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {loggingOut ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          <span>{loggingOut ? 'Logging out...' : 'Sign Out'}</span>
        </button>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Success Toast */}
        {successToast && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm animate-in fade-in slide-in-from-top-2">
            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
        )}

        {/* Profile Card Header */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-indigo-500/20 shrink-0 uppercase">
              {profile?.username?.[0] || 'U'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  @{profile?.username}
                </h2>
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              </div>
              <p className="text-xs sm:text-sm text-gray-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{userEmail}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setNewUsername(profile?.username || '')
              setFormatError(null)
              setIsTaken(false)
              setServerError(null)
              setShowEditUsernameModal(true)
            }}
            className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
          >
            <Edit3 className="w-4 h-4" />
            <span>Change Username</span>
          </button>
        </div>

        {/* Overall Summary Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-gray-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-400" />
              <span>Overall Balance Summary</span>
            </h3>
            <span className="text-xs text-gray-400">Across {groupSummaries.length} groups</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Owed to user card */}
            <div className="p-4 sm:p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>You're owed total</span>
                </p>
                <p className="text-2xl font-extrabold text-white font-mono">
                  ₹{overallTotals.owedToUser.toFixed(2)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-lg border border-emerald-500/30">
                +
              </div>
            </div>

            {/* User owes card */}
            <div className="p-4 sm:p-5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                  <span>You owe total</span>
                </p>
                <p className="text-2xl font-extrabold text-white font-mono">
                  ₹{overallTotals.userOwes.toFixed(2)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold text-lg border border-rose-500/30">
                -
              </div>
            </div>
          </div>
        </div>

        {/* Group Balances List */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-gray-800 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <span>Your Group Memberships & Balances</span>
            </h3>
            <span className="text-xs text-gray-400">{groupSummaries.length} groups</span>
          </div>

          {groupSummaries.length === 0 ? (
            <div className="p-6 rounded-xl bg-gray-900/40 border border-dashed border-gray-800 text-center space-y-2">
              <p className="text-sm font-semibold text-gray-300">No group memberships found</p>
              <p className="text-xs text-gray-500">
                Join or create a group from your dashboard to start tracking shared expenses.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all mt-2"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {groupSummaries.map((grp) => {
                let statusText = "You're settled up"
                let badgeStyle = 'bg-gray-800 text-gray-400 border-gray-700/60'
                let textColor = 'text-gray-300'

                if (grp.netBalancePaisa > 0) {
                  statusText = `You are owed ₹${grp.netBalance.toFixed(2)}`
                  badgeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  textColor = 'text-emerald-400'
                } else if (grp.netBalancePaisa < 0) {
                  statusText = `You owe ₹${Math.abs(grp.netBalance).toFixed(2)}`
                  badgeStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  textColor = 'text-rose-400'
                }

                return (
                  <Link
                    key={grp.id}
                    href={`/group/${grp.id}`}
                    className="p-4 rounded-xl bg-gray-900/50 border border-gray-800/80 hover:border-gray-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm shrink-0">
                        {grp.name[0]?.toUpperCase() || 'G'}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
                          {grp.name}
                        </p>
                        <p className={`text-xs font-semibold ${textColor}`}>
                          {statusText}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-800/60">
                      <span className={`text-xs px-2.5 py-1 rounded-lg border font-mono font-bold ${badgeStyle}`}>
                        {grp.netBalancePaisa > 0
                          ? `+₹${grp.netBalance.toFixed(2)}`
                          : grp.netBalancePaisa < 0
                          ? `-₹${Math.abs(grp.netBalance).toFixed(2)}`
                          : '₹0.00'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* Change Username Modal */}
      {showEditUsernameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-all">
          <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-2xl border border-gray-800 space-y-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            
            <button
              onClick={() => setShowEditUsernameModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-400" />
                <span>Change Username</span>
              </h3>
              <p className="text-xs text-gray-400">Update your unique handle across CostCrew.</p>
            </div>

            {serverError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                {serverError}
              </div>
            )}

            <form onSubmit={handleUpdateUsername} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="newUsername" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  New Username *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">@</span>
                  <input
                    id="newUsername"
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="new_username"
                    className="w-full glass-input pl-8 pr-10 py-2.5 rounded-xl text-sm text-white font-medium placeholder-gray-500"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isChecking ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    ) : newUsername.trim() && !formatError && !isTaken ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (formatError || isTaken) && newUsername.trim() ? (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    ) : null}
                  </div>
                </div>

                {/* Live validation feedback */}
                {newUsername.trim() && (
                  <div className="text-xs pt-1 space-y-0.5">
                    {formatError && <p className="text-rose-400 font-medium">{formatError}</p>}
                    {isTaken && <p className="text-rose-400 font-medium">Username "@ {newUsername.trim()}" is already taken</p>}
                    {!formatError && !isTaken && !isChecking && (
                      <p className="text-emerald-400 font-medium">Username is available!</p>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditUsernameModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    !newUsername.trim() ||
                    !!formatError ||
                    isTaken ||
                    isChecking ||
                    isSubmitting
                  }
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Save Username</span>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </main>
  )
}
