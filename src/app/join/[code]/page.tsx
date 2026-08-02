'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Users, Sparkles, Loader2, AlertCircle, CheckCircle2, ArrowRight, Home } from 'lucide-react'

interface GroupInfo {
  id: string
  name: string
  invite_code: string
  created_at: string
}

export default function JoinGroupPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params)
  const inviteCode = resolvedParams.code

  const [group, setGroup] = useState<GroupInfo | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [memberCount, setMemberCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadJoinContext() {
      try {
        setLoading(true)
        setErrorMsg(null)

        // 1. Fetch user session
        const { data: { user }, error: userErr } = await supabase.auth.getUser()
        if (userErr || !user) {
          router.push(`/login?next=/join/${encodeURIComponent(inviteCode)}`)
          return
        }
        setUserId(user.id)

        // 2. Fetch group by invite code
        const { data: groupData, error: groupErr } = await supabase
          .from('groups')
          .select('id, name, invite_code, created_at')
          .eq('invite_code', inviteCode)
          .maybeSingle()

        if (groupErr || !groupData) {
          setErrorMsg('Group not found or invalid invite code.')
          setLoading(false)
          return
        }

        setGroup(groupData)

        // 3. Check membership & member count
        const { data: membership } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', groupData.id)
          .eq('user_id', user.id)
          .maybeSingle()

        setIsMember(Boolean(membership))

        const { count } = await supabase
          .from('group_members')
          .select('id', { count: 'exact', head: true })
          .eq('group_id', groupData.id)

        setMemberCount(count ?? 0)
      } catch (err) {
        console.error('Failed to load join info:', JSON.stringify(err, null, 2))
        setErrorMsg('An unexpected error occurred.')
      } finally {
        setLoading(false)
      }
    }

    loadJoinContext()
  }, [inviteCode, router, supabase])

  const handleJoin = async () => {
    if (!group || !userId || joining) return
    setJoining(true)
    setErrorMsg(null)

    try {
      // Re-verify membership before insertion
      const { data: existing } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', userId)
        .maybeSingle()

      if (existing) {
        setIsMember(true)
        setJoining(false)
        router.push(`/group/${group.id}`)
        return
      }

      const { error: insertErr } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: userId,
        })

      if (insertErr) {
        console.error('Group member insert error details:', JSON.stringify(insertErr, null, 2))
        // If unique constraint triggers
        if (insertErr.code === '23505') {
          setIsMember(true)
          router.push(`/group/${group.id}`)
          return
        }
        setErrorMsg(insertErr.message || 'Failed to join group.')
        setJoining(false)
        return
      }

      // Success -> navigate to group page
      router.push(`/group/${group.id}`)
      router.refresh()
    } catch (err) {
      console.error('Error joining group:', JSON.stringify(err, null, 2))
      setErrorMsg('An unexpected error occurred while joining.')
      setJoining(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950 text-gray-100 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md space-y-6 glass-panel p-6 sm:p-10 rounded-2xl relative z-10 border border-gray-800 shadow-2xl transition-all duration-300">
        
        {/* Top Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30 mb-2">
            <Users className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-indigo-200">
            CostCrew Group Invitation
          </h1>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-sm text-gray-400 font-medium">Fetching invitation details...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && errorMsg && (
          <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Invitation Unavailable</p>
                <p className="text-xs text-rose-300/80 mt-0.5">{errorMsg}</p>
              </div>
            </div>

            <Link
              href="/dashboard"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 transition-all"
            >
              <Home className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        )}

        {/* Group Details Card & Action */}
        {!loading && group && (
          <div className="space-y-6 pt-2">
            <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 text-center space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                You&apos;re Invited
              </span>
              <h2 className="text-2xl font-bold text-white tracking-wide">
                {group.name}
              </h2>
              <p className="text-xs text-gray-400">
                {memberCount} {memberCount === 1 ? 'member' : 'members'} currently in group
              </p>
            </div>

            {isMember ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs sm:text-sm font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>You are already a member of this group!</span>
                </div>

                <Link
                  href={`/group/${group.id}`}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/25 transition-all duration-200"
                >
                  <span>Go to Group Page</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {joining ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Joining Group...</span>
                    </>
                  ) : (
                    <>
                      <span>Join {group.name}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <Link
                  href="/dashboard"
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Decline & Return to Dashboard
                </Link>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  )
}
