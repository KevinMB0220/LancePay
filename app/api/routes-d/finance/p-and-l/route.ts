import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { renderToBuffer } from '@react-pdf/renderer'
import { FinancialStatementPDF } from './pdf-template'
import { getTaxAuth, computeWithdrawalFee, round2 } from '@/app/api/routes-d/tax-reports/_shared'
import { Decimal } from '@prisma/client/runtime/library'

const PLATFORM_FEE_RATE = 0.01 // 1%

function getPeriodBounds(period: string | null) {
  const now = new Date()
  const currentYear = now.getUTCFullYear()
  const currentMonth = now.getUTCMonth() // 0-11

  let start: Date
  let end: Date = now
  let label: string

  switch (period) {
    case 'last_month': {
      start = new Date(Date.UTC(currentYear, currentMonth - 1, 1))
      end = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999))
      label = start.toLocaleString('default', { month: 'long', year: 'numeric' })
      break
    }
    case 'current_quarter': {
      const quarter = Math.floor(currentMonth / 3)
      start = new Date(Date.UTC(currentYear, quarter * 3, 1))
      end = now
      label = `Q${quarter + 1} ${currentYear}`
      break
    }
    case 'last_year': {
      start = new Date(Date.UTC(currentYear - 1, 0, 1))
      end = new Date(Date.UTC(currentYear - 1, 11, 31, 23, 59, 59, 999))
      label = `${currentYear - 1}`
      break
    }
    case 'current_month':
    default: {
      start = new Date(Date.UTC(currentYear, currentMonth, 1))
      end = now
      label = start.toLocaleString('default', { month: 'long', year: 'numeric' })
      break
    }
  }
  return { start, end, label }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getTaxAuth(request)
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: 401 })
    if (!auth.user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Fetch branding settings separately as getTaxAuth limits selected fields
    const brandingSettings = await prisma.brandingSettings.findUnique({
        where: { userId: auth.user.id }
    })

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'current_month'
    const format = searchParams.get('format') || 'json'
    const userId = auth.user.id

    const { start, end, label } = getPeriodBounds(period)

    // 1. Fetch Income (Paid Invoices / Completed Incoming Transactions)
    const incomeTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        status: 'completed',
        type: { in: ['incoming', 'payment'] },
        completedAt: { gte: start, lte: end },
      },
      include: {
        invoice: {
          select: {
            clientName: true,
            clientEmail: true,
            invoiceNumber: true
          }
        }
      }
    })

    // 2. Fetch Withdrawals (for operating expenses calculation)
    const withdrawalTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        status: 'completed',
        type: 'withdrawal',
        completedAt: { gte: start, lte: end },
      },
    })

     // 3. Fetch Expected Revenue (Pending/Escrowed Invoices)
     // "include 'Pending/Escrowed' funds as 'Expected Revenue'"
     const pendingInvoices = await prisma.invoice.findMany({
        where: {
            userId,
            OR: [
                { status: 'pending' },
                { escrowStatus: { in: ['pending', 'funded'] } }
            ],
            createdAt: { gte: start, lte: end } // Use creation date for consistency in period? Or due date?
                                                // Usually expected revenue is based on when it was issued/due in the period.
                                                // I'll stick to creation date intersecting the period or maybe due date?
                                                // I'm using createdAt for now as a proxy for "activity in this period".
        }
     })

    // Calculations
    const grossRevenue = round2(incomeTransactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0))

    // Platform Fees: 1% of Gross Revenue
    // "Verify that the 'platformFees' sum exactly matches the 1% fee recorded across all paid invoices"
    const platformFees = round2(grossRevenue * PLATFORM_FEE_RATE)

    // Operating Expenses: Withdrawal Fees (using shared logic or raw calculation)
    // The shared logic uses a rate (0.5%).
    const withdrawalFees = round2(withdrawalTransactions.reduce((sum: number, t: any) => sum + computeWithdrawalFee(Number(t.amount)), 0))

    // Total Fees
    // "Cost of Sales (Fees): Sum all platform fees and network fees deducted from those invoices."
    // "Operating Expenses: Sum any withdrawal fees..."
    // In the JSON example:
    // platformFees (Cost of Sales)
    // withdrawalFees (Operating Expenses)
    // netProfit = totalIncome - platformFees - withdrawalFees

    const netProfit = round2(grossRevenue - platformFees - withdrawalFees)

    const expectedRevenue = round2(pendingInvoices.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0))

    // Top Clients
    const clientMap = new Map<string, number>()
    for (const t of incomeTransactions) {
        const name = t.invoice?.clientName || t.invoice?.clientEmail || 'Unknown Client'
        clientMap.set(name, (clientMap.get(name) || 0) + Number(t.amount))
    }
    const topClients = Array.from(clientMap.entries())
        .map(([name, revenue]) => ({ name, revenue: round2(revenue) }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

    const responseData = {
      period: label,
      summary: {
        totalIncome: grossRevenue,
        platformFees,
        withdrawalFees,
        netProfit,
        expectedRevenue
      },
      topClients,
      currency: incomeTransactions[0]?.currency || 'USDC' // Default to USDC if no transactions
    }

    if (format === 'pdf') {
       const buffer = await renderToBuffer(
         FinancialStatementPDF({
           data: {
             ...responseData,
             generatedAt: new Date().toLocaleDateString(),
           },
           branding: brandingSettings || undefined
         })
       )

       return new NextResponse(new Uint8Array(buffer), {
         status: 200,
         headers: {
           'Content-Type': 'application/pdf',
           'Content-Disposition': `attachment; filename="PL_Statement_${label.replace(/\s/g, '_')}.pdf"`,
         },
       })
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('P&L Report Error:', error)
    return NextResponse.json({ error: 'Failed to generate P&L report' }, { status: 500 })
  }
}
