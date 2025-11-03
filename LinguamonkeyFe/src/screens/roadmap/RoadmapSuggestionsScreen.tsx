import { useState } from "react";
import { useRoadmap } from "../../hooks/useRoadmap"; // Extended with useSuggestions, useAddSuggestion, useApplySuggestion
import { ScrollView, TextInput, TouchableOpacity, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { createScaledSheet } from "../../utils/scaledStyles";

const RoadmapSuggestionsScreen = ({ route }) => {
  const { roadmapId, isOwner } = route.params;
  const { useSuggestions } = useRoadmap();
  const { data: suggestions = [] } = useSuggestions(roadmapId);
  const addMut = useAddSuggestion();
  const applyMut = useApplySuggestion();

  const [reason, setReason] = useState("");
  const [itemId, setItemId] = useState(""); // Select from dropdown or input
  const [newOrder, setNewOrder] = useState("");

  const handleAdd = async () => {
    await addMut.mutateAsync({ roadmapId, itemId: UUID.fromString(itemId), suggestedOrderIndex: parseInt(newOrder), reason });
    setReason(""); setItemId(""); setNewOrder("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {suggestions.map((sug) => (
          <View key={sug.suggestionId} style={styles.sugCard}>
            <Text>{sug.reason}</Text>
            {isOwner && (
              <TouchableOpacity onPress={() => applyMut.mutateAsync({ suggestionId: sug.suggestionId, userId: /* current user */ })}>
                <Icon name="check" size={24} color="#10B981" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
      {!isOwner && (
        <View style={styles.addForm}>
          <TextInput value={itemId} onChangeText={setItemId} placeholder="Item ID" />
          <TextInput value={newOrder} onChangeText={setNewOrder} placeholder="New Order Index" keyboardType="numeric" />
          <TextInput value={reason} onChangeText={setReason} placeholder="Reason" multiline />
          <TouchableOpacity onPress={handleAdd}>
            <Text>Submit Suggestion</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = createScaledSheet({
  container: { flex: 1 },
  sugCard: { padding: 16, borderBottomWidth: 1 },
  addForm: { padding: 20 },
});

export default RoadmapSuggestionsScreen;