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
    encryptPrivateKeyBundle,
    decryptPrivateKeyBundle,
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
    encryptedPrivateKeys?: string;
};

const STORAGE_KEYS = {
    IDENTITY_KEY: 'e2ee_identity_key_pair',
    SIGNING_KEY: 'e2ee_signing_key_pair',
    SIGNED_PRE_KEY: 'e2ee_signed_pre_key_pair',
    KEYS_UPLOADED: 'e2ee_keys_uploaded_status_',
    ROOM_KEY_PREFIX: 'e2ee_room_key_',
};

class E2EEService {
    private readonly MIN_PREKEYS_TO_UPLOAD = 50;

    private identityKeyPair?: CryptoKeyPair;
    private signingKeyPair?: CryptoKeyPair;
    private signedPreKeyPair?: CryptoKeyPair;
    private userId?: string;

    private roomKeys: Map<string, string> = new Map();
    private preKeyIdCache: Map<string, number> = new Map();

    async initAndCheckUpload(userId: string) {
        this.setUserId(userId);

        // 1. Try to load local keys
        const loadedLocal = await this.loadKeysFromStorage(userId);

        if (loadedLocal) {
            // Keys exist locally, check if we need to sync/upload status
            const isUploaded = mmkvStorage.getString(`${STORAGE_KEYS.KEYS_UPLOADED}${userId}`) === 'true';
            if (!isUploaded) {
                // Have keys but flag says not uploaded -> Re-upload with backup
                await this.backupAndUploadKeys(userId);
            }
            return;
        }

        // 2. Local keys missing. Try to RESTORE from server
        console.log(`[E2EE] Local keys missing for ${userId}. Attempting restore...`);
        try {
            const restored = await this.restoreKeysFromServer(userId);
            if (restored) {
                console.log(`[E2EE] Keys restored successfully for ${userId}`);
                return;
            }
        } catch (e) {
            console.warn(`[E2EE] Restore failed, falling back to generation:`, e);
        }

        // 3. Restore failed or no keys on server -> Generate NEW keys
        console.log(`[E2EE] Generating NEW keys for ${userId}`);
        await this.generateKeyBundleAndUpload(userId);
    }

    // --- CLEANUP LOGIC ---
    async clearUserKeys(userId: string) {
        console.log(`[E2EE] Clearing keys for user ${userId}`);
        mmkvStorage.removeItem(`${STORAGE_KEYS.IDENTITY_KEY}_${userId}`);
        mmkvStorage.removeItem(`${STORAGE_KEYS.SIGNING_KEY}_${userId}`);
        mmkvStorage.removeItem(`${STORAGE_KEYS.SIGNED_PRE_KEY}_${userId}`);
        mmkvStorage.removeItem(`${STORAGE_KEYS.KEYS_UPLOADED}${userId}`);

        this.identityKeyPair = undefined;
        this.signingKeyPair = undefined;
        this.signedPreKeyPair = undefined;
        this.userId = undefined;
        this.roomKeys.clear();
        this.preKeyIdCache.clear();
    }

    // --- RESTORE LOGIC ---
    private async restoreKeysFromServer(userId: string): Promise<boolean> {
        try {
            const res = await instance.get<any>(`/api/v1/keys/fetch/${userId}`);
            const bundle = res.data;

            if (bundle && bundle.encryptedPrivateKeys) {
                const decryptedBundle = await decryptPrivateKeyBundle(bundle.encryptedPrivateKeys, userId);
                if (decryptedBundle && decryptedBundle.identityKeyPair && decryptedBundle.signedPreKeyPair) {
                    this.identityKeyPair = decryptedBundle.identityKeyPair;
                    this.signingKeyPair = decryptedBundle.signingKeyPair; // might be same as identity
                    this.signedPreKeyPair = decryptedBundle.signedPreKeyPair;

                    await this.saveKeysToStorage(userId);
                    await mmkvStorage.setItem(`${STORAGE_KEYS.KEYS_UPLOADED}${userId}`, 'true');
                    return true;
                }
            }
        } catch (e) {
            // 404 means no keys found
            return false;
        }
        return false;
    }

