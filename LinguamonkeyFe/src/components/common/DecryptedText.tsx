import React, { useEffect, useState } from 'react';
import { Text, TextProps } from 'react-native';
import { useUserStore } from '../../stores/UserStore';
import { e2eeService } from '../../services/E2EEService';

interface DecryptedTextProps extends TextProps {
    content: string; // Ciphertext
    senderId?: string;
    senderEphemeralKey?: string;
    initializationVector?: string;
    selfContent?: string;
    selfEphemeralKey?: string;
    selfInitializationVector?: string;
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
    fallbackText = "Encrypted message",
    style,
    ...props
}) => {
    const [decrypted, setDecrypted] = useState<string | null>(null);
    const { user } = useUserStore();

    useEffect(() => {
        let isMounted = true;

        const decrypt = async () => {
            if (!senderEphemeralKey) {
                if (isMounted) setDecrypted(content);
                return;
            }

            const mockMsg = {
                senderId: senderId,
                content: content,
                senderEphemeralKey: senderEphemeralKey,
                initializationVector: initializationVector,
                selfContent: selfContent,
                selfEphemeralKey: selfEphemeralKey,
                selfInitializationVector: selfInitializationVector,
                id: { chatMessageId: 'temp' }
            };

            if (user?.userId) e2eeService.setUserId(user.userId);

            const result = await e2eeService.decrypt(mockMsg);

            if (isMounted) {
                if (result.includes("!!")) {
                    setDecrypted(fallbackText); // Lỗi giải mã
                } else {
                    setDecrypted(result); // Thành công
                }
            }
        };

        decrypt();

        return () => { isMounted = false; };
    }, [content, senderEphemeralKey, initializationVector, user?.userId]);

    return (
        <Text style={style} {...props}>
            {decrypted || "..."}
        </Text>
    );
};

export default DecryptedText;