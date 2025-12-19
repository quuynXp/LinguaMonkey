import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
  LayoutAnimation,
} from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useToast } from "../../utils/useToast";
import { useChatStore } from "../../stores/ChatStore";
import { useUserStore } from "../../stores/UserStore";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";
import { Room } from "../../types/entity";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
};

const MessageItem = React.memo(({
  message,
}: {
  message: AiMessage,
}) => {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.aiMessageContainer]}>
      <View style={styles.messageRow}>
        <View style={[styles.messageBubble, isUser ? styles.userMessage : styles.aiMessage]}>
          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.aiMessageText]}>
            {message.content}
            {message.isStreaming && <Text style={{ color: '#9CA3AF' }}> •</Text>}
          </Text>
        </View>
      </View>
    </View>
  );
}, (prev, next) => {
  return (
    prev.message.content === next.message.content &&
    prev.message.isStreaming === next.message.isStreaming
  );
});

MessageItem.displayName = 'MessageItem';

const ChatAIScreen = () => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [inputText, setInputText] = useState("");
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const activeAiRoomId = useChatStore(s => s.activeAiRoomId);
  const aiHistory = useChatStore(s => s.aiChatHistory);
  const aiRooms = useChatStore(s => s.aiRoomList);
  const isAiStreaming = useChatStore(s => s.isAiStreaming);
  const loadingByRoom = useChatStore(s => s.loadingByRoom);
  const hasMoreByRoom = useChatStore(s => s.hasMoreByRoom);
  const pageByRoom = useChatStore(s => s.pageByRoom);
  const aiWsConnected = useChatStore(s => s.aiWsConnected);

  const initAiClient = useChatStore(s => s.initAiClient);
  const startNewAiChat = useChatStore(s => s.startNewAiChat);
  const selectAiRoom = useChatStore(s => s.selectAiRoom);
  const fetchAiRoomList = useChatStore(s => s.fetchAiRoomList);
  const loadMessages = useChatStore(s => s.loadMessages);
  const sendAiPrompt = useChatStore(s => s.sendAiPrompt);
  const sendAiWelcomeMessage = useChatStore(s => s.sendAiWelcomeMessage);

  const isLoading = activeAiRoomId ? loadingByRoom[activeAiRoomId] : false;

  // Store lưu [Newest, ..., Oldest] phù hợp với inverted={true}
  const displayMessages = aiHistory;

  useEffect(() => {
    initAiClient();
    const initializeData = async () => {
      await fetchAiRoomList();
      if (!activeAiRoomId) {
        await startNewAiChat();
      }
    };
    if (user?.userId) initializeData();
    return () => { };
  }, [user?.userId, initAiClient]);

  useEffect(() => {
    const onShow = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsKeyboardVisible(true);
    };
    const onHide = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsKeyboardVisible(false);
    };

    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (activeAiRoomId && aiWsConnected && !isLoading) {
      if (aiHistory.length === 0) {
        const welcomeText = t("ai.welcome", "Hello! I am your AI language tutor. How can I help you today?");
        sendAiWelcomeMessage(welcomeText);
      }
    }
  }, [activeAiRoomId, aiWsConnected, isLoading, aiHistory.length, sendAiWelcomeMessage, t]);

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

  const handleSelectHistory = async (room: Room) => {
    setIsHistoryVisible(false);
    if (room.roomId !== activeAiRoomId) {
      await selectAiRoom(room.roomId);
    }
  };

  const renderMessageItem = useCallback(({ item }: { item: AiMessage }) => {
    return <MessageItem message={item} />;
  }, []);

  const keyExtractor = useCallback((item: AiMessage) => item.id, []);

  const inputPaddingBottom = isKeyboardVisible ? 45 : Math.max(insets.bottom, 20);

  return (
    <ScreenLayout keyboardAware={true} disableBottomInset>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
              <Icon name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Icon name="smart-toy" size={24} color="#3B82F6" style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>AI Assistant</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setIsHistoryVisible(true)} style={styles.iconButton}>
              <Icon name="history" size={24} color="#4B5563" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat List */}
        <FlatList
          data={displayMessages}
          renderItem={renderMessageItem}
          keyExtractor={keyExtractor}
          style={styles.chatList}
          contentContainerStyle={styles.chatContent}
          inverted={true} // Inverted: Newest (index 0) at Bottom
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          removeClippedSubviews={true}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
          ListFooterComponent={isLoading ? <ActivityIndicator size="small" color="#3B82F6" style={{ marginVertical: 10 }} /> : null}
          ListEmptyComponent={!isLoading && !isAiStreaming ? (
            <View style={{ alignItems: 'center', marginTop: 50, transform: [{ scaleY: -1 }] }}>
              <Text style={{ color: '#9CA3AF' }}>{t("ai.start_conversation", "Start chatting...")}</Text>
            </View>
          ) : null}
        />

        {/* Streaming Indicator (AI thinking logic) */}
        {isAiStreaming && !aiHistory.some(m => m.isStreaming) && (
          // Chỉ hiện indicator này nếu AI đang "think" mà CHƯA có tin nhắn trả về (streaming chunk đầu tiên chưa tới)
          <View style={styles.streamingIndicator}>
            <ActivityIndicator size="small" color="#6B7280" />
            <Text style={styles.streamingText}>{t("loading.ai", "AI is thinking...")}</Text>
          </View>
        )}

        {/* Input Area */}
        <View style={[styles.inputContainer, { paddingBottom: inputPaddingBottom }]}>
          <TextInput
            style={styles.input}
            placeholder={t("input.placeholder", "Type a message...")}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
            multiline
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

  chatList: { flex: 1 },
  chatContent: { paddingHorizontal: 16, paddingBottom: 16 },

  messageContainer: { marginVertical: 6 },
  userMessageContainer: { alignItems: "flex-end" },
  aiMessageContainer: { alignItems: "flex-start" },
  messageRow: { flexDirection: "row", alignItems: "flex-end" },

  messageBubble: { borderRadius: 16, padding: 12, maxWidth: '85%' },
  userMessage: { backgroundColor: "#3B82F6", borderBottomRightRadius: 4 },
  aiMessage: { backgroundColor: "#F3F4F6", borderBottomLeftRadius: 4 },

  messageText: { fontSize: 16, lineHeight: 22 },
  userMessageText: { color: "#FFFFFF" },
  aiMessageText: { color: "#1F2937" },

  streamingIndicator: { flexDirection: "row", alignItems: "center", padding: 8, justifyContent: "center" },
  streamingText: { marginLeft: 8, color: "#6B7280", fontSize: 12 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    paddingHorizontal: 12,
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