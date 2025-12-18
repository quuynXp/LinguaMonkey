import React, { useEffect, useRef, useState, useMemo } from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Image,
    Pressable,
    Modal,
    Dimensions,
    Keyboard,
    StyleSheet
} from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useChatStore } from "../../stores/ChatStore";
import { useUserStore } from "../../stores/UserStore";
import { useToast } from "../../utils/useToast";
import { MemberResponse, UserProfileResponse } from "../../types/dto";
import { createScaledSheet } from "../../utils/scaledStyles";
import { getAvatarSource } from "../../utils/avatarUtils";
import { getDirectMediaUrl, getDriveThumbnailUrl } from "../../utils/mediaUtils";
import { useAppStore } from "../../stores/appStore";
import FileUploader from "../common/FileUploader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MediaViewerModal from "../common/MediaViewerModal";

const { width } = Dimensions.get('window');

const INPUT_BAR_HEIGHT = 80;

type UIMessage = {
    id: string;
    sender: 'user' | 'other';
    timestamp: string;
    text: string;
    rawContent?: string;
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
    decryptedContent?: string | null;
};

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

interface ChatInnerViewProps {
    roomId: string;
    isBubbleMode?: boolean;
    soundEnabled?: boolean;
    initialFocusMessageId?: string | null;
    members?: MemberResponse[];
    customHeaderHeight?: number;
}

