import AsyncStorage from '@react-native-async-storage/async-storage';
import { e2eeService } from '../services/E2EEService';

const USER_STORAGE_KEY = 'user-storage'; // Ensure this matches your Zustand persist key

export const decryptNotificationContent = async (remoteMessage: any) => {
    const { data, notification } = remoteMessage;

    // 1. Setup Default: Use original title/body from notification (safe fallback)
    let title = notification?.title || 'MonkeyLingua';
    let body = notification?.body || 'Bạn có tin nhắn mới';

    // 2. Check if encrypted
    if (data?.isEncrypted === 'true' && data?.ciphertext && data?.senderEphemeralKey) {
        try {
            console.log('[NotiHelper] Detected Encrypted Push. Attempting decrypt...');

            // 3. MANUALLY RETRIEVE USER ID (Critical for Background/Quit State)
            let currentUserId = e2eeService['userId'];

            if (!currentUserId) {
                try {
                    const userJson = await AsyncStorage.getItem(USER_STORAGE_KEY);
                    if (userJson) {
                        const parsed = JSON.parse(userJson);
                        // Zustand persist structure: { state: { user: { userId: ... } }, version: 0 }
                        const userIdFromStorage = parsed?.state?.user?.userId || parsed?.state?.user?.id;

                        if (userIdFromStorage) {
                            console.log('[NotiHelper] Hydrated UserID from storage:', userIdFromStorage);
                            currentUserId = userIdFromStorage;
                            e2eeService.setUserId(userIdFromStorage);
                        }
                    }
                } catch (storageError) {
                    console.error('[NotiHelper] Storage access failed:', storageError);
                }
            }

            if (!currentUserId) {
                console.warn('[NotiHelper] Cannot find UserId in Background. Decryption skipped.');
                return { title, body: '🔒 Tin nhắn bí mật (Mở app để xem)', data };
            }

            await e2eeService.initAndCheckUpload(currentUserId);

            // 5. Map Data
            const msgStruct = {
                senderId: data.senderId,
                content: data.ciphertext,
                senderEphemeralKey: data.senderEphemeralKey,
                initializationVector: data.initializationVector,
            };

            const decryptedText = await e2eeService.decrypt(msgStruct);

            if (decryptedText && !decryptedText.includes('!!') && !decryptedText.includes('🔒')) {
                console.log('[NotiHelper] Decrypt Success!');
                body = decryptedText;
            } else {
                console.log('[NotiHelper] Decrypt returned error flag:', decryptedText);
                body = '🔒 Tin nhắn bí mật';
            }

        } catch (error) {
            console.error('[NotiHelper] Decrypt failed Exception:', error);
            body = '🔒 Tin nhắn bí mật';
        }
    } else {
        if (data?.content && data?.isEncrypted !== 'true') {
            body = data.content;
        }
    }

    return { title, body, data };
};