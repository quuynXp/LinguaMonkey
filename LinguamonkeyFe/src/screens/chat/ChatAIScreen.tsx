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
} from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useToast } from "../../utils/useToast";
import { useChatStore } from "../../stores/ChatStore";
import { useUserStore } from "../../stores/UserStore";
import ScreenLayout from "../../components/layout/ScreenLayout";
import instance from "../../api/axiosClient";
import { createScaledSheet } from "../../utils/scaledStyles";
import { Room } from "../../types/entity";

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

  const [inputText, setInputText] = useState("");
  const [localTranslations, setLocalTranslations] = useState<LocalTranslationStore>({});
  const [messagesToggleState, setMessagesToggleState] = useState<MessageViewState>({});
  const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [translationTargetLang, setTranslationTargetLang] = useState(i18n.language);

  // Store Selectors
  const activeAiRoomId = useChatStore(s => s.activeAiRoomId);
  const aiHistory = useChatStore(s => s.aiChatHistory);
  const aiRooms = useChatStore(s => s.aiRoomList);
  const isAiStreaming = useChatStore(s => s.isAiStreaming);
  const loadingByRoom = useChatStore(s => s.loadingByRoom);
  const hasMoreByRoom = useChatStore(s => s.hasMoreByRoom);
  const pageByRoom = useChatStore(s => s.pageByRoom);

  const initChatService = useChatStore(s => s.initChatService);
  const startNewAiChat = useChatStore(s => s.startNewAiChat);
  const selectAiRoom = useChatStore(s => s.selectAiRoom);
  const fetchAiRoomList = useChatStore(s => s.fetchAiRoomList);
  const loadMessages = useChatStore(s => s.loadMessages);
  const sendAiPrompt = useChatStore(s => s.sendAiPrompt);

  const isLoading = activeAiRoomId ? loadingByRoom[activeAiRoomId] : false;

  // Inverted list: aiHistory needed in [Newest -> Oldest]
  // Store keeps aiHistory as [Oldest -> Newest] for Context. 
  // We reverse it for Display in Inverted FlatList.
  const displayMessages = React.useMemo(() => [...aiHistory].reverse(), [aiHistory]);

  useEffect(() => {
    const initialize = async () => {
      initChatService();
      await fetchAiRoomList();
      if (!activeAiRoomId) {
        await startNewAiChat();
      }
    };
    initialize();
  }, [user?.userId]);

  const handleLoadMore = () => {
    if (activeAiRoomId && !isLoading && hasMoreByRoom[activeAiRoomId]) {
      const nextPage = (pageByRoom[activeAiRoomId] || 0) + 1;
      loadMessages(activeAiRoomId, nextPage, 10);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText.trim();
    setInputText("");
    await sendAiPrompt(textToSend);
  };

  const { mutate: translateMutate } = useMutation({
    mutationFn: async ({ text, targetLanguage, messageId }: { text: string, targetLanguage: string, messageId: string }) => {
      setTranslatingMessageId(messageId);
      const payload = { text, source_lang: 'auto', target_lang: targetLanguage };
      const response = await instance.post<any>('/api/py/translate', payload);
      const translatedText = response.data.result?.translated_text;
      if (!translatedText) throw new Error("Translation failed");
      return { translatedText, messageId, targetLanguage };
    },
    onSuccess: (data) => {
      setLocalTranslations(prev => ({
        ...prev,
        [data.messageId]: { ...(prev[data.messageId] || {}), [data.targetLanguage]: data.translatedText }
      }));
      setMessagesToggleState(prev => ({ ...prev, [data.messageId]: data.targetLanguage }));
      setTranslatingMessageId(null);
    },
    onError: () => {
      showToast({ message: t("error.translation"), type: "error" });
      setTranslatingMessageId(null);
    },
  });

  const handleToggleTranslation = (messageId: string, messageText: string) => {
    const currentView = messagesToggleState[messageId] || 'original';
    if (currentView !== 'original') {
      setMessagesToggleState(prev => ({ ...prev, [messageId]: 'original' }));
    } else if (localTranslations[messageId]?.[translationTargetLang]) {
      setMessagesToggleState(prev => ({ ...prev, [messageId]: translationTargetLang }));
    } else {
      translateMutate({ messageId, text: messageText, targetLanguage: translationTargetLang });
    }
  };

  const changeLanguage = (lang: string) => {
    setTranslationTargetLang(lang);
    showToast({ message: t("translation.targetUpdated", { lang: lang.toUpperCase() }) });
  };

  const handleSelectHistory = async (room: Room) => {
    setIsHistoryVisible(false);
    if (room.roomId !== activeAiRoomId) {
      await selectAiRoom(room.roomId);
    }
  };

  const renderMessage = ({ item: message }: { item: AiMessage }) => {
    const isUser = message.role === 'user';
    const currentView = messagesToggleState[message.id] || 'original';
    const displayedText = (currentView !== 'original' && localTranslations[message.id]?.[currentView])
      ? localTranslations[message.id]?.[currentView]
      : message.content;

    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.aiMessageContainer]}>
        <View style={styles.messageRow}>
          <TouchableOpacity
            onPress={() => !isUser && handleToggleTranslation(message.id, message.content)}
            style={{ maxWidth: "80%" }}
            disabled={isUser}
          >
            <View style={[styles.messageBubble, isUser ? styles.userMessage : styles.aiMessage]}>
              <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.aiMessageText]}>
                {displayedText}
                {message.isStreaming && "..."}
              </Text>
            </View>
          </TouchableOpacity>

          {!isUser && (
            <TouchableOpacity
              style={styles.translateButtonIcon}
              onPress={() => handleToggleTranslation(message.id, message.content)}
              disabled={translatingMessageId === message.id}
            >
              {translatingMessageId === message.id ? (
                <ActivityIndicator size="small" color="#9CA3AF" />
              ) : (
                <Icon name={currentView !== 'original' ? "undo" : "translate"} size={16} color="#9CA3AF" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScreenLayout>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.container}>
          {/* Custom Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                <Icon name="arrow-back" size={24} color="#1F2937" />
              </TouchableOpacity>

              <View style={styles.headerTitleContainer}>
                {/* Logo & Title */}
                <Icon name="smart-toy" size={24} color="#3B82F6" style={{ marginRight: 8 }} />
                <Text style={styles.headerTitle}>AI Assistant</Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              {/* History Button */}
              <TouchableOpacity onPress={() => setIsHistoryVisible(true)} style={styles.iconButton}>
                <Icon name="history" size={24} color="#4B5563" />
              </TouchableOpacity>

              {/* Language Switcher */}
              <View style={styles.langContainer}>
                {['vi', 'en'].map((lang) => (
                  <TouchableOpacity key={lang} onPress={() => changeLanguage(lang)}>
                    <Text style={[styles.langText, translationTargetLang === lang && styles.activeLangText]}>
                      {lang.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Chat List */}
          <FlatList
            data={displayMessages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.chatList}
            contentContainerStyle={styles.chatContent}
            inverted={true}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.2}
            ListFooterComponent={isLoading ? <ActivityIndicator size="small" color="#3B82F6" style={{ marginVertical: 10 }} /> : null}
          />

          {isAiStreaming && (
            <View style={styles.streamingIndicator}>
              <ActivityIndicator size="small" color="#6B7280" />
              <Text style={styles.streamingText}>{t("loading.ai")}</Text>
            </View>
          )}

          {/* Input Area */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t("input.placeholder")}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
              multiline
              editable={!isAiStreaming}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isAiStreaming) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isAiStreaming}
            >
              <Icon name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* History Modal */}
        <Modal
          visible={isHistoryVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsHistoryVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("history.title") || "Conversation History"}</Text>
                <TouchableOpacity onPress={() => setIsHistoryVisible(false)}>
                  <Icon name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.newChatButton}
                onPress={async () => {
                  setIsHistoryVisible(false);
                  await startNewAiChat();
                }}
              >
                <Icon name="add" size={20} color="#FFFFFF" />
                <Text style={styles.newChatText}>New Chat</Text>
              </TouchableOpacity>

              <FlatList
                data={aiRooms}
                keyExtractor={(item) => item.roomId}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.historyItem, item.roomId === activeAiRoomId && styles.activeHistoryItem]}
                    onPress={() => handleSelectHistory(item)}
                  >
                    <Icon name="chat-bubble-outline" size={20} color="#4B5563" />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.historyName} numberOfLines={1}>
                        {item.roomName || `Chat ${item.roomId.substring(0, 6)}`}
                      </Text>
                      <Text style={styles.historyDate}>
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'Unknown date'}
                      </Text>
                    </View>
                    {item.roomId === activeAiRoomId && <Icon name="check" size={20} color="#3B82F6" />}
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingVertical: 8 }}
              />
            </View>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerTitleContainer: { flexDirection: "row", alignItems: "center", marginLeft: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  headerRight: { flexDirection: "row", alignItems: "center" },
  iconButton: { padding: 4 },
  langContainer: { flexDirection: "row", marginLeft: 12, backgroundColor: "#F3F4F6", borderRadius: 8, padding: 4 },
  langText: { fontSize: 12, color: "#6B7280", paddingHorizontal: 6, fontWeight: "600" },
  activeLangText: { color: "#3B82F6" },

  chatList: { flex: 1 },
  chatContent: { paddingHorizontal: 16, paddingBottom: 16 },

  messageContainer: { marginVertical: 6 },
  userMessageContainer: { alignItems: "flex-end" },
  aiMessageContainer: { alignItems: "flex-start" },
  messageRow: { flexDirection: "row", alignItems: "flex-end" },

  messageBubble: { borderRadius: 16, padding: 12, maxWidth: '100%' },
  userMessage: { backgroundColor: "#3B82F6", borderBottomRightRadius: 4 },
  aiMessage: { backgroundColor: "#F3F4F6", borderBottomLeftRadius: 4 },

  messageText: { fontSize: 16, lineHeight: 22 },
  userMessageText: { color: "#FFFFFF" },
  aiMessageText: { color: "#1F2937" },

  translateButtonIcon: { marginLeft: 8, padding: 4 },

  streamingIndicator: { flexDirection: "row", alignItems: "center", padding: 8, justifyContent: "center" },
  streamingText: { marginLeft: 8, color: "#6B7280", fontSize: 12 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    marginRight: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sendButton: { backgroundColor: "#3B82F6", borderRadius: 24, padding: 10 },
  sendButtonDisabled: { backgroundColor: "#D1D5DB" },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, height: "70%", padding: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  newChatButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#3B82F6", padding: 12, borderRadius: 12, marginBottom: 16
  },
  newChatText: { color: "#FFFFFF", fontWeight: "600", marginLeft: 8 },
  historyItem: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  activeHistoryItem: { backgroundColor: "#EFF6FF", borderRadius: 8, borderBottomWidth: 0 },
  historyName: { fontSize: 16, color: "#374151", fontWeight: "500" },
  historyDate: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
});

export default ChatAIScreen;