const ChatInnerView: React.FC<ChatInnerViewProps> = ({
    roomId,
    isBubbleMode = false,
    soundEnabled = true,
    initialFocusMessageId = null,
    members = [],
    customHeaderHeight = 0
}) => {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const navigation = useNavigation<any>();
    const { user } = useUserStore();
    const insets = useSafeAreaInsets();

    const chatSettings = useAppStore(state => state.chatSettings);
    const appNativeLang = useAppStore(state => state.nativeLanguage);

    const translationTargetLang = user?.nativeLanguageCode || appNativeLang || 'vi';
    const autoTranslate = chatSettings.autoTranslate;

    const currentUserId = user?.userId;
    const setCurrentViewedRoomId = useChatStore(s => s.setCurrentViewedRoomId);
    const userStatuses = useChatStore(s => s.userStatuses);
    const eagerTranslations = useChatStore(s => s.eagerTranslations);
    const readReceipts = useChatStore(s => s.readReceipts[roomId] || {});
    const typingUsers = useChatStore(s => s.typingUsers[roomId] || []);

    const pageByRoom = useChatStore(s => s.pageByRoom);
    const hasMoreByRoom = useChatStore(s => s.hasMoreByRoom);
    const loadingByRoom = useChatStore(s => s.loadingByRoom);

    const [inputText, setInputText] = useState("");
    const [editingMessage, setEditingMessage] = useState<UIMessage | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<UserProfileResponse | MemberResponse | null>(null);
    const [isPopupVisible, setIsPopupVisible] = useState(false);
    const [translatingId, setTranslatingId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [mediaViewer, setMediaViewer] = useState<{ visible: boolean; url: string | null; type: 'IMAGE' | 'VIDEO' | null }>({
        visible: false, url: null, type: null
    });

    const processedReadIds = useRef<Set<string>>(new Set());
    const flatListRef = useRef<FlatList>(null);
    const lastSentRef = useRef<number>(0);
    const inputRef = useRef<TextInput>(null);
    const isTypingRef = useRef<boolean>(false);
    // Updated: Use 'any' to handle both NodeJS.Timeout and number (React Native)
    const typingTimeoutRef = useRef<any>(null);

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
    const sendTypingStatus = useChatStore(s => s.sendTypingStatus);

    const serverMessages = messagesByRoom[roomId] || [];
    const isLoading = loadingByRoom[roomId] || false;
    const hasMore = hasMoreByRoom[roomId] || false;
    const currentPage = pageByRoom[roomId] || 0;

    const messages: UIMessage[] = useMemo(() => {
        return serverMessages
            .filter((msg: any) => msg.type !== 'INCOMING_CALL' && msg.messageType !== 'INCOMING_CALL')
            .map((msg: any) => {
                const senderId = msg?.senderId ?? 'unknown';
                const messageId = msg?.id?.chatMessageId || (typeof msg?.id === 'string' ? msg.id : `${senderId}_${msg.sentAt}`);
                const eagerTrans = eagerTranslations[messageId]?.[translationTargetLang];
                const dbMapTrans = msg.translationsMap ? msg.translationsMap[translationTargetLang] : null;
                const finalTranslation = eagerTrans || dbMapTrans;
                const senderProfile = msg.senderProfile || membersMap[senderId];
                const isEncrypted = !!msg.senderEphemeralKey;

                let displayContent = '';
                if (msg.decryptedContent) displayContent = msg.decryptedContent;
                else if (isEncrypted) displayContent = '';
                else displayContent = msg.content || '';

                const rawMediaUrl = msg.mediaUrl || (msg as any).media_url || null;

                return {
                    id: messageId,
                    sender: senderId === currentUserId ? 'user' : 'other',
                    senderId: senderId,
                    timestamp: formatMessageTime(msg?.id?.sentAt || new Date()),
                    text: displayContent,
                    rawContent: msg.content,
                    content: msg.content || '',
                    mediaUrl: rawMediaUrl,
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
                    decryptedContent: msg.decryptedContent
                } as UIMessage;
            }).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    }, [serverMessages, eagerTranslations, translationTargetLang, currentUserId, membersMap]);

    useEffect(() => {
        loadMessages(roomId);
    }, [roomId]);

    useEffect(() => {
        if (autoTranslate) {
            messages.forEach(msg => {
                if (msg.sender === 'other' && !msg.translatedText && !msg.isDeleted && msg.messageType === 'TEXT' && msg.text) {
                    performEagerTranslation(msg.id, msg.text, translationTargetLang);
                }
            });
        }
    }, [messages, autoTranslate, translationTargetLang, performEagerTranslation]);

    useEffect(() => {
        const unreadMessages = messages.filter(msg =>
            msg.sender === 'other' && !msg.isRead && !processedReadIds.current.has(msg.id)
        );
        if (unreadMessages.length > 0) {
            unreadMessages.forEach(msg => {
                processedReadIds.current.add(msg.id);
                markMessageAsRead(roomId, msg.id);
            });
        }
    }, [messages, roomId]);

    const handleLoadMore = () => {
        if (hasMore && !isLoading) {
            loadMessages(roomId, currentPage + 1);
        }
    };

    const handleTextChange = (text: string) => {
        setInputText(text);

        if (text.length > 0 && !isTypingRef.current) {
            sendTypingStatus(roomId, true);
            isTypingRef.current = true;
        } else if (text.length === 0 && isTypingRef.current) {
            sendTypingStatus(roomId, false);
            isTypingRef.current = false;
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (text.length > 0) {
            typingTimeoutRef.current = setTimeout(() => {
                if (isTypingRef.current) {
                    sendTypingStatus(roomId, false);
                    isTypingRef.current = false;
                }
            }, 3000);
        }
    };

    const handleSendMessage = () => {
        const now = Date.now();
        if (now - lastSentRef.current < 500) return;
        if (inputText.trim() === "") return;

        lastSentRef.current = now;

        if (isTypingRef.current) {
            sendTypingStatus(roomId, false);
            isTypingRef.current = false;
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        if (editingMessage) {
            editMessage(roomId, editingMessage.id, inputText)
                .then(() => { setEditingMessage(null); setInputText(""); })
                .catch(() => showToast({ message: t("chat.edit_error"), type: "error" }));
        } else {
            sendMessage(roomId, inputText, 'TEXT');
            setInputText("");
            setTimeout(() => {
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }, 100);
        }
    };

    const handleUploadSuccess = (result: any, type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT') => {
        const finalUrl = result?.fileUrl || result?.secure_url || result?.url;
        if (finalUrl) {
            sendMessage(roomId, '', type, finalUrl);
            Keyboard.dismiss();
            inputRef.current?.blur();
            setTimeout(() => {
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }, 100);
        } else {
            showToast({ message: "Upload failed: No URL returned", type: "error" });
        }
    };

    const handleAvatarPress = (profile?: UserProfileResponse) => { if (profile) { setSelectedProfile(profile); setIsPopupVisible(true); } };

    const openMedia = (url: string | undefined, type: 'IMAGE' | 'VIDEO') => {
        if (url) {
            setMediaViewer({ visible: true, url, type });
        }
    };

    const handleManualTranslate = async (id: string, text: string) => {
        const msg = messages.find(m => m.id === id);
        const textToTranslate = msg?.decryptedContent || msg?.content || text;
        if (!textToTranslate) return;
        setTranslatingId(id);
        await performEagerTranslation(id, textToTranslate, translationTargetLang);
        setTranslatingId(null);
    };

    const renderMessageItem = ({ item }: { item: UIMessage }) => {
        const isUser = item.sender === 'user';
        const isMedia = item.messageType === 'IMAGE' || item.messageType === 'VIDEO';
        const status = item.senderId !== 'unknown' ? userStatuses[item.senderId] : null;

        const isTranslationSameAsOriginal = item.text?.trim().toLowerCase() === item.translatedText?.trim().toLowerCase();
        const showTranslatedText = !!item.translatedText && !isMedia && !isUser && !isTranslationSameAsOriginal;
        const showManualButton = !autoTranslate && !isMedia && !isUser;
        const isTranslating = translatingId === item.id;
        const showDecryptionError = item.isEncrypted && item.decryptedContent?.includes('!! Decryption Failed');

        let displayMediaUrl = null;
        let videoThumbnailUrl = null;

        if (isMedia && item.mediaUrl) {
            displayMediaUrl = getDirectMediaUrl(item.mediaUrl, item.messageType);
            if (item.messageType === 'VIDEO') {
                videoThumbnailUrl = getDriveThumbnailUrl(item.mediaUrl);
            }
        }

        let primaryText = item.text;
        let isWaitingForDecrypt = false;

        if (item.isEncrypted) {
            if (item.decryptedContent && !showDecryptionError) {
                primaryText = item.decryptedContent;
            } else if (showDecryptionError) {
                primaryText = "Tin nhắn đã mã hóa";
            } else {
                primaryText = '...';
                isWaitingForDecrypt = true;
            }
        }

        const readers = Object.entries(readReceipts)
            .filter(([uid, msgId]) => msgId === item.id && uid !== currentUserId)
            .map(([uid]) => uid);

        const displayReaders = readers.slice(0, 5);
        const remainingCount = readers.length - 5;

        return (
            <View>
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
                        {isMedia && displayMediaUrl ? (
                            <TouchableOpacity style={[styles.mediaContainer, isUser ? styles.mediaUser : styles.mediaOther]} onPress={() => openMedia(item.mediaUrl, item.messageType as 'IMAGE' | 'VIDEO')}>
                                {item.messageType === 'IMAGE' && (
                                    <Image
                                        source={{ uri: displayMediaUrl }}
                                        style={styles.msgImage}
                                        resizeMode="cover"
                                    />
                                )}
                                {item.messageType === 'VIDEO' && (
                                    <View style={[styles.msgImage, styles.videoPlaceholder]}>
                                        {videoThumbnailUrl ? (
                                            <Image
                                                source={{ uri: videoThumbnailUrl }}
                                                style={[StyleSheet.absoluteFill, { opacity: 0.7 }]}
                                                resizeMode="cover"
                                            />
                                        ) : null}
                                        <Icon name="play-circle-outline" size={50} color="#FFF" style={{ zIndex: 2 }} />
                                    </View>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleOther, item.isLocal && styles.localBubble]}>
                                {item.messageType === 'DOCUMENT' && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                                        <Icon name="description" size={30} color={isUser ? "#FFF" : "#4B5563"} />
                                        <Text style={[styles.text, isUser ? styles.textUser : styles.textOther, { marginLeft: 8 }]}>{t('chat.document')}</Text>
                                    </View>
                                )}
                                <Text
                                    selectable={true}
                                    style={[styles.text, isUser ? styles.textUser : styles.textOther, (isWaitingForDecrypt || showDecryptionError) && { fontStyle: 'italic', opacity: 0.8 }]}
                                >
                                    {primaryText}
                                </Text>

                                {showTranslatedText && (
                                    <View style={styles.dualLineContainer}>
                                        <View style={[styles.separator, { backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
                                        <Text
                                            selectable={true}
                                            style={[styles.translatedText, isUser ? styles.textUserTrans : styles.textOtherTrans]}
                                        >
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

                {readers.length > 0 && (
                    <View style={[styles.readReceiptContainer, isUser ? { justifyContent: 'flex-end', paddingRight: 10 } : { justifyContent: 'flex-start', paddingLeft: 50 }]}>
                        {displayReaders.map((uid) => {
                            const member = membersMap[uid];
                            return (
                                <Image
                                    key={uid}
                                    source={getAvatarSource(member?.avatarUrl, null)}
                                    style={styles.readAvatar}
                                />
                            );
                        })}
                        {remainingCount > 0 && (
                            <View style={styles.moreReadersBubble}>
                                <Text style={styles.moreReadersText}>+{remainingCount}</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    };

    const renderTypingIndicator = () => {
        if (!typingUsers || typingUsers.length === 0) return null;

        const typingMembers = typingUsers
            .map(uid => membersMap[uid])
            .filter(Boolean);

        if (typingMembers.length === 0) return null;

        const displayTyping = typingMembers.slice(0, 3);
        const extraCount = typingMembers.length - 3;

        return (
            <View style={styles.typingContainer}>
                <View style={styles.typingBubble}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {displayTyping.map((m, index) => (
                            <Image
                                key={m.userId}
                                source={getAvatarSource(m.avatarUrl, null)}
                                style={[styles.typingAvatar, { marginLeft: index > 0 ? -10 : 0 }]}
                            />
                        ))}
                        {extraCount > 0 && (
                            <View style={[styles.typingAvatar, styles.typingExtra]}>
                                <Text style={styles.typingExtraText}>+{extraCount}</Text>
                            </View>
                        )}
                        <View style={styles.typingDots}>
                            <View style={styles.dot} />
                            <View style={styles.dot} />
                            <View style={styles.dot} />
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const bottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom, 20) : 10;

    return (
        <View style={{ flex: 1, backgroundColor: '#FFF' }}>
            <View style={{ flex: 1 }}>
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    extraData={[eagerTranslations, loadingByRoom[roomId], readReceipts, typingUsers]}
                    keyExtractor={item => item.id}
                    style={styles.list}
                    renderItem={renderMessageItem}
                    inverted
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    contentContainerStyle={{ paddingTop: 10, paddingBottom: bottomPadding + INPUT_BAR_HEIGHT, flexGrow: 1 }}
                    keyboardShouldPersistTaps="always"
                    keyboardDismissMode="on-drag"
                    initialNumToRender={15}
                    ListFooterComponent={isLoading ? <ActivityIndicator size="small" color="#3B82F6" style={{ marginVertical: 10 }} /> : null}
                    ListHeaderComponent={renderTypingIndicator}
                    maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
                />
            </View>

            {editingMessage && (
                <View style={styles.editBanner}>
                    <Text style={styles.editText}>{t("chat.editing_message")}</Text>
                    <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(""); }}><Icon name="close" size={20} color="#6B7280" /></TouchableOpacity>
                </View>
            )}

            <View style={[styles.inputWrapper, { paddingBottom: bottomPadding }]}>
                {isUploading && <View style={styles.uploadingOverlay}><ActivityIndicator size="small" color="#3B82F6" /></View>}
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
                        ref={inputRef}
                        style={styles.input}
                        value={inputText}
                        onChangeText={handleTextChange}
                        onFocus={() => {
                            setTimeout(() => {
                                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                            }, 200);
                        }}
                        placeholder={t("group.input.placeholder")}
                        multiline
                        placeholderTextColor="#9CA3AF"
                        submitBehavior="newline"
                    />
                    <TouchableOpacity onPress={handleSendMessage} style={[styles.sendBtn, !inputText.trim() && { backgroundColor: '#E5E7EB' }]} disabled={!inputText.trim()}>
                        <Icon name={editingMessage ? "check" : "send"} size={20} color={inputText.trim() ? "#FFF" : "#9CA3AF"} />
                    </TouchableOpacity>
                </View>
            </View>

            <QuickProfilePopup visible={isPopupVisible} profile={selectedProfile} onClose={() => setIsPopupVisible(false)} onNavigateProfile={() => { setIsPopupVisible(false); if (selectedProfile) navigation.navigate("UserProfileViewScreen", { userId: selectedProfile.userId }); }} />

            <MediaViewerModal
                visible={mediaViewer.visible}
                url={mediaViewer.url}
                type={mediaViewer.type}
                onClose={() => setMediaViewer(s => ({ ...s, visible: false }))}
            />
        </View>
    );
};

const styles = createScaledSheet({
    list: { flex: 1, paddingHorizontal: 16 },
    msgRow: { flexDirection: 'row', marginVertical: 2 },
    rowUser: { justifyContent: 'flex-end' },
    rowOther: { justifyContent: 'flex-start' },
    msgAvatarImg: { width: 32, height: 32, borderRadius: 16, marginRight: 8, marginTop: 4 },
    msgContent: { maxWidth: '75%' },
    senderName: { fontSize: 10, color: '#9CA3AF', marginBottom: 2, marginLeft: 4 },
    bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleUser: { backgroundColor: '#3B82F6', borderBottomRightRadius: 4 },
    bubbleOther: { backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
    localBubble: { opacity: 0.7 },
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
    inputWrapper: { borderTopWidth: 1, borderColor: '#F3F4F6', backgroundColor: '#FFF', zIndex: 20 },
    inputArea: { flexDirection: 'row', padding: 10, alignItems: 'center', backgroundColor: '#FFF' },
    attachBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
    input: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 100,
        marginLeft: 5,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        color: '#1F2937',
        textAlignVertical: 'top'
    },
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
    readReceiptContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 6 },
    readAvatar: { width: 14, height: 14, borderRadius: 7, marginLeft: 2, borderWidth: 1, borderColor: '#FFF' },
    moreReadersBubble: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', marginLeft: 2 },
    moreReadersText: { fontSize: 8, color: '#6B7280', fontWeight: 'bold' },
    typingContainer: { marginLeft: 50, marginBottom: 5, alignSelf: 'flex-start' },
    typingBubble: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16, borderBottomLeftRadius: 4 },
    typingAvatar: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#FFF' },
    typingExtra: { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', marginLeft: -8 },
    typingExtraText: { fontSize: 8, fontWeight: 'bold', color: '#6B7280' },
    typingDots: { flexDirection: 'row', marginLeft: 6, alignItems: 'center' },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#9CA3AF', marginHorizontal: 1 }
});

export default ChatInnerView;