"use client"

import { useEffect, useRef, useState } from "react"
import { Animated, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Svg, { Line } from "react-native-svg"
import Icon from 'react-native-vector-icons/MaterialIcons'; 
import { MindMapNode } from "../../types/api"

const { width, height } = Dimensions.get("window")

const GrammarMindMapScreen = ({ navigation }: any) => {
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(1)).current

  const mindMapData: MindMapNode[] = [
    {
      id: "root",
      title: "English Grammar",
      description: "Complete English Grammar System",
      x: width / 2,
      y: height / 3,
      color: "#3B82F6",
      level: 0,
      children: ["tenses", "parts-of-speech", "sentence-structure", "punctuation"],
      examples: [],
      rules: [],
    },
    {
      id: "tenses",
      title: "Tenses",
      description: "Past, Present, Future",
      x: width / 4,
      y: height / 5,
      color: "#10B981",
      level: 1,
      children: ["present", "past", "future"],
      examples: ["I eat", "I ate", "I will eat"],
      rules: ["Express time relationships", "Show when actions occur"],
    },
    {
      id: "present",
      title: "Present Tense",
      description: "Simple, Continuous, Perfect",
      x: width / 6,
      y: height / 8,
      color: "#10B981",
      level: 2,
      children: [],
      examples: ["I work", "I am working", "I have worked"],
      rules: ["Current actions", "Ongoing actions", "Completed actions affecting now"],
    },
    {
      id: "past",
      title: "Past Tense",
      description: "Simple, Continuous, Perfect",
      x: width / 4,
      y: height / 12,
      color: "#10B981",
      level: 2,
      children: [],
      examples: ["I worked", "I was working", "I had worked"],
      rules: ["Completed actions", "Ongoing past actions", "Actions before other past actions"],
    },
    {
      id: "future",
      title: "Future Tense",
      description: "Simple, Continuous, Perfect",
      x: width / 3,
      y: height / 8,
      color: "#10B981",
      level: 2,
      children: [],
      examples: ["I will work", "I will be working", "I will have worked"],
      rules: ["Future actions", "Ongoing future actions", "Actions completed by future time"],
    },
    {
      id: "parts-of-speech",
      title: "Parts of Speech",
      description: "8 Main Categories",
      x: (3 * width) / 4,
      y: height / 5,
      color: "#F59E0B",
      level: 1,
      children: ["nouns", "verbs", "adjectives", "adverbs"],
      examples: ["cat (noun)", "run (verb)", "beautiful (adjective)", "quickly (adverb)"],
      rules: ["Words categorized by function", "Each has specific roles in sentences"],
    },
    {
      id: "nouns",
      title: "Nouns",
      description: "Person, Place, Thing, Idea",
      x: (2 * width) / 3,
      y: height / 8,
      color: "#F59E0B",
      level: 2,
      children: [],
      examples: ["teacher", "school", "book", "happiness"],
      rules: ["Can be singular or plural", "Can be concrete or abstract", "Subject or object of sentence"],
    },
    {
      id: "verbs",
      title: "Verbs",
      description: "Action or State Words",
      x: (5 * width) / 6,
      y: height / 8,
      color: "#F59E0B",
      level: 2,
      children: [],
      examples: ["run", "think", "is", "become"],
      rules: ["Express actions or states", "Change form with tense", "Agree with subject"],
    },
    {
      id: "sentence-structure",
      title: "Sentence Structure",
      description: "How sentences are built",
      x: width / 2,
      y: (2 * height) / 3,
      color: "#EF4444",
      level: 1,
      children: ["simple", "compound", "complex"],
      examples: ["I eat.", "I eat and drink.", "I eat because I'm hungry."],
      rules: ["Must have subject and predicate", "Can be combined in various ways"],
    },
    {
      id: "punctuation",
      title: "Punctuation",
      description: "Marks that clarify meaning",
      x: width / 2,
      y: (4 * height) / 5,
      color: "#8B5CF6",
      level: 1,
      children: ["periods", "commas", "questions"],
      examples: [".", ",", "?", "!", ";", ":"],
      rules: ["End sentences", "Separate ideas", "Show emotion or questions"],
    },
  ]

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Grammar Mind Map</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Notes")}>
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
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: "#F59E0B" }]} />
              <Text style={styles.legendText}>Parts of Speech</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: "#EF4444" }]} />
              <Text style={styles.legendText}>Sentence Structure</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: "#8B5CF6" }]} />
              <Text style={styles.legendText}>Punctuation</Text>
            </View>
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

const styles = StyleSheet.create({
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
