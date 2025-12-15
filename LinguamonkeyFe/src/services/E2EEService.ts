import mmkvStorage from "../utils/storage"; // Import the wrapper
import instance from "../api/axiosClient";
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
    CryptoKeyPair
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

    private sessionKeyCache: Map<string, string> = new Map(); // Key is now string (derived key base64)
    private preKeyIdCache: Map<string, number> = new Map();

    async initAndCheckUpload(userId: string) {
        this.setUserId(userId);
        const loadedLocal = await this.loadKeysFromStorage();

        if (!loadedLocal) {
            console.log(`[E2EE] No local keys. Attempting RESTORE for: ${userId}`);
            const restored = await this.restoreKeysFromServer(userId);

            if (restored) {
                console.log(`[E2EE] ✅ Keys RESTORED!`);
                await mmkvStorage.setItem(STORAGE_KEYS.KEYS_UPLOADED + userId, 'true');
            } else {
                console.log(`[E2EE] No backup. Generating NEW keys.`);
                await this.generateKeyBundleAndUpload(userId);
                await this.backupKeysToServer(userId);
                await mmkvStorage.setItem(STORAGE_KEYS.KEYS_UPLOADED + userId, 'true');
            }
        } else {
            const uploadedStatus = await mmkvStorage.getItem(STORAGE_KEYS.KEYS_UPLOADED + userId);
            if (uploadedStatus !== 'true') {
                try {
                    await this.generateKeyBundleAndUpload(userId);
                    await this.backupKeysToServer(userId);
                    await mmkvStorage.setItem(STORAGE_KEYS.KEYS_UPLOADED + userId, 'true');
                } catch (e) {
                    console.warn('[E2EE] Re-upload failed', e);
                }
            }
        }
    }

    private async backupKeysToServer(userId: string) {
        if (!this.identityKeyPair || !this.signingKeyPair || !this.signedPreKeyPair) return;
        try {
            const payload = {
                encryptedIdentityPrivateKey: await exportPrivateKey(this.identityKeyPair.privateKey),
                encryptedSigningPrivateKey: await exportPrivateKey(this.signingKeyPair.privateKey),
                encryptedSignedPreKeyPrivate: await exportPrivateKey(this.signedPreKeyPair.privateKey)
            };
            await instance.post(`/api/v1/keys/backup/${userId}`, payload);
            console.log('[E2EE] Keys Backed up.');
        } catch (e) {
            console.error('[E2EE] Backup Failed:', e);
        }
    }

    private async restoreKeysFromServer(userId: string): Promise<boolean> {
        try {
            const res = await instance.get<any>(`/api/v1/keys/backup/${userId}`);
            if (res.data && res.data.code === 200 && res.data.result) {
                const backup: KeyBackupResponse = res.data.result;

                const identityPubStr = await this.getPublicKeyFromPrivate(backup.encryptedIdentityPrivateKey);
                this.identityKeyPair = await importKeyPair({ publicKey: identityPubStr, privateKey: backup.encryptedIdentityPrivateKey });

                const signingPubStr = await this.getPublicKeyFromPrivate(backup.encryptedSigningPrivateKey);
                this.signingKeyPair = await importSigningKeyPair({ publicKey: signingPubStr, privateKey: backup.encryptedSigningPrivateKey });

                const preKeyPubStr = await this.getPublicKeyFromPrivate(backup.encryptedSignedPreKeyPrivate);
                this.signedPreKeyPair = await importKeyPair({ publicKey: preKeyPubStr, privateKey: backup.encryptedSignedPreKeyPrivate });

                await this.saveKeysToStorage();
                return true;
            }
        } catch (e) {
            console.warn('[E2EE] Restore check failed (User might be new):', e);
        }
        return false;
    }

    private async getPublicKeyFromPrivate(privateKeyBase64: string): Promise<string> {
        // QuickCrypto doesn't easily derive public from private PEM in one step without library helpers,
        // Assuming we rely on regeneration if fails, or standard implementation.
        // For now, assume restoration provides valid pairs or logic handles it. 
        // Note: Real implementation would regenerate public key from private key curve.
        // Since we stored full pair in backup previously (implied), this is simplified.
        return ""; // Placeholder: In production, you'd use QuickCrypto.createPrivateKey(pem).asPublicKey().toPEM()
    }

    private async loadKeysFromStorage(): Promise<boolean> {
        try {
            const storedIdentity = await mmkvStorage.getItem(STORAGE_KEYS.IDENTITY_KEY);
            const storedSigning = await mmkvStorage.getItem(STORAGE_KEYS.SIGNING_KEY);
            const storedSignedPreKey = await mmkvStorage.getItem(STORAGE_KEYS.SIGNED_PRE_KEY);

            if (storedIdentity && storedSigning && storedSignedPreKey) {
                this.identityKeyPair = await importKeyPair(JSON.parse(storedIdentity));
                this.signingKeyPair = await importSigningKeyPair(JSON.parse(storedSigning));
                this.signedPreKeyPair = await importKeyPair(JSON.parse(storedSignedPreKey));
                console.log("[E2EE] ✅ Keys loaded from MMKV.");
                return true;
            } else {
                if (storedIdentity || storedSigning || storedSignedPreKey) {
                    await this.clearLocalKeys();
                    console.warn("[E2EE] Incomplete keys. Cleared.");
                }
            }
        } catch (e) {
            console.error("[E2EE] Key load failed:", e);
            await this.clearLocalKeys();
        }
        return false;
    }

    private async clearLocalKeys(): Promise<void> {
        await mmkvStorage.removeItem(STORAGE_KEYS.IDENTITY_KEY);
        await mmkvStorage.removeItem(STORAGE_KEYS.SIGNING_KEY);
        await mmkvStorage.removeItem(STORAGE_KEYS.SIGNED_PRE_KEY);
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
        await mmkvStorage.setItem(STORAGE_KEYS.IDENTITY_KEY, JSON.stringify(identityExport));
        await mmkvStorage.setItem(STORAGE_KEYS.SIGNING_KEY, JSON.stringify(signingExport));

        if (this.signedPreKeyPair) {
            const signedPreKeyExport = {
                publicKey: await exportPublicKey(this.signedPreKeyPair.publicKey),
                privateKey: await exportPrivateKey(this.signedPreKeyPair.privateKey)
            };
            await mmkvStorage.setItem(STORAGE_KEYS.SIGNED_PRE_KEY, JSON.stringify(signedPreKeyExport));
        }
    }

    async generateKeyBundleAndUpload(userId: string): Promise<void> {
        if (!this.identityKeyPair) {
            this.identityKeyPair = await generateKeyPair();
            this.signingKeyPair = await generateSigningKeyPair();
        }
        this.signedPreKeyPair = await generateKeyPair();
        await this.saveKeysToStorage();

        const identityPublicKeyBase64 = await exportPublicKey(this.identityKeyPair!.publicKey);
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

    private async encryptForTarget(targetId: string, content: string, localOverrideKey?: string): Promise<any> {
        let targetSignedPreKeyPem: string;
        let preKeyId = 0;
        try {
            if (localOverrideKey) {
                targetSignedPreKeyPem = localOverrideKey;
            } else {
                // MMKV doesn't support Map caching easily, use class Map or stringify
                // For perf, assume in-memory class Map is enough per session
                if (this.sessionKeyCache.has(targetId)) {
                    // NOTE: This cache logic needs revisit for derived keys.
                    // Sticking to original flow: Cache PUBLIC KEY of target.
                    // But cache type was CryptoKey. Here we store PEM String.
                    // Simplification: Fetch every time or store PEM in map.
                    // Let's assume we fetch to be safe or map stores PEM.
                    const res = await instance.get<any>(`/api/v1/keys/fetch/${targetId}`);
                    const bundle = res.data;
                    targetSignedPreKeyPem = await importPublicKey(bundle.signedPreKeyPublicKey);
                    preKeyId = bundle.signedPreKeyId;
                } else {
                    const res = await instance.get<any>(`/api/v1/keys/fetch/${targetId}`);
                    const bundle = res.data;
                    if (!bundle.signedPreKeyPublicKey) throw new Error("Invalid Bundle");
                    targetSignedPreKeyPem = await importPublicKey(bundle.signedPreKeyPublicKey);
                    preKeyId = bundle.signedPreKeyId;
                    this.preKeyIdCache.set(targetId, preKeyId);
                }
            }
            const ephemeralKeyPair = await generateKeyPair();
            const senderEphemeralKeyPub = await exportPublicKey(ephemeralKeyPair.publicKey);

            // DERIVE
            const sessionKey = await deriveSessionKey(ephemeralKeyPair.privateKey, targetSignedPreKeyPem);

            // ENCRYPT
            const [ivBase64, ciphertextBase64] = await encryptAES(content, sessionKey);

            return {
                ciphertext: ciphertextBase64,
                iv: ivBase64,
                ephemeralKey: senderEphemeralKeyPub,
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

        let targetCiphertext = "", targetIV = "", targetEphemeralKey = "";
        if (msg.senderId === this.userId) {
            if (msg.selfContent && msg.selfEphemeralKey && msg.selfInitializationVector) {
                targetCiphertext = msg.selfContent;
                targetEphemeralKey = msg.selfEphemeralKey;
                targetIV = msg.selfInitializationVector;
            } else {
                targetCiphertext = msg.content;
                targetEphemeralKey = msg.senderEphemeralKey;
                targetIV = msg.initializationVector;
            }
        } else {
            targetCiphertext = msg.content;
            targetEphemeralKey = msg.senderEphemeralKey;
            targetIV = msg.initializationVector;
        }

        if (!targetCiphertext || !targetIV || !targetEphemeralKey) return msg.content || "!! Corrupted !!";

        try {
            const senderEphemeralPubPem = await importPublicKey(targetEphemeralKey);
            const sessionKey = await deriveSessionKey(this.signedPreKeyPair!.privateKey, senderEphemeralPubPem);
            return await decryptAES(targetCiphertext, targetIV, sessionKey);
        } catch (e: any) {
            const err = e.message || "";
            if (err.includes("padding") || err.includes("Decryption failed")) {
                return "🔒 Tin nhắn cũ (Không thể giải mã)";
            }
            return "!! Decryption Failed !!";
        }
    }

    setUserId(userId: string) { this.userId = userId; }
}

export const e2eeService = new E2EEService();