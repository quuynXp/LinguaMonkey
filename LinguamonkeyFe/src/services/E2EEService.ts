import AsyncStorage from '@react-native-async-storage/async-storage';
import instance from "../api/axiosClient";
import type { ChatMessage } from "../types/entity";
import {
    encryptAES,
    decryptAES,
    generateKeyPair,
    exportPublicKey,
    exportPrivateKey,
    importKeyPair,
    importSigningKeyPair,
    generateSigningKeyPair,
    signData,
    base64ToArrayBuffer,
    generatePreKeyId,
    importPublicKey,
    deriveSessionKey
} from "../utils/crypto";

import type { CryptoKey as QuickCryptoKey, CryptoKeyPair as QuickCryptoKeyPair } from "react-native-quick-crypto";

type PreKeyBundleResponse = {
    identityPublicKey: string;
    signedPreKeyId: number;
    signedPreKeyPublicKey: string;
    signedPreKeySignature: string;
    oneTimePreKeyId?: number;
    oneTimePreKeyPublicKey?: string;
};

type PreKeyBundleRequest = {
    identityPublicKey: string;
    signedPreKeyId: number;
    signedPreKeyPublicKey: string;
    signedPreKeySignature: string;
    oneTimePreKeys?: Record<number, string>;
};

type E2EEMetadata = {
    senderEphemeralKey: string; // Base64 Public Key
    usedPreKeyId?: number;
    initializationVector: string;
    ciphertext: string;
};

const STORAGE_KEYS = {
    IDENTITY_KEY: 'e2ee_identity_key_pair',
    SIGNING_KEY: 'e2ee_signing_key_pair',
    SIGNED_PRE_KEY: 'e2ee_signed_pre_key_pair',
    KEYS_UPLOADED: 'e2ee_keys_uploaded_status_'
};

class E2EEService {
    private sessionCache: Map<string, QuickCryptoKey> = new Map();
    private readonly MIN_PREKEYS_TO_UPLOAD = 50;

    private identityKeyPair?: QuickCryptoKeyPair;
    private signingKeyPair?: QuickCryptoKeyPair;
    private signedPreKeyPair?: QuickCryptoKeyPair;
    private userId?: string;

    async initAndCheckUpload(userId: string) {
        this.setUserId(userId);
        await this.loadKeys();

        const uploadedStatus = await AsyncStorage.getItem(STORAGE_KEYS.KEYS_UPLOADED + userId);
        if (uploadedStatus !== 'true') {
            try {
                console.log(`[E2EE_DEBUG] Generating and uploading initial keys for user: ${userId}`);
                await this.generateKeyBundleAndUpload(userId);
                await AsyncStorage.setItem(STORAGE_KEYS.KEYS_UPLOADED + userId, 'true');
                console.log(`[E2EE_DEBUG] Upload successful`);
            } catch (e) {
                console.warn('[E2EE] Initial key upload failed', e);
            }
        }
    }

    private async loadKeys(): Promise<void> {
        try {
            const storedIdentity = await AsyncStorage.getItem(STORAGE_KEYS.IDENTITY_KEY);
            const storedSigning = await AsyncStorage.getItem(STORAGE_KEYS.SIGNING_KEY);
            const storedSignedPreKey = await AsyncStorage.getItem(STORAGE_KEYS.SIGNED_PRE_KEY);

            if (storedIdentity && storedSigning) {
                this.identityKeyPair = await importKeyPair(JSON.parse(storedIdentity));
                this.signingKeyPair = await importSigningKeyPair(JSON.parse(storedSigning));
                if (storedSignedPreKey) {
                    this.signedPreKeyPair = await importKeyPair(JSON.parse(storedSignedPreKey));
                }
            } else {
                this.identityKeyPair = await generateKeyPair();
                this.signingKeyPair = await generateSigningKeyPair();
                await this.saveKeysToStorage();
            }
        } catch (e) {
            console.error("[E2EE] Key loading error", e);
            throw e;
        }
    }

    private async saveKeysToStorage() {
        if (!this.identityKeyPair || !this.signingKeyPair) return;

        const identityExport = {
            publicKey: await exportPublicKey(this.identityKeyPair.publicKey as QuickCryptoKey),
            privateKey: await exportPrivateKey(this.identityKeyPair.privateKey as QuickCryptoKey)
        };
        const signingExport = {
            publicKey: await exportPublicKey(this.signingKeyPair.publicKey as QuickCryptoKey),
            privateKey: await exportPrivateKey(this.signingKeyPair.privateKey as QuickCryptoKey)
        };

        await AsyncStorage.setItem(STORAGE_KEYS.IDENTITY_KEY, JSON.stringify(identityExport));
        await AsyncStorage.setItem(STORAGE_KEYS.SIGNING_KEY, JSON.stringify(signingExport));

        if (this.signedPreKeyPair) {
            const signedPreKeyExport = {
                publicKey: await exportPublicKey(this.signedPreKeyPair.publicKey as QuickCryptoKey),
                privateKey: await exportPrivateKey(this.signedPreKeyPair.privateKey as QuickCryptoKey)
            };
            await AsyncStorage.setItem(STORAGE_KEYS.SIGNED_PRE_KEY, JSON.stringify(signedPreKeyExport));
        }
    }

