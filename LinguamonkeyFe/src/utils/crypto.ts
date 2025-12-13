// utils/crypto.ts
import { encode, decode } from 'base64-arraybuffer';
import webcrypto, {
    CryptoKey as QuickCryptoKey,
    CryptoKeyPair as QuickCryptoKeyPair
} from 'react-native-quick-crypto';

// --- THÊM DÒNG NÀY ĐỂ TRÁNH LỖI CRASH ---
import 'text-encoding';
// ----------------------------------------

const subtle = webcrypto.subtle;

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    return encode(buffer);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    return decode(base64);
}

export async function deriveSessionKey(
    privateKey: QuickCryptoKey,
    publicKey: QuickCryptoKey
): Promise<QuickCryptoKey> {
    // Ép kiểu 'public' cho đúng chuẩn của lib quick-crypto
    const sharedBits = await subtle.deriveBits(
        { name: "ECDH", namedCurve: "P-256", public: publicKey } as any,
        privateKey,
        256
    );

    return subtle.importKey(
        "raw",
        sharedBits,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    ) as Promise<QuickCryptoKey>;
}

export async function encryptAES(content: string, key: QuickCryptoKey): Promise<[string, string]> {
    const iv = webcrypto.getRandomValues(new Uint8Array(12));

    // TextEncoder sẽ hoạt động nhờ polyfill đã import ở trên
    const encodedContent = new TextEncoder().encode(content);

    const encryptedContent = await subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encodedContent
    );

    const ivBase64 = arrayBufferToBase64(iv.buffer as ArrayBuffer);
    const ciphertextBase64 = arrayBufferToBase64(encryptedContent as ArrayBuffer);

    return [ivBase64, ciphertextBase64];
}

export async function decryptAES(ciphertextBase64: string, ivBase64: string, key: QuickCryptoKey): Promise<string> {
    const ivBuffer = base64ToArrayBuffer(ivBase64);
    const cipherBuffer = base64ToArrayBuffer(ciphertextBase64);

    const decryptedContent = await subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(ivBuffer) },
        key,
        cipherBuffer
    );

    return new TextDecoder().decode(decryptedContent as ArrayBuffer);
}

// --- CÁC HÀM QUẢN LÝ KEY ---

export async function generateKeyPair(): Promise<QuickCryptoKeyPair> {
    return subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
    ) as Promise<QuickCryptoKeyPair>;
}

export async function exportPublicKey(key: QuickCryptoKey): Promise<string> {
    const exportedKey = await subtle.exportKey("spki", key);
    return arrayBufferToBase64(exportedKey as ArrayBuffer);
}

export async function exportPrivateKey(key: QuickCryptoKey): Promise<string> {
    const exportedKey = await subtle.exportKey("pkcs8", key);
    return arrayBufferToBase64(exportedKey as ArrayBuffer);
}

export async function generateSigningKeyPair(): Promise<QuickCryptoKeyPair> {
    return subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"]
    ) as Promise<QuickCryptoKeyPair>;
}

export async function signData(privateKey: QuickCryptoKey, data: ArrayBuffer): Promise<string> {
    const signature = await subtle.sign(
        { name: "ECDSA", hash: { name: "SHA-256" } },
        privateKey,
        data
    );
    return arrayBufferToBase64(signature as ArrayBuffer);
}

export async function importPublicKey(publicKeyBase64: string): Promise<QuickCryptoKey> {
    const buffer = base64ToArrayBuffer(publicKeyBase64);
    return subtle.importKey(
        "spki",
        buffer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    ) as Promise<QuickCryptoKey>;
}

export async function importKeyPair(keyPairJson: { publicKey: string; privateKey: string }): Promise<QuickCryptoKeyPair> {
    const pubBuffer = base64ToArrayBuffer(keyPairJson.publicKey);
    const privBuffer = base64ToArrayBuffer(keyPairJson.privateKey);

    const publicKey = await subtle.importKey(
        "spki",
        pubBuffer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    ) as QuickCryptoKey;

    const privateKey = await subtle.importKey(
        "pkcs8",
        privBuffer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
    ) as QuickCryptoKey;

    return { publicKey, privateKey } as QuickCryptoKeyPair;
}

export async function importSigningKeyPair(keyPairJson: { publicKey: string; privateKey: string }): Promise<QuickCryptoKeyPair> {
    const pubBuffer = base64ToArrayBuffer(keyPairJson.publicKey);
    const privBuffer = base64ToArrayBuffer(keyPairJson.privateKey);

    const publicKey = await subtle.importKey(
        "spki",
        pubBuffer,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["verify"]
    ) as QuickCryptoKey;

    const privateKey = await subtle.importKey(
        "pkcs8",
        privBuffer,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign"]
    ) as QuickCryptoKey;

    return { publicKey, privateKey } as QuickCryptoKeyPair;
}

export function generatePreKeyId(): number {
    return Math.floor(Math.random() * (2 ** 31 - 1));
}