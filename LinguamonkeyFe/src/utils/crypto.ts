import { encode, decode } from 'base64-arraybuffer';
// eslint-disable-next-line import/no-unresolved
import { p256 } from '@noble/curves/p256';
// eslint-disable-next-line import/no-unresolved
import { hkdf } from '@noble/hashes/hkdf';
// eslint-disable-next-line import/no-unresolved
import { sha256 } from '@noble/hashes/sha256';
import 'text-encoding';
import { Buffer } from 'buffer';

const getSubtle = () => {
    const _global = global as any;
    if (_global.crypto && _global.crypto.subtle) return _global.crypto.subtle;
    try {
        const crypto = require('react-native-quick-crypto');
        if ((crypto as any).webcrypto && (crypto as any).webcrypto.subtle) {
            return (crypto as any).webcrypto.subtle;
        }
        if ((crypto as any).subtle) return (crypto as any).subtle;
    } catch (e) {
        console.warn('react-native-quick-crypto not available, using global crypto');
    }
    return {} as any;
};

const subtle = getSubtle();

// --- TYPE DEFINITIONS ---
export type CryptoKey = any;
export type CryptoKeyPair = { publicKey: CryptoKey; privateKey: CryptoKey };

// --- UTILS ---
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    return encode(buffer);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    return decode(base64);
}

function base64UrlToBase64(base64Url: string): string {
    return base64Url.replace(/-/g, '+').replace(/_/g, '/').padEnd(
        base64Url.length + (4 - base64Url.length % 4) % 4,
        '='
    );
}

// --- NOBLE CURVES ECDH IMPLEMENTATION ---
/**
 * Derive session key using @noble/curves v2
 * Flow: ECDH Shared Secret → HKDF-SHA256 → AES-256-GCM Key
 */
export async function deriveSessionKey(
    privateKey: CryptoKey,
    publicKey: CryptoKey
): Promise<CryptoKey> {
    try {
        console.log("[E2EE_DEBUG] Starting ECDH with Noble Curves v2");

        // STEP 1: Export keys to JWK format
        const jwkPriv = await subtle.exportKey("jwk", privateKey);
        const jwkPub = await subtle.exportKey("jwk", publicKey);

        if (!jwkPriv.d || !jwkPub.x || !jwkPub.y) {
            throw new Error("Invalid JWK: missing d, x, or y coordinates");
        }

        // STEP 2: Convert JWK base64url to raw bytes
        const privBytes = new Uint8Array(decode(base64UrlToBase64(jwkPriv.d)));
        const xBytes = new Uint8Array(decode(base64UrlToBase64(jwkPub.x)));
        const yBytes = new Uint8Array(decode(base64UrlToBase64(jwkPub.y)));

        console.log("[E2EE_DEBUG] Private key bytes:", privBytes.length);
        console.log("[E2EE_DEBUG] Public X bytes:", xBytes.length);
        console.log("[E2EE_DEBUG] Public Y bytes:", yBytes.length);

        // STEP 3: Construct uncompressed public key (0x04 || X || Y)
        const publicKeyBytes = new Uint8Array(65);
        publicKeyBytes[0] = 0x04; // Uncompressed point indicator
        publicKeyBytes.set(xBytes, 1);
        publicKeyBytes.set(yBytes, 33);

        // STEP 4: Compute ECDH shared secret using Noble Curves
        // p256.getSharedSecret(privateKey, publicKey, isCompressed?)
        const sharedSecret = p256.getSharedSecret(privBytes, publicKeyBytes, false);

        console.log("[E2EE_DEBUG] ✅ ECDH shared secret computed:", sharedSecret.length, "bytes");

        // STEP 5: Derive AES-256 key using HKDF
        // hkdf(hash, ikm, salt, info, length)
        const info = new TextEncoder().encode('E2EE-AES-256-GCM-v1');
        const salt = undefined; // No salt for simplicity (can add later)
        const derivedKeyBytes = hkdf(sha256, sharedSecret, salt, info, 32); // 32 bytes = 256 bits

        console.log("[E2EE_DEBUG] ✅ HKDF derived key:", derivedKeyBytes.length, "bytes");

        // STEP 6: Import derived key as WebCrypto AES-GCM key
        const aesKey = await subtle.importKey(
            "raw",
            derivedKeyBytes,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );

        console.log("[E2EE_DEBUG] 🎉 Session key successfully derived and imported");
        return aesKey as CryptoKey;

    } catch (e: any) {
        console.error("❌ ECDH Noble Curves Derivation Failed:", e);
        console.error("Error stack:", e.stack);
        throw new Error(`Derive Session Key Failed: ${e.message}`);
    }
}