    async generateKeyBundleAndUpload(userId: string): Promise<void> {
        if (!this.identityKeyPair) await this.loadKeys();

        const identityPublicKeyBase64 = await exportPublicKey(this.identityKeyPair!.publicKey as QuickCryptoKey);

        this.signedPreKeyPair = await generateKeyPair();
        await this.saveKeysToStorage();

        const signedPreKeyId = generatePreKeyId();
        const signedPreKeyPublicKeyBase64 = await exportPublicKey(this.signedPreKeyPair.publicKey as QuickCryptoKey);

        const identityPublicKeyBuffer = base64ToArrayBuffer(identityPublicKeyBase64);
        const signedPreKeySignatureBase64 = await signData(this.signingKeyPair!.privateKey as QuickCryptoKey, identityPublicKeyBuffer);

        const oneTimePreKeys: Record<number, string> = {};
        for (let i = 0; i < this.MIN_PREKEYS_TO_UPLOAD; i++) {
            const otKeypair = await generateKeyPair();
            const otKeyId = generatePreKeyId();
            oneTimePreKeys[otKeyId] = await exportPublicKey(otKeypair.publicKey as QuickCryptoKey);
        }

        const request: PreKeyBundleRequest = {
            identityPublicKey: identityPublicKeyBase64,
            signedPreKeyId: signedPreKeyId,
            signedPreKeyPublicKey: signedPreKeyPublicKeyBase64,
            signedPreKeySignature: signedPreKeySignatureBase64,
            oneTimePreKeys: oneTimePreKeys,
        };

        await instance.post(`/api/v1/keys/upload/${userId}`, request);
    }

    /**
     * MÃ HOÁ (SENDER SIDE)
     */
    async encrypt(receiverId: string, content: string): Promise<E2EEMetadata> {
        console.log(`[E2EE_DEBUG] Encrypting for Receiver: ${receiverId}`);

        // 1. Fetch Bundle
        let bundle: PreKeyBundleResponse;
        try {
            const res = await instance.get<PreKeyBundleResponse>(`/api/v1/keys/fetch/${receiverId}`);
            bundle = res.data;
            console.log(`[E2EE_DEBUG] Fetched bundle. SignedPreKeyId: ${bundle.signedPreKeyId}, OneTimeKeyId: ${bundle.oneTimePreKeyId}`);
        } catch (e: any) {
            console.error(`[E2EE_DEBUG] Failed to fetch bundle for ${receiverId}`, e);
            throw new Error(`Cannot fetch keys for ${receiverId}`);
        }

        if (!bundle.signedPreKeyPublicKey) throw new Error("Invalid Bundle");

        // 2. Import Receiver's Signed PreKey
        const receiverSignedPreKey = await importPublicKey(bundle.signedPreKeyPublicKey);

        // 3. Generate Ephemeral Key Pair for this message session
        const ephemeralKeyPair = await generateKeyPair();
        const senderEphemeralKeyPub = await exportPublicKey(ephemeralKeyPair.publicKey as QuickCryptoKey);

        // 4. Derive Shared Session Key
        const sessionKey = await deriveSessionKey(
            ephemeralKeyPair.privateKey as QuickCryptoKey,
            receiverSignedPreKey
        );
        console.log(`[E2EE_DEBUG] Session Key derived successfully`);

        // 5. Encrypt Content
        const [ivBase64, ciphertextBase64] = await encryptAES(content, sessionKey);
        console.log(`[E2EE_DEBUG] AES Encryption complete. Ciphertext length: ${ciphertextBase64.length}`);

        // 6. Return Payload
        return {
            senderEphemeralKey: senderEphemeralKeyPub,
            initializationVector: ivBase64,
            ciphertext: ciphertextBase64,
            usedPreKeyId: bundle.signedPreKeyId
        };
    }

    /**
     * GIẢI MÃ (RECEIVER SIDE)
     */
    async decrypt(msg: ChatMessage): Promise<string> {
        if (!this.signedPreKeyPair) await this.loadKeys();

        if (!msg.senderEphemeralKey || !msg.initializationVector || !msg.content) {
            console.log(`[E2EE_DEBUG] Message is missing E2EE fields. Returning content as is.`);
            return msg.content || "";
        }

        try {
            const senderEphemeralPub = await importPublicKey(msg.senderEphemeralKey);

            const sessionKey = await deriveSessionKey(
                this.signedPreKeyPair!.privateKey as QuickCryptoKey,
                senderEphemeralPub
            );

            const decryptedContent = await decryptAES(
                msg.content,
                msg.initializationVector,
                sessionKey
            );

            return decryptedContent;

        } catch (e) {
            console.error("[E2EE_DEBUG] Decryption error", e);
            return "!! Decryption Failed !!";
        }
    }

    setUserId(userId: string) {
        this.userId = userId;
    }
}

export const e2eeService = new E2EEService();