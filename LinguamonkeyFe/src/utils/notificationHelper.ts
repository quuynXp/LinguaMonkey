import AsyncStorage from '@react-native-async-storage/async-storage';
import { e2eeService } from '../services/E2EEService';

const USER_STORAGE_KEY = 'user-storage';

export const decryptNotificationContent = async (remoteMessage: any) => {
    const { data, notification } = remoteMessage;

    // 1. Setup mặc định: lấy title/body gốc từ notification (nếu có)
    let title = notification?.title || 'MonkeyLingua';
    let body = notification?.body || 'Bạn có tin nhắn mới';

    // 2. Kiểm tra xem có phải tin nhắn mã hóa không
    if (data?.isEncrypted === 'true' && data?.ciphertext && data?.senderEphemeralKey) {
        try {
            console.log('[NotiHelper] Detected Encrypted Push. Attempting decrypt...');

            // 3. LẤY USER ID THỦ CÔNG (Quan trọng cho Background Mode)
            let currentUserId = e2eeService['userId'];

            if (!currentUserId) {
                const userJson = await AsyncStorage.getItem(USER_STORAGE_KEY);
                if (userJson) {
                    const parsed = JSON.parse(userJson);
                    const userIdFromStorage = parsed?.state?.user?.userId || parsed?.state?.user?.id;

                    if (userIdFromStorage) {
                        console.log('[NotiHelper] Hydrated UserID from storage:', userIdFromStorage);
                        currentUserId = userIdFromStorage;
                        e2eeService.setUserId(userIdFromStorage);
                    }
                }
            }

            if (!currentUserId) {
                console.warn('[NotiHelper] Cannot find UserId. Decryption skipped.');
                return { title, body: '🔒 Tin nhắn bí mật (Bạn cần đăng nhập để xem)', data };
            }

            // 4. Khởi tạo Key (Load Private Key từ Storage)
            await e2eeService.initAndCheckUpload(currentUserId);

            // 5. Mapping dữ liệu từ Backend -> Cấu trúc E2EE Service hiểu
            const msgStruct = {
                senderId: data.senderId,
                content: data.ciphertext, // <--- MAP QUAN TRỌNG
                senderEphemeralKey: data.senderEphemeralKey,
                initializationVector: data.initializationVector,
            };

            const decryptedText = await e2eeService.decrypt(msgStruct);

            if (decryptedText && !decryptedText.includes('!!') && !decryptedText.includes('🔒')) {
                console.log('[NotiHelper] Decrypt Success!');
                body = decryptedText; // Gán nội dung đã giải mã vào body hiển thị
            } else {
                console.log('[NotiHelper] Decrypt returned error flag:', decryptedText);
                body = '🔒 Tin nhắn được mã hóa';
            }

        } catch (error) {
            console.error('[NotiHelper] Decrypt failed Exception:', error);
            body = '🔒 Tin nhắn được mã hóa';
        }
    } else {
        if (data?.content) {
            body = data.content;
        }
    }

    return { title, body, data };
};