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

const STORAGE_KEYS = {
    IDENTITY_KEY: 'e2ee_identity_key_pair',
    SIGNING_KEY: 'e2ee_signing_key_pair',
    SIGNED_PRE_KEY: 'e2ee_signed_pre_key_pair',
    KEYS_UPLOADED: 'e2ee_keys_uploaded_status_',
    ROOM_KEY_PREFIX: 'e2ee_room_key_',
};

// FIX: AES-CBC requires 16 bytes IV (AES-GCM used 12)
const IV_LENGTH_BYTES = 16;

class E2EEService {
    private readonly MIN_PREKEYS_TO_UPLOAD = 50;

    private identityKeyPair?: CryptoKeyPair;
    private signingKeyPair?: CryptoKeyPair;
    private signedPreKeyPair?: CryptoKeyPair;
    private userId?: string;

    private roomKeys: Map<string, string> = new Map();
    private sessionKeyCache: Map<string, string> = new Map();
    private preKeyIdCache: Map<string, number> = new Map();

    async initAndCheckUpload(userId: string) {
        this.setUserId(userId);
        const loadedLocal = await this.loadKeysFromStorage();

        if (!loadedLocal) {
            console.log(`[E2EE] No local keys. Generating NEW keys.`);
            try {
                await this.generateKeyBundleAndUpload(userId);
                await mmkvStorage.setItem(STORAGE_KEYS.KEYS_UPLOADED + userId, 'true');
            } catch (e) { console.error("[E2EE] Init Failed", e); }
        }
    }

    // --- GROUP CHAT LOGIC (Shared AES Key) ---

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

        // encryptAES returns [IV_B64, Ciphertext_B64]
        const [iv, cipher] = await encryptAES(content, key);

        // Format: IV(16 bytes) + Ciphertext
        const ivBuf = base64ToArrayBuffer(iv);
        const cipherBuf = base64ToArrayBuffer(cipher);

        // Safety check
        if (ivBuf.byteLength !== IV_LENGTH_BYTES) {
            console.warn(`[E2EE] Warning: Generated IV length is ${ivBuf.byteLength}, expected ${IV_LENGTH_BYTES}`);
        }

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

            if (combined.byteLength < IV_LENGTH_BYTES) return "Error: Data too short";

            const ivBuf = combined.slice(0, IV_LENGTH_BYTES);
            const cipherBuf = combined.slice(IV_LENGTH_BYTES);

            const ivBase64 = this.arrayBufferToBase64(ivBuf);
            const cipherBase64 = this.arrayBufferToBase64(cipherBuf);

            return await decryptAES(cipherBase64, ivBase64, key);
        } catch (e) {
            console.warn("Group Decrypt Error", e);
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

    // --- PRIVATE CHAT LOGIC (Signal / Double Ratchet) ---
    // (Giữ nguyên logic Private Chat như cũ vì nó dùng Session Key riêng)
    private async saveKeysToStorage() {
        if (!this.identityKeyPair || !this.signingKeyPair) return;
        mmkvStorage.setItem(STORAGE_KEYS.IDENTITY_KEY, JSON.stringify(this.identityKeyPair));
        mmkvStorage.setItem(STORAGE_KEYS.SIGNING_KEY, JSON.stringify(this.signingKeyPair));
        if (this.signedPreKeyPair) {
            mmkvStorage.setItem(STORAGE_KEYS.SIGNED_PRE_KEY, JSON.stringify(this.signedPreKeyPair));
        }
    }

    private async loadKeysFromStorage(): Promise<boolean> {
        try {
            const storedIdentity = mmkvStorage.getString(STORAGE_KEYS.IDENTITY_KEY);
            const storedSigning = mmkvStorage.getString(STORAGE_KEYS.SIGNING_KEY);
            const storedSignedPreKey = mmkvStorage.getString(STORAGE_KEYS.SIGNED_PRE_KEY);

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
        try {
            if (!this.identityKeyPair) {
                this.identityKeyPair = await generateKeyPair();
                this.signingKeyPair = await generateKeyPair();
            }
            this.signedPreKeyPair = await generateKeyPair();
            await this.saveKeysToStorage();

            const identityPubB64 = await exportPublicKey(this.identityKeyPair!.publicKey);
            const signedPreKeyPubB64 = await exportPublicKey(this.signedPreKeyPair.publicKey);
            const identityPubBuffer = base64ToArrayBuffer(identityPubB64);
            const signatureB64 = await signData(this.signingKeyPair!.privateKey, identityPubBuffer);

            const oneTimePreKeys: Record<number, string> = {};
            const promises = [];
            for (let i = 0; i < this.MIN_PREKEYS_TO_UPLOAD; i++) {
                promises.push(generateKeyPair().then(async (kp) => {
                    const id = generatePreKeyId();
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
                if (this.sessionKeyCache.has(targetId)) {
                    const res = await instance.get<any>(`/api/v1/keys/fetch/${targetId}`);
                    const bundle = res.data;
                    targetRawPublicKey = await importPublicKey(bundle.signedPreKeyPublicKey);
                    preKeyId = bundle.signedPreKeyId;
                } else {
                    const res = await instance.get<any>(`/api/v1/keys/fetch/${targetId}`);
                    const bundle = res.data;
                    if (!bundle.signedPreKeyPublicKey) throw new Error("Invalid Bundle");
                    targetRawPublicKey = await importPublicKey(bundle.signedPreKeyPublicKey);
                    preKeyId = bundle.signedPreKeyId;
                    this.preKeyIdCache.set(targetId, preKeyId);
                }
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
            this.sessionKeyCache.delete(targetId);
            throw new Error(`Encrypt failed: ${e.message}`);
        }
    }

    async encrypt(receiverId: string, senderId: string, content: string): Promise<DualEncryptionResult> {
        if (!this.signedPreKeyPair) await this.loadKeysFromStorage();
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
            const senderEphemeralPubRaw = await importPublicKey(targetEphemeralKeySPKI);
            const sessionKey = await deriveSessionKey(this.signedPreKeyPair!.privateKey, senderEphemeralPubRaw);
            return await decryptAES(targetCiphertext, targetIV, sessionKey);
        } catch (e: any) {
            return "🔒 Tin nhắn cũ (Không thể giải mã)";
        }
    }

    setUserId(userId: string) { this.userId = userId; }
}

export const e2eeService = new E2EEService();