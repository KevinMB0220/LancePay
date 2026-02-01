import { server } from "./stellar";

/**
 * Fee estimation configuration
 */
const FEE_CONFIG = {
  DEFAULT_FEE: "100", // stroops - fallback fee
  MULTIPLIER: 1.5, // Safety multiplier for mode fee
  MAX_FEE: 10000, // stroops - Maximum fee cap
  CACHE_TTL: 30000, // 30 seconds in milliseconds
};

/**
 * Cached fee stats
 */
let cachedFeeStats: {
  fee: string;
  timestamp: number;
} | null = null;

/**
 * Fee stats from Horizon
 */
interface FeeStats {
  last_ledger_base_fee: string;
  min_accepted_fee: string;
  mode_accepted_fee: string;
  p10_accepted_fee: string;
  p50_accepted_fee: string;
  p95_accepted_fee: string;
}

/**
 * Fetch current fee stats from Horizon
 */
async function fetchFeeStats(): Promise<FeeStats> {
  const response = await server.feeStats();
  return response as unknown as FeeStats;
}

/**
 * Calculate recommended fee with safety multiplier and cap
 */
function calculateFee(stats: FeeStats): string {
  const modeFee = parseInt(stats.mode_accepted_fee, 10);
  const minFee = parseInt(stats.min_accepted_fee, 10);

  // Apply multiplier for safety
  const calculatedFee = Math.max(
    Math.ceil(modeFee * FEE_CONFIG.MULTIPLIER),
    minFee
  );

  // Apply cap to prevent runaway costs
  const cappedFee = Math.min(calculatedFee, FEE_CONFIG.MAX_FEE);

  return cappedFee.toString();
}

/**
 * Get dynamic fee with caching
 */
export async function getDynamicFee(): Promise<string> {
  const now = Date.now();

  // Return cached fee if still valid
  if (
    cachedFeeStats &&
    now - cachedFeeStats.timestamp < FEE_CONFIG.CACHE_TTL
  ) {
    return cachedFeeStats.fee;
  }

  try {
    // Fetch fresh fee stats
    const stats = await fetchFeeStats();
    const fee = calculateFee(stats);

    // Update cache
    cachedFeeStats = {
      fee,
      timestamp: now,
    };

    return fee;
  } catch (error) {
    console.error("Error fetching fee stats, using default:", error);
    // Fallback to default fee on error
    return FEE_CONFIG.DEFAULT_FEE;
  }
}

/**
 * Get fee stats for monitoring/analytics
 */
export async function getFeeStats(): Promise<{
  current_fee: string;
  stats: FeeStats | null;
  cached: boolean;
}> {
  const now = Date.now();
  const cached =
    cachedFeeStats !== null &&
    now - cachedFeeStats.timestamp < FEE_CONFIG.CACHE_TTL;

  if (cached && cachedFeeStats) {
    return {
      current_fee: cachedFeeStats.fee,
      stats: null,
      cached: true,
    };
  }

  try {
    const stats = await fetchFeeStats();
    const fee = calculateFee(stats);

    return {
      current_fee: fee,
      stats,
      cached: false,
    };
  } catch (error) {
    return {
      current_fee: FEE_CONFIG.DEFAULT_FEE,
      stats: null,
      cached: false,
    };
  }
}

/**
 * Clear fee cache (useful for testing)
 */
export function clearFeeCache(): void {
  cachedFeeStats = null;
}
