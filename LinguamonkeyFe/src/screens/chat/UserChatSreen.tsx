import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
  Share,
} from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from "@react-navigation/native"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useAppStore } from "../../stores/appStore"
import { useToast } from "../../hooks/useToast"
import instance from "../../api/axiosInstance"
import { useChatStore } from "../../stores/ChatStore"
import { createScaledSheet } from "../../utils/scaledStyles";

const UserChatScreen = () => {
  const { t } = useTranslation()
  const { user } = useAppStore()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState("")
  const [showChatSettings, setShowChatSettings] = useState(false)
  const [translatingMessageId, setTranslatingMessageId] = useState(null)
  const [chatInfo, setChatInfo] = useState({
    name: "Minh Anh",
    members: 2,
    isOnline: true,
    roomId: "ROOM123456",
    isAdmin: false,
    canKick: false,
  })
  const [editingChatName, setEditingChatName] = useState(false)
  const [newChatName, setNewChatName] = useState(chatInfo.name)
  const activities = useChatStore(state => state.activities)
  const stats = useChatStore(state => state.stats)

  const flatListRef = useRef(null)
  const navigation = useNavigation()
  const route = useRoute()

  // Fetch chat messages
  const { data: chatMessages = [] } = useQuery({
    queryKey: ["chat-messages", chatInfo.roomId],
    queryFn: async () => {
      const response = await instance.get(`/api/chat/messages/${chatInfo.roomId}`)
      return response.data.messages
    },
    onSuccess: (data) => {
      setMessages(data)
    },
  })

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const response = await instance.post("/chat/send", messageData)
      return response.data
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, data.message])
      queryClient.invalidateQueries({ queryKey: ["chat-messages", chatInfo.roomId] })
    },
    onError: () => {
      showToast(t("chat.sendMessageError"), "error")
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
      showToast(t("chat.translationError"), "error")
    },
  })

  // Update chat name mutation
  const updateChatNameMutation = useMutation({
    mutationFn: async (newName) => {
      const response = await instance.put(`/api/chat/rooms/${chatInfo.roomId}`, {
        name: newName,
      })
      return response.data
    },
    onSuccess: (data) => {
      setChatInfo((prev) => ({ ...prev, name: data.name }))
      setEditingChatName(false)
      showToast(t("chat.nameUpdated"))
    },
    onError: () => {
      showToast(t("chat.nameUpdateError"), "error")
    },
  })

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true })
  }, [messages])

  const sendMessage = () => {
    if (inputText.trim() === "") return

    const messageData = {
      text: inputText,
      roomId: chatInfo.roomId,
      userId: user?.user_id,
      timestamp: new Date().toISOString(),
    }

    // Optimistically add message
    const newMessage = {
      id: Date.now(),
      text: inputText,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    setMessages((prev) => [...prev, newMessage])
    setInputText("")

    sendMessageMutation.mutate(messageData)
  }

  const translateMessage = async (messageId, messageText) => {
    setTranslatingMessageId(messageId)
    translateMessageMutation.mutate({
      text: messageText,
      targetLanguage: "vi",
      messageId,
    })
    setTranslatingMessageId(null)
  }

  const shareRoomId = async () => {
    try {
      await Share.share({
        message: t("chat.shareRoomMessage", { roomId: chatInfo.roomId }),
        title: t("chat.shareRoomTitle"),
      })
    } catch (error) {
      console.error("Error sharing:", error)
    }
  }

  const updateChatName = () => {
    if (newChatName.trim() === "") return
    updateChatNameMutation.mutate(newChatName.trim())
  }

  const kickMember = (memberId) => {
    Alert.alert(t("chat.confirmKick"), t("chat.confirmKickMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.confirm"),
        style: "destructive",
        onPress: () => {
          // Implement kick member logic
          showToast(t("chat.memberKicked"), "success")
        },
      },
    ])
  }

  const renderMessage = ({ item: message }) => (
    <View
      style={[
        styles.messageContainer,
        message.sender === "user" ? styles.userMessageContainer : styles.otherMessageContainer,
      ]}
    >
      <View style={[styles.messageBubble, message.sender === "user" ? styles.userMessage : styles.otherMessage]}>
        <Text
          style={[styles.messageText, message.sender === "user" ? styles.userMessageText : styles.otherMessageText]}
        >
          {message.translated ? message.translatedText : message.text}
        </Text>
        <Text style={[styles.timestamp, message.sender === "user" ? styles.userTimestamp : styles.otherTimestamp]}>
          {message.timestamp}
        </Text>
      </View>

      {message.sender === "other" && (
        <TouchableOpacity
          style={styles.translateButton}
          onPress={() => translateMessage(message.id, message.text)}
          disabled={translatingMessageId === message.id || translateMessageMutation.isPending}
        >
          {translatingMessageId === message.id || translateMessageMutation.isPending ? (
            <ActivityIndicator size="small" color="#6B7280" />
          ) : (
            <Icon name={message.translated ? "language" : "language-outline"} size={16} color="#6B7280" />
          )}
        </TouchableOpacity>
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

          <View style={styles.chatInfo}>
            <Text style={styles.chatName}>{chatInfo.name}</Text>
            <View style={styles.statusContainer}>
              <View style={[styles.onlineIndicator, { backgroundColor: chatInfo.isOnline ? "#10B981" : "#6B7280" }]} />
              <Text style={styles.statusText}>
                {chatInfo.isOnline ? t("chat.online") : t("chat.offline")} • {chatInfo.members} {t("chat.members")}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.headerButton} onPress={() => setShowChatSettings(true)}>
            <Icon name="settings-outline" size={22} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          style={styles.messagesContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t("chat.inputPlaceholder")}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={sendMessageMutation.isPending}>
            <Icon name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Modal
          visible={showChatSettings}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowChatSettings(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("chat.roomSettings")}</Text>
                <TouchableOpacity onPress={() => setShowChatSettings(false)}>
                  <Icon name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              <View style={styles.settingsContent}>
                <View style={styles.settingItem}>
                  <Icon name="chatbubble-outline" size={20} color="#6B7280" />
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>{t("chat.roomName")}</Text>
                    {editingChatName ? (
                      <View style={styles.editNameContainer}>
                        <TextInput
                          style={styles.editNameInput}
                          value={newChatName}
                          onChangeText={setNewChatName}
                          onSubmitEditing={updateChatName}
                          autoFocus
                        />
                        <TouchableOpacity onPress={updateChatName}>
                          <Icon name="checkmark" size={20} color="#10B981" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => setEditingChatName(true)}>
                        <Text style={styles.settingValue}>{chatInfo.name}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.settingItem}>
                  <Icon name="people-outline" size={20} color="#6B7280" />
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>{t("chat.members")}</Text>
                    <Text style={styles.settingValue}>
                      {chatInfo.members} {t("chat.people")}
                    </Text>
                  </View>
                </View>

                <View style={styles.settingItem}>
                  <Icon name="key-outline" size={20} color="#6B7280" />
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>{t("chat.roomId")}</Text>
                    <Text style={styles.settingValue}>{chatInfo.roomId}</Text>
                  </View>
                  <TouchableOpacity onPress={shareRoomId} style={styles.shareButton}>
                    <Icon name="share-outline" size={18} color="#3B82F6" />
                  </TouchableOpacity>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.actionButton} onPress={shareRoomId}>
                    <Icon name="share-outline" size={20} color="#3B82F6" />
                    <Text style={styles.actionButtonText}>{t("chat.shareRoom")}</Text>
                  </TouchableOpacity>

                  {chatInfo.canKick && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.dangerButton]}
                      onPress={() => kickMember("member_id")}
                    >
                      <Icon name="person-remove-outline" size={20} color="#EF4444" />
                      <Text style={[styles.actionButtonText, styles.dangerButtonText]}>{t("chat.kickMember")}</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={[styles.actionButton, styles.dangerButton]}>
                    <Icon name="exit-outline" size={20} color="#EF4444" />
                    <Text style={[styles.actionButtonText, styles.dangerButtonText]}>{t("chat.leaveRoom")}</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: "#6B7280",
  },
  headerButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: "flex-end",
  },
  otherMessageContainer: {
    alignItems: "flex-start",
  },
  senderName: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
    marginLeft: 12,
  },
  messageBubble: {
    maxWidth: "75%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  userMessage: {
    backgroundColor: "#3B82F6",
  },
  otherMessage: {
    backgroundColor: "#F3F4F6",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  otherMessageText: {
    color: "#1F2937",
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  userTimestamp: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  otherTimestamp: {
    color: "#9CA3AF",
  },
  translateButton: {
    marginTop: 4,
    padding: 6,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    alignSelf: "flex-start",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  input: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 20,
    padding: 10,
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
  settingsContent: {
    padding: 20,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  settingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  settingLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  settingValue: {
    fontSize: 16,
    color: "#1F2937",
    marginTop: 2,
  },
  editNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  editNameInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    borderBottomWidth: 1,
    borderBottomColor: "#3B82F6",
    paddingVertical: 2,
  },
  shareButton: {
    padding: 8,
  },
  actionButtons: {
    marginTop: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  dangerButton: {
    backgroundColor: "#FEF2F2",
  },
  actionButtonText: {
    fontSize: 16,
    color: "#3B82F6",
    marginLeft: 8,
  },
  dangerButtonText: {
    color: "#EF4444",
  },
})

export default UserChatScreen