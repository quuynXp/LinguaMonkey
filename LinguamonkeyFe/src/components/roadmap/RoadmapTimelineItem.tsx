import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    LayoutAnimation,
    Platform,
    UIManager,
    StyleSheet,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { createScaledSheet } from "../../utils/scaledStyles";
import type { RoadmapItemUserResponse, RoadmapSuggestionResponse } from "../../types/dto";
import { useUserStore } from "../../stores/UserStore";
import ReviewInput from "../reviews/ReviewInput"; // Integrating the Review Input

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface RoadmapTimelineItemProps {
    item: RoadmapItemUserResponse & {
        level?: number;
        expReward?: number;
        skills?: string[];
        resources?: any[];
    };
    suggestions: RoadmapSuggestionResponse[];
    index: number;
    isLast: boolean;
    isExpanded: boolean;
    onToggle: () => void;
    onComplete?: (itemId: string) => void;
    onAddSuggestion?: (itemId: string, text: string) => Promise<void>;
    isOwner?: boolean;
}

const RoadmapTimelineItem: React.FC<RoadmapTimelineItemProps> = ({
    item,
    suggestions,
    index,
    isLast,
    isExpanded,
    onToggle,
    onComplete,
    onAddSuggestion,
    isOwner = false,
}) => {
    const { user } = useUserStore();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Using ReviewInput requires a submit handler that matches its signature
    const handleSubmitSuggestion = async (text: string) => {
        if (!text.trim() || !onAddSuggestion) return;
        setIsSubmitting(true);
        try {
            await onAddSuggestion(item.id, text);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onToggle();
    };

    const getStatusColor = () => {
        if (item.completed) return "#10B981"; // Success Green
        if (item.status === "in_progress") return "#3B82F6"; // Blue
        return "#E5E7EB"; // Gray for locked/todo
    };

    const getStatusIcon = () => {
        if (item.completed) return "check";
        if (item.status === "in_progress") return "play-arrow";
        return "lock-outline";
    };

    const statusColor = getStatusColor();
    const iconName = getStatusIcon();

    return (
        <View style={styles.container}>
            {/* Connector Line */}
            {!isLast && (
                <View style={[styles.connectorLine, { backgroundColor: item.completed ? "#10B981" : "#E5E7EB" }]} />
            )}

            {/* Timeline Node Icon */}
            <View style={[styles.nodeIconContainer, { borderColor: statusColor, backgroundColor: item.completed ? statusColor : "#FFF" }]}>
                <Icon name={iconName} size={16} color={item.completed ? "#FFF" : statusColor === "#E5E7EB" ? "#9CA3AF" : statusColor} />
            </View>

            {/* Card Content */}
            <View style={styles.cardContainer}>
                <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={handleToggle}
                    activeOpacity={0.9}
                >
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

                {/* Expanded Area */}
                {isExpanded && (
                    <View style={styles.expandedContent}>
                        {/* Metadata Chips */}
                        <View style={styles.metaContainer}>
                            {item.expReward && (
                                <View style={styles.metaChip}>
                                    <Icon name="stars" size={14} color="#F59E0B" />
                                    <Text style={styles.metaText}>{item.expReward} XP</Text>
                                </View>
                            )}
                            <View style={styles.metaChip}>
                                <Icon name="category" size={14} color="#6B7280" />
                                <Text style={styles.metaText}>{item.status || 'Available'}</Text>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        {isOwner && !item.completed && onComplete && (
                            <TouchableOpacity style={styles.actionButton} onPress={() => onComplete(item.id)}>
                                <Text style={styles.actionButtonText}>Mark as Complete</Text>
                                <Icon name="check-circle" size={16} color="#FFF" />
                            </TouchableOpacity>
                        )}

                        {/* Suggestions List */}
                        <View style={styles.suggestionsContainer}>
                            <Text style={styles.sectionTitle}>Community Tips ({suggestions.length})</Text>
                            {suggestions.length > 0 ? (
                                suggestions.map((s) => (
                                    <View key={s.suggestionId} style={styles.suggestionItem}>
                                        <Image
                                            source={{ uri: s.userAvatar || "https://ui-avatars.com/api/?name=" + s.fullname }}
                                            style={styles.avatar}
                                        />
                                        <View style={styles.suggestionContent}>
                                            <View style={styles.suggestionHeader}>
                                                <Text style={styles.suggestionUser}>{s.fullname}</Text>
                                                {s.applied && <Icon name="check-circle" size={12} color="#10B981" style={{ marginLeft: 4 }} />}
                                            </View>
                                            <Text style={styles.suggestionText}>{s.reason}</Text>
                                            {/* Optional: Add Likes here if available in DTO */}
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>No tips yet. Be the first!</Text>
                            )}
                        </View>

                        {/* Add Suggestion Input - Integrated ReviewInput */}
                        {onAddSuggestion && (
                            <View style={{ marginTop: 8 }}>
                                <ReviewInput
                                    currentUserAvatar={user?.avatarUrl}
                                    isSubmitting={isSubmitting}
                                    replyContext={{ id: null, name: null }} // Suggestions are flat list for now
                                    onCancelReply={() => { }}
                                    onSubmit={handleSubmitSuggestion}
                                />
                            </View>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = createScaledSheet({
    container: {
        flexDirection: "row",
        marginBottom: 0,
        minHeight: 80,
    },
    connectorLine: {
        position: "absolute",
        left: 19, // Center of the 40px node icon
        top: 40,
        bottom: -40, // Extend to next item
        width: 2,
        zIndex: 0,
    },
    nodeIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
        zIndex: 1,
        marginTop: 10,
    },
    cardContainer: {
        flex: 1,
        marginBottom: 16,
        backgroundColor: "#FFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        overflow: "hidden",
    },
    cardHeader: {
        flexDirection: "row",
        padding: 12,
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerContent: {
        flex: 1,
        marginRight: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        flexShrink: 1,
    },
    titleCompleted: {
        textDecorationLine: 'line-through',
        color: '#9CA3AF',
    },
    levelBadge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    levelText: {
        fontSize: 10,
        color: '#3B82F6',
        fontWeight: '700',
    },
    description: {
        fontSize: 13,
        color: "#6B7280",
    },
    expandedContent: {
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        padding: 12,
        backgroundColor: "#FAFAFA",
    },
    metaContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    metaText: {
        fontSize: 12,
        color: '#4B5563',
        fontWeight: '500',
    },
    actionButton: {
        flexDirection: "row",
        backgroundColor: "#3B82F6",
        padding: 10,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginBottom: 16,
    },
    actionButtonText: {
        color: "#FFF",
        fontWeight: "600",
        fontSize: 14,
    },
    suggestionsContainer: {
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 8,
    },
    suggestionItem: {
        flexDirection: "row",
        marginBottom: 8,
        backgroundColor: "#FFF",
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    avatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 8,
    },
    suggestionContent: {
        flex: 1,
    },
    suggestionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    suggestionUser: {
        fontSize: 12,
        fontWeight: "600",
        color: "#374151",
    },
    suggestionText: {
        fontSize: 12,
        color: "#4B5563",
        marginTop: 2,
    },
    emptyText: {
        fontSize: 12,
        color: "#9CA3AF",
        fontStyle: "italic",
        marginBottom: 8,
    },
});

export default RoadmapTimelineItem;