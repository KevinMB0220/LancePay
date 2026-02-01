"use client";

import { useState } from "react";
import { canMergeAccount, calculateRecoverableXLM } from "@/lib/account-merge";

interface AccountMergeModalProps {
  publicKey: string;
  onClose: () => void;
  onConfirm: (destinationAddress: string) => Promise<void>;
}

export function AccountMergeModal({
  publicKey,
  onClose,
  onConfirm,
}: AccountMergeModalProps) {
  const [destinationAddress, setDestinationAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [canMerge, setCanMerge] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [recoverableXLM, setRecoverableXLM] = useState("0");

  useState(() => {
    checkMergeEligibility();
  });

  const checkMergeEligibility = async () => {
    const result = await canMergeAccount(publicKey);
    const xlm = await calculateRecoverableXLM(publicKey);
    setCanMerge(result.canMerge);
    setIssues(result.issues);
    setRecoverableXLM(xlm);
  };

  const handleConfirm = async () => {
    if (!canMerge) return;

    setLoading(true);
    try {
      await onConfirm(destinationAddress);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4 text-red-600">
          ⚠️ Delete Account
        </h2>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            This action is <strong>irreversible</strong> and will:
          </p>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>Remove your account from the Stellar blockchain</li>
            <li>Transfer {recoverableXLM} XLM to the destination address</li>
            <li>Permanently delete your LancePay account data</li>
          </ul>
        </div>

        {!canMerge && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm font-semibold text-yellow-800 mb-2">
              Account Not Ready:
            </p>
            <ul className="text-xs text-yellow-700 list-disc list-inside">
              {issues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Destination Address (Optional)
          </label>
          <input
            type="text"
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            placeholder="G... (leave empty to use platform wallet)"
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            disabled={!canMerge}
          />
          <p className="text-xs text-gray-500 mt-1">
            If left empty, XLM will be sent to the platform funding wallet
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canMerge || loading}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Delete Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
