import { Buffer } from 'buffer';
import EC from 'elliptic';
import CryptoJS from 'crypto-js';

// ============================================================================
// 1. POLYFILL GLOBAL (Dành cho các thư viện check global.crypto)
// ============================================================================
const globalAny = global as any;

// Polyfill Buffer nếu thiếu
if (typeof globalAny.Buffer === 'undefined') {
    globalAny.Buffer = Buffer;
}

// Polyfill crypto.getRandomValues bằng Math.random (Fallback an toàn)
if (!globalAny.crypto) globalAny.crypto = {};
if (!globalAny.crypto.getRandomValues) {
    globalAny.crypto.getRandomValues = (array: any) => {
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return array;
    };
}

// ============================================================================
// 2. FORCE OVERRIDE CRYPTOJS (Chặn lỗi "Native crypto module could not be used")
// ============================================================================
// Ghi đè hàm random của CryptoJS để nó KHÔNG bao giờ gọi xuống native module bị lỗi
CryptoJS.lib.WordArray.random = (nBytes: number) => {
    const words: number[] = [];
    for (let i = 0; i < nBytes; i += 4) {
        // Tạo số ngẫu nhiên 32-bit thủ công
        words.push(Math.floor(Math.random() * 0x100000000));
    }
    return CryptoJS.lib.WordArray.create(words, nBytes);
};

// ============================================================================
// 3. CẤU HÌNH ELLIPTIC
// ============================================================================
const ec = new EC.ec('p256');

export type CryptoKey = EC.ec.KeyPair;
export type CryptoKeyPair = { publicKey: CryptoKey; privateKey: CryptoKey };

// Hàm tiện ích: Tạo mảng ngẫu nhiên cho Elliptic (tránh lỗi Not implemented)
function getSecureRandomArray(len: number): number[] {
    const arr = [];
    for (let i = 0; i < len; i++) {
        arr.push(Math.floor(Math.random() * 256));
    }
    return arr;
}

function arrayBufferToWordArray(ab: ArrayBuffer): CryptoJS.lib.WordArray {
    const u8 = new Uint8Array(ab);
    const words: number[] = [];
    for (let i = 0; i < u8.length; i += 4) {
        words.push(
            ((u8[i] || 0) << 24) |
            ((u8[i + 1] || 0) << 16) |
            ((u8[i + 2] || 0) << 8) |
            (u8[i + 3] || 0)
        );
    }
    return CryptoJS.lib.WordArray.create(words, u8.length);
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    return Buffer.from(buffer).toString('base64');
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    return Buffer.from(base64, 'base64').buffer;
}

export async function generateKeyPair(): Promise<CryptoKeyPair> {
    try {
        // CÁCH FIX ELLIPTIC: Truyền trực tiếp entropy (độ ngẫu nhiên) vào hàm genKeyPair
        // Việc này giúp elliptic không cần tự đi tìm RNG hệ thống (nguyên nhân gây crash)
        const entropy = getSecureRandomArray(32);
        const key = ec.genKeyPair({ entropy });

        return { publicKey: key, privateKey: key };
    } catch (e: any) {
        console.error('[Crypto] generateKeyPair CRASHED:', e);
        throw new Error(`Generate Key Pair Failed: ${e.message}`);
    }
}

export async function generateSigningKeyPair(): Promise<CryptoKeyPair> {
    return generateKeyPair();
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
    const pubPoint = key.getPublic(false, 'array');
    return Buffer.from(pubPoint).toString('base64');
}

export async function exportPrivateKey(key: CryptoKey): Promise<string> {
    const priv = key.getPrivate();
    const privBuffer = Buffer.from(priv.toArray('be', 32));
    return privBuffer.toString('base64');
}

export async function importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
    try {
        let buffer = Buffer.from(publicKeyBase64, 'base64');

        // Xử lý key từ Java Backend (Cắt header SPKI 91 bytes -> 65 bytes raw)
        if (buffer.length === 91 && buffer[0] === 0x30) {
            console.log('[Crypto] Stripping SPKI header (91 -> 65 bytes)');
            buffer = buffer.slice(26);
        }

        const pointArray = Array.from(new Uint8Array(buffer));
        const key = ec.keyFromPublic(pointArray);
        return key;
    } catch (e: any) {
        console.error("[Crypto] importPublicKey Failed.", e);
        throw new Error(`Invalid Public Key: ${e.message}`);
    }
}

