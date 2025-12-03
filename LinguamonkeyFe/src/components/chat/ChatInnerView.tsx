import React, { useEffect, useRef, useState, useMemo } from "react";
import {
    ActivityIndicator,
    Alert,
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
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useChatStore } from "../../stores/ChatStore";
import { useUserStore } from "../../stores/UserStore";
import { useFriendships } from "../../hooks/useFriendships"; // Hook xử lý kết bạn
import instance from "../../api/axiosClient";
import { useToast } from "../../utils/useToast";
import { pickAndUploadMedia } from "../../utils/chatMediaUtils";
import { RoomPurpose, FriendshipStatus } from "../../types/enums";
import { RoomResponse, MemberResponse, AppApiResponse, UserProfileResponse } from "../../types/dto";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";
import { useRoute, RouteProp } from '@react-navigation/native';
import { getCountryFlag } from "../../utils/flagUtils";
import { getAvatarSource } from "../../utils/avatarUtils";

const { width } = Dimensions.get('window');

// --- TYPES ---
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
    hasTargetLangTranslation: boolean;
    sentAt: string;
    isRead: boolean;
    senderId: string;
    translatedLang?: string;
    isLocal?: boolean;
    senderProfile?: UserProfileResponse;
    showTranslation?: boolean;
};

interface ChatInnerViewProps {
    roomId: string;
    initialRoomName?: string;
    isBubbleMode?: boolean;
    onCloseBubble?: () => void;
    onMinimizeBubble?: () => void;
    // Settings props passed from parent
    autoTranslate?: boolean;
    soundEnabled?: boolean;
}

type ChatInnerViewRouteParams = {
    roomId: string;
    initialFocusMessageId?: string | null;
};

// --- HELPER FUNCTIONS ---
const formatMessageTime = (sentAt: string | number | Date, locale: string = 'en') => {
    const date = new Date(sentAt);
    if (isNaN(date.getTime())) return '...';
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    return date.toLocaleTimeString(locale, timeOptions);
};

