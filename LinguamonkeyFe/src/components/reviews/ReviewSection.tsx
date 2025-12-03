import React, { useState } from "react";
import { View, FlatList, Text, StyleSheet, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import ReviewItem from "./ReviewItem";
import ReviewInput from "./ReviewInput";
import { CourseVersionReviewResponse } from "../../types/dto";
import { useUserStore } from "../../stores/UserStore";
import { useTranslation } from "react-i18next";
import { createScaledSheet } from "../../utils/scaledStyles";

interface ReviewSectionProps {
    entityId: string;
    reviews: CourseVersionReviewResponse[];
    onAddReview: (content: string, rating: number | null, parentId?: string, onSuccess?: (newReview: CourseVersionReviewResponse) => void) => void;
    isAddingReview: boolean;
    onLikeReview?: (reviewId: string) => void;
    canReview?: boolean; // New prop for permission
}

const ReviewSection: React.FC<ReviewSectionProps> = ({
    reviews,
    onAddReview,
    isAddingReview,
    canReview = true
}) => {
    const { user } = useUserStore();
    const { t } = useTranslation();

    // State để ẩn/hiện toàn bộ phần review (Mặc định là false theo yêu cầu)
    const [isSectionVisible, setIsSectionVisible] = useState(false);

    const [replyContext, setReplyContext] = useState<{
        id: string | null;
        name: string | null;
        onSuccessCallback?: (newReview: CourseVersionReviewResponse) => void;
    }>({
        id: null,
        name: null,
        onSuccessCallback: undefined
    });

    const handleInitiateReply = (reviewId: string, authorName: string, onSuccess?: (newReview: CourseVersionReviewResponse) => void) => {
        setReplyContext({ id: reviewId, name: authorName, onSuccessCallback: onSuccess });
    };

    const handleCancelReply = () => {
        setReplyContext({ id: null, name: null, onSuccessCallback: undefined });
    };

    const handleSubmit = (text: string, rating: number | null, parentId?: string) => {
        onAddReview(text, rating, parentId, replyContext.onSuccessCallback);
        handleCancelReply();
    };

    return (
        <View style={styles.container}>
            {/* Header luôn hiển thị để bấm mở rộng */}
            <TouchableOpacity
                style={styles.header}
                onPress={() => setIsSectionVisible(!isSectionVisible)}
                activeOpacity={0.7}
            >
                <Text style={styles.title}>{t("reviews.title", "Đánh giá & Bình luận")}</Text>
                <View style={styles.headerRight}>
                    <Text style={styles.countText}>{reviews.length} đánh giá</Text>
                    <Icon
                        name={isSectionVisible ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                        size={24}
                        color="#6B7280"
                    />
                </View>
            </TouchableOpacity>

            {/* Nội dung Review chỉ hiện khi isSectionVisible = true */}
            {isSectionVisible && (
                <View style={styles.contentBody}>
                    <FlatList
                        data={reviews}
                        keyExtractor={(item) => item.reviewId}
                        renderItem={({ item }) => (
                            <ReviewItem
                                review={item}
                                onReply={handleInitiateReply}
                            />
                        )}
                        scrollEnabled={false}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>{t("reviews.empty", "Chưa có bình luận nào. Hãy là người đầu tiên!")}</Text>
                        }
                    />

                    {/* Conditional Rendering based on Permission */}
                    {user && canReview ? (
                        <ReviewInput
                            currentUserAvatar={user.avatarUrl}
                            isSubmitting={isAddingReview}
                            replyContext={replyContext}
                            onCancelReply={handleCancelReply}
                            onSubmit={handleSubmit}
                        />
                    ) : (
                        user && !canReview && (
                            <View style={styles.restrictionContainer}>
                                <Icon name="lock" size={20} color="#9CA3AF" />
                                <Text style={styles.restrictionText}>
                                    {t("course.purchaseToReview", "Bạn cần hoàn thành ít nhất 50% khóa học để viết đánh giá.")}
                                </Text>
                            </View>
                        )
                    )}
                </View>
            )}
        </View>
    );
};

const styles = createScaledSheet({
    container: {
        backgroundColor: "#FFF",
        marginTop: 10,
        borderRadius: 12,
        overflow: 'hidden' // Bo góc đẹp hơn
    },
    header: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        backgroundColor: '#F9FAFB'
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    title: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#1F2937",
    },
    countText: {
        fontSize: 13,
        color: "#6B7280"
    },
    contentBody: {
        paddingBottom: 16
    },
    emptyText: {
        padding: 20,
        textAlign: 'center',
        color: '#9CA3AF',
        fontStyle: 'italic'
    },
    restrictionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: '#F3F4F6',
        marginTop: 10,
        marginHorizontal: 16,
        borderRadius: 8,
        gap: 8
    },
    restrictionText: {
        color: '#6B7280',
        fontSize: 13,
        textAlign: 'center'
    }
});

export default ReviewSection;