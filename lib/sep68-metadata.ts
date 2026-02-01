/**
 * SEP-68 Smart NFT Metadata Standard
 * Stellar standard for rich token metadata
 */

import { Operation, Keypair, TransactionBuilder, BASE_FEE } from "@stellar/stellar-sdk";
import { server, STELLAR_NETWORK } from "./stellar";

/**
 * SEP-68 Metadata Schema
 */
export interface BadgeMetadata {
  name: string;
  description: string;
  image: string; // URL to badge image (IPFS or Arweave)
  attributes?: {
    trait_type: string;
    value: string | number;
  }[];
  external_url?: string;
  animation_url?: string;
}

/**
 * LancePay Badge Metadata Template
 */
export interface LancePayBadgeMetadata extends BadgeMetadata {
  attributes: {
    trait_type: "ProjectID" | "CompletionDate" | "Rating" | "Category" | "BadgeType";
    value: string | number;
  }[];
}

/**
 * Create badge metadata JSON following SEP-68
 */
export function createBadgeMetadata(
  badgeName: string,
  description: string,
  imageUrl: string,
  attributes: { trait_type: string; value: string | number }[]
): LancePayBadgeMetadata {
  return {
    name: badgeName,
    description,
    image: imageUrl,
    attributes,
    external_url: `${process.env.NEXT_PUBLIC_APP_URL}/badges`,
  };
}

/**
 * Store metadata URL on-chain using manageData operation
 */
export async function storeBadgeMetadataOnChain(
  issuerKeypair: Keypair,
  assetCode: string,
  metadataUrl: string
): Promise<string> {
  const account = await server.loadAccount(issuerKeypair.publicKey());

  // SEP-68 uses manageData to store metadata pointer
  const dataKey = `${assetCode}_meta_url`;

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_NETWORK,
  })
    .addOperation(
      Operation.manageData({
        name: dataKey,
        value: metadataUrl,
      })
    )
    .setTimeout(180)
    .build();

  transaction.sign(issuerKeypair);
  const result = await server.submitTransaction(transaction);

  return result.hash;
}

/**
 * Lock metadata to make it immutable
 */
export async function lockBadgeMetadata(
  issuerKeypair: Keypair,
  assetCode: string
): Promise<string> {
  const account = await server.loadAccount(issuerKeypair.publicKey());

  const lockKey = `${assetCode}_meta_locked`;

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_NETWORK,
  })
    .addOperation(
      Operation.manageData({
        name: lockKey,
        value: "true",
      })
    )
    .setTimeout(180)
    .build();

  transaction.sign(issuerKeypair);
  const result = await server.submitTransaction(transaction);

  return result.hash;
}

/**
 * Fetch badge metadata from on-chain pointer
 */
export async function fetchBadgeMetadata(
  issuerAddress: string,
  assetCode: string
): Promise<LancePayBadgeMetadata | null> {
  try {
    const account = await server.loadAccount(issuerAddress);
    const dataKey = `${assetCode}_meta_url`;

    // Get metadata URL from account data
    const metadataEntry = account.data_attr[dataKey];

    if (!metadataEntry) {
      return null;
    }

    // Decode base64 metadata URL
    const metadataUrl = Buffer.from(metadataEntry, "base64").toString("utf-8");

    // Fetch metadata JSON from URL
    const response = await fetch(metadataUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch metadata");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching badge metadata:", error);
    return null;
  }
}

/**
 * Check if badge metadata is locked (immutable)
 */
export async function isBadgeMetadataLocked(
  issuerAddress: string,
  assetCode: string
): Promise<boolean> {
  try {
    const account = await server.loadAccount(issuerAddress);
    const lockKey = `${assetCode}_meta_locked`;

    return !!account.data_attr[lockKey];
  } catch (error) {
    return false;
  }
}

/**
 * Create project completion badge metadata
 */
export function createProjectBadgeMetadata(
  projectId: string,
  projectName: string,
  completionDate: string,
  rating: number,
  category: string
): LancePayBadgeMetadata {
  return createBadgeMetadata(
    `${projectName} - Completed`,
    `Successfully completed ${projectName} with ${rating}/5 rating`,
    `${process.env.NEXT_PUBLIC_IPFS_GATEWAY}/badges/project-completion.png`,
    [
      { trait_type: "ProjectID", value: projectId },
      { trait_type: "CompletionDate", value: completionDate },
      { trait_type: "Rating", value: rating },
      { trait_type: "Category", value: category },
      { trait_type: "BadgeType", value: "Project Completion" },
    ]
  );
}

/**
 * Create achievement badge metadata
 */
export function createAchievementBadgeMetadata(
  badgeType: "Top Earner" | "Zero Disputes" | "Rising Star" | "Verified Professional",
  earnedDate: string,
  metricValue: number
): LancePayBadgeMetadata {
  const descriptions = {
    "Top Earner": `Top 1% Earner - Achieved $${metricValue}+ in total revenue`,
    "Zero Disputes": `Zero Dispute Champion - Completed ${metricValue}+ invoices with 0 disputes`,
    "Rising Star": `Rising Star - Earned $${metricValue}+ in revenue`,
    "Verified Professional": `Verified Professional - Completed ${metricValue}+ paid invoices`,
  };

  return createBadgeMetadata(
    `LancePay ${badgeType}`,
    descriptions[badgeType],
    `${process.env.NEXT_PUBLIC_IPFS_GATEWAY}/badges/${badgeType.toLowerCase().replace(/\s/g, "-")}.png`,
    [
      { trait_type: "BadgeType", value: badgeType },
      { trait_type: "EarnedDate", value: earnedDate },
      { trait_type: "MetricValue", value: metricValue },
      { trait_type: "Issuer", value: "LancePay" },
    ]
  );
}

/**
 * Upload metadata to IPFS/Arweave (placeholder - needs actual implementation)
 */
export async function uploadMetadataToIPFS(
  metadata: LancePayBadgeMetadata
): Promise<string> {
  // TODO: Implement actual IPFS upload using Pinata, Web3.Storage, or Arweave
  // For now, return a placeholder URL
  const metadataJson = JSON.stringify(metadata, null, 2);

  // Placeholder - in production, upload to IPFS
  console.log("Metadata to upload:", metadataJson);

  // Return placeholder IPFS URL
  return `${process.env.NEXT_PUBLIC_IPFS_GATEWAY}/metadata/${Date.now()}.json`;
}
