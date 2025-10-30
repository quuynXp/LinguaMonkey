import { useNavigation } from "@react-navigation/native"
import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQuery, useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useAppStore } from "../../stores/appStore"
import { useToast } from "../../hooks/useToast"
import instance from "../../api/axiosInstance"
import { useChatStore } from "../../stores/ChatStore"
import { createScaledSheet } from "../../utils/scaledStyles";

const ChatAIScreen = () => {
  const { t, i18n } = useTranslation()
  const { user } = useAppStore()
  const { showToast } = useToast()
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState("")
  const [showEnvironmentModal, setShowEnvironmentModal] = useState(false)
  const [showTopicsModal, setShowTopicsModal] = useState(false)
  const [currentEnvironment, setCurrentEnvironment] = useState("general")
  const [translatingMessageId, setTranslatingMessageId] = useState(null)
  const scrollViewRef = useRef(null)
  const navigation = useNavigation()
  const activities = useChatStore(state => state.activities)
  const stats = useChatStore(state => state.stats)

  // Fetch chat messages
  const { data: fetchedMessages } = useQuery({
    queryKey: ["chat-ai-messages", user?.userId],
    queryFn: async () => {
      const response = await instance.get("/chat-ai/messages")
      return response.data.messages
    },
    onSuccess: (data) => {
      setMessages(data || [])
    },
  })

  // Fetch environments and topics from backend
  const { data: environmentsData } = useQuery({
    queryKey: ["chat-ai-environments"],
    queryFn: async () => {
      const response = await instance.get("/chat-ai/environments")
      return response.data.environments
    },
  })

  const { data: topicsData } = useQuery({
    queryKey: ["chat-ai-topics"],
    queryFn: async () => {
      const response = await instance.get("/chat-ai/topics")
      return response.data.topics
    },
  })

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, environment, language }) => {
      const response = await instance.post("/chat-ai", {
        message,
        environment,
        language,
        userId: user?.userId,
      })
      return response.data
    },
    onSuccess: (data) => {
      const aiMessage = {
        id: Date.now() + 1,
        text: data.message,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString(),
        translated: false,
      }
      setMessages((prevMessages) => [...prevMessages, aiMessage])
    },
    onError: (error) => {
      const errorMessage = {
        id: Date.now() + 1,
        text: t("error.connection"),
        sender: "ai",
        timestamp: new Date().toLocaleTimeString(),
      }
      setMessages((prevMessages) => [...prevMessages, errorMessage])
      showToast(t("error.sendMessage"), "error")
    },
  })

  // Translate message mutation
  const translateMessageMutation = useMutation({
    mutationFn: async ({ text, targetLanguage }) => {
      const response = await instance.post("/chat-ai/translate", {
        text,
        targetLanguage,
      })
      return response.data
    },
    onSuccess: (data, variables) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === variables.messageId ? { ...msg, translatedText: data.translatedText, translated: true } : msg,
        ),
      )
    },
    onError: () => {
      showToast(t("error.translation"), "error")
    },
  })

  const environments = environmentsData || [
    { id: "general", name: t("environment.general"), icon: "chatbubble", description: t("environment.generalDesc") },
    { id: "business", name: t("environment.business"), icon: "briefcase", description: t("environment.businessDesc") },
    { id: "casual", name: t("environment.casual"), icon: "heart", description: t("environment.casualDesc") },
    { id: "academic", name: t("environment.academic"), icon: "school", description: t("environment.academicDesc") },
    { id: "travel", name: t("environment.travel"), icon: "airplane", description: t("environment.travelDesc") },
    {
      id: "restaurant",
      name: t("environment.restaurant"),
      icon: "restaurant",
      description: t("environment.restaurantDesc"),
    },
  ]

  const conversationTopics = topicsData || [
    {
      id: "introduction",
      title: t("topics.introduction"),
      prompt: t("topics.introductionPrompt"),
    },
    {
      id: "job_interview",
      title: t("topics.jobInterview"),
      prompt: t("topics.jobInterviewPrompt"),
    },
    {
      id: "daily_routine",
      title: t("topics.dailyRoutine"),
      prompt: t("topics.dailyRoutinePrompt"),
    },
    {
      id: "hobbies",
      title: t("topics.hobbies"),
      prompt: t("topics.hobbiesPrompt"),
    },
    {
      id: "travel_planning",
      title: t("topics.travelPlanning"),
      prompt: t("topics.travelPlanningPrompt"),
    },
    {
      id: "food_culture",
      title: t("topics.foodCulture"),
      prompt: t("topics.foodCulturePrompt"),
    },
    {
      id: "technology",
      title: t("topics.technology"),
      prompt: t("topics.technologyPrompt"),
    },
    {
      id: "environment",
      title: t("topics.environment"),
      prompt: t("topics.environmentPrompt"),
    },
  ]

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true })
  }, [messages])

  const sendMessage = async (messageText = inputText) => {
    if (messageText.trim() === "") return

    const newMessage = {
      id: Date.now(),
      text: messageText,
      sender: "user",
      timestamp: new Date().toLocaleTimeString(),
    }
    setMessages((prevMessages) => [...prevMessages, newMessage])
    setInputText("")

    sendMessageMutation.mutate({
      message: messageText,
      environment: currentEnvironment,
      language: i18n.language,
    })
  }

  const translateMessage = async (messageId, messageText) => {
    setTranslatingMessageId(messageId)
    translateMessageMutation.mutate({
      text: messageText,
      targetLanguage: i18n.language,
      messageId,
    })
    setTranslatingMessageId(null)
  }

  const selectEnvironment = (environment) => {
    setCurrentEnvironment(environment.id)
    setShowEnvironmentModal(false)
    const systemMessage = {
      id: Date.now(),
      text: t("environment.switch", { name: environment.name }),
      sender: "system",
      timestamp: new Date().toLocaleTimeString(),
    }
    setMessages((prevMessages) => [...prevMessages, systemMessage])
  }

  const selectTopic = (topic) => {
    setShowTopicsModal(false)
    sendMessage(topic.prompt)
  }

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang)
    showToast(t("language.changed"), "success")
  }

  const renderMessage = ({ item: message }) => (
    <View
      style={[
        styles.message,
        message.sender === "user"
          ? styles.userMessage
          : message.sender === "system"
            ? styles.systemMessage
            : styles.aiMessage,
      ]}
    >
      <View style={styles.messageContent}>
        <Text style={[styles.messageText, message.sender === "system" && styles.systemMessageText]}>
          {message.translated ? message.translatedText : message.text}
        </Text>
        <Text style={styles.timestamp}>{message.timestamp}</Text>
      </View>

      {message.sender === "ai" && (
        <View style={styles.messageActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => translateMessage(message.id, message.text)}
            disabled={translatingMessageId === message.id || translateMessageMutation.isPending}
          >
            {translatingMessageId === message.id || translateMessageMutation.isPending ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <Icon name={message.translated ? "language" : "language-outline"} size={16} color="#6B7280" />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  )

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          <View style={styles.aiInfo}>
            <Text style={styles.aiName}>{t("assistant.name")}</Text>
            <Text style={styles.aiStatus}>
              {environments.find((env) => env.id === currentEnvironment)?.name || t("environment.general")}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={() => setShowEnvironmentModal(true)}>
              <Icon name="globe-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={() => setShowTopicsModal(true)}>
              <Icon name="bulb-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
            {/* Language Switcher */}
            <View style={styles.languageSwitcher}>
              <TouchableOpacity onPress={() => changeLanguage("vi")}>
                <Text style={i18n.language === "vi" ? styles.activeLang : styles.lang}>VI</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => changeLanguage("en")}>
                <Text style={i18n.language === "en" ? styles.activeLang : styles.lang}>EN</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => changeLanguage("zh")}>
                <Text style={i18n.language === "zh" ? styles.activeLang : styles.lang}>ZH</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <FlatList
          ref={scrollViewRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          style={styles.chatContainer}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        />

        {sendMessageMutation.isPending && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#6B7280" />
            <Text style={styles.loadingText}>{t("loading.ai")}</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t("input.placeholder")}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => sendMessage()}
            disabled={sendMessageMutation.isPending}
          >
            <Icon name="send" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Environment Selection Modal */}
        <Modal
          visible={showEnvironmentModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowEnvironmentModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("modal.environment.title")}</Text>
                <TouchableOpacity onPress={() => setShowEnvironmentModal(false)}>
                  <Icon name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={environments}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.environmentItem, currentEnvironment === item.id && styles.selectedEnvironment]}
                    onPress={() => selectEnvironment(item)}
                  >
                    <Icon name={item.icon} size={24} color="#6B7280" />
                    <View style={styles.environmentInfo}>
                      <Text style={styles.environmentName}>{item.name}</Text>
                      <Text style={styles.environmentDescription}>{item.description}</Text>
                    </View>
                    {currentEnvironment === item.id && <Icon name="checkmark-circle" size={20} color="#10B981" />}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Conversation Topics Modal */}
        <Modal
          visible={showTopicsModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTopicsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("modal.topics.title")}</Text>
                <TouchableOpacity onPress={() => setShowTopicsModal(false)}>
                  <Icon name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={conversationTopics}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.topicItem} onPress={() => selectTopic(item)}>
                    <Text style={styles.topicTitle}>{item.title}</Text>
                    <Icon name="arrow-forward" size={16} color="#6B7280" />
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = createScaledSheet({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  aiInfo: {
    flex: 1,
    marginLeft: 12,
  },
  aiName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  aiStatus: {
    fontSize: 12,
    color: "#10B981",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    padding: 8,
    marginLeft: 4,
  },
  languageSwitcher: {
    flexDirection: "row",
    marginLeft: 8,
  },
  lang: {
    fontSize: 14,
    color: "#6B7280",
    padding: 8,
  },
  activeLang: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "600",
    padding: 8,
  },
  chatContainer: {
    flex: 1,
    padding: 16,
  },
  message: {
    maxWidth: "85%",
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: "flex-end",
  },
  aiMessage: {
    alignSelf: "flex-start",
  },
  systemMessage: {
    alignSelf: "center",
    maxWidth: "70%",
  },
  messageContent: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
  },
  messageText: {
    fontSize: 16,
    color: "#1F2937",
    lineHeight: 22,
  },
  systemMessageText: {
    fontStyle: "italic",
    textAlign: "center",
    color: "#6B7280",
  },
  timestamp: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
  messageActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  actionButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: "#6B7280",
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  input: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 25,
    padding: 12,
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
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  environmentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  selectedEnvironment: {
    backgroundColor: "#EFF6FF",
  },
  environmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  environmentName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
  },
  environmentDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  topicItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  topicTitle: {
    fontSize: 16,
    color: "#1F2937",
    flex: 1,
  },
})

export default ChatAIScreen