import React, { useState } from "react";
import {
  ScrollView,
  TextInput,
  TouchableOpacity,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { useRoadmap } from "../../hooks/useRoadmap";
import { useUserStore } from "../../stores/UserStore";
import { createScaledSheet } from "../../utils/scaledStyles";

const RoadmapSuggestionsScreen = ({ route }) => {
  const { t } = useTranslation();
  const { roadmapId, isOwner } = route.params;
  const userId = useUserStore((state) => state.user?.userId);

  const { useSuggestions, useAddSuggestion, useApplySuggestion } = useRoadmap();
  const { data: suggestions = [] } = useSuggestions(roadmapId);
  const addMut = useAddSuggestion();
  const applyMut = useApplySuggestion();

  const [reason, setReason] = useState("");
  const [itemId, setItemId] = useState("");
  const [newOrder, setNewOrder] = useState("");

  const handleAdd = async () => {
    if (!userId || !itemId || !newOrder || !reason) return;

    await addMut.mutateAsync({
      roadmapId,
      itemId,
      suggestedOrderIndex: parseInt(newOrder, 10),
      reason,
    });

    setReason("");
    setItemId("");
    setNewOrder("");
  };

  const handleApply = async (suggestionId: string) => {
    if (!userId) return;
    await applyMut.mutateAsync({ suggestionId });
  };

  return (
    <ScreenLayout backgroundColor="#fff">
      <SafeAreaView style={styles.container}>
        <ScrollView>
          {suggestions.map((sug) => (
            <View key={sug.suggestionId} style={styles.suggestionCard}>
              <Text style={styles.reason}>{sug.reason}</Text>
              <View style={styles.footer}>
                <Text style={styles.infoText}>
                  {t("roadmap.suggestions.from")} {sug.user?.fullname || sug.user?.userId}
                </Text>
                {isOwner && (
                  <TouchableOpacity
                    onPress={() => handleApply(sug.suggestionId)}
                    disabled={applyMut.isPending}
                  >
                    <Icon name="check-circle" size={28} color="#10B981" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        {!isOwner && (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              value={itemId}
              onChangeText={setItemId}
              placeholder={t("roadmap.suggestions.itemIdPlaceholder")}
            />
            <TextInput
              style={styles.input}
              value={newOrder}
              onChangeText={setNewOrder}
              placeholder={t("roadmap.suggestions.orderPlaceholder")}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.multiline]}
              value={reason}
              onChangeText={setReason}
              placeholder={t("roadmap.suggestions.reasonPlaceholder")}
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!itemId || !newOrder || !reason || addMut.isPending) && styles.submitButtonDisabled,
              ]}
              onPress={handleAdd}
              disabled={!itemId || !newOrder || !reason || addMut.isPending}
            >
              <Text style={styles.submitText}>
                {t("roadmap.suggestions.submit")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1 },
  suggestionCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  reason: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#6b7280",
  },
  form: {
    padding: 20,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  multiline: {
    height: 100,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default RoadmapSuggestionsScreen;