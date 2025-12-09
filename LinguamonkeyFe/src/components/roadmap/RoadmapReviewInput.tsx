import React, { useState, useEffect } from "react";
import { View, TextInput, Image, TouchableOpacity, Text, ActivityIndicator } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import StarRatingInput from "../common/StarRatingInput"; // Assumes you have this from CourseReview
import { getAvatarSource } from "../../utils/avatarUtils";
import { createScaledSheet } from "../../utils/scaledStyles";

interface RoadmapReviewInputProps {
    currentUserAvatar?: string | null;
    isSubmitting: boolean;
    replyContext: { id: string | null; name: string | null; };
    onCancelReply: () => void;
    onSubmit: (text: string, rating: number | null, parentId?: string) => void;
}

const RoadmapReviewInput: React.FC<RoadmapReviewInputProps> = ({
    currentUserAvatar,
    isSubmitting,
    replyContext,
    onCancelReply,
    onSubmit,
}) => {
    const { t } = useTranslation();
    const [text, setText] = useState("");
    const [rating, setRating] = useState(5);
    const isReply = !!replyContext.id;

    useEffect(() => {
        if (isReply) {
            setRating(0);
        } else {
            setRating(5);
        }
    }, [isReply]);

    const handleSubmit = () => {
        if (!text.trim()) return;
        onSubmit(text, isReply ? null : rating, replyContext.id || undefined);
        setText("");
    };

    return (
        <View style={styles.container}>
            {isReply && (
                <View style={styles.replyBanner}>
                    <Text style={styles.replyText}>
                        Replying to <Text style={styles.replyName}>{replyContext.name}</Text>
                    </Text>
                    <TouchableOpacity onPress={onCancelReply}>
                        <Icon name="close" size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>
            )}

            {!isReply && (
                <View style={styles.ratingRow}>
                    <Text style={styles.ratingLabel}>{t("roadmap.rateRoadmap", "Rate this roadmap")}:</Text>
                    <StarRatingInput rating={rating} onRatingChange={setRating} size={28} />
                </View>
            )}

            <View style={styles.inputRow}>
                <Image
                    source={getAvatarSource(currentUserAvatar)}
                    style={styles.avatar}
                />
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.input}
                        placeholder={isReply ? "Write a reply..." : t("reviews.writeReview", "Write your review...")}
                        placeholderTextColor="#9CA3AF"
                        multiline
                        value={text}
                        onChangeText={setText}
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
                            <Text style={styles.submitText}>{t("common.send", "Send")}</Text>
                            <Icon name="send" size={16} color="#FFF" style={{ marginLeft: 4 }} />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = createScaledSheet({
    container: { padding: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB", backgroundColor: "#FFF" },
    replyBanner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F3F4F6", padding: 8, borderRadius: 8, marginBottom: 12 },
    replyText: { fontSize: 13, color: "#4B5563" },
    replyName: { fontWeight: "bold", color: "#3B82F6" },
    ratingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 12, gap: 8 },
    ratingLabel: { fontSize: 14, color: "#6B7280", fontWeight: '600' },
    inputRow: { flexDirection: "row", gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E5E7EB" },
    inputWrapper: { flex: 1, backgroundColor: "#F9FAFB", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 12, paddingVertical: 8 },
    input: { fontSize: 14, color: "#1F2937", minHeight: 40, textAlignVertical: "top" },
    actionRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
    submitBtn: { flexDirection: "row", backgroundColor: "#3B82F6", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    disabledBtn: { backgroundColor: "#9CA3AF" },
    submitText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
});

export default RoadmapReviewInput;