    // --- GROUP CHAT LOGIC ---
    async setRoomKey(roomId: string, key: string) {
        this.roomKeys.set(roomId, key);
        mmkvStorage.setItem(STORAGE_KEYS.ROOM_KEY_PREFIX + roomId, key);
    }

    async getRoomKey(roomId: string): Promise<string | null> {
        if (this.roomKeys.has(roomId)) return this.roomKeys.get(roomId)!;
        const cached = mmkvStorage.getString(STORAGE_KEYS.ROOM_KEY_PREFIX + roomId);
        if (cached) {
            this.roomKeys.set(roomId, cached);
            return cached;
        }
        return null;
    }

    async encryptGroupMessage(roomId: string, content: string): Promise<string> {
        const key = await this.getRoomKey(roomId);
        if (!key) throw new Error(`Missing key for room ${roomId}`);

        const [iv, cipher] = await encryptAES(content, key);
        const ivBuf = base64ToArrayBuffer(iv);
        const cipherBuf = base64ToArrayBuffer(cipher);
        const combined = new Uint8Array(ivBuf.byteLength + cipherBuf.byteLength);
        combined.set(new Uint8Array(ivBuf), 0);
        combined.set(new Uint8Array(cipherBuf), ivBuf.byteLength);

        return this.arrayBufferToBase64(combined.buffer);
    }

    async decryptGroupMessage(roomId: string, combinedBase64: string): Promise<string> {
        const key = await this.getRoomKey(roomId);
        if (!key) return "🔒 Room Key Missing";

        try {
            const combined = base64ToArrayBuffer(combinedBase64);
            const ivLen = 12; // 16 for CBC, but check what encryptAES uses. crypto.ts uses CBC so 16? 
            const realIvLen = 16;
            if (combined.byteLength < realIvLen) return "Error: Data too short";

            const ivBuf = combined.slice(0, realIvLen);
            const cipherBuf = combined.slice(realIvLen);

            const ivBase64 = this.arrayBufferToBase64(ivBuf);
            const cipherBase64 = this.arrayBufferToBase64(cipherBuf);

            return await decryptAES(cipherBase64, ivBase64, key);
        } catch (e) {
            return "!! Decryption Failed";
        }
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    // --- PRIVATE CHAT LOGIC ---

    private async saveKeysToStorage(userId: string) {
        if (!this.identityKeyPair || !this.signingKeyPair) return;
        mmkvStorage.setItem(`${STORAGE_KEYS.IDENTITY_KEY}_${userId}`, JSON.stringify(this.identityKeyPair));
        mmkvStorage.setItem(`${STORAGE_KEYS.SIGNING_KEY}_${userId}`, JSON.stringify(this.signingKeyPair));
        if (this.signedPreKeyPair) {
            mmkvStorage.setItem(`${STORAGE_KEYS.SIGNED_PRE_KEY}_${userId}`, JSON.stringify(this.signedPreKeyPair));
        }
    }

    private async loadKeysFromStorage(userId: string): Promise<boolean> {
        try {
            const storedIdentity = mmkvStorage.getString(`${STORAGE_KEYS.IDENTITY_KEY}_${userId}`);
            const storedSigning = mmkvStorage.getString(`${STORAGE_KEYS.SIGNING_KEY}_${userId}`);
            const storedSignedPreKey = mmkvStorage.getString(`${STORAGE_KEYS.SIGNED_PRE_KEY}_${userId}`);

            if (storedIdentity && storedSigning && storedSignedPreKey) {
                this.identityKeyPair = JSON.parse(storedIdentity);
                this.signingKeyPair = JSON.parse(storedSigning);
                this.signedPreKeyPair = JSON.parse(storedSignedPreKey);
                return true;
            }
        } catch (e) { console.error("Load Keys Failed", e); }
        return false;
    }

    async generateKeyBundleAndUpload(userId: string): Promise<void> {
        this.identityKeyPair = await generateKeyPair();
        this.signingKeyPair = await generateKeyPair();
        this.signedPreKeyPair = await generateKeyPair();

        await this.saveKeysToStorage(userId);
        await this.backupAndUploadKeys(userId);
    }

    private async backupAndUploadKeys(userId: string): Promise<void> {
        try {
            if (!this.identityKeyPair || !this.signedPreKeyPair || !this.signingKeyPair) throw new Error("Keys not generated");

            const identityPubB64 = await exportPublicKey(this.identityKeyPair.publicKey);
            const signedPreKeyPubB64 = await exportPublicKey(this.signedPreKeyPair.publicKey);
            const identityPubBuffer = base64ToArrayBuffer(identityPubB64);
            const signatureB64 = await signData(this.signingKeyPair.privateKey, identityPubBuffer);

            const oneTimePreKeys: Record<number, string> = {};
            const promises = [];
            for (let i = 0; i < this.MIN_PREKEYS_TO_UPLOAD; i++) {
                promises.push(generateKeyPair().then(async (kp) => {
                    const id = generatePreKeyId();
                    oneTimePreKeys[id] = await exportPublicKey(kp.publicKey);
                }));
            }
            await Promise.all(promises);

            const privateKeyBundle = {
                identityKeyPair: this.identityKeyPair,
                signingKeyPair: this.signingKeyPair,
                signedPreKeyPair: this.signedPreKeyPair
            };
            const encryptedBackup = await encryptPrivateKeyBundle(privateKeyBundle, userId);

            const request: PreKeyBundleRequest = {
                identityPublicKey: identityPubB64,
                signedPreKeyId: generatePreKeyId(),
                signedPreKeyPublicKey: signedPreKeyPubB64,
                signedPreKeySignature: signatureB64,
                oneTimePreKeys: oneTimePreKeys,
                encryptedPrivateKeys: encryptedBackup // Attach backup
            };

            await instance.post(`/api/v1/keys/upload/${userId}`, request);
            await mmkvStorage.setItem(`${STORAGE_KEYS.KEYS_UPLOADED}${userId}`, 'true');
        } catch (error) {
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
                const res = await instance.get<any>(`/api/v1/keys/fetch/${targetId}`);
                const bundle = res.data;
                if (!bundle.signedPreKeyPublicKey) throw new Error("Invalid Bundle");
                targetRawPublicKey = await importPublicKey(bundle.signedPreKeyPublicKey);
                preKeyId = bundle.signedPreKeyId;
                this.preKeyIdCache.set(targetId, preKeyId);
            }

            const ephemeralKeyPair = await generateKeyPair();
            const sessionKey = await deriveSessionKey(ephemeralKeyPair.privateKey, targetRawPublicKey);
            const [ivBase64, ciphertextBase64] = await encryptAES(content, sessionKey);
            const ephemeralPubSPKI = await exportPublicKey(ephemeralKeyPair.publicKey);

            return {
                ciphertext: ciphertextBase64,
                iv: ivBase64,
                ephemeralKey: ephemeralPubSPKI,
                preKeyId: preKeyId
            };
        } catch (e: any) {
            throw new Error(`Encrypt failed: ${e.message}`);
        }
    }

