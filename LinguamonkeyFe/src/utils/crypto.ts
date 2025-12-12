import { encode, decode } from 'base64-arraybuffer';

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
 * Trong thực tế: Key này được tạo ra bằng X3DH/Double Ratchet.
 * Ở đây ta chỉ sinh ngẫu nhiên từ chuỗi ID cho mục đích chứng minh logic E2EE.
 * @param identifier Chuỗi ID để tạo key cố định.
 * @returns Khóa CryptoKey 256-bit
 */
export async function getSessionKey(identifier: string): Promise<CryptoKey> {
    // Luôn sinh cùng một key từ identifier để giải mã được.
    // Hash identifier để tạo ra 32 byte key.
    const keyBytes = new Uint8Array(32);
    for (let i = 0; i < keyBytes.length; i++) {
        keyBytes[i] = (identifier.charCodeAt(i % identifier.length) + i) % 256;
    }

    return crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM" },
        false, // Khóa này chỉ dùng trong nội bộ
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
    const iv = crypto.getRandomValues(new Uint8Array(12)); // IV 12-byte cho AES-GCM
    const encodedContent = new TextEncoder().encode(content);

    const encryptedContent = await crypto.subtle.encrypt(
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
    const ivBuffer = base64ToArrayBuffer(ivBase64);
    const cipherBuffer = base64ToArrayBuffer(ciphertextBase64);

    const decryptedContent = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(ivBuffer) },
        key,
        cipherBuffer
    );

    return new TextDecoder().decode(decryptedContent);
}