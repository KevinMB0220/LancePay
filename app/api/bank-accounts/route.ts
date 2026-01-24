import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuthToken } from '@/lib/auth'
import speakeasy from 'speakeasy'
import { decrypt } from '@/lib/crypto'

const BANKS: Record<string, string> = {
  '044': 'Access Bank', '058': 'GTBank', '033': 'UBA', '011': 'First Bank', '057': 'Zenith Bank', '032': 'Union Bank', '050': 'Ecobank', '035': 'Wema Bank', '221': 'Stanbic IBTC', '068': 'Standard Chartered',
}

export async function GET(request: NextRequest) {
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
  const claims = await verifyAuthToken(authToken || '')
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { privyId: claims.userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const bankAccounts = await prisma.bankAccount.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ bankAccounts, banks: BANKS })
}

export async function POST(request: NextRequest) {
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
  const claims = await verifyAuthToken(authToken || '')
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { privyId: claims.userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { bankCode, accountNumber, code } = await request.json()

  // 2FA Check
  if (user.twoFactorEnabled) {
    if (!code) {
      return NextResponse.json({ error: '2FA code required' }, { status: 401 })
    }
    if (user.twoFactorSecret) {
      const secret = decrypt(user.twoFactorSecret)
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: code,
        window: 1
      })
      if (!verified) {
        return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 })
      }
    }
  }

  if (!bankCode || !accountNumber || accountNumber.length !== 10) {
    return NextResponse.json({ error: 'Invalid input - account number must be 10 digits' }, { status: 400 })
  }

  const bankName = BANKS[bankCode] || 'Unknown Bank'
  const accountName = 'Account Holder' // MVP mock
  const isFirst = await prisma.bankAccount.count({ where: { userId: user.id } }) === 0

  const bankAccount = await prisma.bankAccount.create({
    data: { userId: user.id, bankCode, bankName, accountNumber, accountName, isVerified: true, isDefault: isFirst },
  })

  return NextResponse.json(bankAccount, { status: 201 })
}
