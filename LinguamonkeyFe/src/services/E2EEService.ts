import mmkvStorage from "../utils/storage";
import instance from "../api/axiosClient";
import {
    encryptAES,
    decryptAES,
    generateKeyPair,
    signData,
    base64ToArrayBuffer,
    generatePreKeyId,
    deriveSessionKey,
    CryptoKeyPair,
    importPublicKey,
    exportPublicKey,
    exportPrivateKey,
    importKeyPair,
    importSigningKeyPair,
    convertPemToBase64 // Vẫn import để giữ tương thích code cũ nếu có sót, nhưng logic bên dưới đã sửa
} from "../utils/crypto";

export type DualEncryptionResult = {
    content: string;
    senderEphemeralKey: string;
    initializationVector: string;
    usedPreKeyId: number;
    selfContent: string;
    selfEphemeralKey: string;
    selfInitializationVector: string;
};

type PreKeyBundleRequest = {
    identityPublicKey: string;
    signedPreKeyId: number;
    signedPreKeyPublicKey: string;
    signedPreKeySignature: string;
    oneTimePreKeys?: Record<number, string>;
};

type KeyBackupResponse = {
    encryptedIdentityPrivateKey: string;
    encryptedSigningPrivateKey: string;
    encryptedSignedPreKeyPrivate: string;
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

    private sessionKeyCache: Map<string, string> = new Map();
    private preKeyIdCache: Map<string, number> = new Map();

    async initAndCheckUpload(userId: string) {
        this.setUserId(userId);
        const loadedLocal = await this.loadKeysFromStorage();

        if (!loadedLocal) {
            console.log(`[E2EE] No local keys. RESTORE attempt...`);
            const restored = await this.restoreKeysFromServer(userId);
            if (restored) {
                console.log(`[E2EE] ✅ RESTORED!`);
                await mmkvStorage.setItem(STORAGE_KEYS.KEYS_UPLOADED + userId, 'true');
            } else {
                console.log(`[E2EE] Generating NEW keys.`);
                try {
                    await this.generateKeyBundleAndUpload(userId);
                    await this.backupKeysToServer(userId);
                    await mmkvStorage.setItem(STORAGE_KEYS.KEYS_UPLOADED + userId, 'true');
                } catch (e) { console.error("[E2EE] Init Failed", e); }
            }
        }
    }

    private async saveKeysToStorage() {
        if (!this.identityKeyPair || !this.signingKeyPair) return;
        // Lưu Raw JSON
        await mmkvStorage.setItem(STORAGE_KEYS.IDENTITY_KEY, JSON.stringify(this.identityKeyPair));
        await mmkvStorage.setItem(STORAGE_KEYS.SIGNING_KEY, JSON.stringify(this.signingKeyPair));
        if (this.signedPreKeyPair) {
            await mmkvStorage.setItem(STORAGE_KEYS.SIGNED_PRE_KEY, JSON.stringify(this.signedPreKeyPair));
        }
    }

    private async loadKeysFromStorage(): Promise<boolean> {
        try {
            const storedIdentity = await mmkvStorage.getItem(STORAGE_KEYS.IDENTITY_KEY);
            const storedSigning = await mmkvStorage.getItem(STORAGE_KEYS.SIGNING_KEY);
            const storedSignedPreKey = await mmkvStorage.getItem(STORAGE_KEYS.SIGNED_PRE_KEY);

            if (storedIdentity && storedSigning && storedSignedPreKey) {
                this.identityKeyPair = JSON.parse(storedIdentity);
                this.signingKeyPair = JSON.parse(storedSigning);
                this.signedPreKeyPair = JSON.parse(storedSignedPreKey);
                console.log("[E2EE] ✅ Keys loaded.");
                return true;
            } else {
                await this.clearLocalKeys();
            }
        } catch (e) {
            console.error("[E2EE] Load failed:", e);
            await this.clearLocalKeys();
        }
        return false;
    }

    private async clearLocalKeys(): Promise<void> {
        await mmkvStorage.removeItem(STORAGE_KEYS.IDENTITY_KEY);
        await mmkvStorage.removeItem(STORAGE_KEYS.SIGNING_KEY);
        await mmkvStorage.removeItem(STORAGE_KEYS.SIGNED_PRE_KEY);
    }

    async generateKeyBundleAndUpload(userId: string): Promise<void> {
        try {
            if (!this.identityKeyPair) {
                this.identityKeyPair = await generateKeyPair();
                this.signingKeyPair = await generateKeyPair();
            }
            this.signedPreKeyPair = await generateKeyPair();
            await this.saveKeysToStorage();

            // SỬA: Dùng exportPublicKey để thêm header SPKI cho server
            const identityPubB64 = await exportPublicKey(this.identityKeyPair!.publicKey);
            const signedPreKeyPubB64 = await exportPublicKey(this.signedPreKeyPair.publicKey);

            // Sign (Dùng raw private key để HMAC/Sign)
            const identityPubBuffer = base64ToArrayBuffer(identityPubB64);
            const signatureB64 = await signData(this.signingKeyPair!.privateKey, identityPubBuffer);

            const oneTimePreKeys: Record<number, string> = {};
            const promises = [];
            for (let i = 0; i < this.MIN_PREKEYS_TO_UPLOAD; i++) {
                promises.push(generateKeyPair().then(async (kp) => {
                    const id = generatePreKeyId();
                    // One Time Key cũng cần export đúng format SPKI
                    oneTimePreKeys[id] = await exportPublicKey(kp.publicKey);
                }));
            }
            await Promise.all(promises);

            const request: PreKeyBundleRequest = {
                identityPublicKey: identityPubB64,
                signedPreKeyId: generatePreKeyId(),
                signedPreKeyPublicKey: signedPreKeyPubB64,
                signedPreKeySignature: signatureB64,
                oneTimePreKeys: oneTimePreKeys,
            };
            await instance.post(`/api/v1/keys/upload/${userId}`, request);
            console.log('[E2EE] ✅ Bundle uploaded.');
        } catch (error) {
            console.error('[E2EE] ❌ Upload Failed:', error);
            throw error;
        }
    }

    private async encryptForTarget(targetId: string, content: string, localOverrideKeyRaw?: string): Promise<any> {
        let targetRawPublicKey: string;
        let preKeyId = 0;
        try {
            if (localOverrideKeyRaw) {
                targetRawPublicKey = localOverrideKeyRaw;
            } else {
                if (this.sessionKeyCache.has(targetId)) {
                    const res = await instance.get<any>(`/api/v1/keys/fetch/${targetId}`);
                    const bundle = res.data;
                    // Server trả về SPKI -> Cắt về Raw
                    targetRawPublicKey = await importPublicKey(bundle.signedPreKeyPublicKey);
                    preKeyId = bundle.signedPreKeyId;
                } else {
                    const res = await instance.get<any>(`/api/v1/keys/fetch/${targetId}`);
                    const bundle = res.data;
                    if (!bundle.signedPreKeyPublicKey) throw new Error("Invalid Bundle");
                    // Server trả về SPKI -> Cắt về Raw
                    targetRawPublicKey = await importPublicKey(bundle.signedPreKeyPublicKey);
                    preKeyId = bundle.signedPreKeyId;
                    this.preKeyIdCache.set(targetId, preKeyId);
                }
            }

            // Raw Key Pair
            const ephemeralKeyPair = await generateKeyPair();

            // Raw Derive
            const sessionKey = await deriveSessionKey(ephemeralKeyPair.privateKey, targetRawPublicKey);

            const [ivBase64, ciphertextBase64] = await encryptAES(content, sessionKey);

            // Gửi lên Server phải thêm Header (SPKI)
            const ephemeralPubSPKI = await exportPublicKey(ephemeralKeyPair.publicKey);

            return {
                ciphertext: ciphertextBase64,
                iv: ivBase64,
                ephemeralKey: ephemeralPubSPKI, // Gửi SPKI
                preKeyId: preKeyId
            };
        } catch (e: any) {
            this.sessionKeyCache.delete(targetId);
            throw new Error(`Encrypt failed: ${e.message}`);
        }
    }

    async encrypt(receiverId: string, senderId: string, content: string): Promise<DualEncryptionResult> {
        if (!this.signedPreKeyPair) await this.loadKeysFromStorage();
        return await this.encryptInternal(receiverId, senderId, content);
    }

    private async encryptInternal(receiverId: string, senderId: string, content: string): Promise<DualEncryptionResult> {
        const [senderEnc, receiverEnc] = await Promise.all([
            this.encryptForTarget(senderId, content, this.signedPreKeyPair!.publicKey),
            receiverId === senderId ? Promise.resolve(null) : this.encryptForTarget(receiverId, content)
        ]);

        const finalReceiverEnc = receiverEnc || senderEnc;
        return {
            content: finalReceiverEnc.ciphertext,
            senderEphemeralKey: finalReceiverEnc.ephemeralKey,
            initializationVector: finalReceiverEnc.iv,
            usedPreKeyId: finalReceiverEnc.preKeyId,
            selfContent: senderEnc.ciphertext,
            selfEphemeralKey: senderEnc.ephemeralKey,
            selfInitializationVector: senderEnc.iv
        };
    }

    async decrypt(msg: any): Promise<string> {
        if (!this.signedPreKeyPair) await this.loadKeysFromStorage();
        if (!this.userId) return "!! Key Error !!";

        let targetCiphertext = "", targetIV = "", targetEphemeralKeySPKI = "";

        if (msg.senderId === this.userId) {
            if (msg.selfContent) {
                targetCiphertext = msg.selfContent;
                targetEphemeralKeySPKI = msg.selfEphemeralKey;
                targetIV = msg.selfInitializationVector;
            } else {
                targetCiphertext = msg.content;
                targetEphemeralKeySPKI = msg.senderEphemeralKey;
                targetIV = msg.initializationVector;
            }
        } else {
            targetCiphertext = msg.content;
            targetEphemeralKeySPKI = msg.senderEphemeralKey;
            targetIV = msg.initializationVector;
        }

        if (!targetCiphertext || !targetIV || !targetEphemeralKeySPKI) return msg.content || "!! Corrupted !!";

        try {
            // Key từ tin nhắn là SPKI -> Cắt về Raw
            const senderEphemeralPubRaw = await importPublicKey(targetEphemeralKeySPKI);

            const sessionKey = await deriveSessionKey(this.signedPreKeyPair!.privateKey, senderEphemeralPubRaw);
            return await decryptAES(targetCiphertext, targetIV, sessionKey);
        } catch (e: any) {
            console.warn("Decrypt error:", e.message);
            return "🔒 Tin nhắn cũ (Không thể giải mã)";
        }
    }

    private async backupKeysToServer(userId: string) {
        if (!this.identityKeyPair || !this.signingKeyPair || !this.signedPreKeyPair) return;
        try {
            // Backup private keys: Raw base64 là đủ
            const payload = {
                encryptedIdentityPrivateKey: this.identityKeyPair.privateKey,
                encryptedSigningPrivateKey: this.signingKeyPair.privateKey,
                encryptedSignedPreKeyPrivate: this.signedPreKeyPair.privateKey
            };
            await instance.post(`/api/v1/keys/backup/${userId}`, payload);
            console.log('[E2EE] Keys Backed up.');
        } catch (e) {
            console.error('[E2EE] Backup Failed:', e);
        }
    }

    private async restoreKeysFromServer(userId: string): Promise<boolean> {
        return false;
    }

    setUserId(userId: string) { this.userId = userId; }
}

export const e2eeService = new E2EEService();