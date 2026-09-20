import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve('.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const parts = line.split('=')
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join('=').trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectAllExpensesAndSplits() {
  console.log('--- Fetching all expenses ---')
  const { data: expenses, error: expErr } = await supabase
    .from('expenses')
    .select('id, note, amount, category, created_at, group_id')

  if (expErr) {
    console.error('Error fetching expenses:', expErr)
    return
  }

  console.log(`Found ${expenses?.length} total expenses:`)
  console.log(JSON.stringify(expenses, null, 2))

  console.log('\n--- Fetching all expense_splits ---')
  const { data: splits, error: splitErr } = await supabase
    .from('expense_splits')
    .select('id, expense_id, user_id, share_amount')

  if (splitErr) {
    console.error('Error fetching splits:', splitErr)
    return
  }

  console.log(`Found ${splits?.length} total expense_splits rows.`)

  // Group splits by expense_id
  const expSplitsMap: Record<string, typeof splits> = {}
  splits?.forEach(s => {
    if (!expSplitsMap[s.expense_id]) expSplitsMap[s.expense_id] = []
    expSplitsMap[s.expense_id].push(s)
  })

  Object.entries(expSplitsMap).forEach(([expId, expSplits]) => {
    const parentExp = expenses?.find(e => e.id === expId)
    console.log(`\n=== Expense: "${parentExp?.note || parentExp?.category}" (ID: ${expId}) ===`)
    console.log(`Total split rows: ${expSplits.length}`)
    expSplits.forEach((s, idx) => {
      console.log(`   [Row ${idx + 1}] Split ID: ${s.id} | User ID: ${s.user_id} | share_amount: ₹${s.share_amount}`)
    })
  })
}

inspectAllExpensesAndSplits()
