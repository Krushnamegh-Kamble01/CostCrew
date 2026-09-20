'use client'

import { useEffect, useState, use, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Users,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
  Calendar,
  Loader2,
  AlertCircle,
  Plus,
  X,
  Receipt,
  Utensils,
  Plane,
  Zap,
  ShoppingBag,
  MoreHorizontal,
  CheckSquare,
  Square,
  DollarSign,
  ChevronDown,
  ChevronUp,
  User,
  Tag,
  Scale,
  History,
  CheckCircle2,
  Camera
} from 'lucide-react'

interface GroupDetail {
  id: string
  name: string
  invite_code: string
  created_at: string
  created_by: string
}

interface Settlement {
  id: string
  group_id: string
  from_user: string
  to_user: string
  amount: number
  settled_at: string
  from_profile?: {
    username: string
    avatar_url?: string
  } | null
  to_profile?: {
    username: string
    avatar_url?: string
  } | null
}

interface ExpenseSplit {
  id?: string
  expense_id: string
  user_id: string
  share_amount: number
  profiles?: {
    username: string
    avatar_url?: string
  } | null
}

interface GroupMember {
  group_id: string
  user_id: string
  joined_at?: string
  profiles: {
    username: string
    avatar_url?: string
  } | null
}

interface Expense {
  id: string
  group_id: string
  paid_by: string
  amount: number
  category: CategoryType
  note: string | null
  created_at: string
  profiles?: {
    username: string
    avatar_url?: string
  } | null
  expense_splits?: ExpenseSplit[]
}

