import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useToast } from "../../utils/useToast";
import { useChatStore } from "../../stores/ChatStore";
import { createScaledSheet } from "../../utils/scaledStyles";
import { useUserStore } from "../../stores/UserStore";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { translateText } from "../../services/pythonService";

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
  const [localTranslations, setLocalTranslations] = useState<{ [msgId: string]: string }>({});
  const [isInitializing, setIsInitializing] = useState(true);

  // --- STORE SELECTORS ---
  const aiHistory = useChatStore(s => s.aiChatHistory);
  const isAiStreaming = useChatStore(s => s.isAiStreaming);
  const sendAiPrompt = useChatStore(s => s.sendAiPrompt);
  const initChatService = useChatStore(s => s.initChatService);
  const startAiChat = useChatStore(s => s.startAiChat);
  const activeAiRoomId = useChatStore(s => s.activeAiRoomId);

  // --- INIT CHAT ---
  useEffect(() => {
    const initialize = async () => {
      try {
        initChatService();
        if (user?.userId) {
          // Sử dụng hàm của store để gọi đúng endpoint GET /ai-chat-room của backend
          await startAiChat();
        }
      } catch (error) {
        console.error("Failed to init AI Chat:", error);
        showToast({ message: t("error.loadAiRoom"), type: "error" });
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, [user?.userId, initChatService, startAiChat]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (aiHistory.length > 0) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [aiHistory.length, aiHistory[aiHistory.length - 1]?.content]);

  // --- API TRANSLATE ---
  const { mutate: translateMutate, isPending: isTranslating } = useMutation({
    mutationFn: async ({ text, messageId }: { text: string, messageId: string }) => {
      const translatedText = await translateText(text);
      return { translated_text: translatedText, messageId };
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

  const handleSendMessage = (messageText = inputText) => {
    if (messageText.trim() === "" || isAiStreaming) return;

    if (!activeAiRoomId) {
      showToast({ message: t("error.roomNotReady"), type: "error" });
      // Thử khởi tạo lại nếu mất kết nối room
      startAiChat();
      return;
    }

    sendAiPrompt(messageText);
    setInputText("");
  };

  const handleTranslate = (messageId: string, messageText: string) => {
    translateMutate({
      text: messageText,
      messageId,
    });
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    showToast({ message: t("language.changed") });
  };

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

  if (isInitializing) {
    return (
      <View style={styles.fullScreenLoading}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>{t("loading.aiRoom")}</Text>
      </View>
    );
  }

  return (
    <ScreenLayout>
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
                {t("status.online")}
              </Text>
            </View>
            <View style={styles.headerActions}>
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
            data={aiHistory}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.chatContainer}
            contentContainerStyle={{ paddingBottom: 20 }}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          />

          {isAiStreaming && (
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
              onSubmitEditing={() => handleSendMessage()}
              returnKeyType="send"
              multiline
              editable={!isAiStreaming && !!activeAiRoomId}
            />
            <TouchableOpacity
              style={[styles.sendButton, (isAiStreaming || !activeAiRoomId) && styles.sendButtonDisabled]}
              onPress={() => handleSendMessage()}
              disabled={isAiStreaming || !activeAiRoomId}
            >
              <Icon name="send" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
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
  sendButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  fullScreenLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default ChatAIScreen;