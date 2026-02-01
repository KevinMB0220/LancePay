/**
 * Client-side encryption utilities using Web Crypto API (AES-256-GCM)
 * 
 * These functions are designed to run in the browser for Zero-Knowledge encryption.
 * The server never has access to the encryption key.
 */

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const SALT_LENGTH = 16
const IV_LENGTH = 12

/**
 * Generate a cryptographically secure random encryption key
 * Returns a base64-encoded string for URL-safe storage in hash fragment
 */
export function generateEncryptionKey(): string {
    const keyBytes = new Uint8Array(32) // 256 bits
    crypto.getRandomValues(keyBytes)
    return bufferToBase64Url(keyBytes)
}

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): string {
    const saltBytes = new Uint8Array(SALT_LENGTH)
    crypto.getRandomValues(saltBytes)
    return bufferToBase64Url(saltBytes)
}

/**
 * Derive an AES-256-GCM key from a secret and salt using PBKDF2
 */
async function deriveKey(secret: string, salt: string): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const secretBuffer = encoder.encode(secret)
    const saltBuffer = base64UrlToBuffer(salt)

    // Import the secret as a raw key for PBKDF2
    const baseKey = await crypto.subtle.importKey(
        'raw',
        secretBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
    )

    // Derive the actual AES key
    // Use .buffer to get the underlying ArrayBuffer from Uint8Array
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBuffer.buffer as ArrayBuffer,
            iterations: 100000,
            hash: 'SHA-256',
        },
        baseKey,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    )
}

/**
 * Encrypt invoice data client-side
 * 
 * @param data - Object containing invoice details (items, clientName, description, etc.)
 * @param secret - User-provided encryption key
 * @returns Encrypted data and salt for server storage
 */
export async function encryptInvoiceData(
    data: Record<string, unknown>,
    secret: string
): Promise<{ encryptedData: string; salt: string }> {
    const salt = generateSalt()
    const key = await deriveKey(secret, salt)

    const encoder = new TextEncoder()
    const plaintext = encoder.encode(JSON.stringify(data))

    // Generate random IV for this encryption
    const iv = new Uint8Array(IV_LENGTH)
    crypto.getRandomValues(iv)

    const ciphertext = await crypto.subtle.encrypt(
        { name: ALGORITHM, iv },
        key,
        plaintext
    )

    // Combine IV + ciphertext for storage
    const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length)
    combined.set(iv)
    combined.set(new Uint8Array(ciphertext), iv.length)

    return {
        encryptedData: bufferToBase64Url(combined),
        salt,
    }
}

/**
 * Decrypt invoice data client-side
 * 
 * @param encryptedData - Base64-encoded encrypted blob (IV + ciphertext)
 * @param salt - Salt used during encryption
 * @param secret - User-provided decryption key
 * @returns Decrypted object
 * @throws Error if decryption fails (wrong key or corrupted data)
 */
export async function decryptInvoiceData(
    encryptedData: string,
    salt: string,
    secret: string
): Promise<Record<string, unknown>> {
    const key = await deriveKey(secret, salt)

    const combined = base64UrlToBuffer(encryptedData)
    const iv = combined.slice(0, IV_LENGTH)
    const ciphertext = combined.slice(IV_LENGTH)

    try {
        const plaintext = await crypto.subtle.decrypt(
            { name: ALGORITHM, iv },
            key,
            ciphertext
        )

        const decoder = new TextDecoder()
        return JSON.parse(decoder.decode(plaintext))
    } catch {
        throw new Error('Decryption failed: Invalid key or corrupted data')
    }
}

/**
 * Extract encryption key from URL hash fragment
 * URL format: /pay/confidential/[id]#key=<base64url-key>
 */
export function extractKeyFromHash(): string | null {
    if (typeof window === 'undefined') return null

    const hash = window.location.hash
    if (!hash || !hash.startsWith('#')) return null

    // Support both #key=VALUE and #VALUE formats
    const keyMatch = hash.match(/^#(?:key=)?(.+)$/)
    return keyMatch ? keyMatch[1] : null
}

// Utility: Convert Uint8Array to URL-safe base64
function bufferToBase64Url(buffer: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...buffer))
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Utility: Convert URL-safe base64 to Uint8Array
function base64UrlToBuffer(base64url: string): Uint8Array {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const binary = atob(padded)
    return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}
