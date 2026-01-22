import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fundNewWallet } from '@/lib/stellar'

type FundingContext = {
  eventType: string
  privyId: string
  destination: string
}

async function tryFundWallet(ctx: FundingContext): Promise<void> {
  const result = await fundNewWallet(ctx.destination)

  if (result.status === 'funded') {
    console.info('Stellar wallet funded', {
      eventType: ctx.eventType,
      privyId: ctx.privyId,
      destination: ctx.destination,
      txHash: result.txHash,
    })
  } else if (result.status === 'skipped') {
    console.info('Stellar wallet funding skipped', {
      eventType: ctx.eventType,
      privyId: ctx.privyId,
      destination: ctx.destination,
      reason: result.reason,
    })
  } else {
    console.error('Stellar wallet funding failed', {
      eventType: ctx.eventType,
      privyId: ctx.privyId,
      destination: ctx.destination,
      reason: result.reason,
    })
  }

  if (result.lowBalance) {
    console.error('Stellar funding wallet balance low', {
      eventType: ctx.eventType,
      privyId: ctx.privyId,
      destination: ctx.destination,
      impact: 'Funding wallet below threshold',
    })
  }
}

function isPrivyEmbeddedWallet(account: any): boolean {
  return (
    account?.type === 'wallet' &&
    (account?.wallet_client_type === 'privy' || account?.walletClientType === 'privy')
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const event = JSON.parse(body)

    console.log('Privy webhook received:', event.type, JSON.stringify(event, null, 2))

    // Ignore test events
    if (event.type === 'privy.test') {
      console.log('Test event received, ignoring')
      return NextResponse.json({ received: true })
    }

    // Handle user.created event
    if (event.type === 'user.created') {
      const userData = event.data?.user || event.data
      const privyId = userData?.id
      const email = userData?.email?.address || ''
      const linkedAccounts = userData?.linked_accounts || []

      if (!privyId) {
        console.log('No privyId found in event, skipping')
        return NextResponse.json({ received: true })
      }

      console.log('User created event - privyId:', privyId, 'email:', email)

      // Find embedded wallet
      const embeddedWallet = linkedAccounts.find((account: any) => isPrivyEmbeddedWallet(account))
      const walletAddress: string | undefined = embeddedWallet?.address

      console.log('Found embedded wallet:', walletAddress || 'none')

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { privyId },
        include: { wallet: true },
      })

      if (existingUser) {
        // Existing user: only create wallet if it does not exist yet.
        if (walletAddress && !existingUser.wallet) {
          await prisma.wallet.create({
            data: {
              userId: existingUser.id,
              address: walletAddress,
            },
          })

          console.log('Wallet added for existing user:', privyId)

          await tryFundWallet({
            eventType: event.type,
            privyId,
            destination: walletAddress,
          })
        } else if (walletAddress && existingUser.wallet?.address !== walletAddress) {
          // Address changed: update DB, but do NOT fund again (rate limit: max 1 per user).
          await prisma.wallet.update({
            where: { userId: existingUser.id },
            data: { address: walletAddress },
          })

          console.log('Wallet address updated for existing user (no funding re-run):', privyId)
        }
      } else {
        // Create new user
        const createdUser = await prisma.user.create({
          data: {
            privyId,
            email: email || `${privyId}@privy.local`,
            wallet: walletAddress ? { create: { address: walletAddress } } : undefined,
          },
          include: { wallet: true },
        })

        console.log('User processed successfully:', privyId)

        // Fund wallet for new user only if wallet record was created
        if (createdUser.wallet?.address) {
          await tryFundWallet({
            eventType: event.type,
            privyId,
            destination: createdUser.wallet.address,
          })
        }
      }
    }

    // Handle user.linked_account event (wallet created after signup)
    if (event.type === 'user.linked_account') {
      const userData = event.data?.user || event.data
      const privyId = userData?.id
      const linkedAccount = event.data?.linked_account

      if (!privyId) {
        console.log('No privyId found in linked_account event, skipping')
        return NextResponse.json({ received: true })
      }

      console.log('Linked account event - privyId:', privyId)

      const isEmbeddedWallet = isPrivyEmbeddedWallet(linkedAccount)
      const walletAddress: string | undefined = linkedAccount?.address

      if (isEmbeddedWallet && walletAddress) {
        const user = await prisma.user.findUnique({
          where: { privyId },
          include: { wallet: true },
        })

        if (user && !user.wallet) {
          await prisma.wallet.create({
            data: {
              userId: user.id,
              address: walletAddress,
            },
          })

          console.log('Wallet added for existing user:', privyId)

          await tryFundWallet({
            eventType: event.type,
            privyId,
            destination: walletAddress,
          })
        } else if (user && user.wallet?.address !== walletAddress) {
          // Address changed: update DB, but do NOT fund again (rate limit: max 1 per user).
          await prisma.wallet.update({
            where: { userId: user.id },
            data: { address: walletAddress },
          })

          console.log('Wallet address updated for existing user (no funding re-run):', privyId)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Privy webhook error:', error)
    return NextResponse.json({ received: true }) // Return 200 to prevent Privy retries
  }
}
