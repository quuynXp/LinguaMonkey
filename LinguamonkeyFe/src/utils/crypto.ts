import { encode, decode } from 'base64-arraybuffer';
import webcrypto, {
    CryptoKey as QuickCryptoKey,
    CryptoKeyPair as QuickCryptoKeyPair
} from 'react-native-quick-crypto';

// Lấy đối tượng subtle từ thư viện Native
const subtle = webcrypto.subtle;

/**
 * Chuyển đổi ArrayBuffer sang Base64 String
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    return encode(buffer);
}

/**
 * Chuyển đổi Base64 String sang ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    return decode(base64);
}

/**
 * Tạo ra một Shared Session Key giả định.
 */
export async function getSessionKey(identifier: string): Promise<QuickCryptoKey> {
    const keyBytes = new Uint8Array(32);
    for (let i = 0; i < keyBytes.length; i++) {
        keyBytes[i] = (identifier.charCodeAt(i % identifier.length) + i) % 256;
    }

    return subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    ) as Promise<QuickCryptoKey>;
}

/**
 * Mã hóa nội dung bằng AES-256 GCM.
 */
export async function encryptAES(content: string, key: QuickCryptoKey): Promise<[string, string]> {
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
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

/**
 * Giải mã nội dung bằng AES-256 GCM.
 */
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

// --- CÁC HÀM SINH KHÓA X3DH ---

/**
 * Tạo một cặp khóa Elliptic Curve (ECDH) dùng cho Identity Key hoặc Signed PreKey.
 */
export async function generateKeyPair(): Promise<QuickCryptoKeyPair> {
    return subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey"]
    ) as Promise<QuickCryptoKeyPair>;
}

/**
 * Xuất khóa công khai từ cặp khóa thành Base64 string (Dùng SPKI).
 */
export async function exportPublicKey(key: QuickCryptoKey): Promise<string> {
    // FIX: Dùng 'spki' thay vì 'raw' để đảm bảo Export Format được hỗ trợ
    const exportedKey = await subtle.exportKey("spki", key);
    return arrayBufferToBase64(exportedKey as ArrayBuffer);
}

/**
 * Xuất khóa bí mật thành Base64 string (Dùng PKCS8).
 */
export async function exportPrivateKey(key: QuickCryptoKey): Promise<string> {
    const exportedKey = await subtle.exportKey("pkcs8", key);
    return arrayBufferToBase64(exportedKey as ArrayBuffer);
}

/**
 * Tạo một cặp khóa dùng cho Signed PreKey (ECDSA để ký).
 */
export async function generateSigningKeyPair(): Promise<QuickCryptoKeyPair> {
    return subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"]
    ) as Promise<QuickCryptoKeyPair>;
}

/**
 * Ký dữ liệu bằng Khóa bí mật.
 */
export async function signData(privateKey: QuickCryptoKey, data: ArrayBuffer): Promise<string> {
    const signature = await subtle.sign(
        { name: "ECDSA", hash: { name: "SHA-256" } },
        privateKey,
        data
    );
    return arrayBufferToBase64(signature as ArrayBuffer);
}

/**
 * Nhập khóa công khai để xác minh.
 */
export async function importPublicKey(publicKeyBase64: string): Promise<QuickCryptoKey> {
    const buffer = base64ToArrayBuffer(publicKeyBase64);
    // FIX: Dùng 'spki' khi import Public Key
    return subtle.importKey(
        "spki",
        buffer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    ) as Promise<QuickCryptoKey>;
}

/**
 * Import lại KeyPair (ECDH) từ JSON đã lưu.
 */
export async function importKeyPair(keyPairJson: { publicKey: string; privateKey: string }): Promise<QuickCryptoKeyPair> {
    const pubBuffer = base64ToArrayBuffer(keyPairJson.publicKey);
    const privBuffer = base64ToArrayBuffer(keyPairJson.privateKey);

    // FIX: Import Public Key dùng 'spki'
    const publicKey = await subtle.importKey(
        "spki",
        pubBuffer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    ) as QuickCryptoKey;

    // Import Private Key dùng 'pkcs8'
    const privateKey = await subtle.importKey(
        "pkcs8",
        privBuffer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey"]
    ) as QuickCryptoKey;

    return { publicKey, privateKey } as QuickCryptoKeyPair;
}

/**
 * Import lại Signing KeyPair (ECDSA) từ JSON đã lưu.
 */
export async function importSigningKeyPair(keyPairJson: { publicKey: string; privateKey: string }): Promise<QuickCryptoKeyPair> {
    const pubBuffer = base64ToArrayBuffer(keyPairJson.publicKey);
    const privBuffer = base64ToArrayBuffer(keyPairJson.privateKey);

    // FIX: Import Signing Public Key dùng 'spki' (thay vì raw)
    const publicKey = await subtle.importKey(
        "spki",
        pubBuffer,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["verify"]
    ) as QuickCryptoKey;

    // Import Signing Private Key dùng 'pkcs8'
    const privateKey = await subtle.importKey(
        "pkcs8",
        privBuffer,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign"]
    ) as QuickCryptoKey;

    return { publicKey, privateKey } as QuickCryptoKeyPair;
}

/**
 * Sinh ngẫu nhiên một ID Key cho One-Time PreKey.
 */
export function generatePreKeyId(): number {
    return Math.floor(Math.random() * (2 ** 31 - 1));
}