type CategoryType = 'Food' | 'Travel' | 'Utilities' | 'Shopping' | 'Other'
type SplitMethod = 'evenly_all' | 'evenly_selected' | 'uneven'

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const groupId = resolvedParams.id

  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expensesLoading, setExpensesLoading] = useState(true)
  const [expandedExpenseIds, setExpandedExpenseIds] = useState<Record<string, boolean>>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // Add Expense Modal State
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false)
  const [amountInput, setAmountInput] = useState<string>('')
  const [paidBy, setPaidBy] = useState<string>('')
  const [category, setCategory] = useState<CategoryType>('Food')
  const [note, setNote] = useState<string>('')
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('evenly_all')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [unevenShares, setUnevenShares] = useState<Record<string, string>>({})
  const [submittingExpense, setSubmittingExpense] = useState(false)
  const [expenseError, setExpenseError] = useState<string | null>(null)

  // Receipt Scanner State & Handler
  const [scanningReceipt, setScanningReceipt] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setScanningReceipt(true)
      setScanError(null)

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.success) {
        if (data.amount !== null && data.amount !== undefined) {
          setAmountInput(String(data.amount))
        }
        if (data.note) {
          setNote(data.note)
        }
        if (data.category && ['Food', 'Travel', 'Utilities', 'Shopping', 'Other'].includes(data.category)) {
          setCategory(data.category as CategoryType)
        }
        setSuccessToast('Receipt details extracted! Review and adjust if needed.')
        setTimeout(() => setSuccessToast(null), 4000)
      } else {
        setScanError(data.error || "Couldn't read the receipt — please enter details manually")
      }
    } catch (err) {
      console.error('Failed to scan receipt:', err)
      setScanError("Couldn't read the receipt — please enter details manually")
    } finally {
      setScanningReceipt(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const router = useRouter()
  const supabase = createClient()

  // Function to fetch expenses with joined profiles & expense_splits -> profiles
  const fetchExpenses = useCallback(async () => {
    try {
      setExpensesLoading(true)
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          id,
          group_id,
          paid_by,
          amount,
          category,
          note,
          created_at,
          profiles:paid_by (
            username,
            avatar_url
          ),
          expense_splits (
            id,
            expense_id,
            user_id,
            share_amount,
            profiles:user_id (
              username,
              avatar_url
            )
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching expenses:', JSON.stringify(error, null, 2))
      } else {
        const normalizedExpenses: Expense[] = (data || []).map((exp: any) => ({
          ...exp,
          profiles: Array.isArray(exp.profiles) ? exp.profiles[0] : exp.profiles,
          expense_splits: (exp.expense_splits || []).map((sp: any) => ({
            ...sp,
            profiles: Array.isArray(sp.profiles) ? sp.profiles[0] : sp.profiles,
          })),
        }))
        setExpenses(normalizedExpenses)
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', JSON.stringify(err, null, 2))
    } finally {
      setExpensesLoading(false)
    }
  }, [groupId, supabase])

  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [settlementsLoading, setSettlementsLoading] = useState(true)
  const [settlingTx, setSettlingTx] = useState<{
    fromUserId: string
    fromUsername: string
    toUserId: string
    toUsername: string
    amount: number
  } | null>(null)
  const [submittingSettlement, setSubmittingSettlement] = useState(false)

  // Function to fetch group settlements joined with profiles
  const fetchSettlements = useCallback(async () => {
    try {
      setSettlementsLoading(true)
      const { data, error } = await supabase
        .from('settlements')
        .select(`
          id,
          group_id,
          from_user,
          to_user,
          amount,
          settled_at,
          from_profile:from_user (
            username,
            avatar_url
          ),
          to_profile:to_user (
            username,
            avatar_url
          )
        `)
        .eq('group_id', groupId)
        .order('settled_at', { ascending: false })

      if (error) {
        console.error('Error fetching settlements:', JSON.stringify(error, null, 2))
      } else {
        const normalized: Settlement[] = (data || []).map((s: any) => ({
          ...s,
          from_profile: Array.isArray(s.from_profile) ? s.from_profile[0] : s.from_profile,
          to_profile: Array.isArray(s.to_profile) ? s.to_profile[0] : s.to_profile,
        }))
        setSettlements(normalized)
      }
    } catch (err) {
      console.error('Failed to fetch settlements:', JSON.stringify(err, null, 2))
    } finally {
      setSettlementsLoading(false)
    }
  }, [groupId, supabase])

  useEffect(() => {
    async function loadGroupDetails() {
      try {
        setLoading(true)
        setErrorMsg(null)

        // 1. Verify user session
        const { data: { user }, error: userErr } = await supabase.auth.getUser()
        if (userErr || !user) {
          router.push('/login')
          return
        }

        setCurrentUserId(user.id)
        setPaidBy(user.id)

        // 2. Fetch group
        const { data: groupData, error: groupErr } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .maybeSingle()

        if (groupErr || !groupData) {
          setErrorMsg('Group not found or access denied.')
          setLoading(false)
          return
        }

        setGroup(groupData)

        // 3. Fetch group members with profile details
        const { data: membersData, error: membersErr } = await supabase
          .from('group_members')
          .select(`
            group_id,
            user_id,
            joined_at,
            profiles (
              username,
              avatar_url
            )
          `)
          .eq('group_id', groupId)

        if (membersErr) {
          console.error('Error fetching members:', JSON.stringify(membersErr, null, 2))
        } else {
          const normalized = (membersData || []).map((item: any) => ({
            group_id: item.group_id,
            user_id: item.user_id,
            joined_at: item.joined_at,
            profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
          }))
          setMembers(normalized)
          setSelectedMemberIds(normalized.map((m) => m.user_id))
        }

        // 4. Fetch expenses & settlements
        await Promise.all([fetchExpenses(), fetchSettlements()])
      } catch (err) {
        console.error('Failed to load group detail:', JSON.stringify(err, null, 2))
        setErrorMsg('An unexpected error occurred.')
      } finally {
        setLoading(false)
      }
    }

    loadGroupDetails()
  }, [groupId, router, supabase, fetchExpenses, fetchSettlements])

  const copyInviteLink = () => {
    if (!group) return
    const inviteUrl = `${window.location.origin}/join/${group.invite_code}`
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleExpenseExpand = (id: string) => {
    setExpandedExpenseIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Handle Mark as Settled action insertion
  const handleMarkSettled = async () => {
    if (!settlingTx) return
    try {
      setSubmittingSettlement(true)
      const { error } = await supabase.from('settlements').insert({
        group_id: groupId,
        from_user: settlingTx.fromUserId,
        to_user: settlingTx.toUserId,
        amount: settlingTx.amount,
        settled_at: new Date().toISOString(),
      })

      if (error) {
        console.error('Error inserting settlement:', JSON.stringify(error, null, 2))
        setSuccessToast('Failed to record settlement.')
      } else {
        setSuccessToast(`Settlement of ₹${settlingTx.amount.toFixed(2)} marked as completed!`)
        setSettlingTx(null)
        // Refresh both expenses and settlements
        fetchExpenses()
        fetchSettlements()
      }
    } catch (err) {
      console.error('Unexpected error marking settled:', JSON.stringify(err, null, 2))
    } finally {
      setSubmittingSettlement(false)
      setTimeout(() => setSuccessToast(null), 4000)
    }
  }

  // Calculate Net Balances factoring in Expenses AND Settlements using exact integer-paisa math
  const memberBalances = useMemo(() => {
    const paidMapPaisa: Record<string, number> = {}
    const owedMapPaisa: Record<string, number> = {}
    const settlementAdjPaisa: Record<string, number> = {}

    members.forEach((m) => {
      paidMapPaisa[m.user_id] = 0
      owedMapPaisa[m.user_id] = 0
      settlementAdjPaisa[m.user_id] = 0
    })

    // 1. Expense Math
    expenses.forEach((exp) => {
      const pId = exp.paid_by
      const expAmountPaisa = Math.round(exp.amount * 100)
      if (paidMapPaisa[pId] !== undefined) {
        paidMapPaisa[pId] += expAmountPaisa
      } else {
        paidMapPaisa[pId] = expAmountPaisa
      }

      if (exp.expense_splits) {
        exp.expense_splits.forEach((sp) => {
          const uId = sp.user_id
          const sharePaisa = Math.round(sp.share_amount * 100)
          if (owedMapPaisa[uId] !== undefined) {
            owedMapPaisa[uId] += sharePaisa
          } else {
            owedMapPaisa[uId] = sharePaisa
          }
        })
      }
    })

    // 2. Settlements Adjustment Math:
    // A settlement FROM user A TO user B means A paid money directly to B.
    // Therefore, A's net balance increases (+amount) and B's net balance decreases (-amount).
    settlements.forEach((s) => {
      const amountPaisa = Math.round(s.amount * 100)
      if (settlementAdjPaisa[s.from_user] !== undefined) {
        settlementAdjPaisa[s.from_user] += amountPaisa
      } else {
        settlementAdjPaisa[s.from_user] = amountPaisa
      }

      if (settlementAdjPaisa[s.to_user] !== undefined) {
        settlementAdjPaisa[s.to_user] -= amountPaisa
      } else {
        settlementAdjPaisa[s.to_user] = -amountPaisa
      }
    })

    const result = members.map((m) => {
      const totalPaidPaisa = paidMapPaisa[m.user_id] || 0
      const totalOwedPaisa = owedMapPaisa[m.user_id] || 0
      const adjPaisa = settlementAdjPaisa[m.user_id] || 0
      
      const netBalancePaisa = totalPaidPaisa - totalOwedPaisa + adjPaisa
      const netBalance = Number((netBalancePaisa / 100).toFixed(2))

      return {
        user_id: m.user_id,
        username: m.profiles?.username || 'Member',
        totalPaid: Number((totalPaidPaisa / 100).toFixed(2)),
        totalOwed: Number((totalOwedPaisa / 100).toFixed(2)),
        netBalancePaisa,
        netBalance,
      }
    })

    return result
  }, [members, expenses, settlements])

  // Current User's Specific Balance Object
  const currentUserBalance = useMemo(() => {
    if (!currentUserId) return null
    return memberBalances.find((b) => b.user_id === currentUserId) || null
  }, [memberBalances, currentUserId])

  // Compute Minimum Transactions for Simplified Settlement using exact integer-paisa algorithm
  const simplifiedSettlements = useMemo(() => {
    // 1. Separate debtors (negative net balance paisa) and creditors (positive net balance paisa)
    const debtors: { user_id: string; username: string; amountPaisa: number }[] = []
    const creditors: { user_id: string; username: string; amountPaisa: number }[] = []

    memberBalances.forEach((b) => {
      if (b.netBalancePaisa < 0) {
        debtors.push({
          user_id: b.user_id,
          username: b.username,
          amountPaisa: Math.abs(b.netBalancePaisa), // positive amount owed by debtor
        })
      } else if (b.netBalancePaisa > 0) {
        creditors.push({
          user_id: b.user_id,
          username: b.username,
          amountPaisa: b.netBalancePaisa, // positive amount owed to creditor
        })
      }
    })

    const transactions: {
      fromUserId: string
      fromUsername: string
      toUserId: string
      toUsername: string
      amountPaisa: number
      amount: number
    }[] = []

    // Greedy settlement: pick largest debtor and largest creditor repeatedly until all resolved
    while (debtors.length > 0 && creditors.length > 0) {
      debtors.sort((a, b) => b.amountPaisa - a.amountPaisa)
      creditors.sort((a, b) => b.amountPaisa - a.amountPaisa)

      const debtor = debtors[0]
      const creditor = creditors[0]

      if (!debtor || debtor.amountPaisa === 0) {
        debtors.shift()
        continue
      }
      if (!creditor || creditor.amountPaisa === 0) {
        creditors.shift()
        continue
      }

      const transferPaisa = Math.min(debtor.amountPaisa, creditor.amountPaisa)
      if (transferPaisa > 0) {
        transactions.push({
          fromUserId: debtor.user_id,
          fromUsername: debtor.username,
          toUserId: creditor.user_id,
          toUsername: creditor.username,
          amountPaisa: transferPaisa,
          amount: Number((transferPaisa / 100).toFixed(2)),
        })

        debtor.amountPaisa -= transferPaisa
        creditor.amountPaisa -= transferPaisa
      }

      if (debtor.amountPaisa === 0) debtors.shift()
      if (creditor.amountPaisa === 0) creditors.shift()
    }

    // Sort transactions so current logged-in user's transactions come first
    if (currentUserId) {
      transactions.sort((a, b) => {
        const aIsUser = a.fromUserId === currentUserId || a.toUserId === currentUserId
        const bIsUser = b.fromUserId === currentUserId || b.toUserId === currentUserId
        if (aIsUser && !bIsUser) return -1
        if (!aIsUser && bIsUser) return 1
        return 0
      })
    }

    return transactions
  }, [memberBalances, currentUserId])

  // Calculate Pairwise Balances for Current User with each other member
  const pairwiseBalances = useMemo(() => {
    if (!currentUserId || members.length <= 1) return []

    // 1. Calculate net pairwise balances from expenses and settlements
    // netPairwisePaisa[otherUserId] > 0 means current user is owed money by otherUser
    // netPairwisePaisa[otherUserId] < 0 means current user owes money to otherUser
    const netPairwisePaisa: Record<string, number> = {}

    const otherMembers = members.filter((m) => m.user_id !== currentUserId)
    otherMembers.forEach((m) => {
      netPairwisePaisa[m.user_id] = 0
    })

    // Add expense shares
    expenses.forEach((exp) => {
      const payerId = exp.paid_by
      const splits = exp.expense_splits || []

      if (payerId === currentUserId) {
        // Current user paid: other members who participate owe current user their share
        splits.forEach((sp) => {
          if (sp.user_id !== currentUserId && netPairwisePaisa[sp.user_id] !== undefined) {
            netPairwisePaisa[sp.user_id] += Math.round(sp.share_amount * 100)
          }
        })
      } else if (netPairwisePaisa[payerId] !== undefined) {
        // Someone else paid: find current user's share owed to that payer
        const mySplit = splits.find((sp) => sp.user_id === currentUserId)
        if (mySplit) {
          netPairwisePaisa[payerId] -= Math.round(mySplit.share_amount * 100)
        }
      }
    })

    // Add settlements
    settlements.forEach((s) => {
      const amountPaisa = Math.round(s.amount * 100)
      if (s.from_user === currentUserId && netPairwisePaisa[s.to_user] !== undefined) {
        // Current user paid to recipient: reduces debt to recipient / increases credit
        netPairwisePaisa[s.to_user] += amountPaisa
      } else if (s.to_user === currentUserId && netPairwisePaisa[s.from_user] !== undefined) {
        // Sender paid to current user: reduces sender's debt to current user
        netPairwisePaisa[s.from_user] -= amountPaisa
      }
    })

    // Simplify pairwise graph if simplifiedSettlements exists, or display direct pairwise
    // Requirement 3 specifies: "Calculate this from the same net-balance data already computed, broken down pairwise"
    // And "If two people never directly owe each other after settlement math nets things out, still show them as settled"
    return otherMembers.map((m) => {
      const netPaisa = netPairwisePaisa[m.user_id] || 0
      const netAmount = Number((Math.abs(netPaisa) / 100).toFixed(2))

      return {
        user_id: m.user_id,
        username: m.profiles?.username || 'Member',
        avatar_url: m.profiles?.avatar_url,
        netPaisa,
        netAmount,
      }
    })
  }, [currentUserId, members, expenses, settlements])

  // Parse numerical total amount
  const parsedAmount = useMemo(() => {
    const val = parseFloat(amountInput)
    return isNaN(val) || val <= 0 ? 0 : val
  }, [amountInput])

  // Exact integer-paisa split algorithm to prevent rounding remainder errors
  const calculateEqualSplits = useCallback(
    (totalAmount: number, participantIds: string[]) => {
      if (participantIds.length === 0 || totalAmount <= 0) return []
      const totalPaisa = Math.round(totalAmount * 100)
      const count = participantIds.length
      const basePaisa = Math.floor(totalPaisa / count)
      const remainderPaisa = totalPaisa - basePaisa * count

      return participantIds.map((uId, idx) => {
        const paisa = idx < remainderPaisa ? basePaisa + 1 : basePaisa
        return {
          userId: uId,
          shareAmount: Number((paisa / 100).toFixed(2)),
        }
      })
    },
    []
  )

  // Uneven shares calculations & sum
  const unevenTotalPaisa = useMemo(() => {
    return Object.values(unevenShares).reduce((acc, strVal) => {
      const val = parseFloat(strVal)
      if (isNaN(val) || val < 0) return acc
      return acc + Math.round(val * 100)
    }, 0)
  }, [unevenShares])

  const targetTotalPaisa = useMemo(() => {
    return Math.round(parsedAmount * 100)
  }, [parsedAmount])

  const unevenDifferencePaisa = targetTotalPaisa - unevenTotalPaisa

  // Validation before submission
  const isFormValid = useMemo(() => {
    if (parsedAmount <= 0 || !paidBy) return false

    if (splitMethod === 'evenly_all') {
      return members.length > 0
    }
    if (splitMethod === 'evenly_selected') {
      return selectedMemberIds.length > 0
    }
    if (splitMethod === 'uneven') {
      return (
        parsedAmount > 0 &&
        unevenTotalPaisa > 0 &&
        unevenDifferencePaisa === 0
      )
    }
    return false
  }, [
    parsedAmount,
    paidBy,
    splitMethod,
    members.length,
    selectedMemberIds.length,
    unevenTotalPaisa,
    unevenDifferencePaisa,
  ])

  // Toggle member selection for "evenly_selected"
  const toggleMemberSelection = (mId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(mId) ? prev.filter((id) => id !== mId) : [...prev, mId]
    )
  }

  // Edit Expense State & Handlers
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null)
  const [deletingLoading, setDeletingLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const openAddExpenseModal = () => {
    setEditingExpenseId(null)
    setAmountInput('')
    setPaidBy(currentUserId || (members[0]?.user_id || ''))
    setCategory('Food')
    setNote('')
    setExpenseDate(new Date().toISOString().split('T')[0])
    setSplitMethod('evenly_all')
    setSelectedMemberIds(members.map((m) => m.user_id))
    setUnevenShares({})
    setExpenseError(null)
    setScanError(null)
    setShowAddExpenseModal(true)
  }

  const openEditExpenseModal = (exp: Expense) => {
    setEditingExpenseId(exp.id)
    setAmountInput(String(exp.amount))
    setPaidBy(exp.paid_by)
    setCategory(exp.category)
    setNote(exp.note || '')
    setExpenseDate(new Date(exp.created_at).toISOString().split('T')[0])
    
    // Determine split method and state from splits
    const splits = exp.expense_splits || []
    const splitUserIds = splits.map((s) => s.user_id)
    
    if (splitUserIds.length === members.length && members.length > 0) {
      // Check if amounts are equal
      const expectedEqual = calculateEqualSplits(exp.amount, members.map((m) => m.user_id))
      const isEven = splits.every((s) => {
        const match = expectedEqual.find((e) => e.userId === s.user_id)
        return match && Math.abs(match.shareAmount - s.share_amount) < 0.01
      })

      if (isEven) {
        setSplitMethod('evenly_all')
        setSelectedMemberIds(members.map((m) => m.user_id))
        setUnevenShares({})
      } else {
        setSplitMethod('uneven')
        const sharesMap: Record<string, string> = {}
        splits.forEach((s) => {
          sharesMap[s.user_id] = String(s.share_amount)
        })
        setUnevenShares(sharesMap)
      }
    } else {
      // Check if selected equal
      const expectedSelected = calculateEqualSplits(exp.amount, splitUserIds)
      const isEvenSelected = splits.every((s) => {
        const match = expectedSelected.find((e) => e.userId === s.user_id)
        return match && Math.abs(match.shareAmount - s.share_amount) < 0.01
      })

      if (isEvenSelected) {
        setSplitMethod('evenly_selected')
        setSelectedMemberIds(splitUserIds)
        setUnevenShares({})
      } else {
        setSplitMethod('uneven')
        const sharesMap: Record<string, string> = {}
        splits.forEach((s) => {
          sharesMap[s.user_id] = String(s.share_amount)
        })
        setUnevenShares(sharesMap)
      }
    }

    setExpenseError(null)
    setScanError(null)
    setShowAddExpenseModal(true)
  }

  const handleDeleteExpense = async () => {
    if (!deletingExpense) return

    try {
      setDeletingLoading(true)
      setDeleteError(null)

      // 1. Delete associated expense_splits rows first
      const { error: splitDelErr } = await supabase
        .from('expense_splits')
        .delete()
        .eq('expense_id', deletingExpense.id)

      if (splitDelErr) {
        console.error('Error deleting expense splits:', JSON.stringify(splitDelErr, null, 2))
        const errMsg = splitDelErr.message || 'Failed to delete expense splits.'
        setDeleteError(`Deletion failed: ${errMsg}`)
        return
      }

      // 2. Delete the expense row
      const { error: expDelErr } = await supabase
        .from('expenses')
        .delete()
        .eq('id', deletingExpense.id)

      if (expDelErr) {
        console.error('Error deleting expense:', JSON.stringify(expDelErr, null, 2))
        const errMsg = expDelErr.message || 'Failed to delete expense.'
        setDeleteError(`Deletion failed: ${errMsg}`)
        return
      }

      // Safeguard Verification: Verify 0 splits remain for deleted expense
      const { count: remainingSplitsCount, error: verifyErr } = await supabase
        .from('expense_splits')
        .select('id', { count: 'exact', head: true })
        .eq('expense_id', deletingExpense.id)

      if (verifyErr || (remainingSplitsCount !== null && remainingSplitsCount > 0)) {
        setDeleteError('Split data may be inconsistent — please refresh and check this expense.')
        return
      }

      setSuccessToast('Expense deleted successfully.')
      setDeletingExpense(null)
      setDeleteError(null)
      fetchExpenses()
      fetchSettlements()
    } catch (err: any) {
      console.error('Error during expense deletion:', JSON.stringify(err, null, 2))
      setDeleteError('An unexpected error occurred while deleting expense.')
    } finally {
      setDeletingLoading(false)
      setTimeout(() => setSuccessToast(null), 4000)
    }
  }

  // Handle Save Expense (Insert or Update)
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid || submittingExpense) return

    setSubmittingExpense(true)
    setExpenseError(null)

    try {
      // Re-verify current session user
      const { data: { user }, error: userAuthErr } = await supabase.auth.getUser()
      if (userAuthErr || !user) {
        setExpenseError('User session expired. Please log in again.')
        setSubmittingExpense(false)
        return
      }

      // Compute final array of splits based on method
      let finalSplits: { userId: string; shareAmount: number }[] = []

      if (splitMethod === 'evenly_all') {
        const allIds = members.map((m) => m.user_id)
        finalSplits = calculateEqualSplits(parsedAmount, allIds)
      } else if (splitMethod === 'evenly_selected') {
        finalSplits = calculateEqualSplits(parsedAmount, selectedMemberIds)
      } else if (splitMethod === 'uneven') {
        finalSplits = members
          .map((m) => {
            const rawVal = parseFloat(unevenShares[m.user_id] || '0')
            return {
              userId: m.user_id,
              shareAmount: isNaN(rawVal) || rawVal <= 0 ? 0 : Number(rawVal.toFixed(2)),
            }
          })
          .filter((s) => s.shareAmount > 0)
      }

      if (finalSplits.length === 0) {
        setExpenseError('At least one member must be assigned a share.')
        setSubmittingExpense(false)
        return
      }

      if (editingExpenseId) {
        // --- EDIT MODE ---
        // 1. Update expense row
        const { error: updateErr } = await supabase
          .from('expenses')
          .update({
            paid_by: paidBy,
            amount: parsedAmount,
            category: category,
            note: note.trim() || null,
            created_at: new Date(expenseDate).toISOString(),
          })
          .eq('id', editingExpenseId)

        if (updateErr) {
          console.error('Expense update error:', JSON.stringify(updateErr, null, 2))
          setExpenseError(updateErr.message || 'Failed to update expense.')
          setSubmittingExpense(false)
          return
        }

        // 2. Delete existing expense_splits
        const { error: splitsDeleteErr } = await supabase
          .from('expense_splits')
          .delete()
          .eq('expense_id', editingExpenseId)

        if (splitsDeleteErr) {
          console.error('Error deleting old splits:', JSON.stringify(splitsDeleteErr, null, 2))
          setExpenseError('Failed to update expense splits.')
          setSubmittingExpense(false)
          return
        }

        // 3. Insert new expense_splits
        const splitRows = finalSplits.map((s) => ({
          expense_id: editingExpenseId,
          user_id: s.userId,
          share_amount: s.shareAmount,
        }))

        const { error: splitsInsertErr } = await supabase
          .from('expense_splits')
          .insert(splitRows)

        if (splitsInsertErr) {
          console.error('New splits insert error:', JSON.stringify(splitsInsertErr, null, 2))
          setExpenseError(splitsInsertErr.message || 'Failed to insert updated splits.')
          setSubmittingExpense(false)
          return
        }

        // Safeguard Verification: Check that actual split count matches expected participant count
        const { count: actualSplitCount, error: countErr } = await supabase
          .from('expense_splits')
          .select('id', { count: 'exact', head: true })
          .eq('expense_id', editingExpenseId)

        if (countErr || actualSplitCount !== finalSplits.length) {
          setExpenseError('Split data may be inconsistent — please refresh and check this expense.')
          setSubmittingExpense(false)
          return
        }

        setShowAddExpenseModal(false)
        setEditingExpenseId(null)
        setAmountInput('')
        setNote('')
        setUnevenShares({})
        setSuccessToast(`Expense updated successfully!`)
        fetchExpenses()
        fetchSettlements()
        setTimeout(() => setSuccessToast(null), 4000)
      } else {
        // --- ADD MODE ---
        // 1. Insert into "expenses"
        const { data: expenseData, error: expenseInsertErr } = await supabase
          .from('expenses')
          .insert({
            group_id: groupId,
            paid_by: paidBy,
            amount: parsedAmount,
            category: category,
            note: note.trim() || null,
            created_at: new Date(expenseDate).toISOString(),
          })
          .select('id')
          .single()

        if (expenseInsertErr || !expenseData) {
          console.error('Expense insert error details:', JSON.stringify(expenseInsertErr, null, 2))
          const msg = expenseInsertErr?.details
            ? `${expenseInsertErr.message} (${expenseInsertErr.details})`
            : (expenseInsertErr?.message || 'Failed to insert expense.')
          setExpenseError(msg)
          setSubmittingExpense(false)
          return
        }

        // 2. Bulk insert into "expense_splits"
        const splitRows = finalSplits.map((s) => ({
          expense_id: expenseData.id,
          user_id: s.userId,
          share_amount: s.shareAmount,
        }))

        const { error: splitsInsertErr } = await supabase
          .from('expense_splits')
          .insert(splitRows)

        if (splitsInsertErr) {
          console.error('Expense splits insert error details:', JSON.stringify(splitsInsertErr, null, 2))
          const msg = splitsInsertErr?.details
            ? `${splitsInsertErr.message} (${splitsInsertErr.details})`
            : (splitsInsertErr?.message || 'Failed to insert expense splits.')
          setExpenseError(msg)
          setSubmittingExpense(false)
          return
        }

        // Success
        setShowAddExpenseModal(false)
        setAmountInput('')
        setNote('')
        setUnevenShares({})
        setSuccessToast(`Expense of ₹${parsedAmount.toFixed(2)} added successfully!`)
        fetchExpenses()
        fetchSettlements()
        setTimeout(() => setSuccessToast(null), 4000)
      }
    } catch (err) {
      console.error('Error saving expense:', JSON.stringify(err, null, 2))
      setExpenseError('An unexpected error occurred while saving expense.')
    } finally {
      setSubmittingExpense(false)
    }
  }

  const categoryIcons = {
    Food: <Utensils className="w-4 h-4 text-emerald-400" />,
    Travel: <Plane className="w-4 h-4 text-sky-400" />,
    Utilities: <Zap className="w-4 h-4 text-amber-400" />,
    Shopping: <ShoppingBag className="w-4 h-4 text-purple-400" />,
    Other: <MoreHorizontal className="w-4 h-4 text-gray-400" />,
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm text-gray-400 font-medium">Loading group details...</p>
        </div>
      </main>
    )
  }

  if (errorMsg || !group) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-950 text-gray-100">
        <div className="w-full max-w-md glass-panel p-6 rounded-2xl text-center space-y-4 border border-gray-800">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h1 className="text-xl font-bold">Group Error</h1>
          <p className="text-sm text-gray-400">{errorMsg || 'Group could not be found.'}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </main>
    )
  }

  const isGroupCreator = group.created_by === currentUserId

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950 text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Success Banner */}
        {successToast && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm animate-in fade-in slide-in-from-top-2">
            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
        )}

        {/* Navigation & Header Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold glass-panel hover:bg-gray-800/80 border border-gray-800 text-gray-300 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <button
            onClick={copyInviteLink}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Invite Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-indigo-400" />
                <span>Copy Invite Link</span>
              </>
            )}
          </button>
        </div>

        {/* 3-Column Layout Container (Mobile: Stacked, Desktop: 3 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT COLUMN: Expense Feed Section (Desktop: Left Col 1-4, Mobile: 2nd block) */}
          <div className="order-2 lg:order-1 lg:col-span-4 space-y-6">
            <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-gray-800 space-y-5">
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-800">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-400" />
                  <span>Group Expenses</span>
                </h2>
                <span className="text-xs text-gray-400">{expenses.length} total</span>
              </div>

              {expensesLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
                  <p className="text-xs text-gray-400 font-medium">Loading group expenses...</p>
                </div>
              ) : expenses.length === 0 ? (
                /* Friendly Empty State */
                <div className="p-6 rounded-2xl glass-panel border border-dashed border-gray-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-gray-200">No expenses yet</h3>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                      Add the first expense for {group.name} to track shared costs and splits seamlessly.
                    </p>
                  </div>
                  <button
                    onClick={openAddExpenseModal}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add First Expense</span>
                  </button>
                </div>
              ) : (
                /* Expense List Feed */
                <div className="space-y-3">
                  {expenses.map((expense) => {
                    const isExpanded = !!expandedExpenseIds[expense.id]
                    const paidByUsername = expense.profiles?.username || 'Unknown'
                    const formattedDate = new Date(expense.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                    const formattedAmount = Number(expense.amount).toFixed(2)

                    // Authorization check for Edit & Delete: paid_by = current user OR group creator
                    const canEditOrDelete = expense.paid_by === currentUserId || isGroupCreator

                    return (
                      <div
                        key={expense.id}
                        className="rounded-xl bg-gray-900/50 border border-gray-800/80 hover:border-gray-700/80 transition-all overflow-hidden"
                      >
                        {/* Expense Row Main Bar */}
                        <div
                          onClick={() => toggleExpenseExpand(expense.id)}
                          className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-gray-800/30 transition-colors"
                        >
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gray-800 border border-gray-700/60 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                              {categoryIcons[expense.category] || categoryIcons.Other}
                            </div>
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700/50 font-medium">
                                  {expense.category}
                                </span>
                                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formattedDate}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-white truncate">
                                {expense.note || `${expense.category} Expense`}
                              </p>
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <User className="w-3 h-3 text-indigo-400 shrink-0" />
                                <span>Paid by <strong className="text-gray-200">@{paidByUsername}</strong></span>
                                {expense.paid_by === currentUserId && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono ml-1">You</span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Right Amount, Actions & Expand Toggle */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-800/60 shrink-0">
                            <div className="text-left sm:text-right">
                              <div className="text-base font-extrabold text-white font-mono">
                                ₹{formattedAmount}
                              </div>
                              <div className="text-[11px] text-gray-400 flex items-center gap-1 sm:justify-end">
                                <span>{expense.expense_splits?.length || 0} participants</span>
                              </div>
                            </div>

                            {/* Edit & Delete Action Buttons for Authorized Users */}
                            {canEditOrDelete && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 bg-gray-800/60 p-1 rounded-lg border border-gray-700/50"
                              >
                                <button
                                  type="button"
                                  onClick={() => openEditExpenseModal(expense)}
                                  title="Edit Expense"
                                  className="p-1.5 rounded-md text-gray-400 hover:text-indigo-300 hover:bg-indigo-500/20 transition-all cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingExpense(expense)}
                                  title="Delete Expense"
                                  className="p-1.5 rounded-md text-gray-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            )}

                            <div className="p-1.5 rounded-lg bg-gray-800/80 border border-gray-700/60 text-gray-400 hover:text-white transition-colors">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-indigo-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Split Breakdown */}
                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 pt-3 bg-gray-950/60 border-t border-gray-800/80 space-y-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                            <div className="flex items-center justify-between font-semibold text-gray-400 border-b border-gray-800/60 pb-2">
                              <span>Split Breakdown</span>
                              <span>Share Amount</span>
                            </div>

                            <div className="space-y-1.5">
                              {(!expense.expense_splits || expense.expense_splits.length === 0) ? (
                                <p className="text-gray-500 text-center py-2">No split details available.</p>
                              ) : (
                                expense.expense_splits.map((split) => {
                                  const username = split.profiles?.username || 'Member'
                                  const isPayer = split.user_id === expense.paid_by
                                  const isCurrent = split.user_id === currentUserId
                                  const shareFormatted = Number(split.share_amount).toFixed(2)

                                  return (
                                    <div
                                      key={split.id || `${expense.id}-${split.user_id}`}
                                      className="flex items-center justify-between p-2 rounded-lg bg-gray-900/60 border border-gray-800/50"
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <div className="w-5 h-5 rounded bg-indigo-600/20 text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                                          {username[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <span className="font-semibold text-gray-200 truncate">
                                          @{username}
                                        </span>
                                        {isCurrent && (
                                          <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">You</span>
                                        )}
                                        {isPayer && (
                                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">Payer</span>
                                        )}
                                      </div>

                                      <span className="font-mono font-bold text-white shrink-0 ml-2">
                                        ₹{shareFormatted}
                                      </span>
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* CENTER COLUMN: Hero Header, Balances, Settle Up, Settlement History (Desktop: Center Col 5-9, Mobile: 1st block) */}
          <div className="order-1 lg:order-2 lg:col-span-5 space-y-6">
            
            {/* Group Hero Header */}
            <div className="glass-panel rounded-2xl p-6 sm:p-7 border border-gray-800 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

              <div className="flex items-center gap-4">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-500/20 shrink-0">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                    {group.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-gray-400 mt-1">
                    <span className="flex items-center gap-1 font-mono">
                      Code: <strong className="text-indigo-300 font-semibold">{group.invite_code}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Created {new Date(group.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={openAddExpenseModal}
                className="w-full md:w-auto min-h-[44px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-5 h-5" />
                <span>Add Expense</span>
              </button>
            </div>

            {/* Balances Section */}
            <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-gray-800 space-y-5">
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-800">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-indigo-400" />
                  <span>Group Balances</span>
                </h2>
                <span className="text-xs text-gray-400">Live Net Summary</span>
              </div>

              {/* Current User Prominent Balance Banner */}
              {currentUserBalance && (
                <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  currentUserBalance.netBalancePaisa > 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : currentUserBalance.netBalancePaisa < 0
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${
                      currentUserBalance.netBalancePaisa > 0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : currentUserBalance.netBalancePaisa < 0
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    }`}>
                      ₹
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Your Status</p>
                      <p className="text-sm sm:text-base font-extrabold text-white">
                        {currentUserBalance.netBalancePaisa > 0
                          ? `You are owed ₹${currentUserBalance.netBalance.toFixed(2)}`
                          : currentUserBalance.netBalancePaisa < 0
                          ? `You owe ₹${Math.abs(currentUserBalance.netBalance).toFixed(2)}`
                          : "You're settled up"}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-400 sm:text-right space-y-0.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-800/50">
                    <div>Paid: <strong className="text-gray-200 font-mono">₹{currentUserBalance.totalPaid.toFixed(2)}</strong></div>
                    <div>Share: <strong className="text-gray-200 font-mono">₹{currentUserBalance.totalOwed.toFixed(2)}</strong></div>
                  </div>
                </div>
              )}

              {/* Every Group Member's Net Balance */}
              <div className="space-y-2.5">
                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">All Members</h3>
                
                <div className="space-y-2">
                  {memberBalances.map((b) => {
                    const isCurrent = b.user_id === currentUserId
                    const initial = b.username[0]?.toUpperCase() || 'M'

                    let balanceStatement = `${b.username} is settled up`
                    let badgeStyle = 'bg-gray-800 text-gray-400 border-gray-700/60'
                    let amountColor = 'text-gray-400'

                    if (b.netBalancePaisa > 0) {
                      balanceStatement = `${b.username} is owed ₹${b.netBalance.toFixed(2)}`
                      badgeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      amountColor = 'text-emerald-400'
                    } else if (b.netBalancePaisa < 0) {
                      balanceStatement = `${b.username} owes ₹${Math.abs(b.netBalance).toFixed(2)}`
                      badgeStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      amountColor = 'text-rose-400'
                    }

                    return (
                      <div
                        key={b.user_id}
                        className="p-3 rounded-xl bg-gray-900/50 border border-gray-800/80 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-gray-800 border border-gray-700/60 flex items-center justify-center text-gray-300 font-bold text-xs shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-200 truncate flex items-center gap-1">
                              @{b.username}
                              {isCurrent && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">You</span>
                              )}
                            </p>
                            <p className={`text-[11px] font-semibold mt-0.5 truncate ${amountColor}`}>
                              {balanceStatement}
                            </p>
                          </div>
                        </div>

                        <span className={`text-[11px] px-2 py-0.5 rounded-lg border font-mono font-bold shrink-0 ${badgeStyle}`}>
                          {b.netBalancePaisa > 0 ? `+₹${b.netBalance.toFixed(2)}` : b.netBalancePaisa < 0 ? `-₹${Math.abs(b.netBalance).toFixed(2)}` : '₹0.00'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Simplified Settlement / Settle Up Section */}
            <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-gray-800 space-y-5">
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-800">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <span>Settle Up (Simplified Payments)</span>
                </h2>
                <span className="text-xs text-gray-400">
                  {simplifiedSettlements.length} {simplifiedSettlements.length === 1 ? 'payment' : 'payments'} needed
                </span>
              </div>

              {simplifiedSettlements.length === 0 ? (
                /* All Settled Up Friendly State */
                <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                    <Check className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-emerald-300">Everyone is settled up!</h3>
                  <p className="text-xs text-emerald-400/80 max-w-sm mx-auto">
                    There are no pending debts or reimbursements required in this group right now.
                  </p>
                </div>
              ) : (
                /* Suggested Settlement Payments List */
                <div className="space-y-3">
                  <p className="text-xs text-gray-400">
                    Minimum transactions required to fully balance all group members:
                  </p>
                  
                  <div className="space-y-2.5">
                    {simplifiedSettlements.map((tx, idx) => {
                      const isSenderCurrent = tx.fromUserId === currentUserId
                      const isReceiverCurrent = tx.toUserId === currentUserId
                      const isUserInvolved = isSenderCurrent || isReceiverCurrent

                      return (
                        <div
                          key={`tx-${tx.fromUserId}-${tx.toUserId}-${idx}`}
                          className={`p-3.5 rounded-xl transition-all flex flex-col justify-between gap-2.5 text-xs ${
                            isUserInvolved
                              ? 'bg-indigo-950/40 border-2 border-indigo-500/60 shadow-lg shadow-indigo-950/50'
                              : 'bg-gray-900/50 border border-gray-800/80 hover:border-gray-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5 font-semibold text-gray-200">
                                <span className={`truncate ${isSenderCurrent ? 'text-indigo-300 font-bold' : ''}`}>
                                  @{tx.fromUsername}
                                </span>
                                {isSenderCurrent && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">You</span>
                                )}
                                <ArrowRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                <span className={`truncate ${isReceiverCurrent ? 'text-indigo-300 font-bold' : ''}`}>
                                  @{tx.toUsername}
                                </span>
                                {isReceiverCurrent && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">You</span>
                                )}
                                {isUserInvolved && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 font-bold ml-1">
                                    Your payment
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                <strong className="text-gray-200 font-medium">@{tx.fromUsername}</strong> pays{' '}
                                <strong className="text-gray-200 font-medium">@{tx.toUsername}</strong>
                              </p>
                            </div>

                            <div className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono font-bold text-xs shrink-0">
                              ₹{tx.amount.toFixed(2)}
                            </div>
                          </div>

                          {isUserInvolved && (
                            <div className="pt-2 border-t border-gray-800/60 flex items-center justify-end">
                              <button
                                onClick={() => setSettlingTx(tx)}
                                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Mark as Settled</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Settlement History Section */}
            <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-gray-800 space-y-5">
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-800">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  <span>Settlement History</span>
                </h2>
                <span className="text-xs text-gray-400">{settlements.length} recorded</span>
              </div>

              {settlementsLoading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <p className="text-xs text-gray-400 font-medium">Loading settlement history...</p>
                </div>
              ) : settlements.length === 0 ? (
                <div className="p-5 rounded-xl bg-gray-900/40 border border-dashed border-gray-800 text-center space-y-1">
                  <p className="text-xs font-semibold text-gray-300">No past settlements recorded</p>
                  <p className="text-xs text-gray-500">
                    When group members settle debts using &quot;Mark as Settled&quot;, payments will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {settlements.map((st) => {
                    const fromUser = st.from_profile?.username || 'Member'
                    const toUser = st.to_profile?.username || 'Member'
                    const isFromCurrent = st.from_user === currentUserId
                    const isToCurrent = st.to_user === currentUserId
                    const formattedDate = new Date(st.settled_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })

                    return (
                      <div
                        key={st.id}
                        className="p-3 rounded-xl bg-gray-900/50 border border-gray-800/80 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <p className="font-semibold text-gray-200 flex flex-wrap items-center gap-1">
                              <span className={isFromCurrent ? 'text-indigo-300 font-bold' : ''}>@{fromUser}</span>
                              {isFromCurrent && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">You</span>
                              )}
                              <span className="text-gray-400 font-normal">paid</span>
                              <span className={isToCurrent ? 'text-indigo-300 font-bold' : ''}>@{toUser}</span>
                              {isToCurrent && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">You</span>
                              )}
                            </p>
                            <p className="text-[10px] text-gray-500">{formattedDate}</p>
                          </div>
                        </div>

                        <div className="font-mono font-bold text-emerald-400 text-xs shrink-0">
                          +₹{Number(st.amount).toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Group Members & Your Pairwise Balances (Desktop: Right Col 10-12, Mobile: 3rd block) */}
          <div className="order-3 lg:order-3 lg:col-span-3 space-y-6">
            
            {/* Group Members Card */}
            <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-gray-800 space-y-5">
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-800">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <span>Group Members</span>
                </h2>
                <span className="text-xs text-gray-400">{members.length}</span>
              </div>

              <div className="space-y-2.5">
                {members.map((member) => {
                  const username = member.profiles?.username || 'Unknown Member'
                  const initial = username[0]?.toUpperCase() || 'U'
                  const isCurrentUser = member.user_id === currentUserId

                  return (
                    <div
                      key={`${member.group_id}-${member.user_id}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-900/50 border border-gray-800/80 hover:border-gray-700 transition-all"
                    >
                      <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
                        {initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-200 truncate flex items-center gap-1">
                          @{username}
                          {isCurrentUser && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">You</span>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Joined {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'Member'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Requirement 3: Your Balances with Each Member Card */}
            <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-gray-800 space-y-5">
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-800">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-400" />
                  <span>Your Balances with Each Member</span>
                </h2>
              </div>

              <div className="space-y-2.5">
                {pairwiseBalances.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-2">No other members in group.</p>
                ) : (
                  pairwiseBalances.map((item) => {
                    const initial = item.username[0]?.toUpperCase() || 'U'
                    
                    let statement = `You and @${item.username} are settled`
                    let textColor = 'text-gray-400'
                    let badgeStyle = 'bg-gray-800 text-gray-400 border-gray-700/60'

                    if (item.netPaisa < 0) {
                      statement = `You owe @${item.username} ₹${item.netAmount.toFixed(2)}`
                      textColor = 'text-rose-400 font-semibold'
                      badgeStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    } else if (item.netPaisa > 0) {
                      statement = `@${item.username} owes you ₹${item.netAmount.toFixed(2)}`
                      textColor = 'text-emerald-400 font-semibold'
                      badgeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }

                    return (
                      <div
                        key={item.user_id}
                        className="p-3 rounded-xl bg-gray-900/50 border border-gray-800/80 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-gray-800 border border-gray-700/60 flex items-center justify-center text-gray-300 font-bold text-xs shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-200 truncate">
                              @{item.username}
                            </p>
                            <p className={`text-[11px] mt-0.5 truncate ${textColor}`}>
                              {statement}
                            </p>
                          </div>
                        </div>

                        <span className={`text-[11px] px-2 py-0.5 rounded-lg border font-mono font-bold shrink-0 ${badgeStyle}`}>
                          {item.netPaisa > 0
                            ? `+₹${item.netAmount.toFixed(2)}`
                            : item.netPaisa < 0
                            ? `-₹${item.netAmount.toFixed(2)}`
                            : 'Settled'}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Add / Edit Expense Modal */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-all overflow-y-auto">
          <div className="w-full max-w-lg glass-panel p-6 sm:p-8 rounded-2xl border border-gray-800 space-y-6 relative shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-150">
            
            <button
              onClick={() => setShowAddExpenseModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-400" />
                {editingExpenseId ? 'Edit Group Expense' : 'Add Group Expense'}
              </h3>
              <p className="text-xs text-gray-400">
                {editingExpenseId
                  ? 'Update details and shares for this expense.'
                  : 'Log a shared cost and choose how it gets split.'}
              </p>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-5">
              
              {/* Scan Receipt Header & Upload Button (Only for Add Mode) */}
              {!editingExpenseId && (
                <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span>Scan Receipt with AI</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                      Gemini Flash AI
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleReceiptScan}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={scanningReceipt}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-indigo-200 bg-indigo-600/30 hover:bg-indigo-600/40 active:bg-indigo-600/50 border border-indigo-500/40 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {scanningReceipt ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                        <span>Scanning receipt with AI...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 text-indigo-400" />
                        <span>Scan Receipt (Camera / Upload)</span>
                      </>
                    )}
                  </button>

                  {scanError && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{scanError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Amount & Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="amount" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">₹</span>
                    <input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full glass-input pl-8 pr-4 py-2.5 rounded-xl text-sm font-semibold text-white placeholder-gray-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="date" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Date *
                  </label>
                  <input
                    id="date"
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm text-white font-medium"
                  />
                </div>
              </div>

              {/* Paid By & Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="paidBy" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Paid By *
                  </label>
                  <select
                    id="paidBy"
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm text-white bg-gray-900 font-medium"
                  >
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id} className="bg-gray-900 text-gray-200">
                        @{m.profiles?.username || 'User'} {m.user_id === currentUserId ? '(You)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="category" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Category *
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CategoryType)}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm text-white bg-gray-900 font-medium"
                  >
                    <option value="Food" className="bg-gray-900 text-gray-200">Food</option>
                    <option value="Travel" className="bg-gray-900 text-gray-200">Travel</option>
                    <option value="Utilities" className="bg-gray-900 text-gray-200">Utilities</option>
                    <option value="Shopping" className="bg-gray-900 text-gray-200">Shopping</option>
                    <option value="Other" className="bg-gray-900 text-gray-200">Other</option>
                  </select>
                </div>
              </div>

              {/* Optional Note */}
              <div className="space-y-1.5">
                <label htmlFor="note" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Note (Optional)
                </label>
                <input
                  id="note"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Dinner at Italian Bistro, Uber fare"
                  className="w-full glass-input px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 font-medium"
                />
              </div>

              {/* Split Method Tabs */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Split Method *
                </label>
                
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-gray-900/80 border border-gray-800 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setSplitMethod('evenly_all')}
                    className={`py-2 px-2 rounded-lg text-center transition-all cursor-pointer ${
                      splitMethod === 'evenly_all'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Evenly All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMethod('evenly_selected')}
                    className={`py-2 px-2 rounded-lg text-center transition-all cursor-pointer ${
                      splitMethod === 'evenly_selected'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Selected
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMethod('uneven')}
                    className={`py-2 px-2 rounded-lg text-center transition-all cursor-pointer ${
                      splitMethod === 'uneven'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Uneven
                  </button>
                </div>

                {/* Option 1: Evenly All Preview */}
                {splitMethod === 'evenly_all' && (
                  <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 space-y-2 text-xs">
                    <p className="text-indigo-300 font-medium">
                      Split evenly among all {members.length} members:
                    </p>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {calculateEqualSplits(parsedAmount, members.map((m) => m.user_id)).map((s: { userId: string; shareAmount: number }) => {
                        const mInfo = members.find((m) => m.user_id === s.userId)
                        return (
                          <div key={s.userId} className="flex items-center justify-between text-gray-300 py-0.5">
                            <span>@{mInfo?.profiles?.username || 'Member'}</span>
                            <span className="font-mono font-semibold text-white">₹{s.shareAmount.toFixed(2)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Option 2: Evenly Selected Checkboxes */}
                {splitMethod === 'evenly_selected' && (
                  <div className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3 text-xs">
                    <p className="text-gray-300 font-medium">Select members to include in split:</p>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                      {members.map((m) => {
                        const isChecked = selectedMemberIds.includes(m.user_id)
                        return (
                          <div
                            key={m.user_id}
                            onClick={() => toggleMemberSelection(m.user_id)}
                            className="flex items-center justify-between p-2 rounded-lg bg-gray-950/60 border border-gray-800/80 hover:border-gray-700 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-500 shrink-0" />
                              )}
                              <span className="text-gray-200">@{m.profiles?.username || 'Member'}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {selectedMemberIds.length > 0 && parsedAmount > 0 && (
                      <div className="pt-2 border-t border-gray-800 space-y-1 text-indigo-300">
                        <div className="font-semibold">Calculated Share ({selectedMemberIds.length} members):</div>
                        {calculateEqualSplits(parsedAmount, selectedMemberIds).map((s: { userId: string; shareAmount: number }) => {
                          const mInfo = members.find((m) => m.user_id === s.userId)
                          return (
                            <div key={s.userId} className="flex items-center justify-between text-gray-300">
                              <span>@{mInfo?.profiles?.username}</span>
                              <span className="font-mono text-white font-semibold">₹{s.shareAmount.toFixed(2)}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Option 3: Uneven Custom Amount Per Member */}
                {splitMethod === 'uneven' && (
                  <div className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3 text-xs">
                    <p className="text-gray-300 font-medium">Specify exact share per member:</p>

                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {members.map((m) => (
                        <div key={m.user_id} className="flex items-center justify-between gap-3">
                          <span className="text-gray-300 font-medium shrink-0">@{m.profiles?.username || 'Member'}</span>
                          <div className="relative w-32">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={unevenShares[m.user_id] || ''}
                              onChange={(e) => {
                                const val = e.target.value
                                setUnevenShares((prev) => ({ ...prev, [m.user_id]: val }))
                              }}
                              placeholder="0.00"
                              className="w-full glass-input pl-6 pr-2 py-1.5 rounded-lg text-xs text-right font-mono text-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Balance Banner */}
                    <div className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between ${
                      unevenDifferencePaisa === 0
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                    }`}>
                      <span>Allocated: ₹{(unevenTotalPaisa / 100).toFixed(2)} / ₹{parsedAmount.toFixed(2)}</span>
                      <span>
                        {unevenDifferencePaisa === 0 ? (
                          '✓ Balanced'
                        ) : unevenDifferencePaisa > 0 ? (
                          `₹${(unevenDifferencePaisa / 100).toFixed(2)} remaining`
                        ) : (
                          `₹${(Math.abs(unevenDifferencePaisa) / 100).toFixed(2)} over limit`
                        )}
                      </span>
                    </div>
                  </div>
                )}

              </div>

              {/* Error Notice */}
              {expenseError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
                  {expenseError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid || submittingExpense}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submittingExpense ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{editingExpenseId ? 'Updating Expense...' : 'Saving Expense...'}</span>
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      <span>{editingExpenseId ? 'Update Expense' : 'Save Expense'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Delete Expense Confirmation Modal */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-all">
          <div className="w-full max-w-md glass-panel p-6 rounded-2xl border border-gray-800 space-y-5 relative shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setDeletingExpense(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2 text-center pt-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete Expense</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Delete this expense? This cannot be undone.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-xs text-gray-300 space-y-1">
              <div className="flex justify-between">
                <span>Category:</span>
                <span className="font-semibold text-gray-200">{deletingExpense.category}</span>
              </div>
              <div className="flex justify-between">
                <span>Note:</span>
                <span className="font-semibold text-gray-200">{deletingExpense.note || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-t border-gray-800 pt-1 mt-1">
                <span>Amount:</span>
                <span className="font-mono font-bold text-white">₹{Number(deletingExpense.amount).toFixed(2)}</span>
              </div>
            </div>

            {deleteError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingExpense(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteExpense}
                disabled={deletingLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {deletingLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Expense</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Marking Settled */}
      {settlingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-all">
          <div className="w-full max-w-md glass-panel p-6 rounded-2xl border border-gray-800 space-y-5 relative shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setSettlingTx(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2 text-center pt-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Confirm Settlement</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Confirm that <strong className="text-gray-200">@{settlingTx.fromUsername}</strong> has paid{' '}
                <strong className="text-emerald-400 font-mono font-bold text-sm">₹{settlingTx.amount.toFixed(2)}</strong> to{' '}
                <strong className="text-gray-200">@{settlingTx.toUsername}</strong>?
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-xs text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>Payer:</span>
                <span className="font-semibold text-gray-200">@{settlingTx.fromUsername}</span>
              </div>
              <div className="flex justify-between">
                <span>Recipient:</span>
                <span className="font-semibold text-gray-200">@{settlingTx.toUsername}</span>
              </div>
              <div className="flex justify-between border-t border-gray-800 pt-1 mt-1">
                <span>Amount:</span>
                <span className="font-mono font-bold text-emerald-400">₹{settlingTx.amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSettlingTx(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkSettled}
                disabled={submittingSettlement}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submittingSettlement ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Yes, Confirm Settlement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
