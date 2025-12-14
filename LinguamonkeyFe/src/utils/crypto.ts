import { Buffer } from 'buffer';
import EC from 'elliptic';
import CryptoJS from 'crypto-js';
import 'react-native-get-random-values';

const ec = new EC.ec('p256');

export type CryptoKey = EC.ec.KeyPair;
export type CryptoKeyPair = { publicKey: CryptoKey; privateKey: CryptoKey };

function arrayBufferToWordArray(ab: ArrayBuffer): CryptoJS.lib.WordArray {
    return CryptoJS.lib.WordArray.create(ab as any);
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    return Buffer.from(buffer).toString('base64');
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    return Buffer.from(base64, 'base64').buffer;
}

export async function generateKeyPair(): Promise<CryptoKeyPair> {
    const key = ec.genKeyPair();
    return { publicKey: key, privateKey: key };
}

export async function generateSigningKeyPair(): Promise<CryptoKeyPair> {
    const key = ec.genKeyPair();
    return { publicKey: key, privateKey: key };
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
    const buffer = Buffer.from(publicKeyBase64, 'base64');
    const key = ec.keyFromPublic(buffer);
    return key;
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
        const sharedSecret = privateKey.derive(publicKey.getPublic());
        const sharedSecretBytes = sharedSecret.toArray('be', 32);
        const sharedSecretWa = arrayBufferToWordArray(new Uint8Array(sharedSecretBytes).buffer);

        const info = 'E2EE-AES-256-GCM-v1';
        const infoWa = CryptoJS.enc.Utf8.parse(info);

        const hmac = CryptoJS.HmacSHA256(infoWa, sharedSecretWa);
        return hmac.toString(CryptoJS.enc.Base64);
    } catch (e: any) {
        console.error("ECDH Derivation Failed:", e);
        throw new Error(`Derive Session Key Failed: ${e.message}`);
    }
}

export async function encryptAES(content: string, keyBase64: string): Promise<[string, string]> {
    try {
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