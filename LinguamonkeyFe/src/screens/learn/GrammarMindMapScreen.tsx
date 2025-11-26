import { useEffect, useRef, useState } from "react"
import { ActivityIndicator, Animated, Dimensions, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Svg, { Line } from "react-native-svg"
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useGrammar } from "../../hooks/useGrammar";
import { MindMapNode } from "../../types/api"
import { createScaledSheet } from "../../utils/scaledStyles";


const { width, height } = Dimensions.get("window")

const GrammarMindMapScreen = ({ navigation }: any) => {
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(1)).current

  const { useGrammarMindmap } = useGrammar();
  const { data: mindMapData = [], isLoading, error } = useGrammarMindmap();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start()
  }, [])

  const handleNodePress = (node: MindMapNode) => {
    setSelectedNode(node)
    setShowDetails(true)

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start()
    // Optional: Navigate to detailed grammar learning if node is a rule
    if (node.type === 'rule') {
      navigation.navigate('GrammarLearningScreen', { ruleId: node.id });
    }
  }

  const renderConnections = () => {
    const connections = []
    mindMapData.forEach((node) => {
      node.children.forEach((childId) => {
        const childNode = mindMapData.find((n) => n.id === childId)
        if (childNode) {
          connections.push(
            <Line
              key={`${node.id}-${childId}`}
              x1={node.x}
              y1={node.y}
              x2={childNode.x}
              y2={childNode.y}
              stroke="#D1D5DB"
              strokeWidth="2"
            />,
          )
        }
      })
    })
    return connections
  }

  const renderNodes = () => {
    return mindMapData.map((node) => (
      <TouchableOpacity
        key={node.id}
        style={[
          styles.nodeContainer,
          {
            left: node.x - 60,
            top: node.y - 30,
            backgroundColor: node.color,
          },
        ]}
        onPress={() => handleNodePress(node)}
      >
        <Text style={[styles.nodeTitle, { fontSize: node.level === 0 ? 14 : 12 }]}>{node.title}</Text>
      </TouchableOpacity>
    ))
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.exampleText}>Loading Grammar Mindmap...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.container}>
          <Icon name="error" size={48} color="#EF4444" />
          <Text style={styles.exampleText}>Failed to load mindmap. Please try again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Grammar Mind Map</Text>
        <TouchableOpacity onPress={() => navigation.navigate("NotesScreen")}>
          <Icon name="note" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.mindMapContainer}
          contentContainerStyle={styles.mindMapContent}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          maximumZoomScale={2}
          minimumZoomScale={0.5}
          pinchGestureEnabled={true} // Enable pinch-to-zoom
        >
          <Svg height={height * 1.2} width={width * 1.2}>
            {renderConnections()}
          </Svg>
          <Animated.View style={[styles.nodesContainer, { transform: [{ scale: scaleAnim }] }]}>
            {renderNodes()}
          </Animated.View>
        </ScrollView>

        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Grammar Categories</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: "#10B981" }]} />
              <Text style={styles.legendText}>Tenses</Text>
            </View>
            {/* Additional legend items as needed */}
          </View>
        </View>
      </Animated.View>

      {/* Node Details Modal */}
      <Modal
        visible={showDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedNode && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalColorIndicator, { backgroundColor: selectedNode.color }]} />
                  <Text style={styles.modalTitle}>{selectedNode.title}</Text>
                  <TouchableOpacity onPress={() => setShowDetails(false)}>
                    <Icon name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <Text style={styles.modalDescription}>{selectedNode.description}</Text>

                  {selectedNode.rules.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>📋 Rules</Text>
                      {selectedNode.rules.map((rule, index) => (
                        <Text key={index} style={styles.modalListItem}>
                          • {rule}
                        </Text>
                      ))}
                    </View>
                  )}

                  {selectedNode.examples.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>💡 Examples</Text>
                      {selectedNode.examples.map((example, index) => (
                        <View key={index} style={styles.exampleItem}>
                          <Text style={styles.exampleText}>{example}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {selectedNode.children.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>🔗 Related Topics</Text>
                      {selectedNode.children.map((childId) => {
                        const childNode = mindMapData.find((n) => n.id === childId)
                        return childNode ? (
                          <TouchableOpacity
                            key={childId}
                            style={styles.relatedTopic}
                            onPress={() => {
                              setSelectedNode(childNode)
                            }}
                          >
                            <View style={[styles.relatedTopicColor, { backgroundColor: childNode.color }]} />
                            <Text style={styles.relatedTopicText}>{childNode.title}</Text>
                            <Icon name="arrow-forward" size={16} color="#6B7280" />
                          </TouchableOpacity>
                        ) : null
                      })}
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  content: {
    flex: 1,
  },
  mindMapContainer: {
    flex: 1,
  },
  mindMapContent: {
    minHeight: height * 1.2,
    minWidth: width * 1.2,
  },
  nodesContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  nodeContainer: {
    position: "absolute",
    width: 120,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  nodeTitle: {
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  legend: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#6B7280",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalColorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 20,
    lineHeight: 24,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  modalListItem: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
    lineHeight: 20,
  },
  exampleItem: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    color: "#1F2937",
    fontFamily: "monospace",
  },
  relatedTopic: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 8,
  },
  relatedTopicColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  relatedTopicText: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
  },
})

export default GrammarMindMapScreen
