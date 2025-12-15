import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import { ec as EC } from 'elliptic';
import CryptoJS from 'crypto-js';

if (typeof global.Buffer === 'undefined') {
    global.Buffer = Buffer;
}

const ec = new EC('p256');

const P256_SPKI_HEADER_HEX = "3059301306072a8648ce3d020106082a8648ce3d030107034200";

export type CryptoKey = string;
export type CryptoKeyPair = { publicKey: string; privateKey: string };


export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    return Buffer.from(buffer).toString('base64');
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    return Buffer.from(base64, 'base64').buffer;
}

function hexToBase64(hex: string): string {
    return Buffer.from(hex, 'hex').toString('base64');
}


export async function generateKeyPair(): Promise<CryptoKeyPair> {
    const key = ec.genKeyPair();

    const privateKey = key.getPrivate('hex');

    const publicKey = key.getPublic(false, 'hex');

    return { publicKey, privateKey };
}

export async function generateSigningKeyPair(): Promise<CryptoKeyPair> {
    return generateKeyPair();
}

export async function exportPublicKey(rawHexPublicKey: string): Promise<string> {
    try {
        const headerBuf = Buffer.from(P256_SPKI_HEADER_HEX, 'hex');
        const keyBuf = Buffer.from(rawHexPublicKey, 'hex');
        const fullBuf = Buffer.concat([headerBuf, keyBuf]);
        return fullBuf.toString('base64');
    } catch (e) {
        return rawHexPublicKey;
    }
}

export async function exportPrivateKey(rawHexPrivateKey: string): Promise<string> {
    return hexToBase64(rawHexPrivateKey);
}

export async function importPublicKey(spkiBase64: string): Promise<string> {
    try {
        const buffer = Buffer.from(spkiBase64, 'base64');
        if (buffer.length > 65) {
            const raw = buffer.slice(buffer.length - 65);
            return raw.toString('hex');
        }
        return buffer.toString('hex');
    } catch (e) {
        return spkiBase64;
    }
}

export async function importKeyPair(json: any): Promise<CryptoKeyPair> { return json; }
export async function importSigningKeyPair(json: any): Promise<CryptoKeyPair> { return json; }
export function convertPemToBase64(k: string) { return k; }
export function convertBase64ToPem(k: string) { return k; }

export async function deriveSessionKey(privateKeyHex: string, publicKeyHex: string): Promise<string> {
    try {
        const keyA = ec.keyFromPrivate(privateKeyHex, 'hex');
        const keyB = ec.keyFromPublic(publicKeyHex, 'hex');

        const sharedSecret = keyA.derive(keyB.getPublic());

        let sharedHex = sharedSecret.toString(16);
        if (sharedHex.length % 2 !== 0) sharedHex = '0' + sharedHex;

        const info = 'E2EE-AES-256-GCM-v1';
        const secretWord = CryptoJS.enc.Hex.parse(sharedHex);
        const derivedKey = CryptoJS.HmacSHA256(secretWord, info);

        return derivedKey.toString(CryptoJS.enc.Base64);
    } catch (e: any) {
        throw new Error(`Derive Key Failed: ${e.message}`);
    }
}

export async function encryptAES(content: string, keyBase64: string): Promise<[string, string]> {
    try {
        const key = CryptoJS.enc.Base64.parse(keyBase64);
        const iv = CryptoJS.lib.WordArray.random(16);

        const encrypted = CryptoJS.AES.encrypt(content, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        return [
            iv.toString(CryptoJS.enc.Base64),
            encrypted.toString()
        ];
    } catch (e: any) {
        throw new Error(`Encryption failed: ${e.message}`);
    }
}

export async function decryptAES(ciphertextBase64: string, ivBase64: string, keyBase64: string): Promise<string> {
    try {
        const key = CryptoJS.enc.Base64.parse(keyBase64);
        const iv = CryptoJS.enc.Base64.parse(ivBase64);

        const decrypted = CryptoJS.AES.decrypt(ciphertextBase64, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        const text = decrypted.toString(CryptoJS.enc.Utf8);
        if (!text) return "🔒 Tin nhắn cũ (Không thể giải mã)";

        return text;
    } catch (e: any) {
        return "🔒 Lỗi giải mã";
    }
}


export async function signData(privateKeyHex: string, data: ArrayBuffer): Promise<string> {
    try {
        const dataB64 = arrayBufferToBase64(data);
        const hash = CryptoJS.HmacSHA256(dataB64, CryptoJS.enc.Hex.parse(privateKeyHex));
        return hash.toString(CryptoJS.enc.Base64);
    } catch (e: any) {
        throw new Error(`Signing failed: ${e.message}`);
    }
}

export function generatePreKeyId(): number {
    return Math.floor(Math.random() * 2147483647);
}