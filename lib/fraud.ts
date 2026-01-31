import { prisma } from '@/lib/db'

interface FraudCheckMetadata {
  ip?: string
  userAgent?: string
  email?: string
  userId?: string
  amount?: number
}

interface RiskSignal {
  signal: string
  weight: number
  details?: string
}

interface FraudCheckResult {
  riskScore: number
  status: 'allowed' | 'flagged' | 'blocked'
  signals: RiskSignal[]
  assessmentId: string
}

const RISK_THRESHOLDS = {
  FLAG: parseInt(process.env.FRAUD_FLAG_THRESHOLD || '50'),
  BLOCK: parseInt(process.env.FRAUD_BLOCK_THRESHOLD || '80'),
}

const VELOCITY_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const VELOCITY_LIMIT = parseInt(process.env.FRAUD_VELOCITY_LIMIT || '10')

// Known VPN/Proxy IP ranges (simplified - in production use external service)
const SUSPICIOUS_IP_PATTERNS = [
  /^10\./, // Private range (shouldn't appear in production)
  /^192\.168\./, // Private range
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private range
]

async function checkWatchlist(metadata: FraudCheckMetadata): Promise<RiskSignal[]> {
  const signals: RiskSignal[] = []

  if (metadata.ip) {
    const ipWatch = await prisma.securityWatchlist.findFirst({
      where: { type: 'ip', value: metadata.ip },
    })
    if (ipWatch) {
      signals.push({ signal: 'ip_blacklisted', weight: 100, details: ipWatch.reason || undefined })
    }
  }

  if (metadata.email) {
    const domain = metadata.email.split('@')[1]?.toLowerCase()
    if (domain) {
      const domainWatch = await prisma.securityWatchlist.findFirst({
        where: { type: 'email_domain', value: domain },
      })
      if (domainWatch) {
        signals.push({ signal: 'email_domain_blacklisted', weight: 100, details: domainWatch.reason || undefined })
      }
    }
  }

  return signals
}

async function checkVelocity(metadata: FraudCheckMetadata): Promise<RiskSignal[]> {
  const signals: RiskSignal[] = []

  if (metadata.userId) {
    const recentAssessments = await prisma.riskAssessment.count({
      where: {
        entityId: metadata.userId,
        createdAt: { gte: new Date(Date.now() - VELOCITY_WINDOW_MS) },
      },
    })

    if (recentAssessments >= VELOCITY_LIMIT) {
      signals.push({
        signal: 'high_velocity',
        weight: 40,
        details: `${recentAssessments} transactions in last hour`,
      })
    } else if (recentAssessments >= VELOCITY_LIMIT / 2) {
      signals.push({
        signal: 'medium_velocity',
        weight: 15,
        details: `${recentAssessments} transactions in last hour`,
      })
    }
  }

  return signals
}

function checkIPReputation(ip?: string): RiskSignal[] {
  const signals: RiskSignal[] = []

  if (!ip) return signals

  // Check for private/suspicious IP patterns
  for (const pattern of SUSPICIOUS_IP_PATTERNS) {
    if (pattern.test(ip)) {
      signals.push({ signal: 'suspicious_ip_range', weight: 20, details: 'Private or suspicious IP range' })
      break
    }
  }

  // Check for localhost/loopback
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    signals.push({ signal: 'localhost_ip', weight: 5, details: 'Request from localhost' })
  }

  return signals
}

function checkAmount(amount?: number): RiskSignal[] {
  const signals: RiskSignal[] = []

  if (!amount) return signals

  const highAmountThreshold = parseFloat(process.env.FRAUD_HIGH_AMOUNT_THRESHOLD || '10000')
  const veryHighAmountThreshold = parseFloat(process.env.FRAUD_VERY_HIGH_AMOUNT_THRESHOLD || '50000')

  if (amount >= veryHighAmountThreshold) {
    signals.push({ signal: 'very_high_amount', weight: 35, details: `Amount: ${amount}` })
  } else if (amount >= highAmountThreshold) {
    signals.push({ signal: 'high_amount', weight: 15, details: `Amount: ${amount}` })
  }

  return signals
}

export async function performFraudCheck(
  entityType: 'transaction' | 'payout' | 'user',
  entityId: string,
  metadata: FraudCheckMetadata
): Promise<FraudCheckResult> {
  const allSignals: RiskSignal[] = []

  // Run all checks
  const [watchlistSignals, velocitySignals] = await Promise.all([
    checkWatchlist(metadata),
    checkVelocity(metadata),
  ])

  allSignals.push(...watchlistSignals)
  allSignals.push(...velocitySignals)
  allSignals.push(...checkIPReputation(metadata.ip))
  allSignals.push(...checkAmount(metadata.amount))

  // Calculate total risk score (capped at 100)
  const riskScore = Math.min(100, allSignals.reduce((sum, s) => sum + s.weight, 0))

  // Determine status
  let status: 'allowed' | 'flagged' | 'blocked' = 'allowed'
  if (riskScore >= RISK_THRESHOLDS.BLOCK) {
    status = 'blocked'
  } else if (riskScore >= RISK_THRESHOLDS.FLAG) {
    status = 'flagged'
  }

  // Store assessment
  const assessment = await prisma.riskAssessment.create({
    data: {
      entityType,
      entityId,
      riskScore,
      signals: allSignals,
      status: status === 'allowed' ? 'logged' : status,
    },
  })

  return {
    riskScore,
    status,
    signals: allSignals,
    assessmentId: assessment.id,
  }
}

export async function addToWatchlist(
  type: 'ip' | 'email_domain' | 'country',
  value: string,
  reason?: string
) {
  return prisma.securityWatchlist.upsert({
    where: { value: value.toLowerCase() },
    update: { reason },
    create: { type, value: value.toLowerCase(), reason },
  })
}

export async function removeFromWatchlist(value: string) {
  return prisma.securityWatchlist.delete({
    where: { value: value.toLowerCase() },
  })
}

export async function getWatchlist(type?: 'ip' | 'email_domain' | 'country') {
  return prisma.securityWatchlist.findMany({
    where: type ? { type } : undefined,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getRiskHistory(entityType: string, entityId: string) {
  return prisma.riskAssessment.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
  })
}
