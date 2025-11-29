// src/components/reviews/ReviewInput.tsx
import React, { useState, useRef, useEffect } from "react";
import { View, TextInput, TouchableOpacity, Image, StyleSheet, Text, ActivityIndicator, Keyboard } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { getAvatarSource } from "../../utils/avatarUtils";

interface ReviewInputProps {
    currentUserAvatar?: string;
    isSubmitting: boolean;
    replyContext: { id: string | null; name: string | null };
    onCancelReply: () => void;
    onSubmit: (text: string, parentId?: string) => void;
}

const ReviewInput: React.FC<ReviewInputProps> = ({
    currentUserAvatar,
    isSubmitting,
    replyContext,
    onCancelReply,
    onSubmit
}) => {
    const [text, setText] = useState("");
    const inputRef = useRef<TextInput>(null);

    // Auto focus khi bấm Reply ở item
    useEffect(() => {
        if (replyContext.id && inputRef.current) {
            inputRef.current.focus();
        }
    }, [replyContext]);

    const handleSubmit = () => {
        if (!text.trim()) return;
        onSubmit(text, replyContext.id || undefined);
        setText("");
        Keyboard.dismiss();
    };

    return (
        <View style={styles.container}>
            {replyContext.name && (
                <View style={styles.replyContextBar}>
                    <Text style={styles.replyText}>Đang phản hồi <Text style={styles.replyName}>{replyContext.name}</Text></Text>
                    <TouchableOpacity onPress={onCancelReply}>
                        <Icon name="close" size={18} color="#6B7280" />
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.inputRow}>
                <Image source={getAvatarSource(currentUserAvatar)} style={styles.avatar} />
                <View style={styles.inputWrapper}>
                    <TextInput
                        ref={inputRef}
                        style={styles.input}
                        placeholder={replyContext.id ? "Viết câu trả lời..." : "Viết đánh giá của bạn..."}
                        placeholderTextColor="#9CA3AF"
                        multiline
                        value={text}
                        onChangeText={setText}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, (!text.trim() || isSubmitting) && styles.disabledBtn]}
                        onPress={handleSubmit}
                        disabled={!text.trim() || isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Icon name="send" size={18} color="#FFF" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#FFF",
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        padding: 12,
    },
    replyContextBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
        padding: 8,
        borderRadius: 8,
        marginBottom: 8,
    },
    replyText: { fontSize: 12, color: "#6B7280" },
    replyName: { fontWeight: "bold", color: "#4F46E5" },

    inputRow: { flexDirection: "row", alignItems: "flex-end" },
    avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10, marginBottom: 2 },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: "#F3F4F6",
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8, // Fixed padding
        alignItems: 'center'
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: "#1F2937",
        maxHeight: 80, // Limit height
        paddingTop: 0,
        paddingBottom: 0,
    },
    sendBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#4F46E5",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
    },
    disabledBtn: { backgroundColor: "#D1D5DB" },
});

export default ReviewInput;