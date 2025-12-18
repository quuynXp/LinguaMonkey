import AsyncStorage from '@react-native-async-storage/async-storage';
import { e2eeService } from '../services/E2EEService';
import { gotoTab } from "./navigationRef";
import * as Localization from 'expo-localization';

const USER_STORAGE_KEY = 'user-storage';

interface NotificationPayload {
    screen?: string;
    stackScreen?: string;
    roomId?: string;
    ciphertext?: string;
    senderId?: string;
    encryptionType?: 'PRIVATE' | 'GROUP';
    senderEphemeralKey?: string;
    initializationVector?: string;
    [key: string]: any;
}

const translations = {
    vi: {
        new_msg: 'Bạn có tin nhắn mới',
        encrypted_msg: '🔒 Tin nhắn bí mật',
        encrypted_preview: '🔒 Mở ứng dụng để xem tin nhắn',
        decryption_failed: '⚠️ Không thể giải mã tin nhắn này',
        room_key_missing: '⚠️ Đang cập nhật khóa phòng...',
    },
    en: {
        new_msg: 'You have a new message',
        encrypted_msg: '🔒 Secret message',
        encrypted_preview: '🔒 Open app to view message',
        decryption_failed: '⚠️ Cannot decrypt this message',
        room_key_missing: '⚠️ Fetching room key...',
    },
    zh: {
        new_msg: '你有一条新消息',
        encrypted_msg: '🔒 秘密消息',
        encrypted_preview: '🔒 打开应用程序查看消息',
        decryption_failed: '⚠️ 无法解密此消息',
        room_key_missing: '⚠️ 正在获取房间密钥...',
    }
};

const getLocalizedText = async (key: keyof typeof translations['en']): Promise<string> => {
    try {
        const userJson = await AsyncStorage.getItem(USER_STORAGE_KEY);
        let langCode = 'en';

        if (userJson) {
            const parsed = JSON.parse(userJson);
            langCode = parsed?.state?.user?.nativeLanguageCode || 'en';
        } else {
            const locales = Localization.getLocales();
            if (locales && locales.length > 0) {
                langCode = locales[0].languageCode ?? 'en';
            }
        }

        if (langCode.startsWith('vi')) langCode = 'vi';
        else if (langCode.startsWith('zh')) langCode = 'zh';
        else langCode = 'en';

        return translations[langCode as keyof typeof translations][key];
    } catch (e) {
        return translations['en'][key];
    }
};

export const handleNotificationNavigation = (remoteMessage: any) => {
    if (!remoteMessage || !remoteMessage.data) return;

    const data = remoteMessage.data as NotificationPayload;
    const { screen, stackScreen, ...params } = data;

    console.log("🚀 Notification Payload:", { screen, stackScreen, params });

    if (screen) {
        gotoTab(screen as any, stackScreen, params);
    }
};

export const decryptNotificationContent = async (remoteMessage: any) => {
    const { data, notification } = remoteMessage;

    // 1. Initialize Fallback Title/Body
    let title = notification?.title || 'MonkeyLingua';
    let body = await getLocalizedText('new_msg');

    // 2. Check for Encryption
    if (data?.isEncrypted === 'true' && data?.ciphertext) {
        try {
            console.log('[NotiHelper] Detected Encrypted Push. Attempting decrypt...');

            // 3. Hydrate User ID (Background context check)
            let currentUserId = e2eeService['userId'];
            if (!currentUserId) {
                const userJson = await AsyncStorage.getItem(USER_STORAGE_KEY);
                if (userJson) {
                    const parsed = JSON.parse(userJson);
                    const userIdFromStorage = parsed?.state?.user?.userId || parsed?.state?.user?.id;
                    if (userIdFromStorage) {
                        currentUserId = userIdFromStorage;
                        e2eeService.setUserId(userIdFromStorage);
                    }
                }
            }

            if (!currentUserId) {
                console.warn('[NotiHelper] No UserID. Decryption skipped.');
                body = await getLocalizedText('encrypted_preview');
                return { title, body, data };
            }

            // 4. Initialize Crypto
            await e2eeService.initAndCheckUpload(currentUserId);

            // 5. Decrypt based on Type
            let decryptedText = '';
            const encryptionType = data.encryptionType || 'PRIVATE'; // Default to Private if missing

            if (encryptionType === 'PRIVATE') {
                // --- 1-on-1 Chat (Double Ratchet) ---
                if (data.senderEphemeralKey && data.initializationVector) {
                    const msgStruct = {
                        senderId: data.senderId,
                        content: data.ciphertext,
                        senderEphemeralKey: data.senderEphemeralKey,
                        initializationVector: data.initializationVector,
                    };
                    decryptedText = await e2eeService.decrypt(msgStruct);
                } else {
                    decryptedText = await getLocalizedText('decryption_failed');
                }

            } else if (encryptionType === 'GROUP') {
                // --- Group Chat (Room Key) ---
                if (data.roomId) {
                    decryptedText = await e2eeService.decryptGroupMessage(data.roomId, data.ciphertext);

                    if (decryptedText.includes('Room Key Missing')) {
                        decryptedText = await getLocalizedText('room_key_missing');
                    }
                } else {
                    decryptedText = await getLocalizedText('decryption_failed');
                }
            }

            // 6. Validate Result
            if (decryptedText && !decryptedText.includes('!!') && !decryptedText.includes('🔒')) {
                console.log('[NotiHelper] Decrypt Success!');
                body = decryptedText;
            } else {
                console.log('[NotiHelper] Decrypt returned error flag:', decryptedText);
                body = await getLocalizedText('encrypted_msg');
            }

        } catch (error) {
            console.error('[NotiHelper] Decrypt exception:', error);
            body = await getLocalizedText('encrypted_msg');
        }
    } else {
        if (data?.content && data?.isEncrypted !== 'true') {
            body = data.content;
        } else if (notification?.body) {
            body = notification.body;
        }
    }

    return { title, body, data };
};