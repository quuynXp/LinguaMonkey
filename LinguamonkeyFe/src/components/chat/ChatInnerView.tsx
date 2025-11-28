import React, { useEffect, useRef, useState, useMemo } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Image,
} from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useChatStore } from "../../stores/ChatStore";
import { useUserStore } from "../../stores/UserStore";
import instance from "../../api/axiosClient";
import { useToast } from "../../utils/useToast";
import { pickAndUploadMedia } from "../../utils/chatMediaUtils";
import { RoomPurpose } from "../../types/enums";
import { RoomResponse, MemberResponse, AppApiResponse } from "../../types/dto";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";

type UIMessage = {
    id: string;
    sender: 'user' | 'other';
    timestamp: string;
    text: string;
    mediaUrl?: string;
    messageType: 'TEXT' | 'IMAGE' | 'VIDEO';
    user: string;
    avatar: string | null;
    currentDisplay: { text: string; lang: string; isTranslatedView: boolean };
    sentAt: string;
};

interface ChatInnerViewProps {
    roomId: string;
    initialRoomName?: string;
    isBubbleMode?: boolean;
    onCloseBubble?: () => void;
    onMinimizeBubble?: () => void;
}

const ChatInnerView: React.FC<ChatInnerViewProps> = ({
    roomId,
    initialRoomName,
    isBubbleMode = false,
    onCloseBubble,
    onMinimizeBubble
}) => {
    const { t, i18n } = useTranslation();
    const { showToast } = useToast();
    const { user } = useUserStore();
    const currentUserId = user?.userId;

    const [inputText, setInputText] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [localTranslations, setLocalTranslations] = useState<any>({});
    const [messagesToggleState, setMessagesToggleState] = useState<any>({});
    const [translationTargetLang] = useState(i18n.language);
    const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);

    // State Store
    const loadMessages = useChatStore(s => s.loadMessages);
    const sendMessage = useChatStore(s => s.sendMessage);
    const messagesByRoom = useChatStore(s => s.messagesByRoom);
    const pageByRoom = useChatStore(s => s.pageByRoom);
    const hasMoreByRoom = useChatStore(s => s.hasMoreByRoom);
    const loadingByRoom = useChatStore(s => s.loadingByRoom);

    const serverMessages = messagesByRoom[roomId] || [];
    const currentPage = pageByRoom[roomId] || 0;
    const hasMore = hasMoreByRoom[roomId] !== false; // Default true
    const isLoading = loadingByRoom[roomId] || false;

    // --- Queries ---
    const { data: roomInfo } = useQuery({
        queryKey: ['roomInfo', roomId],
        queryFn: async () => (await instance.get<AppApiResponse<RoomResponse>>(`/api/v1/rooms/${roomId}`)).data.result,
        enabled: !!roomId,
    });

    const { data: members = [] } = useQuery({
        queryKey: ['roomMembers', roomId],
        queryFn: async () => (await instance.get<AppApiResponse<MemberResponse[]>>(`/api/v1/rooms/${roomId}/members`)).data.result,
        enabled: !!roomId,
    });

    // --- Initial Load ---
    useEffect(() => {
        // Load page 0 (10 tin nhắn mới nhất) ngay khi vào màn hình
        loadMessages(roomId, 0, 10);
    }, [roomId, loadMessages]);

    // --- Load More (Pagination) ---
    const handleLoadMore = () => {
        if (!isLoading && hasMore) {
            console.log(`Loading more messages for room ${roomId}, page ${currentPage + 1}`);
            loadMessages(roomId, currentPage + 1, 10);
        }
    };

    // --- Display Logic ---
    const displayRoomName = useMemo(() => {
        if (!roomInfo) return initialRoomName || t('chat.loading');
        if (roomInfo.purpose === RoomPurpose.PRIVATE_CHAT) {
            const other = members.find(m => m.userId !== currentUserId);
            return other ? (other.nickname || other.fullname) : t('chat.private_room');
        }
        return roomInfo.roomName;
    }, [roomInfo, members, currentUserId, initialRoomName]);

    const messages: UIMessage[] = useMemo(() => {
        // serverMessages đang là [Newest, ..., Oldest] (do Logic upsert/load trong store)
        // FlatList inverted sẽ render item 0 ở dưới cùng. Đúng chuẩn Chat UI.
        return serverMessages.map((msg) => {
            const sentAt = msg?.createdAt || msg?.id?.sentAt || new Date().toISOString();
            const senderId = msg?.senderId ?? 'unknown';
            const messageId = msg?.id?.chatMessageId || `${senderId}_${sentAt}`;
            const senderInfo = members.find(m => m.userId === senderId);

            const currentView = messagesToggleState[messageId] || 'original';
            const localTrans = localTranslations[messageId]?.[currentView];
            const displayedText = (currentView !== 'original' && localTrans) ? localTrans : (msg.content || '');
            const isTranslatedView = currentView !== 'original';

            return {
                id: messageId,
                sender: senderId === currentUserId ? 'user' : 'other',
                timestamp: new Date(sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                text: msg.content || '',
                mediaUrl: (msg as any).mediaUrl,
                messageType: (msg as any).messageType || 'TEXT',
                user: senderInfo?.fullname || 'Unknown',
                avatar: senderInfo?.avatarUrl,
                sentAt,
                currentDisplay: { text: displayedText, lang: isTranslatedView ? currentView : 'original', isTranslatedView },
            } as UIMessage;
        });
        // Không cần sort ở đây nếu Store đã đảm bảo thứ tự DESC (Newest -> Oldest)
        // Nếu Store hỗn loạn, cần sort: .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
    }, [serverMessages, members, localTranslations, messagesToggleState]);

    // --- Actions ---
    const handleSendMessage = () => {
        if (inputText.trim() === "") return;
        sendMessage(roomId, inputText, 'TEXT');
        setInputText("");
    };

    const handleSendMedia = () => {
        pickAndUploadMedia(
            () => setIsUploading(true),
            (url, type) => {
                setIsUploading(false);
                sendMessage(roomId, type === 'IMAGE' ? 'Sent an image' : 'Sent a video', type, url);
            },
            (err) => {
                setIsUploading(false);
                showToast({ message: t("chat.upload_error"), type: "error" });
            }
        );
    };

    // --- Translation ---
    const { mutate: translateMutate } = useMutation({
        mutationFn: async ({ text, target, id }: any) => {
            setTranslatingMessageId(id);
            const res = await instance.post('/api/py/translate', { text, target_lang: target, source_lang: 'auto' });
            return { text: res.data.result.translated_text, id, target };
        },
        onSuccess: (data) => {
            setLocalTranslations((prev: any) => ({
                ...prev,
                [data.id]: { ...(prev[data.id] || {}), [data.target]: data.text }
            }));
            setMessagesToggleState((prev: any) => ({ ...prev, [data.id]: data.target }));
            setTranslatingMessageId(null);
        },
        onError: () => setTranslatingMessageId(null)
    });

    const handleTranslate = (id: string, text: string) => {
        if (translatingMessageId === id) return;
        const currentView = messagesToggleState[id] || 'original';
        if (currentView !== 'original') {
            setMessagesToggleState((p: any) => ({ ...p, [id]: 'original' }));
        } else if (localTranslations[id]?.[translationTargetLang]) {
            setMessagesToggleState((p: any) => ({ ...p, [id]: translationTargetLang }));
        } else {
            translateMutate({ text, target: translationTargetLang, id });
        }
    };

    return (
        <ScreenLayout style={styles.container}>
            {/* Header */}
            <View style={[styles.header, isBubbleMode && styles.bubbleHeader]}>
                <View style={styles.headerInfo}>
                    <Text style={styles.roomName} numberOfLines={1}>{displayRoomName}</Text>
                    <Text style={styles.status}>{members.length} {t('group.members')}</Text>
                </View>
                {isBubbleMode && (
                    <View style={styles.bubbleControls}>
                        <TouchableOpacity onPress={onMinimizeBubble} style={styles.controlBtn}>
                            <Icon name="remove" size={24} color="#6B7280" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onCloseBubble} style={styles.controlBtn}>
                            <Icon name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Messages List (Inverted for Chat UX) */}
            <FlatList
                data={messages}
                keyExtractor={item => item.id}
                style={styles.list}
                inverted={true} // Đảo ngược list: Item[0] (Newest) nằm dưới cùng
                onEndReached={handleLoadMore} // Khi scroll lên trên cùng (thực ra là cuối list data), load page tiếp theo
                onEndReachedThreshold={0.2}
                ListFooterComponent={isLoading ? <ActivityIndicator size="small" color="#3B82F6" style={{ marginVertical: 10 }} /> : null}
                renderItem={({ item }) => (
                    <View style={[styles.msgRow, item.sender === 'user' ? styles.rowUser : styles.rowOther]}>
                        {item.sender === 'other' && (
                            <Text style={styles.avatar}>{item.avatar ? <Image source={{ uri: item.avatar }} style={{ width: 30, height: 30, borderRadius: 15 }} /> : '👤'}</Text>
                        )}
                        <View style={styles.msgContent}>
                            {item.sender === 'other' && <Text style={styles.senderName}>{item.user}</Text>}

                            <View style={[styles.bubble, item.sender === 'user' ? styles.bubbleUser : styles.bubbleOther]}>
                                {item.messageType === 'IMAGE' ? (
                                    <Image source={{ uri: item.mediaUrl || item.text }} style={styles.msgImage} resizeMode="cover" />
                                ) : (
                                    <Text style={[styles.text, item.sender === 'user' ? styles.textUser : styles.textOther]}>
                                        {item.currentDisplay.text}
                                    </Text>
                                )}
                                {item.currentDisplay.isTranslatedView && (
                                    <Text style={styles.transTag}>{item.currentDisplay.lang}</Text>
                                )}
                                <Text style={[styles.time, item.sender === 'user' ? styles.timeUser : styles.timeOther]}>
                                    {item.timestamp}
                                </Text>
                            </View>

                            {/* Translate Btn */}
                            {item.sender === 'other' && item.messageType === 'TEXT' && (
                                <TouchableOpacity onPress={() => handleTranslate(item.id, item.text)} style={styles.transBtn}>
                                    {translatingMessageId === item.id ? <ActivityIndicator size="small" /> :
                                        <Icon name="translate" size={16} color="#6B7280" />}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
            />

            {/* Input */}
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={isBubbleMode ? 0 : 60}>
                <View style={styles.inputArea}>
                    <TouchableOpacity onPress={handleSendMedia} disabled={isUploading} style={styles.attachBtn}>
                        {isUploading ? <ActivityIndicator color="#3B82F6" size="small" /> : <Icon name="image" size={24} color="#3B82F6" />}
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder={t("group.input.placeholder")}
                        multiline
                    />
                    <TouchableOpacity onPress={handleSendMessage} style={styles.sendBtn}>
                        <Icon name="send" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: '#FFF' },
    header: { padding: 16, borderBottomWidth: 1, borderColor: '#EEE', flexDirection: 'row', alignItems: 'center' },
    bubbleHeader: { backgroundColor: '#F9FAFB', paddingTop: 10, paddingBottom: 10 },
    headerInfo: { flex: 1 },
    roomName: { fontWeight: 'bold', fontSize: 16, color: '#1F2937' },
    status: { fontSize: 12, color: '#9CA3AF' },
    bubbleControls: { flexDirection: 'row' },
    controlBtn: { padding: 8 },
    list: { flex: 1, paddingHorizontal: 16 },
    msgRow: { flexDirection: 'row', marginVertical: 8 },
    rowUser: { justifyContent: 'flex-end' },
    rowOther: { justifyContent: 'flex-start' },
    avatar: { marginRight: 8, marginTop: 4, justifyContent: 'center', alignItems: 'center' },
    msgContent: { maxWidth: '75%' },
    senderName: { fontSize: 10, color: '#9CA3AF', marginBottom: 2 },
    bubble: { borderRadius: 16, padding: 12 },
    bubbleUser: { backgroundColor: '#3B82F6' },
    bubbleOther: { backgroundColor: '#F3F4F6' },
    msgImage: { width: 200, height: 200, borderRadius: 12 },
    text: { fontSize: 16 },
    textUser: { color: '#FFF' },
    textOther: { color: '#1F2937' },
    time: { fontSize: 10, marginTop: 4, textAlign: 'right' },
    timeUser: { color: 'rgba(255,255,255,0.7)' },
    timeOther: { color: '#9CA3AF' },
    transTag: { fontSize: 10, color: '#DDD', marginTop: 2, fontStyle: 'italic' },
    transBtn: { marginTop: 4, padding: 4 },
    inputArea: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#EEE', alignItems: 'flex-end' },
    input: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100 },
    attachBtn: { padding: 10, marginRight: 8 },
    sendBtn: { backgroundColor: '#3B82F6', borderRadius: 20, padding: 10, marginLeft: 8 },
});

export default ChatInnerView;