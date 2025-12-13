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
    Pressable,
    Modal,
    Dimensions,
} from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useChatStore } from "../../stores/ChatStore";
import { useUserStore } from "../../stores/UserStore";
import { useToast } from "../../utils/useToast";
import { MemberResponse, UserProfileResponse } from "../../types/dto";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";
import { getAvatarSource } from "../../utils/avatarUtils";
import { useAppStore } from "../../stores/appStore";
import FileUploader from "../common/FileUploader";

const { width } = Dimensions.get('window');

type UIMessage = {
    id: string;
    sender: 'user' | 'other';
    timestamp: string;
    text: string;
    content?: string;
    mediaUrl?: string;
    messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
    translatedText?: string;
    user: string;
    avatar: string | null;
    sentAt: string;
    isRead: boolean;
    senderId: string;
    translatedLang?: string;
    isLocal?: boolean;
    senderProfile?: UserProfileResponse;
    roomId?: string;
    isDeleted?: boolean;
    isEncrypted?: boolean;
};

interface ChatInnerViewProps {
    roomId: string;
    initialRoomName?: string;
    isBubbleMode?: boolean;
    onCloseBubble?: () => void;
    onMinimizeBubble?: () => void;
    soundEnabled?: boolean;
    initialFocusMessageId?: string | null;
    members?: MemberResponse[];
}

const formatMessageTime = (sentAt: string | number | Date, locale: string = 'en') => {
    const date = new Date(sentAt);
    if (isNaN(date.getTime())) return '...';
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    return date.toLocaleTimeString(locale, timeOptions);
};

const QuickProfilePopup = ({ visible, profile, onClose, onNavigateProfile }: any) => {
    if (!visible || !profile) return null;
    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <View style={styles.popupContainer}>
                    <Image source={getAvatarSource(profile.avatarUrl, null)} style={styles.popupAvatar} />
                    <Text style={styles.popupName}>{profile.fullname || profile.nickname}</Text>
                    <TouchableOpacity style={styles.viewProfileBtn} onPress={onNavigateProfile}>
                        <Text style={styles.viewProfileText}>View Profile</Text>
                    </TouchableOpacity>
                </View>
            </Pressable>
        </Modal>
    );
};