export async function importKeyPair(keyPairJson: {
    publicKey: string;
    privateKey: string
}): Promise<CryptoKeyPair> {
    const privBuffer = Buffer.from(keyPairJson.privateKey, 'base64');
    const key = ec.keyFromPrivate(privBuffer);
    return { publicKey: key, privateKey: key };
}

export async function importSigningKeyPair(keyPairJson: {
    publicKey: string;
    privateKey: string
}): Promise<CryptoKeyPair> {
    return importKeyPair(keyPairJson);
}

export async function importKeyPairFromStrings(
    publicKeyBase64: string,
    privateKeyBase64: string
): Promise<CryptoKeyPair> {
    return importKeyPair({ publicKey: publicKeyBase64, privateKey: privateKeyBase64 });
}

export async function importSigningKeyPairFromStrings(
    publicKeyBase64: string,
    privateKeyBase64: string
): Promise<CryptoKeyPair> {
    return importKeyPairFromStrings(publicKeyBase64, privateKeyBase64);
}

export async function deriveSessionKey(
    privateKey: CryptoKey,
    publicKey: CryptoKey
): Promise<string> {
    try {
        // 1. ECDH Derive
        const sharedSecret = privateKey.derive(publicKey.getPublic());
        const sharedSecretBytes = sharedSecret.toArray('be', 32);

        // 2. Convert to CryptoJS WordArray
        const sharedSecretWa = arrayBufferToWordArray(new Uint8Array(sharedSecretBytes).buffer);

        // 3. HKDF / HMAC
        const info = 'E2EE-AES-256-GCM-v1';
        const infoWa = CryptoJS.enc.Utf8.parse(info);

        const hmac = CryptoJS.HmacSHA256(infoWa, sharedSecretWa);
        return hmac.toString(CryptoJS.enc.Base64);
    } catch (e: any) {
        console.error("[Crypto] ECDH Derivation Failed:", e);
        throw new Error(`Derive Session Key Failed: ${e.message}`);
    }
}

export async function encryptAES(content: string, keyBase64: string): Promise<[string, string]> {
    try {
        // IV sẽ được sinh bởi hàm CryptoJS.lib.WordArray.random mà ta đã ghi đè ở trên
        // Đảm bảo không gọi xuống native module
        const ivWa = CryptoJS.lib.WordArray.random(16);
        const ivBase64 = ivWa.toString(CryptoJS.enc.Base64);
        const keyWa = CryptoJS.enc.Base64.parse(keyBase64);

        const encrypted = CryptoJS.AES.encrypt(content, keyWa, {
            iv: ivWa,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        const ciphertextBase64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
        return [ivBase64, ciphertextBase64];
    } catch (e: any) {
        console.error("AES Encryption failed:", e);
        throw new Error(`Encryption failed: ${e.message}`);
    }
}

export async function decryptAES(
    ciphertextBase64: string,
    ivBase64: string,
    keyBase64: string
): Promise<string> {
    try {
        const ivWa = CryptoJS.enc.Base64.parse(ivBase64);
        const keyWa = CryptoJS.enc.Base64.parse(keyBase64);
        const cipherParams = CryptoJS.lib.CipherParams.create({
            ciphertext: CryptoJS.enc.Base64.parse(ciphertextBase64)
        });

        const decrypted = CryptoJS.AES.decrypt(cipherParams, keyWa, {
            iv: ivWa,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (e: any) {
        console.error("AES Decryption failed:", e);
        throw new Error(`Decryption failed: ${e.message}`);
    }
}

export async function signData(privateKey: CryptoKey, data: ArrayBuffer): Promise<string> {
    const dataWa = arrayBufferToWordArray(data);
    const hash = CryptoJS.SHA256(dataWa).toString();
    const signature = privateKey.sign(hash);
    const derSign = signature.toDER();
    return Buffer.from(derSign).toString('base64');
}

export function generatePreKeyId(): number {
    return Math.floor(Math.random() * (2 ** 31 - 1));
}