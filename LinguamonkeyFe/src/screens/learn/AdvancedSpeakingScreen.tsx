import Icon from 'react-native-vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from "react"
import { Alert, Animated, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const { width } = Dimensions.get("window")

interface IPASound {
  symbol: string
  example: string
  audioUrl: string
  type: "vowel" | "consonant"
  description: string
}

interface ConversationTopic {
  id: string
  title: string
  description: string
  level: "basic" | "intermediate" | "advanced"
  icon: string
  color: string
  scenarios: string[]
}

interface AIResponse {
  text: string
  audioUrl: string
  feedback?: {
    pronunciation: number
    fluency: number
    grammar: number
    suggestions: string[]
  }
}

const AdvancedSpeakingScreen = ({ navigation }: any) => {
  const [currentMode, setCurrentMode] = useState<"ipa" | "pronunciation" | "conversation">("ipa")
  const [selectedIPASound, setSelectedIPASound] = useState<IPASound | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedText, setRecordedText] = useState("")
  const [pronunciationScore, setPronunciationScore] = useState<number | null>(null)
  const [conversationLevel, setConversationLevel] = useState<"basic" | "intermediate" | "advanced">("basic")
  const [selectedTopic, setSelectedTopic] = useState<ConversationTopic | null>(null)
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: "user" | "ai"; text: string }>>([])
  const [isAISpeaking, setIsAISpeaking] = useState(false)

  const pulseAnim = useRef(new Animated.Value(1)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()
  }, [])

  

  const ipaVowels: IPASound[] = [
    {
      symbol: "i:",
      example: "see",
      audioUrl: "i_long.mp3",
      type: "vowel",
      description: "Long close front unrounded vowel",
    },
    {
      symbol: "ɪ",
      example: "sit",
      audioUrl: "i_short.mp3",
      type: "vowel",
      description: "Near-close front unrounded vowel",
    },
    { symbol: "e", example: "bed", audioUrl: "e.mp3", type: "vowel", description: "Close-mid front unrounded vowel" },
    { symbol: "æ", example: "cat", audioUrl: "ae.mp3", type: "vowel", description: "Near-open front unrounded vowel" },
    { symbol: "ɑ:", example: "car", audioUrl: "a_long.mp3", type: "vowel", description: "Open back unrounded vowel" },
    { symbol: "ɒ", example: "hot", audioUrl: "o_short.mp3", type: "vowel", description: "Open back rounded vowel" },
    { symbol: "ɔ:", example: "saw", audioUrl: "o_long.mp3", type: "vowel", description: "Open-mid back rounded vowel" },
    {
      symbol: "ʊ",
      example: "put",
      audioUrl: "u_short.mp3",
      type: "vowel",
      description: "Near-close back rounded vowel",
    },
    { symbol: "u:", example: "too", audioUrl: "u_long.mp3", type: "vowel", description: "Close back rounded vowel" },
    { symbol: "ʌ", example: "cup", audioUrl: "schwa.mp3", type: "vowel", description: "Open-mid back unrounded vowel" },
    { symbol: "ə", example: "about", audioUrl: "schwa2.mp3", type: "vowel", description: "Mid central vowel (schwa)" },
    {
      symbol: "ɜ:",
      example: "bird",
      audioUrl: "er.mp3",
      type: "vowel",
      description: "Open-mid central unrounded vowel",
    },
  ]

  const ipaConsonants: IPASound[] = [
    { symbol: "p", example: "pen", audioUrl: "p.mp3", type: "consonant", description: "Voiceless bilabial plosive" },
    { symbol: "b", example: "bad", audioUrl: "b.mp3", type: "consonant", description: "Voiced bilabial plosive" },
    { symbol: "t", example: "tea", audioUrl: "t.mp3", type: "consonant", description: "Voiceless alveolar plosive" },
    { symbol: "d", example: "dog", audioUrl: "d.mp3", type: "consonant", description: "Voiced alveolar plosive" },
    { symbol: "k", example: "cat", audioUrl: "k.mp3", type: "consonant", description: "Voiceless velar plosive" },
    { symbol: "g", example: "go", audioUrl: "g.mp3", type: "consonant", description: "Voiced velar plosive" },
    {
      symbol: "f",
      example: "fish",
      audioUrl: "f.mp3",
      type: "consonant",
      description: "Voiceless labiodental fricative",
    },
    { symbol: "v", example: "very", audioUrl: "v.mp3", type: "consonant", description: "Voiced labiodental fricative" },
    {
      symbol: "θ",
      example: "think",
      audioUrl: "th_voiceless.mp3",
      type: "consonant",
      description: "Voiceless dental fricative",
    },
    {
      symbol: "ð",
      example: "this",
      audioUrl: "th_voiced.mp3",
      type: "consonant",
      description: "Voiced dental fricative",
    },
    { symbol: "s", example: "see", audioUrl: "s.mp3", type: "consonant", description: "Voiceless alveolar fricative" },
    { symbol: "z", example: "zoo", audioUrl: "z.mp3", type: "consonant", description: "Voiced alveolar fricative" },
    {
      symbol: "ʃ",
      example: "she",
      audioUrl: "sh.mp3",
      type: "consonant",
      description: "Voiceless postalveolar fricative",
    },
    {
      symbol: "ʒ",
      example: "measure",
      audioUrl: "zh.mp3",
      type: "consonant",
      description: "Voiced postalveolar fricative",
    },
    { symbol: "h", example: "hat", audioUrl: "h.mp3", type: "consonant", description: "Voiceless glottal fricative" },
    { symbol: "m", example: "man", audioUrl: "m.mp3", type: "consonant", description: "Voiced bilabial nasal" },
    { symbol: "n", example: "no", audioUrl: "n.mp3", type: "consonant", description: "Voiced alveolar nasal" },
    { symbol: "ŋ", example: "sing", audioUrl: "ng.mp3", type: "consonant", description: "Voiced velar nasal" },
    {
      symbol: "l",
      example: "let",
      audioUrl: "l.mp3",
      type: "consonant",
      description: "Voiced alveolar lateral approximant",
    },
    {
      symbol: "r",
      example: "red",
      audioUrl: "r.mp3",
      type: "consonant",
      description: "Voiced postalveolar approximant",
    },
    {
      symbol: "w",
      example: "wet",
      audioUrl: "w.mp3",
      type: "consonant",
      description: "Voiced labio-velar approximant",
    },
    { symbol: "j", example: "yes", audioUrl: "y.mp3", type: "consonant", description: "Voiced palatal approximant" },
  ]

  const conversationTopics: ConversationTopic[] = [
    {
      id: "1",
      title: "Daily Greetings",
      description: "Basic introductions and small talk",
      level: "basic",
      icon: "waving-hand",
      color: "#4ECDC4",
      scenarios: ["Meeting someone new", "Morning greetings", "Asking about the weather"],
    },
    {
      id: "2",
      title: "Job Interview",
      description: "Professional interview scenarios",
      level: "intermediate",
      icon: "work",
      color: "#45B7D1",
      scenarios: ["Self introduction", "Discussing experience", "Asking questions"],
    },
    {
      id: "3",
      title: "Business Negotiation",
      description: "Complex business discussions",
      level: "advanced",
      icon: "handshake",
      color: "#96CEB4",
      scenarios: ["Contract terms", "Price negotiation", "Partnership discussions"],
    },
  ]

  const startRecording = async () => {
    try {
      setIsRecording(true)
      startPulseAnimation()
      // await Voice.start("en-US")
    } catch (error) {
      console.error("Recording error:", error)
      setIsRecording(false)
    }
  }

  const stopRecording = async () => {
    try {
      // await Voice.stop()
      setIsRecording(false)
      stopPulseAnimation()
    } catch (error) {
      console.error("Stop recording error:", error)
    }
  }

  const startPulseAnimation = () => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    )
    pulseAnimation.start()
  }

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation()
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }

  const analyzePronunciation = (text: string) => {
    // Simulate pronunciation analysis
    const score = Math.floor(Math.random() * 30) + 70 // 70-100
    setPronunciationScore(score)

    setTimeout(() => {
      Alert.alert(
        "Pronunciation Analysis",
        `Score: ${score}/100\n\n${score >= 90 ? "Excellent pronunciation!" : score >= 80 ? "Good job! Minor improvements needed." : "Keep practicing! Focus on clarity."}`,
      )
    }, 1000)
  }

  const startAIConversation = async (topic: ConversationTopic) => {
    setSelectedTopic(topic)
    setConversationHistory([])

    // AI starts the conversation
    const aiGreeting = getAIGreeting(topic)
    setConversationHistory([{ role: "ai", text: aiGreeting }])
    setIsAISpeaking(true)

    // Simulate AI speech
    setTimeout(() => setIsAISpeaking(false), 2000)
  }

  const getAIGreeting = (topic: ConversationTopic) => {
    const greetings = {
      basic: "Hello! I'm excited to practice English with you today. How are you doing?",
      intermediate:
        "Good morning! I understand you'd like to practice a job interview scenario. Shall we begin with your introduction?",
      advanced:
        "Welcome to our business meeting. I represent the client company, and I'm interested in discussing a potential partnership. Could you tell me about your company's capabilities?",
    }
    return greetings[topic.level]
  }

  const handleUserResponse = (text: string) => {
    setConversationHistory((prev) => [...prev, { role: "user", text }])

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(text, selectedTopic!)
      setConversationHistory((prev) => [...prev, { role: "ai", text: aiResponse }])
      setIsAISpeaking(true)
      setTimeout(() => setIsAISpeaking(false), 3000)
    }, 1500)
  }

  const generateAIResponse = (userText: string, topic: ConversationTopic) => {
    const responses = {
      basic: [
        "That's great to hear! What are your plans for today?",
        "Interesting! Can you tell me more about that?",
        "I see. What do you like to do in your free time?",
      ],
      intermediate: [
        "Thank you for that introduction. Can you describe your biggest professional achievement?",
        "That's impressive experience. How do you handle challenging situations at work?",
        "Good point. What are your career goals for the next five years?",
      ],
      advanced: [
        "That's a compelling proposition. What would be the key terms of this partnership?",
        "I appreciate the detailed explanation. How would you address potential risks in this venture?",
        "Your analysis is thorough. What timeline are you proposing for implementation?",
      ],
    }

    const levelResponses = responses[topic.level]
    return levelResponses[Math.floor(Math.random() * levelResponses.length)]
  }

  const renderIPAChart = () => (
    <ScrollView style={styles.ipaContainer}>
      <Text style={styles.sectionTitle}>Vowels</Text>
      <View style={styles.ipaGrid}>
        {ipaVowels.map((sound) => (
          <TouchableOpacity key={sound.symbol} style={styles.ipaButton} onPress={() => setSelectedIPASound(sound)}>
            <Text style={styles.ipaSymbol}>{sound.symbol}</Text>
            <Text style={styles.ipaExample}>{sound.example}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Consonants</Text>
      <View style={styles.ipaGrid}>
        {ipaConsonants.map((sound) => (
          <TouchableOpacity key={sound.symbol} style={styles.ipaButton} onPress={() => setSelectedIPASound(sound)}>
            <Text style={styles.ipaSymbol}>{sound.symbol}</Text>
            <Text style={styles.ipaExample}>{sound.example}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  )

  const renderPronunciationCheck = () => (
    <View style={styles.pronunciationContainer}>

      <Text style={styles.pronunciationTitle}>Pronunciation Check</Text>
      <Text style={styles.pronunciationSubtitle}>Tap the microphone and say any word or sentence</Text>

      <Animated.View style={[styles.recordButton, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity
          style={[styles.recordButtonInner, isRecording && styles.recordingActive]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
        >
          <Icon name={isRecording ? "stop" : "mic"} size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {isRecording && <Text style={styles.recordingText}>Listening...</Text>}

      {recordedText && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultLabel}>You said:</Text>
          <Text style={styles.resultText}>"{recordedText}"</Text>

          {pronunciationScore && (
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Pronunciation Score:</Text>
              <Text style={[styles.scoreText, { color: getScoreColor(pronunciationScore) }]}>
                {pronunciationScore}/100
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  )

  const renderConversationPractice = () => (
    <View style={styles.conversationContainer}>
      <View style={styles.levelSelector}>
        {["basic", "intermediate", "advanced"].map((level) => (
          <TouchableOpacity
            key={level}
            style={[styles.levelButton, conversationLevel === level && styles.activeLevelButton]}
            onPress={() => setConversationLevel(level as any)}
          >
            <Text style={[styles.levelText, conversationLevel === level && styles.activeLevelText]}>
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.topicsList}>
        {conversationTopics
          .filter((topic) => topic.level === conversationLevel)
          .map((topic) => (
            <TouchableOpacity
              key={topic.id}
              style={[styles.topicCard, { borderLeftColor: topic.color }]}
              onPress={() => startAIConversation(topic)}
            >
              <View style={[styles.topicIcon, { backgroundColor: `${topic.color}20` }]}>
                <Icon name={topic.icon} size={24} color={topic.color} />
              </View>
              <View style={styles.topicInfo}>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                <Text style={styles.topicDescription}>{topic.description}</Text>
                <View style={styles.scenariosList}>
                  {topic.scenarios.map((scenario, index) => (
                    <Text key={index} style={styles.scenarioText}>
                      • {scenario}
                    </Text>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          ))}
      </ScrollView>
    </View>
  )

  const getScoreColor = (score: number) => {
    if (score >= 90) return "#4CAF50"
    if (score >= 80) return "#FF9800"
    return "#F44336"
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Advanced Speaking</Text>
        <TouchableOpacity>
          <Icon name="settings" size={24} color="#4ECDC4" />
        </TouchableOpacity>
      </View>

      <View style={styles.modeSelector}>
        {[
          { key: "ipa", label: "IPA Chart", icon: "record-voice-over" },
          { key: "pronunciation", label: "Pronunciation", icon: "mic" },
          { key: "conversation", label: "AI Chat", icon: "chat" },
        ].map((mode) => (
          <TouchableOpacity
            key={mode.key}
            style={[styles.modeButton, currentMode === mode.key && styles.activeModeButton]}
            onPress={() => setCurrentMode(mode.key as any)}
          >
            <Icon name={mode.icon} size={20} color={currentMode === mode.key ? "#FFFFFF" : "#666"} />
            <Text style={[styles.modeText, currentMode === mode.key && styles.activeModeText]}>{mode.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {currentMode === "ipa" && renderIPAChart()}
        {currentMode === "pronunciation" && renderPronunciationCheck()}
        {currentMode === "conversation" && renderConversationPractice()}
      </Animated.View>

      {/* IPA Sound Detail Modal */}
      <Modal visible={!!selectedIPASound} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.ipaModal}>
            {selectedIPASound && (
              <>
                <Text style={styles.ipaModalSymbol}>{selectedIPASound.symbol}</Text>
                <Text style={styles.ipaModalExample}>Example: {selectedIPASound.example}</Text>
                <Text style={styles.ipaModalDescription}>{selectedIPASound.description}</Text>

                <View style={styles.ipaModalActions}>
                  <TouchableOpacity style={styles.playButton}>
                    <Icon name="volume-up" size={24} color="#4ECDC4" />
                    <Text style={styles.playButtonText}>Play Sound</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.practiceButton}>
                    <Icon name="mic" size={24} color="#45B7D1" />
                    <Text style={styles.practiceButtonText}>Practice</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedIPASound(null)}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* AI Conversation Modal */}
      <Modal visible={!!selectedTopic} animationType="slide">
        <SafeAreaView style={styles.conversationModal}>
          <View style={styles.conversationHeader}>
            <TouchableOpacity onPress={() => setSelectedTopic(null)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.conversationTitle}>{selectedTopic?.title}</Text>
            <View style={[styles.levelBadge, { backgroundColor: selectedTopic?.color }]}>
              <Text style={styles.levelBadgeText}>{selectedTopic?.level}</Text>
            </View>
          </View>

          <ScrollView style={styles.chatContainer}>
            {conversationHistory.map((message, index) => (
              <View
                key={index}
                style={[styles.messageContainer, message.role === "user" ? styles.userMessage : styles.aiMessage]}
              >
                <Text
                  style={[styles.messageText, message.role === "user" ? styles.userMessageText : styles.aiMessageText]}
                >
                  {message.text}
                </Text>
              </View>
            ))}

            {isAISpeaking && (
              <View style={styles.typingIndicator}>
                <Icon name="autorenew" size={24} color="#4ECDC4" />
                <Text style={styles.typingText}>AI is speaking...</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.voiceInputButton}
              onPressIn={startRecording}
              onPressOut={() => {
                stopRecording()
                if (recordedText) {
                  handleUserResponse(recordedText)
                  setRecordedText("")
                }
              }}
            >
              <Icon name="mic" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.inputHint}>Hold to speak</Text>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  modeSelector: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    margin: 20,
    borderRadius: 25,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  activeModeButton: {
    backgroundColor: "#4ECDC4",
  },
  modeText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  activeModeText: {
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
  ipaContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
    marginTop: 10,
  },
  ipaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  ipaButton: {
    width: (width - 60) / 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ipaSymbol: {
    fontSize: 20,
    fontWeight: "600",
    color: "#4ECDC4",
    marginBottom: 4,
  },
  ipaExample: {
    fontSize: 12,
    color: "#666",
  },
  pronunciationContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  micAnimation: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  pronunciationTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  pronunciationSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
  },
  recordButton: {
    marginBottom: 20,
  },
  recordButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4ECDC4",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordingActive: {
    backgroundColor: "#EF4444",
  },
  recordingText: {
    fontSize: 16,
    color: "#4ECDC4",
    fontWeight: "500",
  },
  resultContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    width: "100%",
    alignItems: "center",
  },
  resultLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  resultText: {
    fontSize: 18,
    color: "#333",
    fontWeight: "500",
    marginBottom: 16,
  },
  scoreContainer: {
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: "600",
  },
  conversationContainer: {
    flex: 1,
    padding: 20,
  },
  levelSelector: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    padding: 4,
    marginBottom: 20,
  },
  levelButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 20,
  },
  activeLevelButton: {
    backgroundColor: "#4ECDC4",
  },
  levelText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activeLevelText: {
    color: "#FFFFFF",
  },
  topicsList: {
    flex: 1,
  },
  topicCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topicIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  topicInfo: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  topicDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  scenariosList: {
    gap: 2,
  },
  scenarioText: {
    fontSize: 12,
    color: "#4ECDC4",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  ipaModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: "center",
    minWidth: 280,
  },
  ipaModalSymbol: {
    fontSize: 48,
    fontWeight: "600",
    color: "#4ECDC4",
    marginBottom: 12,
  },
  ipaModalExample: {
    fontSize: 18,
    color: "#333",
    marginBottom: 8,
  },
  ipaModalDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  ipaModalActions: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F8F5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  playButtonText: {
    fontSize: 14,
    color: "#4ECDC4",
    fontWeight: "500",
  },
  practiceButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  practiceButtonText: {
    fontSize: 14,
    color: "#45B7D1",
    fontWeight: "500",
  },
  closeButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: "#666",
  },
  conversationModal: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  conversationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelBadgeText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  chatContainer: {
    flex: 1,
    padding: 20,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: "80%",
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#4ECDC4",
  },
  aiMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
  },
  messageText: {
    fontSize: 16,
    padding: 12,
    borderRadius: 12,
    lineHeight: 22,
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  aiMessageText: {
    color: "#333",
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  typingAnimation: {
    width: 40,
    height: 20,
  },
  typingText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  inputContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  voiceInputButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#4ECDC4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: "#666",
  },
})

export default AdvancedSpeakingScreen
