import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { createScaledSheet } from "../../utils/scaledStyles";
import { RoadmapItemUserResponse, RoadmapSuggestionResponse } from "../../types/dto";
import RoadmapTimelineItem from "./RoadmapTimelineItem";
import { useTranslation } from "react-i18next";

interface RoadmapTimelineProps {
    items: RoadmapItemUserResponse[];
    suggestions?: RoadmapSuggestionResponse[];
    isOwner?: boolean;
    // FIX: Thay đổi kiểu trả về từ 'void' thành 'Promise<void>'
    onCompleteItem?: (itemId: string) => Promise<void>;
    onAddSuggestion?: (itemId: string, text: string) => Promise<void>;
}

const RoadmapTimeline: React.FC<RoadmapTimelineProps> = ({
    items,
    suggestions = [],
    isOwner = false,
    onCompleteItem,
    onAddSuggestion,
}) => {
    const { t } = useTranslation();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleToggle = (id: string) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    if (!items || items.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('roadmap.noItems')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {items.map((item, index) => {
                // Filter suggestions for this specific item
                const itemSuggestions = suggestions.filter((s) => s.itemId === item.id);

                return (
                    <RoadmapTimelineItem
                        key={item.id}
                        item={item}
                        suggestions={itemSuggestions}
                        index={index}
                        isLast={index === items.length - 1}
                        isExpanded={expandedId === item.id}
                        onToggle={() => handleToggle(item.id)}
                        // Propagate the updated type
                        onComplete={onCompleteItem}
                        onAddSuggestion={onAddSuggestion}
                        isOwner={isOwner}
                    />
                );
            })}
        </View>
    );
};

const styles = createScaledSheet({
    container: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 40,
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: '#6B7280',
        fontSize: 14,
    }
});

export default RoadmapTimeline;