    async encrypt(receiverId: string, senderId: string, content: string): Promise<DualEncryptionResult> {
        if (!this.signedPreKeyPair) await this.loadKeysFromStorage(senderId);

        if (!this.signedPreKeyPair) {
            throw new Error("E2EE Keys not initialized");
        }

        const [senderEnc, receiverEnc] = await Promise.all([
            this.encryptForTarget(senderId, content, this.signedPreKeyPair.publicKey),
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
        if (!this.userId) return "!! Key Error: No User ID !!";
        if (!this.signedPreKeyPair) await this.loadKeysFromStorage(this.userId);

        if (!this.signedPreKeyPair) return "🔒 Chờ khóa bảo mật...";

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
            const senderEphemeralPubRaw = await importPublicKey(targetEphemeralKeySPKI);
            const sessionKey = await deriveSessionKey(this.signedPreKeyPair!.privateKey, senderEphemeralPubRaw);
            const result = await decryptAES(targetCiphertext, targetIV, sessionKey);
            return result || "🔒 Lỗi giải mã";
        } catch (e: any) {
            console.warn("Decrypt failed:", e.message);
            return "🔒 Lỗi khóa (Re-login)";
        }
    }

    setUserId(userId: string) { this.userId = userId; }
}

export const e2eeService = new E2EEService();