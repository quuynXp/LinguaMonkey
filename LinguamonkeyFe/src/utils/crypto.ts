import { encode, decode } from 'base64-arraybuffer';

// KHẮC PHỤC LỖI: Lấy đối tượng crypto một cách an toàn
// Giả định môi trường React Native cần polyfill (ví dụ: gán vào global.crypto)
// Nếu không có, các hàm sẽ ném ra lỗi rõ ràng.
const webCrypto = global.crypto;

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
 * @param identifier Chuỗi ID để tạo key cố định.
 * @returns Khóa CryptoKey 256-bit
 */
export async function getSessionKey(identifier: string): Promise<CryptoKey> {
    if (!webCrypto || !webCrypto.subtle) throw new Error("Web Crypto subtle is missing.");
    const keyBytes = new Uint8Array(32);
    for (let i = 0; i < keyBytes.length; i++) {
        keyBytes[i] = (identifier.charCodeAt(i % identifier.length) + i) % 256;
    }

    return webCrypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Mã hóa nội dung bằng AES-256 GCM.
 * @param content Nội dung chuỗi.
 * @param key Khóa CryptoKey.
 * @returns Tuple [IV (Base64), Ciphertext (Base64)].
 */
export async function encryptAES(content: string, key: CryptoKey): Promise<[string, string]> {
    if (!webCrypto || !webCrypto.subtle) throw new Error("Web Crypto subtle is missing.");
    const iv = webCrypto.getRandomValues(new Uint8Array(12));
    const encodedContent = new TextEncoder().encode(content);

    const encryptedContent = await webCrypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encodedContent
    );

    const ivBase64 = arrayBufferToBase64(iv.buffer);
    const ciphertextBase64 = arrayBufferToBase64(encryptedContent);

    return [ivBase64, ciphertextBase64];
}

/**
 * Giải mã nội dung bằng AES-256 GCM.
 * @param ciphertextBase64 Ciphertext (Base64).
 * @param ivBase64 Initialization Vector (Base64).
 * @param key Khóa CryptoKey.
 * @returns Chuỗi nội dung đã giải mã.
 */
export async function decryptAES(ciphertextBase64: string, ivBase64: string, key: CryptoKey): Promise<string> {
    if (!webCrypto || !webCrypto.subtle) throw new Error("Web Crypto subtle is missing.");
    const ivBuffer = base64ToArrayBuffer(ivBase64);
    const cipherBuffer = base64ToArrayBuffer(ciphertextBase64);

    const decryptedContent = await webCrypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(ivBuffer) },
        key,
        cipherBuffer
    );

    return new TextDecoder().decode(decryptedContent);
}

// --- BỔ SUNG CÁC HÀM SINH KHÓA X3DH ---

/**
 * Tạo một cặp khóa Elliptic Curve (ECDH) dùng cho Identity Key hoặc Signed PreKey.
 * @returns Cặp khóa công khai và bí mật (CryptoKey).
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
    if (!webCrypto || !webCrypto.subtle) throw new Error("Web Crypto subtle is missing.");
    return webCrypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey"]
    );
}

/**
 * Xuất khóa công khai từ cặp khóa thành Base64 string (Format RAW hoặc SPKI).
 * @param key Khóa công khai CryptoKey.
 * @returns Khóa công khai Base64.
 */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
    if (!webCrypto || !webCrypto.subtle) throw new Error("Web Crypto subtle is missing.");
    const exportedKey = await webCrypto.subtle.exportKey("raw", key);
    return arrayBufferToBase64(exportedKey);
}

/**
 * --- NEW: Xuất khóa bí mật thành Base64 string (Format PKCS8) ---
 * Bắt buộc dùng pkcs8 cho Private Key để lưu trữ/transfer an toàn.
 * @param key Khóa bí mật CryptoKey.
 * @returns Khóa bí mật Base64.
 */