// --- SUB-COMPONENT: QUICK PROFILE POPUP ---
const QuickProfilePopup = ({
    visible,
    profile,
    onClose,
    onNavigateProfile,
    currentUserId
}: {
    visible: boolean;
    profile: UserProfileResponse | null;
    onClose: () => void;
    onNavigateProfile: () => void;
    currentUserId: string;
}) => {
    const { t } = useTranslation();
    const { useCreateFriendship, useUpdateFriendship, useDeleteFriendship } = useFriendships();

    // Mutations
    const createFriendship = useCreateFriendship();
    const updateFriendship = useUpdateFriendship();
    const deleteFriendship = useDeleteFriendship();

    if (!profile) return null;

    const isMe = profile.userId === currentUserId;
    const { isFriend, friendRequestStatus } = profile;

    // Logic xác định trạng thái kết bạn dựa trên data có sẵn
    const hasSentRequest = friendRequestStatus?.hasSentRequest;
    const hasReceivedRequest = friendRequestStatus?.hasReceivedRequest;
    const handleAddFriend = () => {
        createFriendship.mutate({ requesterId: currentUserId, receiverId: profile.userId, status: FriendshipStatus.PENDING });
    };

    const handleAcceptFriend = () => {
        updateFriendship.mutate({
            user1Id: profile.userId,
            user2Id: currentUserId,
            req: { requesterId: profile.userId, receiverId: currentUserId, status: FriendshipStatus.ACCEPTED }
        });
    };

    const handleCancelOrUnfriend = () => {
        deleteFriendship.mutate({ user1Id: currentUserId, user2Id: profile.userId });
    };

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <View style={styles.popupContainer}>
                    {/* Header: Avatar & Basic Info */}
                    <View style={styles.popupHeader}>
                        <Image source={getAvatarSource(profile.avatarUrl, null)} style={styles.popupAvatar} />
                        <View style={styles.popupInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.popupName}>{profile.fullname}</Text>
                                <Text style={{ marginLeft: 5 }}>{getCountryFlag(profile.country)}</Text>
                            </View>
                            <Text style={styles.popupNickname}>@{profile.nickname}</Text>
                            <View style={styles.popupStatsRow}>
                                <Text style={styles.popupStat}>Lv.{profile.level}</Text>
                                <Text style={styles.popupStat}>🔥 {profile.streak}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Details: Proficiency & Languages */}
                    <View style={styles.popupDetails}>
                        <Text style={styles.popupDetailText}>{t('profile.proficiency')}: {profile.proficiency}</Text>
                        <View style={styles.langRow}>
                            {profile.languages?.map((lang, idx) => (
                                <View key={idx} style={styles.langTag}>
                                    <Text style={styles.langText}>{lang}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Actions */}
                    {!isMe && (
                        <View style={styles.popupActions}>
                            {isFriend ? (
                                <TouchableOpacity style={styles.actionBtnSecondary} onPress={handleCancelOrUnfriend}>
                                    <Text style={styles.actionTextSec}>{t('profile.unfriend')}</Text>
                                </TouchableOpacity>
                            ) : hasReceivedRequest ? (
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleAcceptFriend}>
                                        <Text style={styles.actionTextPri}>{t('common.accept')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionBtnSecondary} onPress={handleCancelOrUnfriend}>
                                        <Text style={styles.actionTextSec}>{t('common.deny')}</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : hasSentRequest ? (
                                <TouchableOpacity style={styles.actionBtnSecondary} onPress={handleCancelOrUnfriend}>
                                    <Text style={styles.actionTextSec}>{t('profile.cancel_request')}</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleAddFriend}>
                                    <Icon name="person-add" size={16} color="#FFF" />
                                    <Text style={styles.actionTextPri}>{t('profile.add_friend')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    <TouchableOpacity style={styles.viewProfileBtn} onPress={onNavigateProfile}>
                        <Text style={styles.viewProfileText}>{t('profile.view_full_profile')}</Text>
                    </TouchableOpacity>
                </View>
            </Pressable>
        </Modal>
    );
};

const ChatInnerView: React.FC<ChatInnerViewProps> = ({
    roomId,
    initialRoomName,
    isBubbleMode = false,
    onCloseBubble,
    onMinimizeBubble,
    autoTranslate = false, // Prop settings từ GroupChatScreen
    soundEnabled = true
}) => {
    const { t, i18n } = useTranslation();
    const { showToast } = useToast();
    const navigation = useNavigation<any>();
    const { user } = useUserStore();
    const currentUserId = user?.userId;
    const setCurrentViewedRoomId = useChatStore(s => s.setCurrentViewedRoomId);

    const [inputText, setInputText] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchText, setSearchText] = useState("");

    // Translation States
    const [localTranslations, setLocalTranslations] = useState<any>({});
    const [translationTargetLang, setTranslationTargetLang] = useState(i18n.language || 'vi');
    const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);

    // Message States
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const [editingMessage, setEditingMessage] = useState<UIMessage | null>(null);

    // Profile Popup State
    const [selectedProfile, setSelectedProfile] = useState<UserProfileResponse | null>(null);
    const [isPopupVisible, setIsPopupVisible] = useState(false);

    const route = useRoute<RouteProp<Record<string, ChatInnerViewRouteParams>, string>>();
    const initialFocusMessageId = (route?.params as any)?.initialFocusMessageId ?? null;

    useEffect(() => {
        if (!isBubbleMode) setCurrentViewedRoomId(roomId);
        return () => { if (!isBubbleMode) setCurrentViewedRoomId(null); };
    }, [roomId, isBubbleMode]);

    const loadMessages = useChatStore(s => s.loadMessages);
    const searchMessages = useChatStore(s => s.searchMessages);
    const sendMessage = useChatStore(s => s.sendMessage);
    const editMessage = useChatStore(s => s.editMessage);
    const deleteMessage = useChatStore(s => s.deleteMessage);
    const markMessageAsRead = useChatStore(s => s.markMessageAsRead);
    const messagesByRoom = useChatStore(s => s.messagesByRoom);

    const serverMessages = messagesByRoom[roomId] || [];
    const flatListRef = useRef<FlatList>(null);

    // Queries
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

    // --- MESSAGE PROCESSING LOGIC ---
    const messages: UIMessage[] = useMemo(() => {
        return serverMessages.map((msg: any) => {
            const senderProfileData = msg.senderProfile || null;
            const sentAt = msg?.id?.sentAt || new Date().toISOString();
            const senderId = msg?.senderId ?? 'unknown';
            const messageId = msg?.id?.chatMessageId || `${senderId}_${sentAt}`;

            // Lấy translation từ Local State (ưu tiên) hoặc từ DB
            const dbTrans = msg.translatedLang === translationTargetLang ? msg.translatedText : null;
            const localTrans = localTranslations[messageId]?.[translationTargetLang];
            const finalTranslation = localTrans || dbTrans;

            // Logic hiển thị bản dịch:
            // 1. Nếu autoTranslate bật VÀ message là của người khác VÀ có bản dịch -> True
            // 2. Nếu đã click dịch thủ công (có trong localTranslations) -> True
            // 3. Nếu message đã có sẵn dịch trong DB trùng khớp ngôn ngữ mục tiêu -> True
            const isAutoTranslated = autoTranslate && msg.senderId !== currentUserId;
            const hasTranslationContent = !!finalTranslation;
            const showTranslation = hasTranslationContent && (isAutoTranslated || !!localTrans || !!dbTrans);

            return {
                id: messageId,
                sender: senderId === currentUserId ? 'user' : 'other',
                senderId: senderId,
                timestamp: formatMessageTime(sentAt, i18n.language),
                text: msg.content || '',
                translatedText: finalTranslation, // Text dịch để hiển thị dòng dưới
                translatedLang: msg.translatedLang,
                mediaUrl: (msg as any).mediaUrl,
                messageType: (msg as any).messageType || 'TEXT',
                user: senderProfileData.fullname || 'Unknown',
                avatar: senderProfileData.avatarUrl || null,
                sentAt,
                showTranslation: showTranslation, // Cờ kiểm soát hiển thị
                hasTargetLangTranslation: hasTranslationContent,
                isRead: msg.isRead,
                isLocal: (msg as any).isLocal,
                senderProfile: senderProfileData
            } as UIMessage;
        }).sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    }, [serverMessages, localTranslations, translationTargetLang, currentUserId, autoTranslate]);

    // Effect: Auto Scroll & Read Status
    useEffect(() => { loadMessages(roomId); }, [roomId]);
    useEffect(() => {
        if (!messages.length) return;
        if (initialFocusMessageId) {
            const idx = messages.findIndex(m => m.id === initialFocusMessageId);
            if (idx >= 0) {
                setTimeout(() => {
                    flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
                    setHighlightedMessageId(initialFocusMessageId);
                    setTimeout(() => setHighlightedMessageId(null), 3000);
                }, 500);
            }
        } else {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
        }
    }, [messages.length, initialFocusMessageId]);

    useEffect(() => {
        messages.forEach(msg => {
            if (msg.sender === 'other' && !msg.isRead) {
                markMessageAsRead(roomId, msg.id);
            }
        });
    }, [messages.length, roomId]);

    // --- ACTIONS ---
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

    // --- TRANSLATION API ---
    const { mutate: translateMutate } = useMutation({
        mutationFn: async ({ text, target, id }: any) => {
            setTranslatingMessageId(id);
            // Giả lập API call hoặc gọi thật
            const res = await instance.post('/api/py/translate', { text, target_lang: target, source_lang: 'auto' });
            return { text: res.data.result.translated_text, id, target };
        },
        onSuccess: (data) => {
            setLocalTranslations((prev: any) => ({
                ...prev,
                [data.id]: { ...(prev[data.id] || {}), [data.target]: data.text }
            }));
            setTranslatingMessageId(null);
        },
        onError: () => {
            setTranslatingMessageId(null);
            showToast({ message: t("error.translation"), type: "error" });
        }
    });

    const handleTranslateClick = (id: string, text: string, hasTranslation: boolean) => {
        // Nếu đã có bản dịch (do auto hoặc đã dịch trước đó), click vào sẽ KHÔNG ẩn đi mà có thể là refresh hoặc toggle (tùy nhu cầu).
        // Ở đây ta làm logic: Nếu chưa có dịch -> gọi API. Nếu có rồi -> Toggle hiển thị (nhưng trong code UIMessage đã tính toán showTranslation rồi).
        // Ta sẽ dùng localTranslations để force hiển thị nếu user click thủ công.

        if (translatingMessageId === id) return;

        // Nếu đã có trong local hoặc DB, ta coi như muốn ẩn/hiện? 
        // Logic mới: Auto translate đã hiển thị rồi. Click nút này để dịch thủ công nếu auto chưa chạy hoặc ngôn ngữ khác.
        if (localTranslations[id]?.[translationTargetLang]) {
            // Đã có local -> Toggle? (Xóa khỏi local để ẩn?)
            // Để đơn giản: Nếu đã có, không làm gì hoặc re-translate.
            return;
        }

        translateMutate({ text, target: translationTargetLang, id });
    };

    // --- PROFILE ACTIONS ---
    const handleAvatarPress = (profile?: UserProfileResponse) => {
        if (!profile) return;
        setSelectedProfile(profile);
        setIsPopupVisible(true);
    };

    const navigateToFullProfile = () => {
        setIsPopupVisible(false);
        if (selectedProfile) {
            navigation.navigate("UserProfileViewScreen", { userId: selectedProfile.userId });
        }
    };

    // --- RENDER ITEM ---
    const renderMessageItem = ({ item }: { item: UIMessage }) => {
        const isUser = item.sender === 'user';
        return (
            <Pressable
                onLongPress={() => isUser && setEditingMessage(item)}
                style={[styles.msgRow, isUser ? styles.rowUser : styles.rowOther, highlightedMessageId === item.id && styles.highlighted]}
            >
                {/* Avatar (Clickable) */}
                {!isUser && (
                    <TouchableOpacity onPress={() => handleAvatarPress(item.senderProfile)}>
                        <Image source={getAvatarSource(item.senderProfile?.avatarUrl, null)} style={styles.msgAvatarImg} />
                        {item.senderProfile?.isOnline && <View style={styles.avatarActiveDot} />}
                    </TouchableOpacity>
                )}

                <View style={styles.msgContent}>
                    {!isUser && <Text style={styles.senderName}>{item.user}</Text>}

                    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleOther, item.isLocal && styles.localBubble]}>
                        {/* 1. Media Content */}
                        {(item.messageType === 'IMAGE' || item.messageType === 'VIDEO') && (
                            <View>
                                <Text style={[styles.text, isUser ? styles.textUser : styles.textOther, { fontStyle: 'italic', marginBottom: 5 }]}>
                                    {item.messageType === 'IMAGE' ? t('chat.sent_image') : t('chat.sent_video')}
                                </Text>
                                <Image source={{ uri: item.mediaUrl || item.text }} style={styles.msgImage} resizeMode="cover" />
                            </View>
                        )}

                        {/* 2. Text Content (Original) */}
                        {item.messageType === 'TEXT' && (
                            <Text style={[styles.text, isUser ? styles.textUser : styles.textOther]}>
                                {item.text}
                            </Text>
                        )}

                        {/* 3. Translated Content (Row below) */}
                        {item.showTranslation && item.translatedText && (
                            <View style={styles.translationContainer}>
                                <View style={[styles.divider, isUser ? { backgroundColor: 'rgba(255,255,255,0.3)' } : { backgroundColor: 'rgba(0,0,0,0.1)' }]} />
                                <Text style={[styles.translatedText, isUser ? styles.textUser : styles.textOther]}>
                                    {item.translatedText}
                                </Text>
                                <Text style={[styles.langTag, isUser ? { color: 'rgba(255,255,255,0.6)' } : { color: '#9CA3AF' }]}>
                                    {item.translatedLang?.toUpperCase()}
                                </Text>
                            </View>
                        )}

                        {/* Meta Data */}
                        <View style={styles.metaRow}>
                            <Text style={[styles.time, isUser ? styles.timeUser : styles.timeOther]}>
                                {item.timestamp} {item.isLocal && t('chat.sending')}
                            </Text>
                            {isUser && <Icon name={item.isRead ? "done-all" : "done"} size={12} color={item.isRead ? "#FFF" : "rgba(255,255,255,0.7)"} style={{ marginLeft: 4 }} />}
                        </View>
                    </View>

                    {/* Translate Button (Only for others text) */}
                    {!isUser && item.messageType === 'TEXT' && (
                        <TouchableOpacity
                            onPress={() => handleTranslateClick(item.id, item.text, !!item.translatedText)}
                            style={styles.transBtn}
                            disabled={translatingMessageId === item.id}
                        >
                            {translatingMessageId === item.id ? (
                                <ActivityIndicator size="small" color="#6B7280" />
                            ) : (
                                <Icon name="translate" size={16} color={item.showTranslation ? "#3B82F6" : "#9CA3AF"} />
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </Pressable>
        );
    };

    return (
        <ScreenLayout style={styles.container}>
            {/* Header Area (Simplified for Brevity - Keeping Search/Header Logic) */}
            <View style={[styles.header, isBubbleMode && styles.bubbleHeader]}>
                {!isSearchVisible ? (
                    <>
                        <View style={styles.headerInfo}>
                            <Text style={styles.roomName} numberOfLines={1}>{displayRoomName}</Text>
                            <Text style={styles.status}>{members.length} {t('group.members')}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setIsSearchVisible(true)} style={{ marginLeft: 10 }}>
                            <Icon name="search" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search..."
                            value={searchText}
                            onChangeText={setSearchText}
                            onSubmitEditing={() => searchMessages(roomId, searchText)}
                        />
                        <TouchableOpacity onPress={() => { setSearchText(""); setIsSearchVisible(false); loadMessages(roomId); }}>
                            <Icon name="close" size={24} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                )}
                {isBubbleMode && (
                    <View style={styles.bubbleControls}>
                        <TouchableOpacity onPress={onMinimizeBubble} style={styles.controlBtn}><Icon name="remove" size={24} color="#6B7280" /></TouchableOpacity>
                        <TouchableOpacity onPress={onCloseBubble} style={styles.controlBtn}><Icon name="close" size={24} color="#6B7280" /></TouchableOpacity>
                    </View>
                )}
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                style={styles.list}
                renderItem={renderMessageItem}
                onScrollToIndexFailed={() => { }}
            />

            {/* Input Area */}
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={isBubbleMode ? 0 : 60}>
                {editingMessage && (
                    <View style={styles.editBanner}>
                        <Text style={styles.editText}>{t("chat.editing_message")}</Text>
                        <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(""); }}><Icon name="close" size={20} color="#6B7280" /></TouchableOpacity>
                    </View>
                )}
                <View style={styles.inputArea}>
                    <TouchableOpacity onPress={handleSendMedia} disabled={isUploading} style={styles.attachBtn}>
                        {isUploading ? <ActivityIndicator color="#3B82F6" size="small" /> : <Icon name="image" size={24} color="#3B82F6" />}
                    </TouchableOpacity>
                    <TextInput style={styles.input} value={inputText} onChangeText={setInputText} placeholder={t("group.input.placeholder")} multiline />
                    <TouchableOpacity onPress={handleSendMessage} style={styles.sendBtn}>
                        <Icon name={editingMessage ? "check" : "send"} size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Quick Profile Popup */}
            <QuickProfilePopup
                visible={isPopupVisible}
                profile={selectedProfile}
                onClose={() => setIsPopupVisible(false)}
                onNavigateProfile={navigateToFullProfile}
                currentUserId={currentUserId || ""}
            />
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
    searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 10, height: 40 },
    searchInput: { flex: 1, height: 40, color: '#333' },
    bubbleControls: { flexDirection: 'row', marginLeft: 8 },
    controlBtn: { padding: 4 },
    list: { flex: 1, paddingHorizontal: 16 },
    msgRow: { flexDirection: 'row', marginVertical: 8 },
    rowUser: { justifyContent: 'flex-end' },
    rowOther: { justifyContent: 'flex-start' },
    highlighted: { backgroundColor: 'rgba(255, 235, 59, 0.3)', borderRadius: 8 },
    msgAvatarImg: { width: 32, height: 32, borderRadius: 16, marginRight: 8, marginTop: 4 },
    avatarActiveDot: { position: 'absolute', bottom: 0, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', borderWidth: 1, borderColor: '#FFF' },
    msgContent: { maxWidth: '75%' },
    senderName: { fontSize: 10, color: '#9CA3AF', marginBottom: 2 },
    bubble: { borderRadius: 16, padding: 12 },
    bubbleUser: { backgroundColor: '#3B82F6' },
    bubbleOther: { backgroundColor: '#F3F4F6' },
    localBubble: { opacity: 0.6 },
    msgImage: { width: 200, height: 200, borderRadius: 12, marginTop: 4 },
    text: { fontSize: 16, lineHeight: 22 },
    textUser: { color: '#FFF' },
    textOther: { color: '#1F2937' },

    // Dual Translation Styles
    translationContainer: { marginTop: 6 },
    divider: { height: 1, width: '100%', marginBottom: 4 },
    translatedText: { fontSize: 14, fontStyle: 'italic', lineHeight: 18 },

    metaRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 },
    time: { fontSize: 10 },
    timeUser: { color: 'rgba(255,255,255,0.7)' },
    timeOther: { color: '#9CA3AF' },
    transBtn: { marginTop: 4, padding: 4, alignSelf: 'flex-start' },
    inputArea: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#EEE', alignItems: 'flex-end' },
    input: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100 },
    attachBtn: { padding: 10, marginRight: 8 },
    sendBtn: { backgroundColor: '#3B82F6', borderRadius: 20, padding: 10, marginLeft: 8 },
    editBanner: { backgroundColor: '#FEF3C7', padding: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    editText: { color: '#D97706', fontSize: 12, fontWeight: 'bold' },

    // Popup Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    popupContainer: { width: width * 0.8, backgroundColor: '#FFF', borderRadius: 16, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
    popupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    popupAvatar: { width: 60, height: 60, borderRadius: 30, marginRight: 15 },
    popupInfo: { flex: 1 },
    popupName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
    popupNickname: { fontSize: 14, color: '#6B7280', marginVertical: 2 },
    popupStatsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    popupStat: { fontSize: 12, fontWeight: '600', color: '#4F46E5', backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    popupDetails: { marginBottom: 20 },
    popupDetailText: { fontSize: 14, color: '#374151', marginBottom: 5 },
    langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    langTag: { fontSize: 9, marginTop: 2, textAlign: 'right', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    langText: { fontSize: 12, color: '#4B5563' },
    popupActions: { marginBottom: 15, gap: 10 },
    actionBtnPrimary: { backgroundColor: '#3B82F6', padding: 10, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 },
    actionBtnSecondary: { backgroundColor: '#EF4444', padding: 10, borderRadius: 8, alignItems: 'center' },
    actionTextPri: { color: '#FFF', fontWeight: '600' },
    actionTextSec: { color: '#FFF', fontWeight: '600' },
    viewProfileBtn: { padding: 10, alignItems: 'center', borderTopWidth: 1, borderColor: '#EEE' },
    viewProfileText: { color: '#6B7280', fontSize: 14 }
});

export default ChatInnerView;