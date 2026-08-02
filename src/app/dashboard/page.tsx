'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  LogOut,
  ShieldCheck,
  Mail,
  Sparkles,
  Loader2,
  Plus,
  Users,
  Copy,
  Check,
  ArrowRight,
  X,
  KeyRound,
  DollarSign,
  User,
  AlertCircle
} from 'lucide-react'

interface UserProfile {
  id: string
  username: string
  created_at?: string
}

interface GroupCardData {
  id: string
  name: string
  invite_code: string
  created_at: string
  created_by: string
  memberCount: number
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [groups, setGroups] = useState<GroupCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  // Create Group Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createdGroupInviteCode, setCreatedGroupInviteCode] = useState<string | null>(null)

  // Manual Join Code State
  const [manualCode, setManualCode] = useState('')
  const [joiningCode, setJoiningCode] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  // Copy state tracker per invite code
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  // Fetch groups for the logged-in user
  const fetchUserGroups = useCallback(async (currentUserId: string) => {
    try {
      setGroupsLoading(true)

      // Query group_members for current user, joined with groups
      const { data: memberRows, error: memberErr } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups (
            id,
            name,
            invite_code,
            created_at,
            created_by
          )
        `)
        .eq('user_id', currentUserId)

      if (memberErr) {
        console.error('Error fetching user groups:', JSON.stringify(memberErr, null, 2))
        return
      }

      if (!memberRows || memberRows.length === 0) {
        setGroups([])
        return
      }

      // Extract unique groups
      const groupList: any[] = memberRows
        .map((r: any) => (Array.isArray(r.groups) ? r.groups[0] : r.groups))
        .filter(Boolean)

      // Fetch member counts for each group
      const enrichedGroups: GroupCardData[] = await Promise.all(
        groupList.map(async (g) => {
          const { count } = await supabase
            .from('group_members')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', g.id)

          return {
            id: g.id,
            name: g.name,
            invite_code: g.invite_code,
            created_at: g.created_at,
            created_by: g.created_by,
            memberCount: count ?? 1,
          }
        })
      )

      setGroups(enrichedGroups)
    } catch (err) {
      console.error('Error loading groups:', JSON.stringify(err, null, 2))
    } finally {
      setGroupsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          router.push('/login')
          return
        }

        setUserId(user.id)
        setUserEmail(user.email ?? null)

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (!profileData) {
          router.push('/setup-profile')
          return
        }

        setProfile(profileData)
        await fetchUserGroups(user.id)
      } catch (err) {
        console.error('Failed to load user data:', JSON.stringify(err, null, 2))
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router, supabase, fetchUserGroups])

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (err) {
      console.error('Sign out error:', err)
      setLoggingOut(false)
    }
  }

  // Handle Create Group Submission
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim() || creatingGroup) return

    setCreatingGroup(true)
    setCreateError(null)

    try {
      // 1. Re-verify current authenticated user session
      const { data: { user }, error: userAuthErr } = await supabase.auth.getUser()
      if (userAuthErr || !user) {
        setCreateError('User authentication expired. Please log in again.')
        setCreatingGroup(false)
        return
      }

      const currentUserId = user.id

      // 2. Insert into "groups" using authenticated browser client with created_by = user.id
      const { data: groupData, error: groupInsertErr } = await supabase
        .from('groups')
        .insert({
          name: newGroupName.trim(),
          created_by: currentUserId,
        })
        .select('id, name, invite_code')
        .single()

      if (groupInsertErr || !groupData) {
        console.error('Group insert error details:', JSON.stringify(groupInsertErr, null, 2))
        const errMsg = groupInsertErr?.details 
          ? `${groupInsertErr.message} (${groupInsertErr.details})`
          : (groupInsertErr?.message || 'Failed to create group.')
        setCreateError(errMsg)
        setCreatingGroup(false)
        return
      }

      // 3. Insert creator into "group_members"
      const { error: memberInsertErr } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData.id,
          user_id: currentUserId,
        })

      if (memberInsertErr) {
        console.error('Error assigning creator to group_members:', JSON.stringify(memberInsertErr, null, 2))
      }

      // Show invite code feedback
      setCreatedGroupInviteCode(groupData.invite_code)
      await fetchUserGroups(currentUserId)
    } catch (err) {
      console.error('Error creating group:', JSON.stringify(err, null, 2))
      setCreateError('An unexpected error occurred while creating group.')
    } finally {
      setCreatingGroup(false)
    }
  }

  // Handle Manual Join Code Submission
  const handleManualJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedCode = manualCode.trim()
    if (!trimmedCode || joiningCode) return

    setJoiningCode(true)
    setJoinError(null)

    try {
      const { data: { user }, error: userAuthErr } = await supabase.auth.getUser()
      if (userAuthErr || !user) {
        setJoinError('User session expired. Please log in again.')
        setJoiningCode(false)
        return
      }

      const currentUserId = user.id

      // 1. Find group by invite code
      const { data: groupData, error: groupErr } = await supabase
        .from('groups')
        .select('id, name')
        .eq('invite_code', trimmedCode)
        .maybeSingle()

      if (groupErr || !groupData) {
        setJoinError('Invalid invite code. Please double-check and try again.')
        setJoiningCode(false)
        return
      }

      // 2. Check if already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupData.id)
        .eq('user_id', currentUserId)
        .maybeSingle()

      if (existingMember) {
        // Navigate directly to group page
        router.push(`/group/${groupData.id}`)
        return
      }

      // 3. Insert into group_members
      const { error: joinInsertErr } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData.id,
          user_id: currentUserId,
        })

      if (joinInsertErr && joinInsertErr.code !== '23505') {
        setJoinError(joinInsertErr.message || 'Failed to join group.')
        setJoiningCode(false)
        return
      }

      // Success -> navigate to group page
      setManualCode('')
      router.push(`/group/${groupData.id}`)
    } catch (err) {
      console.error('Error joining group by code:', JSON.stringify(err, null, 2))
      setJoinError('An unexpected error occurred.')
      setJoiningCode(false)
    }
  }

  // Copy link utility
  const copyInviteLink = (code: string) => {
    const link = `${window.location.origin}/join/${code}`
    navigator.clipboard.writeText(link)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm text-gray-400 font-medium">Loading your profile & groups...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950 text-gray-100 p-4 sm:p-6 lg:p-10">
      
      {/* Top Navbar */}
      <header className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between p-4 sm:px-6 glass-panel rounded-2xl mb-6 sm:mb-8 border border-gray-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">CostCrew</h1>
            <p className="text-xs text-gray-400">Expense Splitting Made Simple</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
          <Link
            href="/profile"
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold glass-panel hover:bg-gray-800 border border-gray-800 text-gray-300 transition-all"
          >
            <User className="w-4 h-4 text-indigo-400" />
            <span>Profile</span>
          </Link>

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
        </div>
      </header>

      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* User Info Header Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-2xl uppercase shrink-0">
              {profile?.username?.[0] || 'U'}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                @{profile?.username}
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                {userEmail || 'Authenticated User'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setShowCreateModal(true)
              setCreatedGroupInviteCode(null)
              setNewGroupName('')
              setCreateError(null)
            }}
            className="w-full md:w-auto min-h-[44px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/25 transition-all duration-200 cursor-pointer shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Create New Group</span>
          </button>
        </div>

        {/* Join Group with Code Bar */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-gray-800 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm sm:text-base text-white">Join a Group with Code</h3>
          </div>

          <form onSubmit={handleManualJoin} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter invite code (e.g. ABC123XYZ)"
                className="w-full glass-input px-4 py-2.5 rounded-xl text-sm placeholder-gray-500 font-mono tracking-wider min-h-[44px]"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim() || joiningCode}
              className="min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-indigo-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {joiningCode ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              ) : (
                <ArrowRight className="w-4 h-4 text-indigo-400" />
              )}
              <span>{joiningCode ? 'Joining...' : 'Join Group'}</span>
            </button>
          </form>

          {joinError && (
            <div className="flex items-center gap-2 text-xs text-rose-400 pt-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{joinError}</span>
            </div>
          )}
        </div>

        {/* Groups Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <span>Your Groups</span>
            </h3>
            <span className="text-xs text-gray-400 font-medium">
              {groups.length} {groups.length === 1 ? 'group' : 'groups'}
            </span>
          </div>

          {groupsLoading ? (
            <div className="glass-panel p-10 rounded-2xl flex flex-col items-center justify-center gap-3 border border-gray-800">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <p className="text-xs text-gray-400">Loading your groups...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="glass-panel p-8 sm:p-12 rounded-2xl text-center space-y-4 border border-gray-800">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-white">No Groups Yet</h4>
                <p className="text-xs sm:text-sm text-gray-400 max-w-sm mx-auto mt-1">
                  Create a new group to split expenses with friends or enter an invite code above to join an existing group.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(true)
                  setCreatedGroupInviteCode(null)
                  setNewGroupName('')
                  setCreateError(null)
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Group</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {groups.map((g) => {
                const isCopied = copiedCode === g.invite_code

                return (
                  <div
                    key={g.id}
                    className="glass-panel rounded-2xl p-5 sm:p-6 border border-gray-800 hover:border-indigo-500/40 transition-all duration-200 flex flex-col justify-between space-y-4 group relative"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <Link
                          href={`/group/${g.id}`}
                          className="font-bold text-lg text-white hover:text-indigo-300 transition-colors line-clamp-1 flex-1"
                        >
                          {g.name}
                        </Link>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold shrink-0">
                          <Users className="w-3 h-3 text-indigo-400" />
                          {g.memberCount}
                        </span>
                      </div>

                      <p className="text-xs text-gray-400 font-mono">
                        Code: <span className="text-gray-200 font-semibold">{g.invite_code}</span>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between gap-2">
                      <button
                        onClick={() => copyInviteLink(g.invite_code)}
                        className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-indigo-300 transition-colors py-2 px-3 rounded-xl hover:bg-gray-800/60 cursor-pointer"
                        title="Copy invite link"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>

                      <Link
                        href={`/group/${g.id}`}
                        className="min-h-[44px] inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors py-2 px-3 rounded-xl hover:bg-indigo-500/10"
                      >
                        <span>View Group</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>

      {/* Create Group Modal Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-all">
          <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-2xl border border-gray-800 space-y-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-white">Create New Group</h3>
              <p className="text-xs text-gray-400">Start splitting costs with friends or roommates.</p>
            </div>

            {createdGroupInviteCode ? (
              <div className="space-y-5 pt-2">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-white text-base">Group Created Successfully!</h4>
                  <p className="text-xs text-emerald-300/90">Share this invite link with your members:</p>
                </div>

                <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 font-mono text-xs text-indigo-300 break-all select-all flex items-center justify-between gap-2">
                  <span>{`${window.location.origin}/join/${createdGroupInviteCode}`}</span>
                  <button
                    onClick={() => copyInviteLink(createdGroupInviteCode)}
                    className="p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 shrink-0 cursor-pointer"
                  >
                    {copiedCode === createdGroupInviteCode ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-indigo-400" />
                    )}
                  </button>
                </div>

                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="groupName" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Group Name
                  </label>
                  <input
                    id="groupName"
                    type="text"
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Summer Trip 2026, Apartment Expenses"
                    className="w-full glass-input px-4 py-3 rounded-xl text-sm placeholder-gray-500 font-medium"
                  />
                </div>

                {createError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                    {createError}
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newGroupName.trim() || creatingGroup}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {creatingGroup ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Group</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </main>
  )
}
