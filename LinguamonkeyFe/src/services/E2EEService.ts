import instance from "../api/axiosClient";
import type { ChatMessage } from "../types/entity";
import { getSessionKey, encryptAES, decryptAES } from "../utils/crypto";

type E2EEMetadata = {
    senderEphemeralKey: string;
    usedPreKeyId?: number;
    initializationVector: string; // IV (Base64)
    ciphertext: string; // Ciphertext (Base64)
};

class E2EEService {
    private sessionCache: Map<string, boolean> = new Map();
    private keyCache: Map<string, CryptoKey> = new Map(); // Cache cho Session Key

    /**
     * Thiết lập phiên E2EE (X3DH giả định) và tạo Session Key.
     * Trong thực tế, đây là nơi diễn ra quá trình trao đổi khóa và tính toán Shared Secret.
     */
    async establishSession(receiverId: string): Promise<{ isNewSession: boolean, usedPreKeyId?: number }> {
        const isEstablished = this.sessionCache.get(receiverId);

        if (isEstablished) {
            return { isNewSession: false };
        }

        try {
            // Thực tế: Call GET /api/v1/keys/fetch/{receiverId} để lấy Key Bundle
            const res = await instance.get(`/api/v1/keys/fetch/${receiverId}`);
            const data = res.data.result;

            if (data && data.identityPublicKey) {
                // Logic thiết lập phiên E2EE (X3DH) diễn ra ở đây.
                // Nếu thành công:
                const sessionKey = await getSessionKey(receiverId); // Tạo Key thực tế từ ID
                this.keyCache.set(receiverId, sessionKey);

                this.sessionCache.set(receiverId, true);
                return { isNewSession: true, usedPreKeyId: data.oneTimePreKeyId };
            }
        } catch (e) {
            console.error("Failed to fetch key bundle or establish session:", e);
        }

        // Thay thế Giả lập: Tạo Session Key và thiết lập phiên thành công
        const sessionKey = await getSessionKey(receiverId);
        this.keyCache.set(receiverId, sessionKey);
        this.sessionCache.set(receiverId, true);
        return { isNewSession: true, usedPreKeyId: 100 + Math.floor(Math.random() * 50) };
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

        // MÃ HÓA THỰC TẾ:
        const [ivBase64, ciphertextBase64] = await encryptAES(content, sessionKey);

        // THỰC TẾ: Ephemeral Key (Khóa công khai dùng một lần) được sinh trong quá trình Double Ratchet
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
            // Giả định content của tin nhắn E2EE là một JSON string của E2EEMetadata
            metadata = JSON.parse(msg.content) as E2EEMetadata;

            if (!metadata.ciphertext || !metadata.initializationVector) {
                return msg.content || ""; // Không phải E2EE hoặc thiếu metadata
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
}

export const e2eeService = new E2EEService();