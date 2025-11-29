import React, { useState } from "react";
import {
  ScrollView,
  TextInput,
  TouchableOpacity,
  Text,
  View,
  Image,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { useRoadmap } from "../../hooks/useRoadmap";
import { useUserStore } from "../../stores/UserStore";
import { createScaledSheet } from "../../utils/scaledStyles";
import dayjs from "dayjs";

const RoadmapSuggestionsScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { roadmapId, isOwner } = route.params;
  const userId = useUserStore((state) => state.user?.userId);

  const { useSuggestions, useAddSuggestion, useApplySuggestion } = useRoadmap();
  const { data: suggestions = [], isLoading } = useSuggestions(roadmapId);
  const addMut = useAddSuggestion();
  const applyMut = useApplySuggestion();

  const [comment, setComment] = useState("");
  const [activeTab, setActiveTab] = useState<'reviews' | 'write'>('reviews');

  const handleSubmit = async () => {
    if (!userId || !comment.trim()) return;

    try {
      await addMut.mutateAsync({
        roadmapId,
        itemId: null, // General roadmap comment
        suggestedOrderIndex: 0,
        reason: comment,
      });
      setComment("");
      setActiveTab('reviews');
    } catch (e) {
      console.error(e);
    }
  };

  const handleApply = async (suggestionId: string) => {
    if (!userId) return;
    await applyMut.mutateAsync({ suggestionId });
  };

  const renderReviewItem = (item: any) => (
    <View key={item.suggestionId} style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.userInfo}>
          {item.userAvatar ? (
            <Image source={{ uri: item.userAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.placeholderAvatar]}>
              <Text style={styles.placeholderText}>{item.fullname?.charAt(0) || 'U'}</Text>
            </View>
          )}
          <View>
            <Text style={styles.fullname}>{item.fullname || 'Anonymous'}</Text>
            <Text style={styles.date}>{dayjs(item.createdAt).format('MMM D, YYYY')}</Text>
          </View>
        </View>
        {item.applied && (
          <View style={styles.badge}>
            <Icon name="check" size={12} color="#065F46" />
            <Text style={styles.badgeText}>{t('roadmap.suggestionApplied')}</Text>
          </View>
        )}
      </View>

      <Text style={styles.reviewContent}>{item.reason}</Text>

      {isOwner && !item.applied && (
        <View style={styles.ownerActions}>
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => handleApply(item.suggestionId)}
            disabled={applyMut.isPending}
          >
            <Text style={styles.applyBtnText}>{t('roadmap.acceptSuggestion')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('roadmap.reviewsAndSuggestions')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
          onPress={() => setActiveTab('reviews')}
        >
          <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>
            {t('roadmap.allReviews')} ({suggestions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'write' && styles.activeTab]}
          onPress={() => setActiveTab('write')}
        >
          <Text style={[styles.tabText, activeTab === 'write' && styles.activeTabText]}>
            {t('roadmap.writeReview')}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'reviews' ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {isLoading ? (
            <ActivityIndicator color="#3B82F6" />
          ) : suggestions.length > 0 ? (
            suggestions.map(renderReviewItem)
          ) : (
            <View style={styles.emptyState}>
              <Icon name="chat-bubble-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>{t('roadmap.noReviewsYet')}</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.writeContainer}>
          <Text style={styles.writeLabel}>{t('roadmap.shareThoughts')}</Text>
          <TextInput
            style={styles.input}
            multiline
            numberOfLines={6}
            placeholder={t('roadmap.reviewPlaceholder')}
            value={comment}
            onChangeText={setComment}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.submitBtn, (!comment.trim() || addMut.isPending) && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={!comment.trim() || addMut.isPending}
          >
            {addMut.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{t('common.submit')}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderColor: "#E5E7EB" },
  title: { fontSize: 18, fontWeight: "600", color: "#1F2937" },

  tabs: { flexDirection: "row", padding: 16, gap: 12 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: "#E5E7EB" },
  activeTab: { backgroundColor: "#3B82F6" },
  tabText: { color: "#4B5563", fontWeight: "500" },
  activeTabText: { color: "#fff" },

  listContent: { padding: 16 },
  reviewCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  userInfo: { flexDirection: "row", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  placeholderAvatar: { backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center" },
  placeholderText: { color: "#2563EB", fontWeight: "bold" },
  fullname: { fontWeight: "600", color: "#1F2937", fontSize: 14 },
  date: { color: "#9CA3AF", fontSize: 12 },

  badge: { flexDirection: "row", alignItems: "center", backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, gap: 4 },
  badgeText: { fontSize: 10, color: "#065F46", fontWeight: "600" },

  reviewContent: { fontSize: 14, color: "#374151", lineHeight: 22 },

  ownerActions: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: "#F3F4F6" },
  applyBtn: { alignSelf: "flex-start" },
  applyBtnText: { color: "#3B82F6", fontWeight: "600", fontSize: 14 },

  writeContainer: { padding: 20 },
  writeLabel: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 12 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 12, fontSize: 16, minHeight: 120, marginBottom: 20 },
  submitBtn: { backgroundColor: "#3B82F6", padding: 16, borderRadius: 8, alignItems: "center" },
  disabledBtn: { backgroundColor: "#93C5FD" },
  submitBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  emptyState: { alignItems: "center", marginTop: 40 },
  emptyText: { color: "#9CA3AF", marginTop: 10 }
});

export default RoadmapSuggestionsScreen;