export async function exportPrivateKey(key: CryptoKey): Promise<string> {
    if (!webCrypto || !webCrypto.subtle) throw new Error("Web Crypto subtle is missing.");
    const exportedKey = await webCrypto.subtle.exportKey("pkcs8", key);
    return arrayBufferToBase64(exportedKey);
}

/**
 * Tạo một cặp khóa dùng cho Signed PreKey (ECDSA để ký).
 * @returns Cặp khóa ký.
 */
export async function generateSigningKeyPair(): Promise<CryptoKeyPair> {
    if (!webCrypto || !webCrypto.subtle) throw new Error("Web Crypto subtle is missing.");
    return webCrypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"]
    );
}

/**
 * Ký dữ liệu bằng Khóa bí mật (Signed PreKey Private Key).
 * @param privateKey Khóa bí mật dùng để ký.
 * @param data Dữ liệu cần ký (Identity Public Key ArrayBuffer).
 * @returns Chữ ký Base64.
 */
export async function signData(privateKey: CryptoKey, data: ArrayBuffer): Promise<string> {
    if (!webCrypto || !webCrypto.subtle) throw new Error("Web Crypto subtle is missing.");
    const signature = await webCrypto.subtle.sign(
        { name: "ECDSA", hash: { name: "SHA-256" } },
        privateKey,
        data
    );
    return arrayBufferToBase64(signature);
}

/**
 * Nhập khóa công khai để xác minh.
 * @param publicKeyBase64 Khóa công khai Base64.
 * @returns Khóa CryptoKey.
 */
export async function importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
    if (!webCrypto || !webCrypto.subtle) throw new Error("Web Crypto subtle is missing.");
    const buffer = base64ToArrayBuffer(publicKeyBase64);
    return webCrypto.subtle.importKey(
        "raw",
        buffer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    );
}

/**
 * --- NEW: Import lại KeyPair (ECDH) từ JSON đã lưu ---
 * Dùng để khôi phục Identity Key khi mở lại app.
 * @param keyPairJson Object chứa public và private key Base64.
 * @returns Cặp khóa CryptoKeyPair.
 */
export async function importKeyPair(keyPairJson: { publicKey: string; privateKey: string }): Promise<CryptoKeyPair> {
    if (!webCrypto || !webCrypto.subtle) throw new Error("Web Crypto subtle is missing.");
    const pubBuffer = base64ToArrayBuffer(keyPairJson.publicKey);
    const privBuffer = base64ToArrayBuffer(keyPairJson.privateKey);

    const publicKey = await webCrypto.subtle.importKey(
        "raw",
        pubBuffer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    );

    const privateKey = await webCrypto.subtle.importKey(
        "pkcs8",
        privBuffer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey"]
    );

    return { publicKey, privateKey };
}

/**
 * --- NEW: Import lại Signing KeyPair (ECDSA) từ JSON đã lưu ---
 * Dùng để khôi phục Signing Key khi mở lại app.
 * @param keyPairJson Object chứa public và private key Base64.
 * @returns Cặp khóa CryptoKeyPair.
 */
export async function importSigningKeyPair(keyPairJson: { publicKey: string; privateKey: string }): Promise<CryptoKeyPair> {
    if (!webCrypto || !webCrypto.subtle) throw new Error("Web Crypto subtle is missing.");
    const pubBuffer = base64ToArrayBuffer(keyPairJson.publicKey);
    const privBuffer = base64ToArrayBuffer(keyPairJson.privateKey);

    const publicKey = await webCrypto.subtle.importKey(
        "raw",
        pubBuffer,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["verify"]
    );

    const privateKey = await webCrypto.subtle.importKey(
        "pkcs8",
        privBuffer,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign"]
    );

    return { publicKey, privateKey };
}

/**
 * Sinh ngẫu nhiên một ID Key (giả định) cho One-Time PreKey.
 * @returns Một số nguyên.
 */
export function generatePreKeyId(): number {
    return Math.floor(Math.random() * (2 ** 31 - 1));
}