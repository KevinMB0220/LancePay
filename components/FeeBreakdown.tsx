"use client";

import { formatFeeBreakdown } from "@/lib/revenue-split";

interface FeeBreakdownProps {
  amount: string;
}

export function FeeBreakdown({ amount }: FeeBreakdownProps) {
  const breakdown = formatFeeBreakdown(amount);

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="font-semibold mb-3">Payment Breakdown</h3>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Invoice Amount:</span>
          <span className="font-medium">{breakdown.subtotal} USDC</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            Platform Fee ({breakdown.platformFeePercent}):
          </span>
          <span className="text-red-600">-{breakdown.platformFee} USDC</span>
        </div>

        <div className="border-t pt-2 flex justify-between font-semibold">
          <span>You Receive:</span>
          <span className="text-green-600">{breakdown.totalReceived} USDC</span>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Platform fee is automatically deducted and processed on-chain in the same transaction.
      </p>
    </div>
  );
}
