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
import instance from "../../api/axiosClient";

type PythonTranslateResponse = { translated_text: string };

type AiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
};

type LocalTranslationStore = {
  [msgId: string]: {
    [targetLang: string]: string;
  };
};

type MessageViewState = {
  [msgId: string]: string | 'original';
};

const ChatAIScreen = () => {
  const { t, i18n } = useTranslation();
  const { user } = useUserStore();
  const { showToast } = useToast();
  const navigation = useNavigation();
  const scrollViewRef = useRef<FlatList>(null);

  const [inputText, setInputText] = useState("");
  const [localTranslations, setLocalTranslations] = useState<LocalTranslationStore>({});
  const [messagesToggleState, setMessagesToggleState] = useState<MessageViewState>({});
  const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);

  // Bỏ qua loading nếu dữ liệu đã có
  const [isInitializing, setIsInitializing] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const [translationTargetLang, setTranslationTargetLang] = useState(i18n.language);

  // --- STORE SELECTORS ---
  const aiHistory = useChatStore(s => s.aiChatHistory); // Lấy history
  const isAiStreaming = useChatStore(s => s.isAiStreaming);
  const sendAiPrompt = useChatStore(s => s.aiChatHistory); // FIX: Lỗi copy paste ở đây, phải là sendAiPrompt
  const initChatService = useChatStore(s => s.initChatService);
  const startAiChat = useChatStore(s => s.startAiChat);
  const activeAiRoomId = useChatStore(s => s.activeAiRoomId);
  const isAiInitialMessageSent = useChatStore(s => s.isAiInitialMessageSent);
  const sendAiWelcomeMessage = useChatStore(s => s.sendAiWelcomeMessage);
  // Sửa lại cho đúng:
  const sendAiPromptCorrected = useChatStore(s => s.sendAiPrompt);


  // --- INIT CHAT & LOAD HISTORY ---
  useEffect(() => {
    const initialize = async () => {
      // Chỉ hiển thị loading nếu CHƯA có dữ liệu
      if (aiHistory.length === 0) {
        setIsInitializing(true);
      } else {
        // Nếu đã có dữ liệu, không cần hiển thị loading
        setIsInitializing(false);
      }

      setInitialLoadComplete(false);
      setTranslationTargetLang(i18n.language);

      try {
        initChatService();
        if (user?.userId) {
          // CHỈ GỌI START CHAT (VÀ LOAD HISTORY) NẾU LỊCH SỬ ĐANG TRỐNG
          if (aiHistory.length === 0) {
            await startAiChat();
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t("error.unknown");
        console.error("Failed to init AI Chat:", error);
        showToast({
          message: `${t("error.loadAiRoom")}: ${errorMessage}`,
          type: "error"
        });
      } finally {
        setIsInitializing(false);
        setInitialLoadComplete(true);
      }
    };

    const unsubscribe = navigation.addListener('focus', initialize);
    return unsubscribe;
    // THÊM aiHistory.length vào dependency để lắng nghe sự thay đổi của dữ liệu trong store
  }, [user?.userId, initChatService, startAiChat, navigation, i18n.language, aiHistory.length]);

  // --- SEND INITIAL WELCOME MESSAGE ---
  useEffect(() => {
    // CHỈ gửi tin nhắn chào mừng nếu load xong và lịch sử đang trống
    if (initialLoadComplete && !isAiInitialMessageSent && aiHistory.length === 0) {
      sendAiWelcomeMessage();
    }
  }, [initialLoadComplete, isAiInitialMessageSent, sendAiWelcomeMessage, aiHistory.length]);


  useEffect(() => {
    if (aiHistory.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [aiHistory.length]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText.trim();
    setInputText("");
    // Dùng biến sendAiPromptCorrected đã sửa
    await sendAiPromptCorrected(textToSend);
  };

  const { mutate: translateMutate } = useMutation<
    { translatedText: string; messageId: string; targetLanguage: string },
    Error,
    { text: string, targetLanguage: string, messageId: string }
  >({
    mutationFn: async ({ text, targetLanguage, messageId }) => {
      setTranslatingMessageId(messageId);

      const payload = {
        text: text,
        source_lang: 'auto',
        target_lang: targetLanguage,
      };

      const response = await instance.post<any>('/api/py/translate', payload);
      const responseData = response.data.result || response.data;
      const translatedText = responseData?.translated_text;

      if (!translatedText) {
        throw new Error("Invalid translation response structure or missing 'translated_text' field.");
      }

      return { translatedText: translatedText, messageId, targetLanguage };
    },
    onSuccess: (data) => {
      setLocalTranslations(prev => ({
        ...prev,
        [data.messageId]: {
          ...(prev[data.messageId] || {}),
          [data.targetLanguage]: data.translatedText
        }
      }));
      setMessagesToggleState(prev => ({ ...prev, [data.messageId]: data.targetLanguage }));
      showToast({ message: t("translation.success") });
      setTranslatingMessageId(null);
    },
    onError: () => {
      showToast({ message: t("error.translation"), type: "error" });
      setTranslatingMessageId(null);
    },
  });

  const handleTranslate = (messageId: string, messageText: string) => {
    if (translatingMessageId === messageId) return;

    const targetLang = translationTargetLang;
    const localTranslation = localTranslations[messageId]?.[targetLang];
    const currentView = messagesToggleState[messageId] || 'original';

    if (currentView !== 'original') {
      setMessagesToggleState(prev => ({ ...prev, [messageId]: 'original' }));
      return;
    }

    if (currentView === 'original' && localTranslation) {
      setMessagesToggleState(prev => ({ ...prev, [messageId]: targetLang }));
      return;
    }

    translateMutate({ messageId, text: messageText, targetLanguage: targetLang });
  };

  const handleToggleTranslation = (messageId: string, messageText: string) => {
    const currentView = messagesToggleState[messageId] || 'original';
    const targetLang = translationTargetLang;
    const hasCurrentTargetLangTranslation = localTranslations[messageId]?.[targetLang];

    if (currentView === 'original') {
      if (hasCurrentTargetLangTranslation) {
        setMessagesToggleState(prev => ({ ...prev, [messageId]: targetLang }));
      } else {
        handleTranslate(messageId, messageText);
      }
    } else {
      setMessagesToggleState(prev => ({ ...prev, [messageId]: 'original' }));
    }
  }

  const changeLanguage = (lang: string) => {
    setTranslationTargetLang(lang);
    showToast({ message: t("translation.targetUpdated", { lang: lang.toUpperCase() }) });
  };

  const renderMessage = ({ item: message }: { item: AiMessage }) => {
    const isUser = message.role === 'user';
    const showTranslationAction = message.role === 'assistant';

    const targetLang = translationTargetLang;
    const currentView = messagesToggleState[message.id] || 'original';

    const localTranslation = localTranslations[message.id]?.[currentView as string];
    const displayedText = (currentView !== 'original' && localTranslation)
      ? localTranslation
      : message.content;

    const isTranslatedView = currentView !== 'original';
    const displayLang = isTranslatedView ? currentView : 'original';

    const hasCurrentTargetLangTranslation = !!localTranslations[message.id]?.[targetLang];
    const isCurrentTranslating = translatingMessageId === message.id;

    const buttonStyle = hasCurrentTargetLangTranslation ? styles.translatedButton : {};
    const iconColor = hasCurrentTargetLangTranslation ? "#3B82F6" : "#6B7280";

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.aiMessageContainer,
        ]}
      >
        <View style={styles.messageRow}>
          <TouchableOpacity
            onPress={() => showTranslationAction && handleToggleTranslation(message.id, message.content)}
            style={[styles.messageContentWrapper, { maxWidth: "80%" }]}
            disabled={isUser}
          >
            <View style={[styles.messageBubble, isUser ? styles.userMessage : styles.aiMessage]}>
              <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.aiMessageText]}>
                {displayedText}
                {message.isStreaming && "..."}
              </Text>
              {isTranslatedView && (
                <Text style={[styles.translationLangTag, isUser && styles.userTranslationLangTag]}>
                  {displayLang.toUpperCase()} {t('translation.tag')}
                </Text>
              )}
              <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.aiTimestamp]}>
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </TouchableOpacity>

          {showTranslationAction && (
            <View style={styles.translateButtonContainer}>
              <TouchableOpacity
                style={[styles.translateButton, buttonStyle]}
                onPress={() => handleTranslate(message.id, message.content)}
                disabled={isCurrentTranslating}
              >
                {isCurrentTranslating ? (
                  <ActivityIndicator size="small" color="#6B7280" />
                ) : isTranslatedView ? (
                  <Icon name={"undo"} size={16} color={iconColor} />
                ) : (
                  <Icon name={"language"} size={16} color={iconColor} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (isInitializing && aiHistory.length === 0) { // CHỈ HIỂN THỊ LOADING NẾU ĐANG INIT VÀ CHƯA CÓ DỮ LIỆU
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
              <Text style={styles.aiStatus}>{t("status.online")}</Text>
            </View>
            <View style={styles.headerActions}>
              <View style={styles.languageSwitcher}>
                <TouchableOpacity onPress={() => changeLanguage("vi")}>
                  <Text style={translationTargetLang === "vi" ? styles.activeLang : styles.lang}>VI</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => changeLanguage("en")}>
                  <Text style={translationTargetLang === "en" ? styles.activeLang : styles.lang}>EN</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => changeLanguage("zh")}>
                  <Text style={translationTargetLang === "zh" ? styles.activeLang : styles.lang}>ZH</Text>
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
            onContentSizeChange={() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }}
            extraData={{ localTranslations, messagesToggleState }}
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
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
              multiline
              editable={!isAiStreaming && !!activeAiRoomId}
            />
            <TouchableOpacity
              style={[styles.sendButton, (isAiStreaming || !activeAiRoomId) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
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
  messageContainer: {
    marginBottom: 12,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  messageContentWrapper: {
    flexShrink: 1,
  },
  userMessageContainer: {
    alignSelf: "flex-end",
  },
  aiMessageContainer: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: 'auto',
  },
  userMessage: {
    backgroundColor: "#3B82F6",
  },
  aiMessage: {
    backgroundColor: "#F3F4F6",
  },
  messageText: {
    fontSize: 16,
    color: "#1F2937",
    lineHeight: 22,
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  aiMessageText: {
    color: "#1F2937",
  },
  timestamp: {
    fontSize: 11,
    color: "#9CA3AF",
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  aiTimestamp: {
    color: "#9CA3AF",
  },
  translationLangTag: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  userTranslationLangTag: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  translateButtonContainer: {
    width: 38,
    height: 38,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  translateButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    alignSelf: "flex-start",
  },
  translatedButton: {
    backgroundColor: "#E0F2FE",
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