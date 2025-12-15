import QuickCrypto from 'react-native-quick-crypto';
import { Buffer } from 'buffer';

if (typeof global.Buffer === 'undefined') {
    global.Buffer = Buffer;
}

export type CryptoKey = Buffer;
export type CryptoKeyPair = { publicKey: string; privateKey: string };

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    return Buffer.from(buffer).toString('base64');
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    return Buffer.from(base64, 'base64').buffer;
}

export async function generateKeyPair(): Promise<CryptoKeyPair> {
    try {
        const keyPair = QuickCrypto.generateKeyPairSync('ec', {
            namedCurve: 'prime256v1',
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });

        return {
            publicKey: keyPair.publicKey as string,
            privateKey: keyPair.privateKey as string,
        };
    } catch (e: any) {
        throw new Error(`Generate Key Pair Failed: ${e.message}`);
    }
}

export async function generateSigningKeyPair(): Promise<CryptoKeyPair> {
    return generateKeyPair();
}

export async function exportPublicKey(key: string | Buffer): Promise<string> {
    if (typeof key === 'string' && key.includes('-----BEGIN PUBLIC KEY-----')) {
        return key
            .replace(/-----BEGIN PUBLIC KEY-----/g, '')
            .replace(/-----END PUBLIC KEY-----/g, '')
            .replace(/\s/g, '');
    }
    return key.toString();
}

export async function exportPrivateKey(key: string | Buffer): Promise<string> {
    if (typeof key === 'string' && key.includes('-----BEGIN PRIVATE KEY-----')) {
        return key
            .replace(/-----BEGIN PRIVATE KEY-----/g, '')
            .replace(/-----END PRIVATE KEY-----/g, '')
            .replace(/\s/g, '');
    }
    return key.toString();
}

export async function importPublicKey(publicKeyBase64: string): Promise<string> {
    return `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64}\n-----END PUBLIC KEY-----`;
}

export async function importKeyPair(keyPairJson: { publicKey: string; privateKey: string }): Promise<CryptoKeyPair> {
    return {
        publicKey: `-----BEGIN PUBLIC KEY-----\n${keyPairJson.publicKey}\n-----END PUBLIC KEY-----`,
        privateKey: `-----BEGIN PRIVATE KEY-----\n${keyPairJson.privateKey}\n-----END PRIVATE KEY-----`,
    };
}

export async function importSigningKeyPair(keyPairJson: { publicKey: string; privateKey: string }): Promise<CryptoKeyPair> {
    return importKeyPair(keyPairJson);
}

export async function deriveSessionKey(privateKeyPem: string, publicKeyPem: string): Promise<string> {
    try {
        const sharedSecretBuffer = QuickCrypto.diffieHellman({
            privateKey: QuickCrypto.createPrivateKey(privateKeyPem),
            publicKey: QuickCrypto.createPublicKey(publicKeyPem),
        });

        // Thêm kiểm tra để loại bỏ 'void' khỏi kiểu trả về
        if (!sharedSecretBuffer) {
            throw new Error("ECDH shared secret derivation failed: null buffer returned.");
        }

        const info = 'E2EE-AES-256-GCM-v1';

        // sharedSecretBuffer đã được xác nhận là Buffer (BinaryLike cho khóa)
        const hmac = QuickCrypto.createHmac('sha256', sharedSecretBuffer);

        // Buffer.from(info) đảm bảo tham số cho update là BinaryLike (Buffer) chứ không phải void.
        hmac.update(Buffer.from(info, 'utf-8'));

        return hmac.digest('base64');
    } catch (e: any) {
        console.error('ECDH Derive Error:', e);
        throw new Error(`Derive Key Failed: ${e.message}`);
    }
}

export async function encryptAES(content: string, keyBase64: string): Promise<[string, string]> {
    try {
        const iv = QuickCrypto.randomBytes(16);
        const key = Buffer.from(keyBase64, 'base64');

        const cipher = QuickCrypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(content, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        return [iv.toString('base64'), encrypted];
    } catch (e: any) {
        throw new Error(`Encryption failed: ${e.message}`);
    }
}

export async function decryptAES(ciphertextBase64: string, ivBase64: string, keyBase64: string): Promise<string> {
    try {
        const iv = Buffer.from(ivBase64, 'base64');
        const key = Buffer.from(keyBase64, 'base64');

        const decipher = QuickCrypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(ciphertextBase64, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (e: any) {
        throw new Error(`Decryption failed: ${e.message}`);
    }
}

export async function signData(privateKeyPem: string, data: ArrayBuffer): Promise<string> {
    try {
        const sign = QuickCrypto.createSign('SHA256');
        sign.update(Buffer.from(data));
        const signatureBuffer = sign.sign(privateKeyPem);
        return signatureBuffer.toString('base64');
    } catch (e: any) {
        throw new Error(`Signing failed: ${e.message}`);
    }
}

export function generatePreKeyId(): number {
    const buf = QuickCrypto.randomBytes(4);
    const num = buf.readUInt32BE(0);
    return num % (2 ** 31 - 1);
}