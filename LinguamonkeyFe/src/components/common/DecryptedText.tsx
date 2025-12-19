import React, { useEffect, useState } from 'react';
import { Text, TextProps } from 'react-native';
import { useUserStore } from '../../stores/UserStore';
import { e2eeService } from '../../services/E2EEService';
import { roomSecurityService } from '../../services/RoomSecurityService'; 
import { RoomType } from '../../types/enums'; 

interface DecryptedTextProps extends TextProps {
    content: string; 

    senderId?: string;
    senderEphemeralKey?: string;
    initializationVector?: string;
    selfContent?: string;
    selfEphemeralKey?: string;
    selfInitializationVector?: string;

    roomId?: string;
    roomType?: RoomType;

    fallbackText?: string;
}

const DecryptedText: React.FC<DecryptedTextProps> = ({
    content,
    senderId,
    senderEphemeralKey,
    initializationVector,
    selfContent,
    selfEphemeralKey,
    selfInitializationVector,
    roomId,
    roomType,
    fallbackText = "🔒 Tin nhắn mã hóa",
    style,
    ...props
}) => {
    const [decrypted, setDecrypted] = useState<string | null>(null);
    const { user } = useUserStore();

    useEffect(() => {
        let isMounted = true;

        const decrypt = async () => {
            if (roomId && roomType && roomType !== RoomType.PRIVATE) {
                try {
                    const result = await roomSecurityService.decryptMessage(roomId, content);

                    if (isMounted) {
                        setDecrypted(result);
                    }
                } catch (e) {
                    if (isMounted) setDecrypted(fallbackText);
                }
                return;
            }

            if (senderEphemeralKey) {
                const mockMsg = {
                    senderId: senderId,
                    content: content,
                    senderEphemeralKey: senderEphemeralKey,
                    initializationVector: initializationVector,
                    selfContent: selfContent,
                    selfEphemeralKey: selfEphemeralKey,
                    selfInitializationVector: selfInitializationVector,
                    id: { chatMessageId: 'temp' } // Mock ID để service không lỗi
                };

                if (user?.userId) e2eeService.setUserId(user.userId);

                try {
                    const result = await e2eeService.decrypt(mockMsg);
                    if (isMounted) {
                        if (result.includes("!!") || result.includes("Error")) {
                            setDecrypted(fallbackText);
                        } else {
                            setDecrypted(result);
                        }
                    }
                } catch (e) {
                    if (isMounted) setDecrypted(fallbackText);
                }
                return;
            }

            if (isMounted) setDecrypted(content);
        };

        decrypt();

        return () => { isMounted = false; };
    }, [
        content,
        senderEphemeralKey,
        initializationVector,
        user?.userId,
        roomId,
        roomType
    ]);

    return (
        <Text style={style} {...props}>
            {decrypted !== null ? decrypted : "..."}
        </Text>
    );
};

export default DecryptedText;