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
    deriveSessionKey,
    CryptoKey,
    CryptoKeyPair
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
    SIGNED_PRE_KEY: 'e2ee_signed_pre_key_pair',
    KEYS_UPLOADED: 'e2ee_keys_uploaded_status_'
};

class E2EEService {
    private readonly MIN_PREKEYS_TO_UPLOAD = 50;

    private identityKeyPair?: CryptoKeyPair;
    private signingKeyPair?: CryptoKeyPair;
    private signedPreKeyPair?: CryptoKeyPair;
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
            publicKey: await exportPublicKey(this.identityKeyPair.publicKey),
            privateKey: await exportPrivateKey(this.identityKeyPair.privateKey)
        };
        const signingExport = {
            publicKey: await exportPublicKey(this.signingKeyPair.publicKey),
            privateKey: await exportPrivateKey(this.signingKeyPair.privateKey)
        };

        await AsyncStorage.setItem(STORAGE_KEYS.IDENTITY_KEY, JSON.stringify(identityExport));
        await AsyncStorage.setItem(STORAGE_KEYS.SIGNING_KEY, JSON.stringify(signingExport));

        if (this.signedPreKeyPair) {
            const signedPreKeyExport = {
                publicKey: await exportPublicKey(this.signedPreKeyPair.publicKey),
                privateKey: await exportPrivateKey(this.signedPreKeyPair.privateKey)
            };
            await AsyncStorage.setItem(STORAGE_KEYS.SIGNED_PRE_KEY, JSON.stringify(signedPreKeyExport));
        }
    }

    async generateKeyBundleAndUpload(userId: string): Promise<void> {
        if (!this.identityKeyPair) await this.loadKeys();

        const identityPublicKeyBase64 = await exportPublicKey(this.identityKeyPair!.publicKey);

        this.signedPreKeyPair = await generateKeyPair();
        await this.saveKeysToStorage();

        const signedPreKeyId = generatePreKeyId();
        const signedPreKeyPublicKeyBase64 = await exportPublicKey(this.signedPreKeyPair.publicKey);

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

    async encrypt(receiverId: string, content: string): Promise<E2EEMetadata> {
        console.log(`[E2EE_DEBUG] Encrypting for Receiver: ${receiverId}`);

        let bundle: PreKeyBundleResponse;
        try {
            const res = await instance.get<PreKeyBundleResponse>(`/api/v1/keys/fetch/${receiverId}`);
            bundle = res.data;
        } catch (e: any) {
            console.error(`[E2EE_DEBUG] Failed to fetch bundle for ${receiverId}`, e);
            throw new Error(`Cannot fetch keys for ${receiverId}`);
        }

        if (!bundle.signedPreKeyPublicKey) {
            console.error('[E2EE_DEBUG] Bundle missing signedPreKeyPublicKey:', bundle);
            throw new Error("Invalid Bundle: Missing signedPreKeyPublicKey");
        }

        // Debug log to catch format issues
        // console.log(`[E2EE_DEBUG] Importing Key: ${bundle.signedPreKeyPublicKey.substring(0, 20)}...`);

        const receiverSignedPreKey = await importPublicKey(bundle.signedPreKeyPublicKey);

        const ephemeralKeyPair = await generateKeyPair();
        const senderEphemeralKeyPub = await exportPublicKey(ephemeralKeyPair.publicKey);

        const sessionKey = await deriveSessionKey(
            ephemeralKeyPair.privateKey,
            receiverSignedPreKey
        );
        console.log(`[E2EE_DEBUG] Session Key derived successfully`);

        const [ivBase64, ciphertextBase64] = await encryptAES(content, sessionKey);
        console.log(`[E2EE_DEBUG] AES Encryption complete.`);

        return {
            senderEphemeralKey: senderEphemeralKeyPub,
            initializationVector: ivBase64,
            ciphertext: ciphertextBase64,
            usedPreKeyId: bundle.signedPreKeyId
        };
    }

    async decrypt(msg: ChatMessage): Promise<string> {
        if (!this.signedPreKeyPair) await this.loadKeys();

        if (!msg.senderEphemeralKey || !msg.initializationVector || !msg.content) {
            return msg.content || "";
        }

        try {
            const senderEphemeralPub = await importPublicKey(msg.senderEphemeralKey);

            const sessionKey = await deriveSessionKey(
                this.signedPreKeyPair!.privateKey,
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