import instance from "../api/axiosClient";
import type { ChatMessage } from "../types/entity";
import { getSessionKey, encryptAES, decryptAES, generateKeyPair, exportPublicKey, generateSigningKeyPair, signData, base64ToArrayBuffer, generatePreKeyId } from "../utils/crypto";

// Giả định cấu trúc response từ server
type PreKeyBundleResponse = {
    identityPublicKey: string;
    signedPreKeyId: number;
    signedPreKeyPublicKey: string;
    signedPreKeySignature: string;
    oneTimePreKeyId?: number;
    oneTimePreKeyPublicKey?: string;
};

// Cấu trúc request gửi lên server
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

class E2EEService {
    private sessionCache: Map<string, boolean> = new Map();
    private keyCache: Map<string, CryptoKey> = new Map();

    private readonly MIN_PREKEYS_TO_UPLOAD = 100;
    private readonly SIGNING_KEY_PAIR_STORAGE_KEY = "e2ee_signing_keypair";
    private identityKeyPair?: CryptoKeyPair;
    private signingKeyPair?: CryptoKeyPair;
    private userId?: string;

    private async loadKeys(): Promise<void> {
        // TẢI KHÓA IDENTITY KEY VÀ SIGNING KEY
        // Trong ứng dụng thực tế, các khóa này phải được lưu trữ an toàn (ví dụ: IndexedDB/Secure Storage)
        if (!this.identityKeyPair) {
            this.identityKeyPair = await generateKeyPair();
        }

        if (!this.signingKeyPair) {
            this.signingKeyPair = await generateSigningKeyPair();
        }
    }

    /**
     * Sinh và Upload bộ PreKey Bundle mới lên Server.
     */
    async generateKeyBundleAndUpload(userId: string): Promise<void> {
        await this.loadKeys();

        const identityPublicKeyBase64 = await exportPublicKey(this.identityKeyPair!.publicKey);
        const signedPreKeyKeyPair = await generateKeyPair();
        const signedPreKeyId = generatePreKeyId();
        const signedPreKeyPublicKeyBase64 = await exportPublicKey(signedPreKeyKeyPair.publicKey);

        // Ký Identity Public Key bằng Signing Key Private Key
        const identityPublicKeyBuffer = base64ToArrayBuffer(identityPublicKeyBase64);
        const signedPreKeySignatureBase64 = await signData(this.signingKeyPair!.privateKey, identityPublicKeyBuffer);

        // Sinh 100 One-Time PreKeys
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


    /**
     * Thiết lập phiên E2EE (X3DH giả định) và tạo Session Key.
     */
    async establishSession(receiverId: string): Promise<{ isNewSession: boolean, usedPreKeyId?: number }> {
        const isEstablished = this.sessionCache.get(receiverId);

        if (isEstablished) {
            return { isNewSession: false };
        }

        try {
            // Thử lấy PreKeyBundle của người nhận
            const res = await instance.get<PreKeyBundleResponse>(`/api/v1/keys/fetch/${receiverId}`);
            const data = res.data;

            // X3DH Logic: Sử dụng Identity Key, Ephemeral Key của mình 
            // và PreKeyBundle của người nhận để tính toán Shared Secret
            if (data.identityPublicKey) {
                const sessionKey = await getSessionKey(receiverId);
                this.keyCache.set(receiverId, sessionKey);

                this.sessionCache.set(receiverId, true);
                return { isNewSession: true, usedPreKeyId: data.oneTimePreKeyId };
            }

        } catch (e: any) {
            // Bắt lỗi 404 (Không tìm thấy Key Bundle)
            if (e.response && e.response.status === 404) {
                console.info(`Key bundle not found for ${receiverId}. Initializing and uploading new keys...`);
                // Người nhận chưa có khóa, ta không thể làm gì.
                // Nếu người nhận là chính mình (user), ta cần khởi tạo và upload.
                // Đây là tình huống user chưa có key nào, logic yêu cầu:
                if (receiverId === this.userId) {
                    await this.generateKeyBundleAndUpload(receiverId);
                    console.info(`Key bundle initialized and uploaded for ${receiverId}.`);
                    // Key đã được upload, nhưng ta không cần thiết lập phiên với chính mình.
                    return { isNewSession: true, usedPreKeyId: 0 };
                }
            }
            console.error(`Failed to establish session or fetch key bundle for ${receiverId}:`, e);
        }

        // Nếu không có key bundle của người nhận, ta không thể thiết lập phiên E2EE.
        throw new Error(`Cannot establish E2EE session with ${receiverId}. No key bundle available.`);
    }

    /**
     * Mã hóa nội dung bằng AES-GCM sử dụng Session Key.
     * @param receiverId ID người nhận (dùng để tra cứu Session Key)
     * @param content Nội dung cần mã hóa
     * @returns E2EEMetadata chứa IV, Ephemeral Key và Ciphertext
     */
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

    /**
     * Giải mã tin nhắn đã mã hóa E2EE.
     * @param msg Tin nhắn ChatMessage chứa content (dạng E2EEMetadata JSON string)
     * @returns Chuỗi nội dung đã giải mã.
     */
    async decrypt(msg: ChatMessage): Promise<string> {
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
            console.error("Failed to decrypt message:", msg.id.chatMessageId, e);
            return "!! Decryption Failed: Bad Ciphertext/Key !!";
        }
    }

    /**
     * Thiết lập ID của người dùng hiện tại để kiểm tra nếu cần tự khởi tạo key.
     */
    setUserId(userId: string) {
        this.userId = userId;
    }
}

export const e2eeService = new E2EEService();