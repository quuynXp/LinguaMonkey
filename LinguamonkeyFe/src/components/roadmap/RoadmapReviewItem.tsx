import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { getAvatarSource } from "../../utils/avatarUtils";
import { formatDistanceToNow } from "date-fns";
import StaticStarRating from "../common/StaticStarRating";
import { createScaledSheet } from "../../utils/scaledStyles";

interface RoadmapReviewItemProps {
    review: any; // Using any or interface matching RoadmapReviewResponse
    onReply: (reviewId: string, authorName: string) => void;
    depth?: number;
}

const RoadmapReviewItem: React.FC<RoadmapReviewItemProps> = ({ review, onReply, depth = 0 }) => {
    const isRoot = depth === 0;
    const [showReplies, setShowReplies] = useState(false);

    const replies = review.replies || [];
    const displayName = review.userFullname || "User";
    const timeAgo = review.createdAt ? formatDistanceToNow(new Date(review.createdAt), { addSuffix: true }) : "";

    const handleReplyClick = () => {
        onReply(review.reviewId || review.id, displayName);
    };

    return (
        <View style={[styles.container, depth > 0 && styles.indentedContainer]}>
            <View style={styles.avatarContainer}>
                <Image
                    source={getAvatarSource(review.userAvatar)}
                    style={depth > 0 ? styles.childAvatar : styles.avatar}
                />
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.bubble}>
                    <View style={styles.authorHeader}>
                        <Text style={styles.authorName}>{displayName}</Text>
                        {isRoot && review.rating > 0 && <StaticStarRating rating={review.rating} size={12} />}
                    </View>
                    <Text style={styles.commentText}>{review.comment || review.content}</Text>
                </View>

                <View style={styles.actionRow}>
                    <Text style={styles.timeText}>{timeAgo}</Text>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleReplyClick}>
                        <Text style={styles.replyTextLabel}>Reply</Text>
                    </TouchableOpacity>
                </View>

                {replies.length > 0 && (
                    <View>
                        {!showReplies ? (
                            <TouchableOpacity style={styles.showReplyBtn} onPress={() => setShowReplies(true)}>
                                <View style={styles.line} />
                                <Text style={styles.showReplyText}>View {replies.length} replies</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.repliesWrapper}>
                                {replies.map((reply: any) => (
                                    <RoadmapReviewItem
                                        key={reply.id || reply.reviewId}
                                        review={reply}
                                        onReply={onReply}
                                        depth={depth + 1}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = createScaledSheet({
    container: { flexDirection: "row", marginBottom: 12, paddingHorizontal: 16 },
    indentedContainer: { marginTop: 8 },
    avatarContainer: { marginRight: 8 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E5E7EB" },
    childAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#E5E7EB" },
    contentContainer: { flex: 1 },
    bubble: {
        backgroundColor: "#F3F4F6",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignSelf: "flex-start",
        maxWidth: '100%'
    },
    authorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, gap: 6 },
    authorName: { fontWeight: "bold", color: "#1F2937", fontSize: 13 },
    commentText: { color: "#374151", fontSize: 14, lineHeight: 20 },
    actionRow: { flexDirection: "row", marginTop: 4, alignItems: "center", gap: 16 },
    timeText: { fontSize: 12, color: "#9CA3AF" },
    actionBtn: { paddingVertical: 4 },
    replyTextLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
    showReplyBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    line: { width: 24, height: 1, backgroundColor: '#D1D5DB', marginRight: 8 },
    showReplyText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    repliesWrapper: { marginTop: 4 },
});

export default RoadmapReviewItem;