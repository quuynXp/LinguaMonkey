import AsyncStorage from '@react-native-async-storage/async-storage';
import instance from "../api/axiosClient";
import type { ChatMessage } from "../types/entity";
import {
    getSessionKey,
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
    generatePreKeyId
} from "../utils/crypto";

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
    senderEphemeralKey: string;
    usedPreKeyId?: number;
    initializationVector: string;
    ciphertext: string;
};

const STORAGE_KEYS = {
    IDENTITY_KEY: 'e2ee_identity_key_pair',
    SIGNING_KEY: 'e2ee_signing_key_pair',
    KEYS_UPLOADED: 'e2ee_keys_uploaded_status_'
};

class E2EEService {
    private sessionCache: Map<string, boolean> = new Map();
    private keyCache: Map<string, CryptoKey> = new Map();
    private readonly MIN_PREKEYS_TO_UPLOAD = 100;

    private identityKeyPair?: CryptoKeyPair;
    private signingKeyPair?: CryptoKeyPair;
    private userId?: string;

    async initAndCheckUpload(userId: string) {
        this.setUserId(userId);
        await this.loadKeys();

        const uploadedStatus = await AsyncStorage.getItem(STORAGE_KEYS.KEYS_UPLOADED + userId);
        if (uploadedStatus !== 'true') {
            try {
                await this.generateKeyBundleAndUpload(userId);
                await AsyncStorage.setItem(STORAGE_KEYS.KEYS_UPLOADED + userId, 'true');
            } catch (e) {
                console.warn('Initial key upload failed', e);
            }
        }
    }

    private async loadKeys(): Promise<void> {
        try {
            const storedIdentity = await AsyncStorage.getItem(STORAGE_KEYS.IDENTITY_KEY);
            const storedSigning = await AsyncStorage.getItem(STORAGE_KEYS.SIGNING_KEY);

            if (storedIdentity && storedSigning) {
                const identityJson = JSON.parse(storedIdentity);
                this.identityKeyPair = await importKeyPair(identityJson);

                const signingJson = JSON.parse(storedSigning);
                this.signingKeyPair = await importSigningKeyPair(signingJson);
            } else {
                this.identityKeyPair = await generateKeyPair();
                this.signingKeyPair = await generateSigningKeyPair();
                await this.saveKeysToStorage();
            }
        } catch (e) {
            this.identityKeyPair = await generateKeyPair();
            this.signingKeyPair = await generateSigningKeyPair();
        }
    }

    private async saveKeysToStorage() {
        if (!this.identityKeyPair || !this.signingKeyPair) return;

        const identityExport = {
            publicKey: await exportPublicKey(this.identityKeyPair.publicKey),
            privateKey: await exportPrivateKey(this.identityKeyPair.privateKey)
        };

        const signingExport = {
            publicKey: await exportPublicKey(this.signingKeyPair.publicKey),
            privateKey: await exportPrivateKey(this.signingKeyPair.privateKey)
        };

        await AsyncStorage.setItem(STORAGE_KEYS.IDENTITY_KEY, JSON.stringify(identityExport));
        await AsyncStorage.setItem(STORAGE_KEYS.SIGNING_KEY, JSON.stringify(signingExport));
    }

    async generateKeyBundleAndUpload(userId: string): Promise<void> {
        if (!this.identityKeyPair) await this.loadKeys();

        const identityPublicKeyBase64 = await exportPublicKey(this.identityKeyPair!.publicKey);
        const signedPreKeyKeyPair = await generateKeyPair();
        const signedPreKeyId = generatePreKeyId();
        const signedPreKeyPublicKeyBase64 = await exportPublicKey(signedPreKeyKeyPair.publicKey);

        const identityPublicKeyBuffer = base64ToArrayBuffer(identityPublicKeyBase64);
        const signedPreKeySignatureBase64 = await signData(this.signingKeyPair!.privateKey, identityPublicKeyBuffer);

        const oneTimePreKeys: Record<number, string> = {};
        for (let i = 0; i < this.MIN_PREKEYS_TO_UPLOAD; i++) {
            const otKeypair = await generateKeyPair();
            const otKeyId = generatePreKeyId();
            oneTimePreKeys[otKeyId] = await exportPublicKey(otKeypair.publicKey);
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

    async establishSession(receiverId: string): Promise<{ isNewSession: boolean, usedPreKeyId?: number }> {
        const isEstablished = this.sessionCache.get(receiverId);

        if (isEstablished) {
            return { isNewSession: false };
        }

        try {
            const res = await instance.get<PreKeyBundleResponse>(`/api/v1/keys/fetch/${receiverId}`);
            const data = res.data;

            if (data.identityPublicKey) {
                const sessionKey = await getSessionKey(receiverId);
                this.keyCache.set(receiverId, sessionKey);
                this.sessionCache.set(receiverId, true);
                return { isNewSession: true, usedPreKeyId: data.oneTimePreKeyId };
            }

        } catch (e: any) {
            if (e.response && e.response.status === 404) {
                if (receiverId === this.userId) {
                    await this.generateKeyBundleAndUpload(receiverId);
                    await AsyncStorage.setItem(STORAGE_KEYS.KEYS_UPLOADED + receiverId, 'true');
                    return { isNewSession: true, usedPreKeyId: 0 };
                }
            }
        }

        throw new Error(`Cannot establish E2EE session with ${receiverId}. No key bundle available.`);
    }

    async encrypt(receiverId: string, content: string): Promise<E2EEMetadata> {
        await this.establishSession(receiverId);

        const sessionKey = this.keyCache.get(receiverId);
        if (!sessionKey) {
            throw new Error("Session key not available for encryption.");
        }

        const [ivBase64, ciphertextBase64] = await encryptAES(content, sessionKey);
        const dummyEphemeralKey = Math.random().toString(36).substring(2, 8);

        return {
            senderEphemeralKey: dummyEphemeralKey,
            initializationVector: ivBase64,
            ciphertext: ciphertextBase64
        };
    }

    async decrypt(msg: ChatMessage): Promise<string> {
        if (!this.identityKeyPair) await this.loadKeys();

        const partnerId = msg.senderId.toString();
        await this.establishSession(partnerId);

        const sessionKey = this.keyCache.get(partnerId);
        if (!sessionKey) {
            return msg.content || "!! Decryption Failed: No Session Key !!";
        }

        let metadata: E2EEMetadata;
        try {
            metadata = JSON.parse(msg.content) as E2EEMetadata;
            if (!metadata.ciphertext || !metadata.initializationVector) {
                return msg.content || "";
            }
        } catch (e) {
            return msg.content || "";
        }

        try {
            const decryptedContent = await decryptAES(
                metadata.ciphertext,
                metadata.initializationVector,
                sessionKey
            );
            return decryptedContent;
        } catch (e) {
            return "!! Decryption Failed: Bad Ciphertext/Key !!";
        }
    }

    setUserId(userId: string) {
        this.userId = userId;
    }
}

export const e2eeService = new E2EEService();