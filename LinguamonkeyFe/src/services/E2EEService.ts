import AsyncStorage from '@react-native-async-storage/async-storage';
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
    CryptoKey,
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

type EncryptionResult = {
    ciphertext: string;
    iv: string;
    ephemeralKey: string;
    preKeyId: number;
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
                console.log(`[E2EE] Initializing keys for user: ${userId}`);
                await this.generateKeyBundleAndUpload(userId);
                await AsyncStorage.setItem(STORAGE_KEYS.KEYS_UPLOADED + userId, 'true');
            } catch (e) {
                console.warn('[E2EE] Key upload failed', e);
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
                console.log("[E2EE] No keys found, generating new identity...");
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

    // ✅ UPDATED: Hỗ trợ dùng Local Key để mã hóa cho chính mình
    private async encryptForTarget(targetId: string, content: string, localOverrideKey?: CryptoKey): Promise<EncryptionResult> {
        let targetSignedPreKey: CryptoKey;
        let preKeyId = 0;

        try {
            if (localOverrideKey) {
                // CASE 1: Mã hóa cho chính mình (Sender) -> Dùng Key Local (Luôn khớp)
                console.log(`[E2EE] Encrypting for SELF (${targetId}) using LOCAL key.`);
                targetSignedPreKey = localOverrideKey;
            } else {
                // CASE 2: Mã hóa cho người khác (Receiver) -> Lấy Key từ Server
                console.log(`[E2EE] Fetching keys for TARGET (${targetId})...`);
                const res = await instance.get<PreKeyBundleResponse>(`/api/v1/keys/fetch/${targetId}`);
                const bundle = res.data;

                if (!bundle.signedPreKeyPublicKey) throw new Error("Invalid Bundle from Server");

                targetSignedPreKey = await importPublicKey(bundle.signedPreKeyPublicKey);
                preKeyId = bundle.signedPreKeyId;
            }

            // Tạo Ephemeral Key cho tin nhắn này
            const ephemeralKeyPair = await generateKeyPair();
            const senderEphemeralKeyPub = await exportPublicKey(ephemeralKeyPair.publicKey);

            // ECDH: My Ephemeral Private + Target Static Public
            const sessionKey = await deriveSessionKey(
                ephemeralKeyPair.privateKey,
                targetSignedPreKey
            );

            // Encrypt AES
            const [ivBase64, ciphertextBase64] = await encryptAES(content, sessionKey);

            return {
                ciphertext: ciphertextBase64,
                iv: ivBase64,
                ephemeralKey: senderEphemeralKeyPub,
                preKeyId: preKeyId
            };

        } catch (e: any) {
            console.error(`[E2EE] Encryption failed for target ${targetId}:`, e);
            throw new Error(`Cannot encrypt for ${targetId}: ${e.message}`);
        }
    }

    // ✅ FIXED: Hàm encrypt chính gọi hàm helper đã sửa ở trên
    async encrypt(receiverId: string, senderId: string, content: string): Promise<DualEncryptionResult> {
        if (!this.signedPreKeyPair) await this.loadKeys();

        console.log(`[E2EE] Dual Encrypting: Receiver=${receiverId}, Sender=${senderId}`);

        // 1. Mã hóa cho SENDER (Self Copy)
        // QUAN TRỌNG: Truyền this.signedPreKeyPair!.publicKey để KHÔNG fetch từ server
        const senderEnc = await this.encryptForTarget(senderId, content, this.signedPreKeyPair!.publicKey);

        // 2. Mã hóa cho RECEIVER
        let receiverEnc: EncryptionResult;
        if (receiverId === senderId) {
            receiverEnc = senderEnc; // Chat với chính mình
        } else {
            receiverEnc = await this.encryptForTarget(receiverId, content);
        }

        return {
            // Data cho người nhận
            content: receiverEnc.ciphertext,
            senderEphemeralKey: receiverEnc.ephemeralKey,
            initializationVector: receiverEnc.iv,
            usedPreKeyId: receiverEnc.preKeyId,

            // Data cho người gửi (bản sao lưu)
            selfContent: senderEnc.ciphertext,
            selfEphemeralKey: senderEnc.ephemeralKey,
            selfInitializationVector: senderEnc.iv
        };
    }

    // ✅ FIXED: Logic giải mã
    async decrypt(msg: any): Promise<string> {
        if (!this.signedPreKeyPair) {
            await this.loadKeys();
        }

        if (!this.userId) {
            console.warn("[E2EE] decrypt called without userId set.");
            return "!! Key Error !!";
        }

        let targetCiphertext = "";
        let targetIV = "";
        let targetEphemeralKey = "";

        // Xác định nguồn dữ liệu để giải mã
        if (msg.senderId === this.userId) {
            // Tin nhắn DO TÔI GỬI -> Dùng cột 'self_'
            if (msg.selfContent && msg.selfEphemeralKey && msg.selfInitializationVector) {
                targetCiphertext = msg.selfContent;
                targetEphemeralKey = msg.selfEphemeralKey;
                targetIV = msg.selfInitializationVector;
                // console.log(`[E2EE] Decrypting SELF message via self_ columns`);
            } else {
                // Fallback: Nếu thiếu self copy (rất hiếm nếu code trên chạy đúng)
                console.warn("[E2EE] Self-message missing self-copy. Trying main content...");
                targetCiphertext = msg.content;
                targetEphemeralKey = msg.senderEphemeralKey;
                targetIV = msg.initializationVector;
            }
        } else {
            // Tin nhắn NGƯỜI KHÁC GỬI -> Dùng cột thường
            targetCiphertext = msg.content;
            targetEphemeralKey = msg.senderEphemeralKey;
            targetIV = msg.initializationVector;
        }

        if (!targetCiphertext || !targetIV || !targetEphemeralKey) {
            return "!! Corrupted Message !!";
        }

        try {
            // 1. Import Ephemeral Public Key từ tin nhắn
            const senderEphemeralPub = await importPublicKey(targetEphemeralKey);

            // 2. Derive Session Key
            // Công thức: My Private Key * Message Ephemeral Public Key
            const sessionKey = await deriveSessionKey(
                this.signedPreKeyPair!.privateKey,
                senderEphemeralPub
            );

            // 3. Decrypt AES
            const decryptedContent = await decryptAES(
                targetCiphertext,
                targetIV,
                sessionKey
            );

            return decryptedContent;

        } catch (e) {
            console.error(`[E2EE] Decryption Failed for msg ${msg.id?.chatMessageId}:`, e);
            return "!! Decryption Failed !!";
        }
    }

    setUserId(userId: string) {
        this.userId = userId;
    }
}

export const e2eeService = new E2EEService();