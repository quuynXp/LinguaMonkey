import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet, // Import StyleSheet
} from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useToast } from "../../utils/useToast";
import instance from "../../api/axiosInstance";
import { useChatStore } from "../../stores/ChatStore";
import { createScaledSheet } from "../../utils/scaledStyles";
import { useUserStore } from "../../stores/UserStore";
import { RoomResponse } from "../../types/api";
import { queryClient } from "../../services/queryClient";
import ScreenLayout from "../../components/layout/ScreenLayout";

type AiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
};

const ChatAIScreen = () => {
  const { t, i18n } = useTranslation();
  const { user } = useUserStore();
  const { showToast } = useToast();
  const navigation = useNavigation();
  const scrollViewRef = useRef<FlatList>(null);

  const [inputText, setInputText] = useState("");
  const [showEnvironmentModal, setShowEnvironmentModal] = useState(false);
  const [showTopicsModal, setShowTopicsModal] = useState(false);
  const [currentEnvironment, setCurrentEnvironment] = useState("general");
  const [localTranslations, setLocalTranslations] = useState<{ [msgId: string]: string }>({});

  // --- STATE TỪ ZUSTAND STORE ---
  const aiHistory = useChatStore(s => s.aiChatHistory);
  const isAiStreaming = useChatStore(s => s.isAiStreaming);
  const sendAiMessage = useChatStore(s => s.sendAiMessage);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [aiHistory.length, aiHistory[aiHistory.length - 1]?.content]);

  const {
    data: aiRoomData,
    isLoading: isLoadingAiRoom,
    error: aiRoomError
  } = useQuery<RoomResponse>({
    queryKey: ['aiChatRoom', user?.userId],
    queryFn: async () => {
      const response = await instance.get(`/api/v1/rooms/ai-chat-room`);
      return response.data.result;
    },
    enabled: !!user?.userId,
    retry: 3, // ✅ Retry 3 lần nếu fail
    staleTime: Infinity, // ✅ Cache mãi mãi vì room ID không đổi
  });

  const aiChatRoomId = aiRoomData?.roomId;

  // Loading / error UI for aiRoom is handled later in the component to ensure hooks are called in a stable order.

  // --- API DỊCH ---
  const { mutate: translateMutate, isPending: isTranslating } = useMutation({
    mutationFn: async ({ text, targetLanguage, messageId }: { text: string, targetLanguage: string, messageId: string }) => {
      const response = await instance.post('/api/py/translate', {
        text,
        target_lang: targetLanguage
      });
      return { translated_text: response.data.translated_text, messageId };
    },
    onSuccess: (data) => {
      setLocalTranslations(prev => ({
        ...prev,
        [data.messageId]: data.translated_text
      }));
      showToast({ message: t("translation.success") });
    },
    onError: () => {
      showToast({ message: t("error.translation") });
    },
  });

  // --- API LẤY MÔI TRƯỜNG/CHỦ ĐỀ ---
  const { data: environmentsData } = useQuery({
    queryKey: ["chat-ai-environments"],
    queryFn: async () => {
      const response = await instance.get("/api/v1/chat/environments");
      return response.data.result;
    },
  });

  const { data: topicsData } = useQuery({
    queryKey: ["chat-ai-topics"],
    queryFn: async () => {
      const response = await instance.get("/api/v1/chat/topics");
      return response.data.result;
    },
  });

  const environments = environmentsData || [
    { id: "general", name: t("environment.general"), icon: "chatbubble", description: t("environment.generalDesc") },
    { id: "business", name: t("environment.business"), icon: "briefcase", description: t("environment.businessDesc") },
  ];
  const conversationTopics = topicsData || [
    { id: "greetings", title: t("topics.greetings") || "Greetings", prompt: "Hi, let's practice a greeting conversation." },
    { id: "travel", title: t("topics.travel") || "Travel", prompt: "Tell me about travel to your country." },
  ];

  // --- FUNCTIONS ---
  const handleSendMessage = (messageText = inputText) => {
    if (messageText.trim() === "" || isAiStreaming) return;

    // ✅ Double-check roomId
    if (!aiChatRoomId) {
      console.error("AI Chat Room ID is still not loaded!");
      showToast({
        message: t("error.roomNotReady"),
        type: "error"
      });
      return;
    }

    sendAiMessage(messageText, aiChatRoomId);
    setInputText("");
  };

  const handleTranslate = (messageId: string, messageText: string) => {
    translateMutate({
      text: messageText,
      targetLanguage: i18n.language,
      messageId,
    });
  };

  const selectEnvironment = (environment: any) => {
    setCurrentEnvironment(environment.id);
    setShowEnvironmentModal(false);
  };

  const selectTopic = (topic: any) => {
    setShowTopicsModal(false);
    handleSendMessage(topic.prompt);
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    showToast({ message: t("language.changed") });
  };

  // --- RENDER MESSAGE ITEM ---
  const renderMessage = ({ item: message }: { item: AiMessage }) => {
    const isUser = message.role === 'user';
    const translatedText = localTranslations[message.id];

    return (
      <View
        style={[
          styles.message,
          isUser ? styles.userMessage : styles.aiMessage,
        ]}
      >
        <View style={[styles.messageContent, isUser && styles.userMessageContent]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {translatedText ? translatedText : message.content}
            {message.isStreaming && "..."}
          </Text>
          <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {!isUser && !message.isStreaming && (
          <View style={styles.messageActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleTranslate(message.id, message.content)}
              disabled={isTranslating}
            >
              {isTranslating ? (
                <ActivityIndicator size="small" color="#6B7280" />
              ) : (
                <Icon name={translatedText ? "language" : "language"} size={16} color="#6B7280" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ======================================================
  // === SỬA LỖI RACE CONDITION: THÊM LOADING / ERROR ===
  // ======================================================

  // Nếu đang loading room ID, hiển thị màn hình chờ
  if (isLoadingAiRoom) {
    return (
      <View style={styles.fullScreenLoading}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading AI Chat...</Text>
      </View>
    );
  }

  // Nếu load room ID bị lỗi, hiển thị màn hình lỗi
  if (aiRoomError) {
    return (
      <View style={styles.fullScreenLoading}>
        <Icon name="error-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Error loading AI chat room.</Text>
        <Text>{aiRoomError.message}</Text>
      </View>
    );
  }
  // ======================================================
  // === KẾT THÚC SỬA LỖI ===
  // ======================================================

  // Chỉ render UI chat khi đã có roomId
  return (
    <ScreenLayout>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
          {/* Header */}
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
                <Icon name="workspaces-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={() => setShowTopicsModal(true)}>
                <Icon name="bulb-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
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

          {/* Chat List */}
          <FlatList
            ref={scrollViewRef}
            data={aiHistory}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.chatContainer}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          />

          {/* Loading Indicator (Streaming) */}
          {isAiStreaming && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#6B7280" />
              <Text style={styles.loadingText}>{t("loading.ai")}</Text>
            </View>
          )}

          {/* Input Container */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t("input.placeholder")}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSendMessage()}
              returnKeyType="send"
              multiline
              editable={!isAiStreaming}
            />
            <TouchableOpacity
              style={[styles.sendButton, isAiStreaming && styles.sendButtonDisabled]}
              onPress={() => handleSendMessage()}
              disabled={isAiStreaming}
            >
              <Icon name="send" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Modals */}
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
                http://10.0.2.2:8000/api/v1/rooms/ai-chat-room           <FlatList
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
    </ScreenLayout>
  );
};

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
  userMessageContent: {
    backgroundColor: "#3B82F6",
  },
  messageText: {
    fontSize: 16,
    color: "#1F2937",
    lineHeight: 22,
  },
  userMessageText: {
    color: "#FFFFFF",
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
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  messageActions: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 4,
  },
  actionButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
  },
  // Style này dùng cho loading "..." KHI ĐANG STREAMING
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  // Style này dùng cho loading "..." KHI ĐANG STREAMING
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
  sendButtonDisabled: {
    backgroundColor: "#9CA3AF",
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

  // === STYLE MỚI CHO LOADING/ERROR ===
  fullScreenLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});


export default ChatAIScreen;