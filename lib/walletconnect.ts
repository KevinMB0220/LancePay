import { SignClient } from "@walletconnect/sign-client";
import type { SessionTypes } from "@walletconnect/types";

/**
 * WalletConnect configuration for Stellar
 */
const WALLETCONNECT_CONFIG = {
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
  metadata: {
    name: "LancePay",
    description: "Instant international payments for Nigerian freelancers",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://lancepay.app",
    icons: ["https://lancepay.app/icon.png"],
  },
  chains: ["stellar:pubnet", "stellar:testnet"],
};

/**
 * Stellar WalletConnect namespace
 */
const STELLAR_NAMESPACE = "stellar";
const STELLAR_CHAIN_ID =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
    ? "stellar:pubnet"
    : "stellar:testnet";

/**
 * WalletConnect client instance
 */
let signClient: SignClient | null = null;
let currentSession: SessionTypes.Struct | null = null;

/**
 * Initialize WalletConnect SignClient
 */
export async function initWalletConnect(): Promise<SignClient> {
  if (signClient) return signClient;

  signClient = await SignClient.init({
    projectId: WALLETCONNECT_CONFIG.projectId,
    metadata: WALLETCONNECT_CONFIG.metadata,
  });

  // Handle session events
  signClient.on("session_delete", () => {
    currentSession = null;
  });

  return signClient;
}

/**
 * Connect to a Stellar wallet via WalletConnect
 */
export async function connectWallet(): Promise<{
  uri?: string;
  session?: SessionTypes.Struct;
}> {
  const client = await initWalletConnect();

  const { uri, approval } = await client.connect({
    requiredNamespaces: {
      [STELLAR_NAMESPACE]: {
        methods: [
          "stellar_signTransaction",
          "stellar_signAndSubmitTransaction",
        ],
        chains: [STELLAR_CHAIN_ID],
        events: ["accountsChanged", "chainChanged"],
      },
    },
  });

  // Return URI for QR code display
  if (uri) {
    // Wait for session approval
    const session = await approval();
    currentSession = session;
    return { session };
  }

  return { uri };
}

/**
 * Get connected account address
 */
export function getConnectedAccount(): string | null {
  if (!currentSession) return null;

  const accounts =
    currentSession.namespaces[STELLAR_NAMESPACE]?.accounts || [];
  if (accounts.length === 0) return null;

  // Extract address from format: stellar:pubnet:G...
  const account = accounts[0].split(":")[2];
  return account;
}

/**
 * Sign a transaction using connected wallet
 */
export async function signTransaction(xdr: string): Promise<string> {
  if (!signClient || !currentSession) {
    throw new Error("Wallet not connected");
  }

  const result = await signClient.request({
    topic: currentSession.topic,
    chainId: STELLAR_CHAIN_ID,
    request: {
      method: "stellar_signTransaction",
      params: {
        xdr,
      },
    },
  });

  return result as string;
}

/**
 * Sign and submit transaction using connected wallet
 */
export async function signAndSubmitTransaction(
  xdr: string
): Promise<{ hash: string }> {
  if (!signClient || !currentSession) {
    throw new Error("Wallet not connected");
  }

  const result = await signClient.request({
    topic: currentSession.topic,
    chainId: STELLAR_CHAIN_ID,
    request: {
      method: "stellar_signAndSubmitTransaction",
      params: {
        xdr,
      },
    },
  });

  return result as { hash: string };
}

/**
 * Disconnect from WalletConnect session
 */
export async function disconnectWallet(): Promise<void> {
  if (!signClient || !currentSession) return;

  await signClient.disconnect({
    topic: currentSession.topic,
    reason: {
      code: 6000,
      message: "User disconnected",
    },
  });

  currentSession = null;
}

/**
 * Get current session
 */
export function getCurrentSession(): SessionTypes.Struct | null {
  return currentSession;
}

/**
 * Check if wallet is connected
 */
export function isWalletConnected(): boolean {
  return currentSession !== null;
}
