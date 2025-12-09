import React, { useState } from "react";
import { View, FlatList, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import RoadmapReviewItem from "./RoadmapReviewItem";
import RoadmapReviewInput from "./RoadmapReviewInput";
import { useUserStore } from "../../stores/UserStore";
import { useTranslation } from "react-i18next";
import { createScaledSheet } from "../../utils/scaledStyles";
import { useRoadmap } from "../../hooks/useRoadmap";

interface RoadmapReviewSectionProps {
    roadmapId: string;
}

const RoadmapReviewSection: React.FC<RoadmapReviewSectionProps> = ({ roadmapId }) => {
    const { user } = useUserStore();
    const { t } = useTranslation();
    const [isSectionVisible, setIsSectionVisible] = useState(true);

    // Hook logic
    const { useRoadmapReviews, useAddRoadmapReview } = useRoadmap();
    const { data: reviews, isLoading, refetch } = useRoadmapReviews(roadmapId);
    const addReviewMut = useAddRoadmapReview();

    const [replyContext, setReplyContext] = useState<{
        id: string | null;
        name: string | null;
    }>({ id: null, name: null });

    const handleInitiateReply = (reviewId: string, authorName: string) => {
        setReplyContext({ id: reviewId, name: authorName });
    };

    const handleCancelReply = () => {
        setReplyContext({ id: null, name: null });
    };

    const handleSubmit = async (text: string, rating: number | null, parentId?: string) => {
        try {
            await addReviewMut.mutateAsync({
                roadmapId,
                comment: text,
                rating: rating,
                parentId: parentId
            });
            handleCancelReply();
            refetch(); // Refresh list after add
        } catch (error) {
            console.error("Failed to post review", error);
        }
    };

    if (isLoading) return <ActivityIndicator size="small" color="#3B82F6" style={{ margin: 20 }} />;

    const reviewList = reviews || [];

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.header}
                onPress={() => setIsSectionVisible(!isSectionVisible)}
                activeOpacity={0.7}
            >
                <Text style={styles.title}>{t("reviews.title", "Roadmap Reviews")}</Text>
                <View style={styles.headerRight}>
                    <Text style={styles.countText}>{reviewList.length} {t("common.reviews")}</Text>
                    <Icon
                        name={isSectionVisible ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                        size={24}
                        color="#6B7280"
                    />
                </View>
            </TouchableOpacity>

            {isSectionVisible && (
                <View style={styles.contentBody}>
                    <FlatList
                        data={reviewList}
                        keyExtractor={(item) => item.reviewId || item.id}
                        renderItem={({ item }) => (
                            <RoadmapReviewItem
                                review={item}
                                onReply={handleInitiateReply}
                            />
                        )}
                        scrollEnabled={false}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>{t("reviews.empty", "No reviews yet. Be the first!")}</Text>
                        }
                    />

                    {user && (
                        <RoadmapReviewInput
                            currentUserAvatar={user.avatarUrl}
                            isSubmitting={addReviewMut.isPending}
                            replyContext={replyContext}
                            onCancelReply={handleCancelReply}
                            onSubmit={handleSubmit}
                        />
                    )}
                </View>
            )}
        </View>
    );
};

const styles = createScaledSheet({
    container: {
        backgroundColor: "#FFF",
        marginTop: 16,
        marginHorizontal: 20,
        borderRadius: 12,
        marginBottom: 40,
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 }
    },
    header: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        backgroundColor: '#F9FAFB',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
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
    }
});

export default RoadmapReviewSection;