// --- AES ENCRYPTION/DECRYPTION ---
export async function encryptAES(content: string, key: CryptoKey): Promise<[string, string]> {
    try {
        const crypto = require('react-native-quick-crypto');
        const getRandomValues = (crypto as any).getRandomValues || (global as any).crypto?.getRandomValues;

        if (!getRandomValues) {
            throw new Error("getRandomValues not available");
        }

        const iv = getRandomValues(new Uint8Array(12));
        const encodedContent = new TextEncoder().encode(content);

        const encryptedContent = await subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encodedContent
        );

        const ivBase64 = arrayBufferToBase64(iv.buffer as ArrayBuffer);
        const ciphertextBase64 = arrayBufferToBase64(encryptedContent as ArrayBuffer);

        return [ivBase64, ciphertextBase64];
    } catch (e: any) {
        console.error("AES Encryption failed:", e);
        throw new Error(`Encryption failed: ${e.message}`);
    }
}

export async function decryptAES(
    ciphertextBase64: string,
    ivBase64: string,
    key: CryptoKey
): Promise<string> {
    try {
        const ivBuffer = base64ToArrayBuffer(ivBase64);
        const cipherBuffer = base64ToArrayBuffer(ciphertextBase64);

        const decryptedContent = await subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(ivBuffer) },
            key,
            cipherBuffer
        );

        return new TextDecoder().decode(decryptedContent as ArrayBuffer);
    } catch (e: any) {
        console.error("AES Decryption failed:", e);
        throw new Error(`Decryption failed: ${e.message}`);
    }
}

// --- KEY MANAGEMENT FUNCTIONS ---
export async function generateKeyPair(): Promise<CryptoKeyPair> {
    return await subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
    ) as CryptoKeyPair;
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
    const exportedKey = await subtle.exportKey("spki", key);
    return arrayBufferToBase64(exportedKey as ArrayBuffer);
}

export async function exportPrivateKey(key: CryptoKey): Promise<string> {
    const exportedKey = await subtle.exportKey("pkcs8", key);
    return arrayBufferToBase64(exportedKey as ArrayBuffer);
}

export async function generateSigningKeyPair(): Promise<CryptoKeyPair> {
    return await subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"]
    ) as CryptoKeyPair;
}

export async function signData(privateKey: CryptoKey, data: ArrayBuffer): Promise<string> {
    const signature = await subtle.sign(
        { name: "ECDSA", hash: { name: "SHA-256" } },
        privateKey,
        data
    );
    return arrayBufferToBase64(signature as ArrayBuffer);
}

export async function importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
    const buffer = base64ToArrayBuffer(publicKeyBase64);
    return await subtle.importKey(
        "spki",
        buffer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    ) as CryptoKey;
}

export async function importKeyPair(keyPairJson: {
    publicKey: string;
    privateKey: string
}): Promise<CryptoKeyPair> {
    const pubBuffer = base64ToArrayBuffer(keyPairJson.publicKey);
    const privBuffer = base64ToArrayBuffer(keyPairJson.privateKey);

    const publicKey = await subtle.importKey(
        "spki",
        pubBuffer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    ) as CryptoKey;

    const privateKey = await subtle.importKey(
        "pkcs8",
        privBuffer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
    ) as CryptoKey;

    return { publicKey, privateKey };
}

export async function importSigningKeyPair(keyPairJson: {
    publicKey: string;
    privateKey: string
}): Promise<CryptoKeyPair> {
    const pubBuffer = base64ToArrayBuffer(keyPairJson.publicKey);
    const privBuffer = base64ToArrayBuffer(keyPairJson.privateKey);

    const publicKey = await subtle.importKey(
        "spki",
        pubBuffer,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["verify"]
    ) as CryptoKey;

    const privateKey = await subtle.importKey(
        "pkcs8",
        privBuffer,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign"]
    ) as CryptoKey;

    return { publicKey, privateKey };
}

export async function importKeyPairFromStrings(
    publicKeyBase64: string,
    privateKeyBase64: string
): Promise<CryptoKeyPair> {
    const pubBuffer = base64ToArrayBuffer(publicKeyBase64);
    const privBuffer = base64ToArrayBuffer(privateKeyBase64);

    const publicKey = await subtle.importKey(
        "spki",
        pubBuffer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    ) as CryptoKey;

    const privateKey = await subtle.importKey(
        "pkcs8",
        privBuffer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
    ) as CryptoKey;

    return { publicKey, privateKey };
}

export async function importSigningKeyPairFromStrings(
    publicKeyBase64: string,
    privateKeyBase64: string
): Promise<CryptoKeyPair> {
    const pubBuffer = base64ToArrayBuffer(publicKeyBase64);
    const privBuffer = base64ToArrayBuffer(privateKeyBase64);

    const publicKey = await subtle.importKey(
        "spki",
        pubBuffer,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["verify"]
    ) as CryptoKey;

    const privateKey = await subtle.importKey(
        "pkcs8",
        privBuffer,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign"]
    ) as CryptoKey;

    return { publicKey, privateKey };
}

export function generatePreKeyId(): number {
    return Math.floor(Math.random() * (2 ** 31 - 1));
}