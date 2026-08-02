import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('[SCAN-RECEIPT ERROR] GEMINI_API_KEY is missing from environment variables.')
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 }
      )
    }

    // Query available models from Google API to see exact model names
    try {
      const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      const listRes = await fetch(listModelsUrl)
      if (listRes.ok) {
        const listData = await listRes.json()
        const modelNames = listData?.models?.map((m: any) => m.name) || []
        console.log('[SCAN-RECEIPT DEBUG] Currently available Gemini models for API Key:', modelNames)
      } else {
        const listErr = await listRes.text()
        console.error('[SCAN-RECEIPT DEBUG] ListModels failed status:', listRes.status, listErr)
      }
    } catch (e) {
      console.error('[SCAN-RECEIPT DEBUG] ListModels fetch exception:', e)
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      console.error('[SCAN-RECEIPT ERROR] No image file found in FormData.')
      return NextResponse.json(
        { success: false, error: "No image file provided." },
        { status: 400 }
      )
    }

    // Convert file to Base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Data = buffer.toString('base64')
    const mimeType = file.type || 'image/jpeg'

    console.log(`[SCAN-RECEIPT INFO] File received: name=${file.name}, size=${file.size} bytes, mime=${mimeType}, base64Length=${base64Data.length}`)

    const promptText = `You are a specialized receipt scanner AI.
Analyze the provided receipt image and extract structured data.
Return a JSON object containing:
1. "amount": The total final amount on the receipt as a number (e.g. 42.50). Return null if missing/unreadable.
2. "note": The merchant or vendor name (e.g. "Target", "Starbucks", "Shell Gas"). Return string or null if missing/unreadable.
3. "category": Suggested category for the expense. MUST be strictly one of these exact 5 string options:
   - "Food" (for restaurants, cafes, groceries, bars, food delivery)
   - "Travel" (for gas, flights, taxis, train, rideshare, hotel, parking)
   - "Utilities" (for electricity, water, internet, phone bill, utility services)
   - "Shopping" (for retail stores, clothing, electronics, books, goods)
   - "Other" (for anything else or if unclear)

Return ONLY valid JSON matching this schema.`

    const payload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    }

    const modelsToTry = ['gemini-flash-latest', 'gemini-3.5-flash']
    let apiResponse: Response | null = null
    const attemptLogs: any[] = []

    for (const modelName of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`
        console.log(`[SCAN-RECEIPT INFO] Calling Gemini API model: ${modelName}...`)
        
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (res.ok) {
          console.log(`[SCAN-RECEIPT SUCCESS] Model ${modelName} responded with HTTP 200 OK`)
          apiResponse = res
          break
        } else {
          const errText = await res.text()
          console.error(`[SCAN-RECEIPT API ERROR] Model ${modelName} returned status ${res.status}:`, errText)
          attemptLogs.push({ model: modelName, status: res.status, errorResponse: errText })
        }
      } catch (err: any) {
        console.error(`[SCAN-RECEIPT FETCH ERROR] Exception when calling ${modelName}:`, err?.message || err)
        attemptLogs.push({ model: modelName, exception: err?.message || String(err) })
      }
    }

    if (!apiResponse) {
      console.error('[SCAN-RECEIPT FAILURE DETAILED LOG] All attempted Gemini models failed:', JSON.stringify(attemptLogs, null, 2))
      return NextResponse.json(
        { success: false, error: "Couldn't read the receipt — please enter details manually" },
        { status: 200 }
      )
    }

    const data = await apiResponse.json()
    console.log('[SCAN-RECEIPT DEBUG] Raw Gemini API Response JSON:', JSON.stringify(data, null, 2))

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawText) {
      console.error('[SCAN-RECEIPT ERROR] Candidate text not found in response:', JSON.stringify(data, null, 2))
      return NextResponse.json(
        { success: false, error: "Couldn't read the receipt — please enter details manually" },
        { status: 200 }
      )
    }

    console.log('[SCAN-RECEIPT DEBUG] Extracted text content from Gemini:', rawText)

    let parsed: any = {}
    try {
      parsed = JSON.parse(rawText)
    } catch (parseErr) {
      console.warn('[SCAN-RECEIPT WARNING] Direct JSON parse failed, trying regex match:', parseErr)
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch (regexParseErr) {
          console.error('[SCAN-RECEIPT ERROR] Regex JSON parse also failed:', regexParseErr)
          parsed = {}
        }
      }
    }

    console.log('[SCAN-RECEIPT DEBUG] Parsed JSON object:', JSON.stringify(parsed, null, 2))

    // Process and validate extracted fields
    let amount: number | null = null
    if (typeof parsed.amount === 'number' && !isNaN(parsed.amount) && parsed.amount > 0) {
      amount = parsed.amount
    } else if (typeof parsed.amount === 'string') {
      const cleaned = parseFloat(parsed.amount.replace(/[^0-9.]/g, ''))
      if (!isNaN(cleaned) && cleaned > 0) {
        amount = cleaned
      }
    }

    let note: string | null = null
    if (typeof parsed.note === 'string' && parsed.note.trim().length > 0) {
      note = parsed.note.trim()
    } else if (typeof parsed.merchant === 'string' && parsed.merchant.trim().length > 0) {
      note = parsed.merchant.trim()
    } else if (typeof parsed.vendor === 'string' && parsed.vendor.trim().length > 0) {
      note = parsed.vendor.trim()
    }

    const validCategories = ['Food', 'Travel', 'Utilities', 'Shopping', 'Other']
    let category: string = 'Other'
    if (typeof parsed.category === 'string') {
      const match = validCategories.find(
        (c) => c.toLowerCase() === parsed.category.trim().toLowerCase()
      )
      if (match) {
        category = match
      }
    }

    console.log(`[SCAN-RECEIPT FINAL RESULT] amount=${amount}, note=${note}, category=${category}`)

    return NextResponse.json({
      success: true,
      amount,
      note,
      category
    })
  } catch (error: any) {
    console.error('[SCAN-RECEIPT UNCAUGHT ROUTE EXCEPTION]:', error?.stack || error?.message || JSON.stringify(error, null, 2))
    return NextResponse.json(
      { success: false, error: "Couldn't read the receipt — please enter details manually" },
      { status: 200 }
    )
  }
}
