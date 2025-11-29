import React, { useState } from "react";
import { View, FlatList, Text, StyleSheet } from "react-native";
import ReviewItem from "./ReviewItem";
import ReviewInput from "./ReviewInput";
import { CourseReviewResponse } from "../../types/dto";
import { useUserStore } from "../../stores/UserStore";
import { useTranslation } from "react-i18next";

interface ReviewSectionProps {
    entityId: string;
    reviews: CourseReviewResponse[];
    onAddReview: (content: string, parentId?: string) => void;
    isAddingReview: boolean;
    onLikeReview?: (reviewId: string) => void;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({
    reviews,
    onAddReview,
    isAddingReview,
    onLikeReview
}) => {
    const { user } = useUserStore();
    const { t } = useTranslation();

    const [replyContext, setReplyContext] = useState<{ id: string | null; name: string | null }>({
        id: null,
        name: null
    });

    const handleInitiateReply = (reviewId: string, authorName: string) => {
        setReplyContext({ id: reviewId, name: authorName });
    };

    const handleCancelReply = () => {
        setReplyContext({ id: null, name: null });
    };

    const handleSubmit = (text: string, parentId?: string) => {
        onAddReview(text, parentId);
        handleCancelReply();
    };

    const handleLike = (reviewId: string) => {
        if (onLikeReview) onLikeReview(reviewId);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t("reviews.title", "Đánh giá & Bình luận")}</Text>
            </View>

            <FlatList
                data={reviews}
                keyExtractor={(item) => item.reviewId}
                renderItem={({ item }) => (
                    <ReviewItem
                        review={item}
                        onReply={handleInitiateReply}
                        onLike={handleLike}
                    />
                )}
                scrollEnabled={false}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>{t("reviews.empty", "Chưa có bình luận nào.")}</Text>
                }
            />

            {user && (
                <ReviewInput
                    currentUserAvatar={user.avatarUrl}
                    isSubmitting={isAddingReview}
                    replyContext={replyContext}
                    onCancelReply={handleCancelReply}
                    onSubmit={handleSubmit}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#FFF",
        marginTop: 10,
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    title: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#1F2937",
    },
    emptyText: {
        padding: 20,
        textAlign: 'center',
        color: '#9CA3AF',
        fontStyle: 'italic'
    }
});

export default ReviewSection;