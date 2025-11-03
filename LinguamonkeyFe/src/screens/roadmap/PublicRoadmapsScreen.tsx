import { useRoadmap } from "../../hooks/useRoadmap"; // Extended with usePublicRoadmaps
import { ScrollView, TouchableOpacity, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createScaledSheet } from "../../utils/scaledStyles";

const PublicRoadmapsScreen = ({ navigation }) => {
  const { usePublicRoadmaps } = useRoadmap();
  const { data: roadmaps = [] } = usePublicRoadmaps();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {roadmaps.map((rm) => (
          <TouchableOpacity key={rm.roadmapId} onPress={() => navigation.navigate('RoadmapDetail', { roadmapId: rm.roadmapId, isPublic: true })}>
            <View style={styles.card}>
              <Text>{rm.title}</Text>
              <Text>{rm.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = createScaledSheet({
  container: { flex: 1 },
  card: { padding: 16, borderBottomWidth: 1, borderColor: "#E5E7EB" },
});

export default PublicRoadmapsScreen;