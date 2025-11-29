import React, { useEffect, useRef, useState, useMemo } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Image,
    Pressable,
} from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
    translatedText?: string;
    user: string;
    avatar: string | null;
    currentDisplay: { text: string; lang: string; isTranslatedView: boolean };
    hasTargetLangTranslation: boolean;
    sentAt: string;
    isRead: boolean;
    senderId: string;
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
    const [translationTargetLang, setTranslationTargetLang] = useState(i18n.language);
    const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);

    // Edit Mode State
    const [editingMessage, setEditingMessage] = useState<UIMessage | null>(null);

    const loadMessages = useChatStore(s => s.loadMessages);
    const sendMessage = useChatStore(s => s.sendMessage);
    const editMessage = useChatStore(s => s.editMessage);
    const deleteMessage = useChatStore(s => s.deleteMessage);
    const markMessageAsRead = useChatStore(s => s.markMessageAsRead);
    const messagesByRoom = useChatStore(s => s.messagesByRoom);

    const serverMessages = messagesByRoom[roomId] || [];
    const flatListRef = useRef<FlatList>(null);

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

    // --- Display Logic ---
    const targetMember = useMemo(() => {
        if (!members.length) return null;
        return members.find(m => m.userId !== currentUserId);
    }, [members, currentUserId]);

    const displayRoomName = useMemo(() => {
        if (!roomInfo) return initialRoomName || t('chat.loading');
        if (roomInfo.purpose === RoomPurpose.PRIVATE_CHAT) {
            return targetMember ? (targetMember.nickname || targetMember.fullname) : t('chat.private_room');
        }
        return roomInfo.roomName;
    }, [roomInfo, members, targetMember, initialRoomName]);

    const messages: UIMessage[] = useMemo(() => {
        return serverMessages.map((msg) => {
            const sentAt = msg?.id?.sentAt || new Date().toISOString();
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
                senderId: senderId,
                timestamp: new Date(sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                text: msg.content || '',
                mediaUrl: (msg as any).mediaUrl,
                messageType: (msg as any).messageType || 'TEXT',
                user: senderInfo?.fullname || 'Unknown',
                avatar: senderInfo?.avatarUrl,
                sentAt,
                currentDisplay: { text: displayedText, lang: isTranslatedView ? currentView : 'original', isTranslatedView },
                hasTargetLangTranslation: !!localTranslations[messageId]?.[translationTargetLang],
                isRead: msg.isRead
            } as UIMessage;
        }).sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    }, [serverMessages, members, localTranslations, messagesToggleState, translationTargetLang]);

    useEffect(() => { loadMessages(roomId); }, [roomId]);
    useEffect(() => { if (messages.length) flatListRef.current?.scrollToEnd({ animated: true }); }, [messages.length]);

    // --- Read Receipt Logic ---
    useEffect(() => {
        // Mark unread messages from others as read when entering/updating view
        messages.forEach(msg => {
            if (msg.sender === 'other' && !msg.isRead) {
                markMessageAsRead(roomId, msg.id);
            }
        });
    }, [messages.length, roomId]);

    // --- Actions ---
    const handleSendMessage = () => {
        if (inputText.trim() === "") return;

        if (editingMessage) {
            handleUpdateMessage();
        } else {
            sendMessage(roomId, inputText, 'TEXT');
            setInputText("");
        }
    };

    const handleUpdateMessage = async () => {
        if (!editingMessage) return;
        try {
            await editMessage(roomId, editingMessage.id, inputText);
            setEditingMessage(null);
            setInputText("");
        } catch (error) {
            showToast({ message: t("chat.edit_error"), type: "error" });
        }
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

    // --- Edit / Delete Logic ---
    const handleLongPress = (item: UIMessage) => {
        if (item.sender !== 'user') return; // Only edit own messages

        const sentTime = new Date(item.sentAt).getTime();
        const now = new Date().getTime();
        const diffMinutes = (now - sentTime) / (1000 * 60);

        if (diffMinutes > 5) {
            Alert.alert(t("chat.options"), t("chat.cannot_edit_expired"));
            return;
        }

        Alert.alert(
            t("chat.message_options"),
            undefined,
            [
                { text: t("common.cancel"), style: "cancel" },
                {
                    text: t("common.edit"),
                    onPress: () => {
                        setEditingMessage(item);
                        setInputText(item.text);
                    }
                },
                {
                    text: t("common.delete"),
                    style: "destructive",
                    onPress: () => {
                        Alert.alert(
                            t("chat.confirm_delete"),
                            t("chat.delete_warning"),
                            [
                                { text: t("common.cancel"), style: "cancel" },
                                {
                                    text: t("common.delete"),
                                    style: "destructive",
                                    onPress: () => deleteMessage(roomId, item.id)
                                }
                            ]
                        );
                    }
                }
            ]
        );
    };

    const handleCancelEdit = () => {
        setEditingMessage(null);
        setInputText("");
    };

    // --- Translation (Simplified) ---
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

    const renderActiveDot = (userId: string, style: any) => {
        const member = members.find(m => m.userId === userId);
        const isOnline = (member as any)?.isOnline || false;

        if (isOnline) {
            return <View style={style} />;
        }
        return null;
    };

    return (
        <ScreenLayout style={styles.container}>
            {/* Header */}
            <View style={[styles.header, isBubbleMode && styles.bubbleHeader]}>
                {roomInfo?.purpose === RoomPurpose.PRIVATE_CHAT && targetMember ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View>
                            <Text style={styles.avatar}>{targetMember.avatarUrl ? <Image source={{ uri: targetMember.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} /> : '👤'}</Text>
                            {renderActiveDot(targetMember.userId, styles.headerActiveDot)}
                        </View>
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.roomName} numberOfLines={1}>{displayRoomName}</Text>
                            <Text style={styles.status}>{(targetMember as any).isOnline ? "Active now" : "Offline"}</Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.headerInfo}>
                        <Text style={styles.roomName} numberOfLines={1}>{displayRoomName}</Text>
                        <Text style={styles.status}>{members.length} {t('group.members')}</Text>
                    </View>
                )}

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

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                style={styles.list}
                renderItem={({ item }) => (
                    <Pressable
                        onLongPress={() => handleLongPress(item)}
                        style={[styles.msgRow, item.sender === 'user' ? styles.rowUser : styles.rowOther]}
                    >
                        {item.sender === 'other' && (
                            <View>
                                {item.avatar ?
                                    <Image source={{ uri: item.avatar }} style={styles.msgAvatarImg} /> :
                                    <Text style={styles.avatar}>👤</Text>
                                }
                                {renderActiveDot(item.senderId, styles.avatarActiveDot)}
                            </View>
                        )}
                        <View style={styles.msgContent}>
                            {item.sender === 'other' && <Text style={styles.senderName}>{item.user}</Text>}

                            <View style={[styles.bubble, item.sender === 'user' ? styles.bubbleUser : styles.bubbleOther]}>
                                {item.messageType === 'IMAGE' ? (
                                    <Image
                                        source={{ uri: item.mediaUrl || item.text }}
                                        style={styles.msgImage}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Text style={[styles.text, item.sender === 'user' ? styles.textUser : styles.textOther]}>
                                        {item.currentDisplay.text}
                                    </Text>
                                )}
                                {item.currentDisplay.isTranslatedView && (
                                    <Text style={styles.transTag}>{item.currentDisplay.lang}</Text>
                                )}
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 }}>
                                    <Text style={[styles.time, item.sender === 'user' ? styles.timeUser : styles.timeOther]}>
                                        {item.timestamp}
                                    </Text>
                                    {item.sender === 'user' && (
                                        <Icon
                                            name={item.isRead ? "done-all" : "done"}
                                            size={12}
                                            color={item.isRead ? "#FFF" : "rgba(255,255,255,0.7)"}
                                            style={{ marginLeft: 4 }}
                                        />
                                    )}
                                </View>
                            </View>

                            {/* Translate Btn */}
                            {item.sender === 'other' && item.messageType === 'TEXT' && (
                                <TouchableOpacity onPress={() => handleTranslate(item.id, item.text)} style={styles.transBtn}>
                                    {translatingMessageId === item.id ? <ActivityIndicator size="small" /> :
                                        <Icon name="translate" size={16} color="#6B7280" />}
                                </TouchableOpacity>
                            )}
                        </View>
                    </Pressable>
                )}
            />

            {/* Input */}
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={isBubbleMode ? 0 : 60}>
                {editingMessage && (
                    <View style={styles.editBanner}>
                        <Text style={styles.editText}>{t("chat.editing_message")}</Text>
                        <TouchableOpacity onPress={handleCancelEdit}>
                            <Icon name="close" size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                )}
                <View style={styles.inputArea}>
                    <TouchableOpacity onPress={handleSendMedia} disabled={isUploading || !!editingMessage} style={styles.attachBtn}>
                        {isUploading ? <ActivityIndicator color="#3B82F6" size="small" /> : <Icon name="image" size={24} color={editingMessage ? "#CCC" : "#3B82F6"} />}
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder={editingMessage ? t("chat.edit_placeholder") : t("group.input.placeholder")}
                        multiline
                    />
                    <TouchableOpacity onPress={handleSendMessage} style={styles.sendBtn}>
                        <Icon name={editingMessage ? "check" : "send"} size={20} color="#FFF" />
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
    avatar: { fontSize: 24, marginRight: 8, marginTop: 4 },
    msgAvatarImg: { width: 30, height: 30, borderRadius: 15, marginRight: 8, marginTop: 4 },
    avatarActiveDot: { position: 'absolute', bottom: 0, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', borderWidth: 1, borderColor: '#FFF' },
    headerActiveDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFF' },
    msgContent: { maxWidth: '75%' },
    senderName: { fontSize: 10, color: '#9CA3AF', marginBottom: 2 },
    bubble: { borderRadius: 16, padding: 12 },
    bubbleUser: { backgroundColor: '#3B82F6' },
    bubbleOther: { backgroundColor: '#F3F4F6' },
    msgImage: { width: 200, height: 200, borderRadius: 12 },
    text: { fontSize: 16 },
    textUser: { color: '#FFF' },
    textOther: { color: '#1F2937' },
    time: { fontSize: 10, textAlign: 'right' },
    timeUser: { color: 'rgba(255,255,255,0.7)' },
    timeOther: { color: '#9CA3AF' },
    transTag: { fontSize: 10, color: '#DDD', marginTop: 2, fontStyle: 'italic' },
    transBtn: { marginTop: 4, padding: 4 },
    inputArea: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#EEE', alignItems: 'flex-end' },
    input: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100 },
    attachBtn: { padding: 10, marginRight: 8 },
    sendBtn: { backgroundColor: '#3B82F6', borderRadius: 20, padding: 10, marginLeft: 8 },
    editBanner: { backgroundColor: '#FEF3C7', padding: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    editText: { color: '#D97706', fontSize: 12, fontWeight: 'bold' }
});

export default ChatInnerView;