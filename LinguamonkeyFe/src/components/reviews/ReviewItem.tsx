import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { CourseVersionReviewResponse } from "../../types/dto";
import { getAvatarSource } from "../../utils/avatarUtils";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useCourses } from "../../hooks/useCourses";
import { useUserStore } from "../../stores/UserStore";
import StaticStarRating from "../common/StaticStarRating";

interface ReviewItemProps {
    review: CourseVersionReviewResponse;
    onReply: (reviewId: string, authorName: string, onSuccess: (newReply: CourseVersionReviewResponse) => void) => void;
    depth?: number;
}

const ReviewItem: React.FC<ReviewItemProps> = ({ review, onReply, depth = 0 }) => {
    const { user } = useUserStore();

    // Logic level: 
    // depth 0: Root (Rating)
    // depth 1: Level 2 (Reply trực tiếp)
    // depth 2+: Level 3 (Reply con) - Hiển thị thẳng xuống
    const isRoot = depth === 0;

    // Logic hiển thị replies:
    // Nếu là Root: Mặc định ẩn, chờ user bấm "Xem phản hồi".
    // Nếu là Level 2 trở đi: LUÔN LUÔN hiện replies con (nếu có data) để tạo luồng chat liền mạch.
    const [showReplies, setShowReplies] = useState(!isRoot);

    const [isLiked, setIsLiked] = useState(review.isLiked || false);
    const [isDisliked, setIsDisliked] = useState(review.isDisliked || false);
    const [localLikeCount, setLocalLikeCount] = useState(review.likeCount || 0);
    const [localDislikeCount, setLocalDislikeCount] = useState(review.dislikeCount || 0);

    // Dữ liệu replies
    const [replies, setReplies] = useState<CourseVersionReviewResponse[]>(review.topReplies || []);
    const [repliesPage, setRepliesPage] = useState(0);
    const [totalReplyCount, setTotalReplyCount] = useState(review.replyCount || 0);
    const [hasFetchedInitial, setHasFetchedInitial] = useState(false);

    const { useLoadReplies, useLikeReview, useUnlikeReview, useDislikeReview, useUndislikeReview } = useCourses();
    const { mutate: loadReplies, isPending: isLoadingReplies } = useLoadReplies();
    const { mutate: likeReview } = useLikeReview();
    const { mutate: unlikeReview } = useUnlikeReview();
    const { mutate: dislikeReview } = useDislikeReview();
    const { mutate: undislikeReview } = useUndislikeReview();

    const displayName = review.userFullname || review.userNickname || "User";
    const timeAgo = review.reviewedAt ? formatDistanceToNow(new Date(review.reviewedAt), { addSuffix: true, locale: vi }) : "";

    // Cập nhật state khi props thay đổi (quan trọng để load data Level 3 từ backend)
    useEffect(() => {
        if (review.topReplies && review.topReplies.length > 0) {
            // Nếu backend trả về topReplies (đã fix ở bước 1), set nó vào state
            setReplies(review.topReplies);
        }
        setTotalReplyCount(review.replyCount || 0);
        setLocalLikeCount(review.likeCount || 0);
        setLocalDislikeCount(review.dislikeCount || 0);
        setIsLiked(review.isLiked || false);
        setIsDisliked(review.isDisliked || false);
    }, [review]);

    // ... (Giữ nguyên các hàm handleLike, handleDislike, handleReplyClick như cũ) ...
    const handleLike = () => {
        if (!user) return;
        if (isLiked) {
            setIsLiked(false);
            setLocalLikeCount(prev => Math.max(0, prev - 1));
            unlikeReview({ reviewId: review.reviewId, userId: user.userId });
        } else {
            setIsLiked(true);
            setLocalLikeCount(prev => prev + 1);
            likeReview({ reviewId: review.reviewId, userId: user.userId });
            if (isDisliked) {
                setIsDisliked(false);
                setLocalDislikeCount(prev => Math.max(0, prev - 1));
                undislikeReview({ reviewId: review.reviewId, userId: user.userId });
            }
        }
    };

    const handleDislike = () => {
        if (!user) return;
        if (isDisliked) {
            setIsDisliked(false);
            setLocalDislikeCount(prev => Math.max(0, prev - 1));
            undislikeReview({ reviewId: review.reviewId, userId: user.userId });
        } else {
            setIsDisliked(true);
            setLocalDislikeCount(prev => prev + 1);
            dislikeReview({ reviewId: review.reviewId, userId: user.userId });
            if (isLiked) {
                setIsLiked(false);
                setLocalLikeCount(prev => Math.max(0, prev - 1));
                unlikeReview({ reviewId: review.reviewId, userId: user.userId });
            }
        }
    };

    const handleReplyClick = () => {
        onReply(review.reviewId, displayName, (newReply) => {
            if (!showReplies) setShowReplies(true);
            setReplies(prev => [...prev, newReply]);
            setTotalReplyCount(prev => prev + 1);
        });
    };
    // ... (Kết thúc phần logic giữ nguyên) ...

    const handleLoadMoreReplies = () => {
        const pageToFetch = hasFetchedInitial ? repliesPage + 1 : 0;
        loadReplies({
            reviewId: review.reviewId,
            page: pageToFetch,
            size: 10 // Load thêm 10 reply
        }, {
            onSuccess: (data: any) => {
                const newReplies = data.data;
                const pagination = data.pagination;

                if (hasFetchedInitial) {
                    const existingIds = new Set(replies.map(r => r.reviewId));
                    const uniqueNewReplies = newReplies.filter((r: CourseVersionReviewResponse) => !existingIds.has(r.reviewId));
                    setReplies(prev => [...prev, ...uniqueNewReplies]);
                    setRepliesPage(prev => prev + 1);
                } else {
                    // Lần đầu load full list (nếu trước đó chỉ là preview)
                    setReplies(newReplies);
                    setRepliesPage(pagination.pageNumber);
                    setHasFetchedInitial(true);
                }
                setTotalReplyCount(pagination.totalElements);
                if (!showReplies) setShowReplies(true);
            }
        });
    };

    const toggleShowReplies = () => {
        if (!showReplies && replies.length === 0 && totalReplyCount > 0) {
            handleLoadMoreReplies();
        } else {
            setShowReplies(!showReplies);
        }
    };

    const renderCommentContent = (text: string) => {
        // Highlight tên người được reply ở Level 3+
        if (depth >= 1) {
            const separatorIndex = text.indexOf(':');
            if (separatorIndex > 0 && separatorIndex < 30) {
                const namePart = text.substring(0, separatorIndex + 1);
                const contentPart = text.substring(separatorIndex + 1);
                return (
                    <Text style={styles.commentText}>
                        <Text style={styles.boldName}>{namePart}</Text>
                        {contentPart}
                    </Text>
                );
            }
        }
        return <Text style={styles.commentText}>{text}</Text>;
    };

    const remainingReplies = totalReplyCount - replies.length;

    // LOGIC UI QUAN TRỌNG:
    // nextDepth luôn tăng để logic đệ quy hoạt động
    const nextDepth = depth + 1;

    // shouldIndent: Chỉ thụt lề khi từ Root -> Level 2. 
    // Từ Level 2 -> Level 3 trở đi thì KHÔNG thụt nữa (style margin 0).
    const shouldIndent = depth === 0;

    const shouldRenderReplies = isRoot ? showReplies : true;

    return (
        // Style container điều chỉnh margin dựa trên depth
        <View style={[
            styles.container,
            !shouldIndent && styles.flatContainer // Level 3+ sẽ dùng style này
        ]}>
            <View style={styles.avatarContainer}>
                {/* Avatar nhỏ hơn cho các cấp reply */}
                <Image source={getAvatarSource(review.userAvatar)} style={depth > 0 ? styles.childAvatar : styles.avatar} />
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.bubble}>
                    <View style={styles.authorHeader}>
                        <Text style={styles.authorName}>{displayName}</Text>
                        {isRoot && review.rating && <StaticStarRating rating={review.rating} size={12} />}
                    </View>
                    {renderCommentContent(review.comment)}
                </View>

                <View style={styles.actionRow}>
                    <Text style={styles.timeText}>{timeAgo}</Text>

                    <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                        <Icon name={isLiked ? "thumb-up" : "thumb-up-off-alt"} size={14} color={isLiked ? "#4F46E5" : "#6B7280"} />
                        {localLikeCount > 0 && <Text style={[styles.actionText, isLiked && styles.activeText]}>{localLikeCount}</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={handleDislike}>
                        <Icon name={isDisliked ? "thumb-down" : "thumb-down-off-alt"} size={14} color={isDisliked ? "#EF4444" : "#6B7280"} />
                        {localDislikeCount > 0 && <Text style={[styles.actionText, isDisliked && styles.activeDislikeText]}>{localDislikeCount}</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={handleReplyClick}>
                        <Text style={styles.replyTextLabel}>Phản hồi</Text>
                    </TouchableOpacity>
                </View>

                {/* Nút Xem Phản Hồi - CHỈ HIỆN Ở LEVEL 1 (Root) */}
                {isRoot && totalReplyCount > 0 && (
                    <TouchableOpacity style={styles.showReplyBtn} onPress={toggleShowReplies}>
                        <View style={styles.line} />
                        <Text style={styles.showReplyText}>
                            {showReplies ? "Ẩn phản hồi" : `Xem ${totalReplyCount} phản hồi`}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Khu vực hiển thị Replies con */}
                {shouldRenderReplies && (
                    <View style={styles.repliesWrapper}>
                        {replies.map((reply) => (
                            <ReviewItem
                                key={reply.reviewId}
                                review={reply}
                                onReply={onReply}
                                depth={nextDepth} // Đệ quy tăng depth
                            />
                        ))}

                        {/* Nút xem thêm reply con (cho Level 2 trở đi) */}
                        {remainingReplies > 0 && (
                            <TouchableOpacity
                                style={styles.viewMoreBtn}
                                onPress={handleLoadMoreReplies}
                                disabled={isLoadingReplies}
                            >
                                {isLoadingReplies ? (
                                    <ActivityIndicator size="small" color="#6B7280" />
                                ) : (
                                    <Text style={styles.viewMoreText}>
                                        Xem thêm {remainingReplies} bình luận khác...
                                    </Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flexDirection: "row", marginBottom: 12 },

    // flatContainer: Dùng cho Level 3 trở đi. 
    // marginTop nhỏ để các reply sát nhau.
    // KHÔNG có marginLeft để nó thẳng hàng với cha nó (Level 2).
    flatContainer: {
        marginTop: 8,
        marginLeft: 0
    },

    avatarContainer: { marginRight: 8 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E5E7EB" },
    childAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#E5E7EB" }, // Avatar reply nhỏ hơn

    contentContainer: { flex: 1 },
    bubble: {
        backgroundColor: "#F3F4F6",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignSelf: "flex-start",
        maxWidth: '98%'
    },
    authorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, gap: 6 },
    authorName: { fontWeight: "bold", color: "#1F2937", fontSize: 13 },
    boldName: { fontWeight: "bold", color: "#111827" },
    commentText: { color: "#374151", fontSize: 14, lineHeight: 20 },

    actionRow: { flexDirection: "row", marginTop: 4, alignItems: "center", gap: 16 },
    timeText: { fontSize: 12, color: "#9CA3AF" },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }, // Tăng vùng bấm
    actionText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
    replyTextLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
    activeText: { color: "#4F46E5" },
    activeDislikeText: { color: "#EF4444" },

    showReplyBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    line: { width: 24, height: 1, backgroundColor: '#D1D5DB', marginRight: 8 },
    showReplyText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },

    repliesWrapper: {
        marginTop: 4,
    },

    viewMoreBtn: { marginTop: 8, paddingVertical: 4 },
    viewMoreText: { fontSize: 13, color: '#4F46E5', fontWeight: '600' }
});

export default ReviewItem;