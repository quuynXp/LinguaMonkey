import React, { useState, useEffect, useRef } from "react";
import {
    View,
    TextInput,
    Image,
    TouchableOpacity,
    Text,
    ActivityIndicator,
    StyleSheet,
    Alert,
    Keyboard
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import StarRatingInput from "../common/StarRatingInput";
import { getAvatarSource } from "../../utils/avatarUtils";

interface ReviewInputProps {
    currentUserAvatar?: string | null;
    isSubmitting: boolean;
    replyContext: {
        id: string | null;
        name: string | null;
    };
    onCancelReply: () => void;
    onSubmit: (text: string, rating: number | null, parentId?: string) => void;
}

const ReviewInput: React.FC<ReviewInputProps> = ({
    currentUserAvatar,
    isSubmitting,
    replyContext,
    onCancelReply,
    onSubmit,
}) => {
    const { t } = useTranslation();
    const [text, setText] = useState("");
    const [rating, setRating] = useState(5);
    const inputRef = useRef<TextInput>(null);

    const isReply = !!replyContext.id;

    useEffect(() => {
        if (replyContext.id && replyContext.name) {
            setText(`${replyContext.name}: `);
            setRating(0);
            inputRef.current?.focus();
        } else {
            setText("");
            setRating(5);
            Keyboard.dismiss();
        }
    }, [replyContext.id, replyContext.name]);

    const handleSubmit = () => {
        if (!text.trim()) {
            Alert.alert(t("error"), t("review.emptyContent"));
            return;
        }

        if (!isReply && rating <= 0) {
            Alert.alert(t("error"), t("review.noRatingSelected"));
            return;
        }

        // LƯU Ý: Nếu là Reply, gửi rating là NULL hoặc UNDEFINED, KHÔNG GỬI 0.
        // Backend DTO phải bỏ @Min(1)
        const finalRating = isReply ? null : rating;

        onSubmit(text, finalRating, replyContext.id || undefined);

        setText("");
        setRating(5);
    };

    return (
        <View style={styles.container}>
            {isReply && (
                <View style={styles.replyBanner}>
                    <Text style={styles.replyText}>
                        Đang phản hồi <Text style={styles.replyName}>{replyContext.name}</Text>
                    </Text>
                    <TouchableOpacity onPress={onCancelReply}>
                        <Icon name="close" size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Chỉ hiện input Rating khi KHÔNG phải là reply */}
            {!isReply && (
                <View style={styles.ratingRow}>
                    <Text style={styles.ratingLabel}>{t("reviews.rateThisCourse", { defaultValue: "Đánh giá khóa học" })}:</Text>
                    <StarRatingInput rating={rating} onRatingChange={setRating} size={28} />
                </View>
            )}

            <View style={styles.inputRow}>
                <Image
                    source={getAvatarSource(currentUserAvatar, "MALE")}
                    style={styles.avatar}
                />
                <View style={styles.inputWrapper}>
                    <TextInput
                        ref={inputRef}
                        style={styles.input}
                        placeholder={isReply ? "Nhập phản hồi..." : t("reviews.writeReview", { defaultValue: "Viết đánh giá của bạn..." })}
                        placeholderTextColor="#9CA3AF"
                        multiline
                        value={text}
                        onChangeText={setText}
                        maxLength={500}
                        editable={!isSubmitting}
                    />
                </View>
            </View>

            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={[styles.submitBtn, (!text.trim() || isSubmitting) && styles.disabledBtn]}
                    onPress={handleSubmit}
                    disabled={!text.trim() || isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <>
                            <Text style={styles.submitText}>{t("common.send", { defaultValue: "Gửi" })}</Text>
                            <Icon name="send" size={16} color="#FFF" style={{ marginLeft: 4 }} />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        backgroundColor: "#FFF",
    },
    replyBanner: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
        padding: 8,
        borderRadius: 8,
        marginBottom: 12,
    },
    replyText: { fontSize: 13, color: "#4B5563" },
    replyName: { fontWeight: "bold", color: "#4F46E5" },
    ratingRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
        gap: 8,
    },
    ratingLabel: { fontSize: 14, color: "#6B7280", fontWeight: '600' },
    inputRow: { flexDirection: "row", gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E5E7EB" },
    inputWrapper: {
        flex: 1,
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    input: { fontSize: 14, color: "#1F2937", minHeight: 40, textAlignVertical: "top" },
    actionRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
    submitBtn: {
        flexDirection: "row",
        backgroundColor: "#4F46E5",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    disabledBtn: { backgroundColor: "#9CA3AF" },
    submitText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
});

export default ReviewInput;