import {
  Operation,
  Keypair,
  TransactionBuilder,
  BASE_FEE,
  Memo,
} from "@stellar/stellar-sdk";
import { server, USDC_ASSET, STELLAR_NETWORK } from "./stellar";

/**
 * Platform fee configuration
 */
const PLATFORM_FEE_BPS = parseInt(
  process.env.NEXT_PUBLIC_PLATFORM_FEE_BPS || "100", // 100 basis points = 1%
  10
);

const PLATFORM_REVENUE_WALLET =
  process.env.NEXT_PUBLIC_PLATFORM_REVENUE_WALLET || "";

/**
 * Calculate fee and net amounts
 */
export function calculateSplit(totalAmount: string): {
  platformFee: string;
  freelancerNet: string;
  total: string;
} {
  const total = parseFloat(totalAmount);
  const feePercent = PLATFORM_FEE_BPS / 10000; // Convert BPS to decimal
  const platformFee = Math.floor(total * feePercent * 10000000) / 10000000; // Round down to 7 decimals
  const freelancerNet = total - platformFee;

  return {
    platformFee: platformFee.toFixed(7),
    freelancerNet: freelancerNet.toFixed(7),
    total: total.toFixed(7),
  };
}

/**
 * Create a split payment transaction with platform fee
 */
export async function createSplitPayment(
  senderKeypair: Keypair,
  freelancerAddress: string,
  totalAmount: string,
  invoiceId: string
) {
  const { platformFee, freelancerNet } = calculateSplit(totalAmount);

  if (!PLATFORM_REVENUE_WALLET) {
    throw new Error("Platform revenue wallet not configured");
  }

  const senderAccount = await server.loadAccount(senderKeypair.publicKey());

  const transaction = new TransactionBuilder(senderAccount, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_NETWORK,
  })
    // Operation 1: Pay freelancer (99%)
    .addOperation(
      Operation.payment({
        destination: freelancerAddress,
        asset: USDC_ASSET,
        amount: freelancerNet,
        source: senderKeypair.publicKey(),
      })
    )
    // Operation 2: Pay platform fee (1%)
    .addOperation(
      Operation.payment({
        destination: PLATFORM_REVENUE_WALLET,
        asset: USDC_ASSET,
        amount: platformFee,
        source: senderKeypair.publicKey(),
      })
    )
    .addMemo(Memo.text(`LancePay:${invoiceId}`))
    .setTimeout(180)
    .build();

  transaction.sign(senderKeypair);
  return await server.submitTransaction(transaction);
}

/**
 * Verify split payment amounts
 */
export function verifySplit(
  totalAmount: string,
  freelancerAmount: string,
  platformAmount: string
): boolean {
  const { platformFee, freelancerNet } = calculateSplit(totalAmount);

  const freelancerMatch =
    Math.abs(parseFloat(freelancerAmount) - parseFloat(freelancerNet)) < 0.0000001;
  const platformMatch =
    Math.abs(parseFloat(platformAmount) - parseFloat(platformFee)) < 0.0000001;

  return freelancerMatch && platformMatch;
}

/**
 * Get platform fee percentage
 */
export function getPlatformFeePercent(): number {
  return PLATFORM_FEE_BPS / 100; // Return as percentage (e.g., 1.0 for 1%)
}

/**
 * Format fee breakdown for display
 */
export function formatFeeBreakdown(totalAmount: string): {
  subtotal: string;
  platformFee: string;
  platformFeePercent: string;
  totalReceived: string;
} {
  const { platformFee, freelancerNet, total } = calculateSplit(totalAmount);

  return {
    subtotal: total,
    platformFee: platformFee,
    platformFeePercent: `${getPlatformFeePercent()}%`,
    totalReceived: freelancerNet,
  };
}
