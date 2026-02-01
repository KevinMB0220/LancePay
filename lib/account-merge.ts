import {
  Operation,
  Keypair,
  TransactionBuilder,
  BASE_FEE,
  Asset,
} from "@stellar/stellar-sdk";
import { server, USDC_ASSET, STELLAR_NETWORK } from "./stellar";

/**
 * Platform funding wallet for reserve recovery
 */
const PLATFORM_FUNDING_WALLET =
  process.env.NEXT_PUBLIC_PLATFORM_FUNDING_WALLET || "";

/**
 * Check if account is ready for merge
 */
export async function canMergeAccount(publicKey: string): Promise<{
  canMerge: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    const account = await server.loadAccount(publicKey);

    // Check for non-native asset balances
    const nonNativeBalances = account.balances.filter(
      (balance) =>
        balance.asset_type !== "native" && parseFloat(balance.balance) > 0
    );

    if (nonNativeBalances.length > 0) {
      issues.push(
        `Account has ${nonNativeBalances.length} non-zero asset balance(s). Please withdraw all USDC first.`
      );
    }

    // Check for active trustlines
    const trustlines = account.balances.filter(
      (balance) => balance.asset_type !== "native"
    );

    if (trustlines.length > 0) {
      issues.push(
        `Account has ${trustlines.length} active trustline(s) that must be removed.`
      );
    }

    // Check for pending claimable balances
    const claimable = await server
      .claimableBalances()
      .claimant(publicKey)
      .call();

    if (claimable.records.length > 0) {
      issues.push(
        `Account has ${claimable.records.length} pending claimable balance(s). Please claim them first.`
      );
    }

    return {
      canMerge: issues.length === 0,
      issues,
    };
  } catch (error) {
    issues.push("Failed to load account information");
    return { canMerge: false, issues };
  }
}

/**
 * Remove all trustlines from an account
 */
export async function removeTrustlines(accountKeypair: Keypair) {
  const account = await server.loadAccount(accountKeypair.publicKey());

  const trustlines = account.balances.filter(
    (balance) => balance.asset_type !== "native"
  );

  if (trustlines.length === 0) {
    return { success: true, message: "No trustlines to remove" };
  }

  const txBuilder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_NETWORK,
  });

  // Add changeTrust operations to remove each trustline
  trustlines.forEach((balance: any) => {
    const asset =
      balance.asset_type === "credit_alphanum4" ||
      balance.asset_type === "credit_alphanum12"
        ? new Asset(balance.asset_code, balance.asset_issuer)
        : Asset.native();

    txBuilder.addOperation(
      Operation.changeTrust({
        asset: asset,
        limit: "0", // Setting limit to 0 removes the trustline
      })
    );
  });

  const transaction = txBuilder.setTimeout(180).build();
  transaction.sign(accountKeypair);

  const result = await server.submitTransaction(transaction);
  return {
    success: true,
    transactionHash: result.hash,
    removedCount: trustlines.length,
  };
}

/**
 * Merge account and transfer all XLM to destination
 */
export async function mergeAccount(
  accountKeypair: Keypair,
  destinationAddress: string
) {
  // Validate destination address
  if (!destinationAddress || destinationAddress.length !== 56) {
    throw new Error("Invalid destination address");
  }

  // Check if account can be merged
  const { canMerge, issues } = await canMergeAccount(
    accountKeypair.publicKey()
  );

  if (!canMerge) {
    throw new Error(`Account cannot be merged: ${issues.join(", ")}`);
  }

  const account = await server.loadAccount(accountKeypair.publicKey());

  // Get XLM balance before merge
  const xlmBalance = account.balances.find(
    (b: any) => b.asset_type === "native"
  );
  const balanceBeforeMerge = xlmBalance ? xlmBalance.balance : "0";

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_NETWORK,
  })
    .addOperation(
      Operation.accountMerge({
        destination: destinationAddress,
      })
    )
    .setTimeout(180)
    .build();

  transaction.sign(accountKeypair);
  const result = await server.submitTransaction(transaction);

  return {
    success: true,
    transactionHash: result.hash,
    xlmTransferred: balanceBeforeMerge,
    destination: destinationAddress,
  };
}

/**
 * Full account cleanup and merge workflow
 */
export async function cleanupAndMergeAccount(
  accountKeypair: Keypair,
  destinationAddress?: string
) {
  const publicKey = accountKeypair.publicKey();

  // Step 1: Check readiness
  const { canMerge, issues } = await canMergeAccount(publicKey);

  // Step 2: Remove trustlines if needed
  if (issues.some((i) => i.includes("trustline"))) {
    await removeTrustlines(accountKeypair);
  }

  // Step 3: Merge account
  const destination = destinationAddress || PLATFORM_FUNDING_WALLET;

  if (!destination) {
    throw new Error(
      "No destination address provided and platform funding wallet not configured"
    );
  }

  return await mergeAccount(accountKeypair, destination);
}

/**
 * Calculate XLM that will be recovered from merge
 */
export async function calculateRecoverableXLM(
  publicKey: string
): Promise<string> {
  try {
    const account = await server.loadAccount(publicKey);
    const xlmBalance = account.balances.find(
      (b: any) => b.asset_type === "native"
    );

    return xlmBalance ? xlmBalance.balance : "0";
  } catch (error) {
    return "0";
  }
}
