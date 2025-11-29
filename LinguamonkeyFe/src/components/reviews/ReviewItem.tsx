import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { CourseReviewResponse } from "../../types/dto";
import { getAvatarSource } from "../../utils/avatarUtils";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useCourses } from "../../hooks/useCourses";

interface ReviewItemProps {
    review: CourseReviewResponse;
    onReply: (reviewId: string, authorName: string) => void;
    onLike: (reviewId: string) => void;
    isChild?: boolean;
}

interface LoadRepliesSuccessData {
    data: CourseReviewResponse[];
    pagination: {
        pageNumber: number;
        pageSize: number;
        totalElements: number;
        totalPages: number;
        isLast: boolean;
        isFirst: boolean;
        hasNext: boolean;
        hasPrevious: boolean;
    };
}

const ReviewItem: React.FC<ReviewItemProps> = ({ review, onReply, onLike, isChild = false }) => {
    const [isLiked, setIsLiked] = useState(false);
    const [localLikeCount, setLocalLikeCount] = useState(review.likeCount);

    const [replies, setReplies] = useState<CourseReviewResponse[]>(review.topReplies || []);
    const [repliesPage, setRepliesPage] = useState(0);
    const [totalReplyCount, setTotalReplyCount] = useState(review.replyCount || 0);
    const [hasFetchedInitial, setHasFetchedInitial] = useState(false);

    const { useLoadReplies } = useCourses();
    const { mutate: loadReplies, isPending: isLoadingReplies } = useLoadReplies();

    const displayName = review.userFullname || review.userNickname || "User";
    const timeAgo = review.reviewedAt ? formatDistanceToNow(new Date(review.reviewedAt), { addSuffix: true, locale: vi }) : "";

    useEffect(() => {
        setReplies(review.topReplies || []);
        setTotalReplyCount(review.replyCount || 0);
        setHasFetchedInitial(false);
        setRepliesPage(0);
    }, [review]);

    const handleLike = () => {
        setIsLiked(!isLiked);
        setLocalLikeCount(prev => isLiked ? prev - 1 : prev + 1);
        onLike(review.reviewId);
    };

    const handleLoadMoreReplies = () => {
        const pageToFetch = hasFetchedInitial ? repliesPage + 1 : 0;

        loadReplies({
            reviewId: review.reviewId,
            page: pageToFetch,
            size: 20
        }, {
            onSuccess: (data: LoadRepliesSuccessData) => {
                const newReplies = data.data;
                const pagination = data.pagination;

                if (hasFetchedInitial) {
                    setReplies(prev => [...prev, ...newReplies]);
                    setRepliesPage(prev => prev + 1);
                } else {
                    setReplies(newReplies);
                    setRepliesPage(pagination.pageNumber);
                    setHasFetchedInitial(true);
                }
                setTotalReplyCount(pagination.totalElements);
            },
            onError: () => {
                console.log("Failed to load replies");
            }
        });
    };

    const remainingReplies = totalReplyCount - replies.length;

    return (
        <View style={[styles.container, isChild && styles.childContainer]}>
            <View style={styles.avatarContainer}>
                <Image source={getAvatarSource(review.userAvatar)} style={isChild ? styles.childAvatar : styles.avatar} />
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.bubble}>
                    <Text style={styles.authorName}>{displayName}</Text>
                    <Text style={styles.commentText}>{review.comment}</Text>
                </View>

                <View style={styles.actionRow}>
                    <Text style={styles.timeText}>{timeAgo}</Text>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                        <Text style={[styles.actionText, isLiked && styles.activeText]}>Thích {localLikeCount > 0 && `(${localLikeCount})`}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => onReply(review.reviewId, displayName)}>
                        <Text style={styles.actionText}>Phản hồi</Text>
                    </TouchableOpacity>
                </View>

                {replies.length > 0 && (
                    <View style={styles.repliesContainer}>
                        {replies.map((reply) => (
                            <ReviewItem
                                key={reply.reviewId}
                                review={reply}
                                onReply={onReply}
                                onLike={onLike}
                                isChild={true}
                            />
                        ))}
                    </View>
                )}

                {/* Load More Button */}
                {remainingReplies > 0 && (
                    <TouchableOpacity
                        style={styles.viewMoreBtn}
                        onPress={handleLoadMoreReplies}
                        disabled={isLoadingReplies}
                    >
                        {isLoadingReplies ? (
                            <ActivityIndicator size="small" color="#6B7280" style={{ marginRight: 5 }} />
                        ) : (
                            <Icon name="subdirectory-arrow-right" size={16} color="#6B7280" />
                        )}
                        <Text style={styles.viewMoreText}>
                            {isLoadingReplies ? "Đang tải..." : `Xem thêm ${remainingReplies} phản hồi...`}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flexDirection: "row", marginBottom: 12 },
    childContainer: { marginTop: 10, marginLeft: -12 },

    avatarContainer: { marginRight: 8 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E5E7EB" },
    childAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#E5E7EB" },

    contentContainer: { flex: 1 },
    bubble: {
        backgroundColor: "#F3F4F6",
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignSelf: "flex-start",
    },
    authorName: { fontWeight: "bold", color: "#1F2937", fontSize: 13, marginBottom: 2 },
    commentText: { color: "#374151", fontSize: 14, lineHeight: 20 },

    actionRow: { flexDirection: "row", marginTop: 4, marginLeft: 12, alignItems: "center" },
    timeText: { fontSize: 12, color: "#9CA3AF", marginRight: 12 },
    actionBtn: { marginRight: 16 },
    actionText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
    activeText: { color: "#4F46E5" },

    repliesContainer: { marginTop: 4 },
    viewMoreBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginLeft: 5, paddingVertical: 4 },
    viewMoreText: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginLeft: 4 }
});

export default ReviewItem;