const ChatInnerView: React.FC<ChatInnerViewProps> = ({
    roomId,
    isBubbleMode = false,
    members = []
}) => {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const navigation = useNavigation<any>();
    const { user } = useUserStore();

    const chatSettings = useAppStore(state => state.chatSettings);
    const nativeLanguage = useAppStore(state => state.nativeLanguage);

    const autoTranslate = chatSettings.autoTranslate;
    const translationTargetLang = nativeLanguage || 'vi';

    const currentUserId = user?.userId;
    const setCurrentViewedRoomId = useChatStore(s => s.setCurrentViewedRoomId);
    const userStatuses = useChatStore(s => s.userStatuses);
    const eagerTranslations = useChatStore(s => s.eagerTranslations);

    const [inputText, setInputText] = useState("");
    const [editingMessage, setEditingMessage] = useState<UIMessage | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<UserProfileResponse | MemberResponse | null>(null);
    const [isPopupVisible, setIsPopupVisible] = useState(false);
    const [translatingId, setTranslatingId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const membersMap = useMemo(() => {
        const map: Record<string, MemberResponse> = {};
        members.forEach(m => { map[m.userId] = m; });
        return map;
    }, [members]);

    useEffect(() => {
        if (!isBubbleMode) setCurrentViewedRoomId(roomId);
        return () => { if (!isBubbleMode) setCurrentViewedRoomId(null); };
    }, [roomId, isBubbleMode]);

    const loadMessages = useChatStore(s => s.loadMessages);
    const sendMessage = useChatStore(s => s.sendMessage);
    const editMessage = useChatStore(s => s.editMessage);
    const markMessageAsRead = useChatStore(s => s.markMessageAsRead);
    const messagesByRoom = useChatStore(s => s.messagesByRoom);
    const performEagerTranslation = useChatStore(s => s.performEagerTranslation);

    const serverMessages = messagesByRoom[roomId] || [];
    const flatListRef = useRef<FlatList>(null);

    const messages: UIMessage[] = useMemo(() => {
        return serverMessages.map((msg: any) => {
            const senderId = msg?.senderId ?? 'unknown';
            const messageId = msg?.id?.chatMessageId || (typeof msg?.id === 'string' ? msg.id : `${senderId}_${msg.sentAt}`);

            const eagerTrans = eagerTranslations[messageId]?.[translationTargetLang];
            const dbMapTrans = msg.translationsMap ? msg.translationsMap[translationTargetLang] : null;
            const finalTranslation = eagerTrans || dbMapTrans;

            const senderProfile = msg.senderProfile || membersMap[senderId];
            const displayContent = msg.decryptedContent || msg.content || '';
            const isEncrypted = !!msg.senderEphemeralKey;

            return {
                id: messageId,
                sender: senderId === currentUserId ? 'user' : 'other',
                senderId: senderId,
                timestamp: formatMessageTime(msg?.id?.sentAt || new Date()),
                text: displayContent,
                content: msg.content || '',
                mediaUrl: (msg as any).mediaUrl,
                messageType: (msg as any).messageType || 'TEXT',
                translatedText: finalTranslation,
                translatedLang: translationTargetLang,
                user: senderProfile?.fullname || senderProfile?.nickname || 'Unknown',
                avatar: senderProfile?.avatarUrl || null,
                sentAt: msg?.id?.sentAt,
                isRead: msg.isRead,
                isLocal: (msg as any).isLocal,
                senderProfile: senderProfile,
                roomId: roomId,
                isDeleted: msg.isDeleted,
                isEncrypted: isEncrypted,
            } as UIMessage;
        }).sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    }, [serverMessages, eagerTranslations, translationTargetLang, currentUserId, membersMap]);

    useEffect(() => { loadMessages(roomId); }, [roomId]);

    useEffect(() => {
        if (!messages.length) return;
        const timer = setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 200);
        return () => clearTimeout(timer);
    }, [messages.length]);

    useEffect(() => {
        messages.forEach(msg => { if (msg.sender === 'other' && !msg.isRead) markMessageAsRead(roomId, msg.id); });
    }, [messages.length, roomId]);

    const handleSendMessage = () => {
        if (inputText.trim() === "") return;
        if (editingMessage) {
            editMessage(roomId, editingMessage.id, inputText).then(() => { setEditingMessage(null); setInputText(""); }).catch(() => showToast({ message: t("chat.edit_error"), type: "error" }));
        } else {
            sendMessage(roomId, inputText, 'TEXT');
            setInputText("");
        }
    };

    const handleManualTranslate = async (id: string, text: string) => {
        const messageToTranslate = serverMessages.find(m => m.id.chatMessageId === id);
        const contentToTranslate = messageToTranslate?.decryptedContent || messageToTranslate?.content || text;
        if (!contentToTranslate) return;

        setTranslatingId(id);
        await performEagerTranslation(id, contentToTranslate, translationTargetLang);
        setTranslatingId(null);
    };

    const handleUploadSuccess = (result: any, type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT') => {
        const finalUrl = result?.secure_url || result?.url || result?.fileUrl;
        if (finalUrl) {
            sendMessage(roomId, '', type, finalUrl);
        } else {
            console.warn("Upload success but no URL found in result:", result);
        }
    };

    const handleAvatarPress = (profile?: UserProfileResponse) => { if (profile) { setSelectedProfile(profile); setIsPopupVisible(true); } };

    const renderMessageItem = ({ item }: { item: UIMessage }) => {
        const isUser = item.sender === 'user';
        const isMedia = item.messageType === 'IMAGE' || item.messageType === 'VIDEO';
        const status = item.senderId !== 'unknown' ? userStatuses[item.senderId] : null;

        const isTranslationSameAsOriginal = item.text?.trim().toLowerCase() === item.translatedText?.trim().toLowerCase();
        const showTranslatedText = autoTranslate && !!item.translatedText && !isMedia && !isUser && !isTranslationSameAsOriginal;
        const showManualButton = !autoTranslate && !isMedia && !isUser;
        const isTranslating = translatingId === item.id;
        const showDecryptionError = item.isEncrypted && item.text?.startsWith('!! Decryption Failed !!');

        let primaryText = item.text;
        if (item.isEncrypted && primaryText === item.content) {
            primaryText = showDecryptionError ? t('chat.decryption_failed') : t('chat.encrypted_message');
        }

        return (
            <Pressable onLongPress={() => isUser && !isMedia && setEditingMessage(item)} style={[styles.msgRow, isUser ? styles.rowUser : styles.rowOther]}>
                {!isUser && (
                    <TouchableOpacity onPress={() => handleAvatarPress(item.senderProfile)}>
                        <View>
                            <Image source={getAvatarSource(item.avatar, null)} style={styles.msgAvatarImg} />
                            {status?.isOnline && <View style={[styles.activeDot, { right: 8, bottom: 0, borderWidth: 1 }]} />}
                        </View>
                    </TouchableOpacity>
                )}
                <View style={styles.msgContent}>
                    {!isUser && <Text style={styles.senderName}>{item.user}</Text>}

                    {isMedia ? (
                        // Media render without Bubble Wrapper
                        <View style={[styles.mediaContainer, isUser ? styles.mediaUser : styles.mediaOther]}>
                            {item.messageType === 'IMAGE' && (
                                <Image source={{ uri: item.mediaUrl }} style={styles.msgImage} resizeMode="cover" />
                            )}
                            {item.messageType === 'VIDEO' && (
                                <View style={[styles.msgImage, styles.videoPlaceholder]}>
                                    <Icon name="play-circle-outline" size={50} color="#FFF" />
                                </View>
                            )}
                        </View>
                    ) : (
                        // Text/Document render with Bubble Wrapper
                        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleOther, item.isLocal && styles.localBubble]}>
                            {item.messageType === 'DOCUMENT' && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                                    <Icon name="description" size={30} color={isUser ? "#FFF" : "#4B5563"} />
                                    <Text style={[styles.text, isUser ? styles.textUser : styles.textOther, { marginLeft: 8 }]}>{t('chat.document')}</Text>
                                </View>
                            )}

                            <Text style={[styles.text, isUser ? styles.textUser : styles.textOther]}>
                                {primaryText}
                            </Text>

                            {showDecryptionError && (
                                <Text style={[styles.textOtherTrans, { fontSize: 12, color: '#D97706', marginTop: 4, fontStyle: 'italic' }]}>
                                    {t('chat.decryption_error_hint')}
                                </Text>
                            )}

                            {showTranslatedText && (
                                <View style={styles.dualLineContainer}>
                                    <View style={[styles.separator, { backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
                                    <Text style={[styles.translatedText, isUser ? styles.textUserTrans : styles.textOtherTrans]}>
                                        {item.translatedText}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.metaRow}>
                                <Text style={[styles.time, isUser ? styles.timeUser : styles.timeOther]}>{item.timestamp}</Text>
                                {isUser && <Icon name={item.isRead ? "done-all" : "done"} size={12} color={item.isRead ? "#FFF" : "rgba(255,255,255,0.7)"} style={{ marginLeft: 4 }} />}
                            </View>
                        </View>
                    )}

                    {showManualButton && (
                        <TouchableOpacity onPress={() => handleManualTranslate(item.id, item.text)} style={styles.transBtn} disabled={isTranslating}>
                            {isTranslating ? <ActivityIndicator size="small" color="#6B7280" /> : <Icon name="translate" size={16} color="#9CA3AF" />}
                        </TouchableOpacity>
                    )}
                </View>
            </Pressable>
        );
    };

    return (
        <ScreenLayout style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                style={styles.list}
                renderItem={renderMessageItem}
                contentContainerStyle={{ paddingTop: 10, paddingBottom: 10 }}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                removeClippedSubviews={false}
                initialNumToRender={15}
            />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={isBubbleMode ? 0 : 90}>
                {editingMessage && (
                    <View style={styles.editBanner}>
                        <Text style={styles.editText}>{t("chat.editing_message")}</Text>
                        <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(""); }}><Icon name="close" size={20} color="#6B7280" /></TouchableOpacity>
                    </View>
                )}

                <View style={styles.inputWrapper}>
                    {isUploading && (
                        <View style={styles.uploadingOverlay}>
                            <ActivityIndicator size="small" color="#3B82F6" />
                        </View>
                    )}
                    <View style={styles.inputArea}>
                        <FileUploader
                            onUploadStart={() => setIsUploading(true)}
                            onUploadEnd={() => setIsUploading(false)}
                            onUploadSuccess={handleUploadSuccess}
                            mediaType="all"
                            style={styles.attachBtn}
                        >
                            <Icon name="add-photo-alternate" size={26} color="#6B7280" />
                        </FileUploader>

                        <TextInput
                            style={styles.input}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder={t("group.input.placeholder")}
                            multiline
                            placeholderTextColor="#9CA3AF"
                        />

                        <TouchableOpacity onPress={handleSendMessage} style={[styles.sendBtn, !inputText.trim() && { backgroundColor: '#E5E7EB' }]} disabled={!inputText.trim()}>
                            <Icon name={editingMessage ? "check" : "send"} size={20} color={inputText.trim() ? "#FFF" : "#9CA3AF"} />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            <QuickProfilePopup
                visible={isPopupVisible}
                profile={selectedProfile}
                onClose={() => setIsPopupVisible(false)}
                onNavigateProfile={() => { setIsPopupVisible(false); if (selectedProfile) navigation.navigate("UserProfileViewScreen", { userId: selectedProfile.userId }); }}
            />
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: '#FFF' },
    list: { flex: 1, paddingHorizontal: 16 },
    msgRow: { flexDirection: 'row', marginVertical: 6 },
    rowUser: { justifyContent: 'flex-end' },
    rowOther: { justifyContent: 'flex-start' },
    msgAvatarImg: { width: 32, height: 32, borderRadius: 16, marginRight: 8, marginTop: 4 },
    msgContent: { maxWidth: '75%' },
    senderName: { fontSize: 10, color: '#9CA3AF', marginBottom: 2, marginLeft: 4 },

    // Bubble for Text/Docs
    bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleUser: { backgroundColor: '#3B82F6', borderBottomRightRadius: 4 },
    bubbleOther: { backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
    localBubble: { opacity: 0.7 },

    // Media Styles (No Bubble)
    mediaContainer: { borderRadius: 12, overflow: 'hidden' },
    mediaUser: { alignSelf: 'flex-end' },
    mediaOther: { alignSelf: 'flex-start' },
    msgImage: { width: 220, height: 220, backgroundColor: '#E5E7EB' },
    videoPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },

    text: { fontSize: 16, lineHeight: 22 },
    textUser: { color: '#FFF' },
    textOther: { color: '#1F2937' },

    metaRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 },
    time: { fontSize: 10 },
    timeUser: { color: 'rgba(255,255,255,0.7)' },
    timeOther: { color: '#9CA3AF' },
    transBtn: { marginTop: 4, padding: 6, alignSelf: 'flex-start', backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6' },

    inputWrapper: { borderTopWidth: 1, borderColor: '#F3F4F6', backgroundColor: '#FFF', paddingBottom: Platform.OS === 'ios' ? 20 : 0 },
    inputArea: { flexDirection: 'row', padding: 10, alignItems: 'center', backgroundColor: '#FFF' },
    attachBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
    input: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, marginLeft: 5, fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB' },
    sendBtn: { backgroundColor: '#3B82F6', borderRadius: 24, padding: 12, marginLeft: 8, justifyContent: 'center', alignItems: 'center' },
    editBanner: { backgroundColor: '#FEF3C7', padding: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    editText: { color: '#D97706', fontSize: 12, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    popupContainer: { width: width * 0.7, backgroundColor: '#FFF', borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
    popupAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 16 },
    popupName: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 20, textAlign: 'center' },
    viewProfileBtn: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#F3F4F6', borderRadius: 20, width: '100%', alignItems: 'center' },
    viewProfileText: { color: '#374151', fontSize: 14, fontWeight: '600' },
    activeDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderColor: '#FFF' },
    uploadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 10, justifyContent: 'center', alignItems: 'center' },

    dualLineContainer: { marginTop: 6, paddingTop: 6 },
    separator: { height: 1, width: '100%', marginBottom: 4 },
    translatedText: { fontSize: 15, fontStyle: 'italic', lineHeight: 22 },
    textUserTrans: { color: '#E0F2FE' },
    textOtherTrans: { color: '#4B5563' },
});

export default ChatInnerView;