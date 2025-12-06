import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    LayoutAnimation,
    Platform,
    UIManager,
    TextInput,
    ActivityIndicator,
    Linking
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useVideoPlayer, VideoView } from 'expo-video';
import { createScaledSheet } from "../../utils/scaledStyles";
import type { RoadmapItemUserResponse, RoadmapSuggestionResponse } from "../../types/dto";
import { useUserStore } from "../../stores/UserStore";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface RoadmapTimelineItemProps {
    item: RoadmapItemUserResponse & {
        level?: number;
        expReward?: number;
        resources?: Array<{ title: string; url: string; type: string }>;
    };
    suggestions: RoadmapSuggestionResponse[];
    index: number;
    isLast: boolean;
    isExpanded: boolean;
    onToggle: () => void;
    onComplete?: (itemId: string) => Promise<void>;
    onAddSuggestion?: (itemId: string, text: string) => Promise<void>;
    isOwner?: boolean;
}

const ResourceViewer = ({ resource }: { resource: { title: string; url: string; type: string } }) => {
    const isVideo = resource.type.includes('video') || resource.url.endsWith('.mp4');
    const isImage = resource.type.includes('image') || resource.url.match(/\.(jpeg|jpg|gif|png)$/) != null;

    const player = useVideoPlayer(isVideo ? resource.url : "", (player) => {
        player.loop = false;
    });

    if (isVideo) {
        return (
            <View style={styles.resourceContainer}>
                <Text style={styles.resourceHeader}>{resource.title || "Video Resource"}</Text>
                <View style={styles.videoWrapper}>
                    <VideoView player={player} style={styles.video} contentFit="contain" />
                    <TouchableOpacity style={styles.replayBtn} onPress={() => player.replay()}>
                        <Icon name="replay" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (isImage) {
        return (
            <View style={styles.resourceContainer}>
                <Text style={styles.resourceHeader}>{resource.title || "Image Resource"}</Text>
                <Image
                    source={{ uri: resource.url }}
                    style={styles.image}
                    resizeMode="contain"
                />
            </View>
        );
    }

    return (
        <TouchableOpacity style={styles.linkButton} onPress={() => Linking.openURL(resource.url)}>
            <View style={styles.linkIconBg}>
                <Icon name="link" size={20} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle} numberOfLines={1}>{resource.title || "External Resource"}</Text>
                <Text style={styles.linkUrl} numberOfLines={1}>{resource.url}</Text>
            </View>
            <Icon name="open-in-new" size={18} color="#9CA3AF" />
        </TouchableOpacity>
    );
};

const RoadmapTimelineItem: React.FC<RoadmapTimelineItemProps> = ({
    item,
    suggestions,
    isLast,
    isExpanded,
    onToggle,
    onComplete,
    onAddSuggestion,
    isOwner = false,
}) => {
    const { user } = useUserStore();
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [reviewText, setReviewText] = useState("");

    const handleToggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onToggle();
    };

    const handleComplete = async () => {
        if (!onComplete || isCompleting) return;
        setIsCompleting(true);
        try {
            await onComplete(item.id);
        } catch (error) {
            console.error("Failed to complete item", error);
        } finally {
            setIsCompleting(false);
        }
    };

    const handleSubmitSuggestion = async () => {
        if (!reviewText.trim() || !onAddSuggestion) return;
        setIsSubmittingReview(true);
        try {
            await onAddSuggestion(item.id, reviewText);
            setReviewText("");
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const statusColor = item.completed ? "#10B981" : item.status === "in_progress" ? "#3B82F6" : "#E5E7EB";
    const iconName = item.completed ? "check" : item.status === "in_progress" ? "play-arrow" : "lock-outline";

    return (
        <View style={styles.container}>
            {!isLast && (
                <View style={[styles.connectorLine, { backgroundColor: item.completed ? "#10B981" : "#E5E7EB" }]} />
            )}

            <View style={[styles.nodeIconContainer, { borderColor: statusColor, backgroundColor: item.completed ? statusColor : "#FFF" }]}>
                <Icon name={iconName} size={16} color={item.completed ? "#FFF" : statusColor === "#E5E7EB" ? "#9CA3AF" : statusColor} />
            </View>

            <View style={styles.cardContainer}>
                <TouchableOpacity style={styles.cardHeader} onPress={handleToggle} activeOpacity={0.9}>
                    <View style={styles.headerContent}>
                        <View style={styles.titleRow}>
                            <Text style={[styles.title, item.completed && styles.titleCompleted]} numberOfLines={1}>
                                {item.name}
                            </Text>
                            {item.level && (
                                <View style={styles.levelBadge}>
                                    <Text style={styles.levelText}>Lv.{item.level}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.description} numberOfLines={isExpanded ? undefined : 1}>
                            {item.description}
                        </Text>
                    </View>
                    <Icon name={isExpanded ? "expand-less" : "expand-more"} size={24} color="#9CA3AF" />
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.expandedContent}>
                        {/* Resources Section - using Expo Video logic */}
                        {item.resources && item.resources.length > 0 && (
                            <View style={styles.resourcesWrapper}>
                                {item.resources.map((res, idx) => (
                                    <ResourceViewer key={idx} resource={res} />
                                ))}
                            </View>
                        )}

                        <View style={styles.metaContainer}>
                            {item.expReward && (
                                <View style={styles.metaChip}>
                                    <Icon name="stars" size={14} color="#F59E0B" />
                                    <Text style={styles.metaText}>{item.expReward} XP</Text>
                                </View>
                            )}
                        </View>

                        {isOwner && !item.completed && onComplete && (
                            <TouchableOpacity
                                style={[styles.actionButton, isCompleting && styles.disabledButton]}
                                onPress={handleComplete}
                                disabled={isCompleting}
                            >
                                {isCompleting ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Text style={styles.actionButtonText}>Mark as Complete</Text>
                                        <Icon name="check-circle" size={16} color="#FFF" />
                                    </>
                                )}
                            </TouchableOpacity>
                        )}

                        <View style={styles.suggestionsContainer}>
                            <Text style={styles.sectionTitle}>Community Tips</Text>
                            {suggestions.length > 0 ? (
                                suggestions.map((s) => (
                                    <View key={s.suggestionId} style={styles.suggestionItem}>
                                        <Image
                                            source={{ uri: s.userAvatar || "https://ui-avatars.com/api/?name=" + s.fullname }}
                                            style={styles.avatar}
                                        />
                                        <View style={styles.suggestionContent}>
                                            <Text style={styles.suggestionUser}>{s.fullname}</Text>
                                            <Text style={styles.suggestionText}>{s.reason}</Text>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>No tips yet.</Text>
                            )}
                        </View>

                        {onAddSuggestion && (
                            <View style={styles.reviewInputContainer}>
                                <View style={styles.inputWrapper}>
                                    <Image
                                        source={user?.avatarUrl ? { uri: user.avatarUrl } : require('../../assets/images/ImagePlacehoderCourse.png')}
                                        style={styles.myAvatar}
                                    />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Add a review or tip..."
                                        value={reviewText}
                                        onChangeText={setReviewText}
                                        multiline
                                    />
                                </View>
                                {reviewText.length > 0 && (
                                    <TouchableOpacity
                                        style={styles.sendButton}
                                        onPress={handleSubmitSuggestion}
                                        disabled={isSubmittingReview}
                                    >
                                        <Text style={styles.sendButtonText}>Post</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = createScaledSheet({
    container: { flexDirection: "row", marginBottom: 0, minHeight: 80 },
    connectorLine: { position: "absolute", left: 19, top: 40, bottom: -40, width: 2, zIndex: 0 },
    nodeIconContainer: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, justifyContent: "center", alignItems: "center", marginRight: 12, zIndex: 1, marginTop: 10 },
    cardContainer: { flex: 1, marginBottom: 16, backgroundColor: "#FFF", borderRadius: 12, borderWidth: 1, borderColor: "#F3F4F6", elevation: 2, overflow: "hidden" },
    cardHeader: { flexDirection: "row", padding: 12, alignItems: "center", justifyContent: "space-between" },
    headerContent: { flex: 1, marginRight: 8 },
    titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
    title: { fontSize: 16, fontWeight: "600", color: "#1F2937", flexShrink: 1 },
    titleCompleted: { textDecorationLine: 'line-through', color: '#9CA3AF' },
    levelBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    levelText: { fontSize: 10, color: '#3B82F6', fontWeight: '700' },
    description: { fontSize: 13, color: "#6B7280" },
    expandedContent: { borderTopWidth: 1, borderTopColor: "#F3F4F6", padding: 12, backgroundColor: "#FAFAFA" },

    // Resource Viewer Styles
    resourcesWrapper: { marginBottom: 16 },
    resourceContainer: { marginBottom: 12, borderRadius: 8, overflow: 'hidden', backgroundColor: '#000' },
    resourceHeader: { padding: 8, backgroundColor: '#F3F4F6', color: '#374151', fontSize: 12, fontWeight: '600' },
    videoWrapper: { position: 'relative', height: 200, width: '100%', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    video: { width: '100%', height: '100%' },
    replayBtn: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 20 },
    image: { width: '100%', height: 200, backgroundColor: '#E5E7EB' },

    linkButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 },
    linkIconBg: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    linkTitle: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
    linkUrl: { fontSize: 12, color: '#6B7280' },

    metaContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    metaText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
    actionButton: { flexDirection: "row", backgroundColor: "#3B82F6", padding: 10, borderRadius: 8, alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 },
    disabledButton: { backgroundColor: "#93C5FD" },
    actionButtonText: { color: "#FFF", fontWeight: "600", fontSize: 14 },
    suggestionsContainer: { marginBottom: 12 },
    sectionTitle: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
    suggestionItem: { flexDirection: "row", marginBottom: 8, backgroundColor: "#FFF", padding: 8, borderRadius: 8, borderWidth: 1, borderColor: "#F3F4F6" },
    avatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
    suggestionContent: { flex: 1 },
    suggestionUser: { fontSize: 12, fontWeight: "600", color: "#374151" },
    suggestionText: { fontSize: 12, color: "#4B5563", marginTop: 2 },
    emptyText: { fontSize: 12, color: "#9CA3AF", fontStyle: "italic", marginBottom: 8 },
    reviewInputContainer: { marginTop: 8, borderTopWidth: 1, borderColor: '#E5E7EB', paddingTop: 12 },
    inputWrapper: { flexDirection: 'row', gap: 8 },
    myAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E5E7EB' },
    textInput: { flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, minHeight: 40, textAlignVertical: 'top' },
    sendButton: { alignSelf: 'flex-end', backgroundColor: '#3B82F6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, marginTop: 8 },
    sendButtonText: { color: '#FFF', fontWeight: '600', fontSize: 12 }
});

export default RoadmapTimelineItem;