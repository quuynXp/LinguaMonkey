import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useChatStore } from '../../stores/ChatStore';
import { createScaledSheet } from '../../utils/scaledStyles';

interface ChatBubbleTriggerProps {
    roomId: string;
    buttonText?: string;
    style?: ViewStyle;
    textStyle?: TextStyle;
    iconColor?: string;
}

const ChatBubbleTrigger: React.FC<ChatBubbleTriggerProps> = ({
    roomId,
    buttonText = "Open Chat Bubble",
    style,
    textStyle,
    iconColor = "#FFFFFF"
}) => {
    const openBubble = useChatStore(s => s.openBubble);

    const handlePress = () => {
        openBubble(roomId);
    };

    return (
        <TouchableOpacity
            style={[styles.button, style]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <Icon name="chat-bubble" size={20} color={iconColor} style={styles.icon} />
            <Text style={[styles.text, textStyle]}>{buttonText}</Text>
        </TouchableOpacity>
    );
};

const styles = createScaledSheet({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3B82F6',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    icon: {
        marginRight: 8,
    },
    text: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
});

export default ChatBubbleTrigger;