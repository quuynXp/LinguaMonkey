import { useState } from "react";
import { useRoadmap } from "../../hooks/useRoadmap"; // Assume extended with edit functions
import { ScrollView, TextInput, TouchableOpacity, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { createScaledSheet } from "../../utils/scaledStyles";

const EditRoadmapScreen = ({ route, navigation }) => {
  const { roadmapId, userId } = route.params;
  const { useRoadmapDetail, useEditRoadmap } = useRoadmap(); // New functions in hook
  const { data: roadmap } = useRoadmapDetail(roadmapId, userId);
  const editMut = useEditRoadmap();

  const [title, setTitle] = useState(roadmap?.title || "");
  const [description, setDescription] = useState(roadmap?.description || "");

  const handleSave = async () => {
    await editMut.mutateAsync({ roadmapId, title, description });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Roadmap</Text>
        <TouchableOpacity onPress={handleSave}>
          <Icon name="save" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content}>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Title" />
        <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Description" multiline />
        {/* Add list of items with edit buttons, using similar mutations */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", justifyContent: "space-between", padding: 16 },
  title: { fontSize: 18, fontWeight: "600" },
  content: { padding: 20 },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 12, marginBottom: 16 },
});

export default EditRoadmapScreen;