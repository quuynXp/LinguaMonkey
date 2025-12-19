import { Buffer } from 'buffer';
import mmkvStorage from "../utils/storage";
import { encryptAES, decryptAES } from "../utils/crypto";

const STORAGE_PREFIX = 'room_key_aes_';

class RoomSecurityService {
    private memoryKeys: Map<string, string> = new Map();

    setKey(roomId: string, base64Key: string) {
        if (!roomId || !base64Key) return;
        this.memoryKeys.set(roomId, base64Key);
        mmkvStorage.setString(STORAGE_PREFIX + roomId, base64Key);
    }

    getKey(roomId: string): string | null {
        if (this.memoryKeys.has(roomId)) {
            return this.memoryKeys.get(roomId)!;
        }
        const cached = mmkvStorage.getString(STORAGE_PREFIX + roomId);
        if (cached) {
            this.memoryKeys.set(roomId, cached);
            return cached;
        }
        return null;
    }

    async decryptMessage(roomId: string, combinedBase64: string): Promise<string> {
        const key = this.getKey(roomId);
        if (!key) {
            const reloadedKey = mmkvStorage.getString(STORAGE_PREFIX + roomId);
            if (!reloadedKey) return "⚠️ Đang tải khóa phòng...";
            this.setKey(roomId, reloadedKey);
            return this.decryptMessage(roomId, combinedBase64); // Gọi lại đệ quy 1 lần
        }

        try {
            const combinedBuffer = Buffer.from(combinedBase64, 'base64');

            if (combinedBuffer.length < 16) return "Error: Data too short";

            const ivBuffer = combinedBuffer.slice(0, 16);
            const cipherBuffer = combinedBuffer.slice(16);

            const ivBase64 = ivBuffer.toString('base64');
            const cipherBase64 = cipherBuffer.toString('base64');

            const decrypted = await decryptAES(cipherBase64, ivBase64, key);
            return decrypted;
        } catch (e) {
            console.warn(`[RoomSecurity] Decrypt failed for room ${roomId}:`, e);
            return "🔒 Không thể giải mã";
        }
    }

    async encryptMessage(roomId: string, plainText: string): Promise<string> {
        const key = this.getKey(roomId);
        if (!key) throw new Error(`Missing key for room ${roomId}`);

        const [ivBase64, cipherBase64] = await encryptAES(plainText, key);

        const ivBuffer = Buffer.from(ivBase64, 'base64');
        const cipherBuffer = Buffer.from(cipherBase64, 'base64');

        const combined = Buffer.concat([ivBuffer, cipherBuffer]);

        return combined.toString('base64');
    }

    preloadKeys() {
        const keys = mmkvStorage.getAllKeys();
        keys.forEach(k => {
            if (k.startsWith(STORAGE_PREFIX)) {
                const roomId = k.replace(STORAGE_PREFIX, '');
                const val = mmkvStorage.getString(k);
                if (val) this.memoryKeys.set(roomId, val);
            }
        });
        console.log(`[RoomSecurity] Preloaded ${this.memoryKeys.size} room keys.`);
    }
}

export const roomSecurityService = new RoomSecurityService();