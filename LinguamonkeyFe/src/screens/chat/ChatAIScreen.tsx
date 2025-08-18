"use client"

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
import MaterialIcons from "react-native-vector-icons/Ionicons"
import axios from "axios"
import { useTranslation } from "react-i18next"
import "../../i18n"

// Custom fetcher for useSWR
const fetcher = (url) => axios.get(url).then((res) => res.data)

const ChatAIScreen = () => {
  const { t, i18n } = useTranslation()
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState("")
  const [loading, setLoading] = useState(false)
  const [showEnvironmentModal, setShowEnvironmentModal] = useState(false)
  const [showTopicsModal, setShowTopicsModal] = useState(false)
  const [currentEnvironment, setCurrentEnvironment] = useState("general")
  const [translatingMessageId, setTranslatingMessageId] = useState(null)
  const scrollViewRef = useRef()
  const navigation = useNavigation()

  // Fetch messages using useSWR
  const { data: fetchedMessages, error: messagesError } = useSWR("/api/chat-ai/messages", fetcher, {
    onSuccess: (data) => {
      setMessages(data.messages || [])
    },
  })

  // Fetch environments and topics from backend
  const { data: environmentsData } = useSWR("/api/chat-ai/environments", fetcher)
  const { data: topicsData } = useSWR("/api/chat-ai/topics", fetcher)

  const environments = environmentsData || []
  const conversationTopics = topicsData || []

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
    setLoading(true)

    try {
      const response = await axios.post("/api/chat-ai", {
        message: messageText,
        environment: currentEnvironment,
        language: i18n.language,
      })
      const aiMessage = {
        id: Date.now() + 1,
        text: response.data.message,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString(),
        translated: false,
      }
      setMessages((prevMessages) => [...prevMessages, aiMessage])
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage = {
        id: Date.now() + 1,
        text: t("error.connection"),
        sender: "ai",
        timestamp: new Date().toLocaleTimeString(),
      }
      setMessages((prevMessages) => [...prevMessages, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const translateMessage = async (messageId, messageText) => {
    setTranslatingMessageId(messageId)
    try {
      const response = await axios.post("/api/chat-ai/translate", {
        text: messageText,
        targetLanguage: i18n.language,
      })
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, translatedText: response.data.translatedText, translated: true } : msg,
        ),
      )
    } catch (error) {
      console.error("Translation error:", error)
    } finally {
      setTranslatingMessageId(null)
    }
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
            disabled={translatingMessageId === message.id}
          >
            {translatingMessageId === message.id ? (
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

        {loading && (
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
          <TouchableOpacity style={styles.sendButton} onPress={() => sendMessage()}>
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

const styles = StyleSheet.create({
  // ... (Existing styles remain unchanged, adding language switcher styles)
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
})

export default ChatAIScreen