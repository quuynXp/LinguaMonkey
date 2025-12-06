import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
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
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useChatStore, getMessageDisplayData } from "../../stores/ChatStore";
import { useUserStore } from "../../stores/UserStore";
import { useFriendships } from "../../hooks/useFriendships";
import instance from "../../api/axiosClient";
import { useToast } from "../../utils/useToast";
import FileUploader from "../../components/common/FileUploader";
import { RoomPurpose, FriendshipStatus } from "../../types/enums";
import { RoomResponse, MemberResponse, AppApiResponse, UserProfileResponse } from "../../types/dto";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";
import { getCountryFlag } from "../../utils/flagUtils";
import { getAvatarSource } from "../../utils/avatarUtils";

const { width } = Dimensions.get('window');

// --- TYPES ---
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
    hasTargetLangTranslation: boolean;
    sentAt: string;
    isRead: boolean;
    senderId: string;
    translatedLang?: string;
    isLocal?: boolean;
    senderProfile?: UserProfileResponse;
    showTranslation?: boolean;
    roomId?: string;
    isDeleted?: boolean;
};

interface ChatInnerViewProps {
    roomId: string;
    initialRoomName?: string;
    isBubbleMode?: boolean;
    onCloseBubble?: () => void;
    onMinimizeBubble?: () => void;
    autoTranslate?: boolean;
    soundEnabled?: boolean;
    initialFocusMessageId?: string | null;
    members?: MemberResponse[];
}

type ChatInnerViewRouteParams = {
    roomId: string;
    initialFocusMessageId?: string | null;
};

type LanguageOption = {
    code: string;
    name: string;
    flag: React.JSX.Element | null;
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
    currentUserId,
    statusInfo
}: {
    visible: boolean;
    profile: UserProfileResponse | MemberResponse | null;
    onClose: () => void;
    onNavigateProfile: () => void;
    currentUserId: string;
    statusInfo?: { isOnline: boolean; lastActiveAt?: string }
}) => {
    const { t } = useTranslation();
    const { useCreateFriendship, useUpdateFriendship, useDeleteFriendship } = useFriendships();
    const createFriendship = useCreateFriendship();
    const updateFriendship = useUpdateFriendship();
    const deleteFriendship = useDeleteFriendship();

    if (!profile) return null;

    const isMe = profile.userId === currentUserId;
    const fullProfile = (profile as any).friendRequestStatus ? (profile as UserProfileResponse) : null;
    const isFriend = fullProfile?.isFriend;
    const friendRequestStatus = fullProfile?.friendRequestStatus;
    const hasSentRequest = friendRequestStatus?.hasSentRequest;
    const hasReceivedRequest = friendRequestStatus?.hasReceivedRequest;

    const handleAddFriend = () => createFriendship.mutate({ requesterId: currentUserId, receiverId: profile.userId, status: FriendshipStatus.PENDING });
    const handleAcceptFriend = () => updateFriendship.mutate({ user1Id: profile.userId, user2Id: currentUserId, req: { requesterId: profile.userId, receiverId: currentUserId, status: FriendshipStatus.ACCEPTED } });
    const handleCancelOrUnfriend = () => deleteFriendship.mutate({ user1Id: currentUserId, user2Id: profile.userId });

    let statusText = "";
    if (statusInfo?.isOnline) statusText = "Active now";
    else if (statusInfo?.lastActiveAt) {
        const diff = Date.now() - new Date(statusInfo.lastActiveAt).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) statusText = `Active ${mins}m ago`;
        else {
            const hours = Math.floor(mins / 60);
            statusText = `Active ${hours}h ago`;
        }
    }

    const avatarUrl = profile.avatarUrl;
    const name = profile.fullname || (profile as any).nickNameInRoom;
    const countryFlag = fullProfile?.country ? getCountryFlag(fullProfile.country) : "";

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <View style={styles.popupContainer}>
                    <View style={styles.popupHeader}>
                        <View>
                            <Image source={getAvatarSource(avatarUrl, null)} style={styles.popupAvatar} />
                            {statusInfo?.isOnline && <View style={[styles.activeDot, { right: 15, bottom: 5 }]} />}
                        </View>
                        <View style={styles.popupInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.popupName}>{name}</Text>
                                <Text style={{ marginLeft: 5 }}>{countryFlag}</Text>
                            </View>
                            <Text style={styles.popupNickname}>@{profile.nickname}</Text>
                            {statusText !== "" && <Text style={{ fontSize: 10, color: '#10B981' }}>{statusText}</Text>}
                            {fullProfile && (
                                <View style={styles.popupStatsRow}>
                                    <Text style={styles.popupStat}>Lv.{fullProfile.level}</Text>
                                    <Text style={styles.popupStat}>🔥 {fullProfile.streak}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {fullProfile && (
                        <View style={styles.popupDetails}>
                            <Text style={styles.popupDetailText}>{t('profile.proficiency')}: {fullProfile.proficiency}</Text>
                            <View style={styles.langRow}>
                                {fullProfile.languages?.map((lang, idx) => (
                                    <View key={idx} style={styles.langTag}><Text style={styles.langText}>{lang}</Text></View>
                                ))}
                            </View>
                        </View>
                    )}

                    {!isMe && fullProfile && (
                        <View style={styles.popupActions}>
                            {isFriend ? (
                                <TouchableOpacity style={styles.actionBtnSecondary} onPress={handleCancelOrUnfriend}><Text style={styles.actionTextSec}>{t('profile.unfriend')}</Text></TouchableOpacity>
                            ) : hasReceivedRequest ? (
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleAcceptFriend}><Text style={styles.actionTextPri}>{t('common.accept')}</Text></TouchableOpacity>
                                    <TouchableOpacity style={styles.actionBtnSecondary} onPress={handleCancelOrUnfriend}><Text style={styles.actionTextSec}>{t('common.deny')}</Text></TouchableOpacity>
                                </View>
                            ) : hasSentRequest ? (
                                <TouchableOpacity style={styles.actionBtnSecondary} onPress={handleCancelOrUnfriend}><Text style={styles.actionTextSec}>{t('profile.cancel_request')}</Text></TouchableOpacity>
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

// --- SUB-COMPONENT: CHAT LANGUAGE SELECTOR ---
const ChatLanguageSelector = ({
    selectedLanguage,
    onSelectLanguage,
    availableLanguages,
}: {
    selectedLanguage: LanguageOption;
    onSelectLanguage: (lang: LanguageOption) => void;
    availableLanguages: LanguageOption[];
}) => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);
    const canExpand = availableLanguages.length > 1;

    // Filter out languages that don't have a code (if any) or are invalid
    if (!availableLanguages || availableLanguages.length === 0) return null;

    return (
        <View style={styles.languageSelectorContainer}>
            <TouchableOpacity
                style={[styles.selectedLanguageButton, !canExpand && { paddingRight: 8 }]}
                onPress={() => canExpand && setIsExpanded(!isExpanded)}
                activeOpacity={canExpand ? 0.7 : 1}
                disabled={!canExpand}
            >
                <Text style={styles.selectorLabel}>{t('common.translateTo', 'Dịch sang')}:</Text>
                <View style={styles.languageFlagWrapper}>
                    {selectedLanguage.flag}
                </View>
                {canExpand && (
                    <Icon
                        name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                        size={20}
                        color="#4F46E5"
                        style={{ marginLeft: 4 }}
                    />
                )}
            </TouchableOpacity>

            {isExpanded && canExpand && (
                <View style={styles.languageDropdown}>
                    {availableLanguages.filter(lang => lang.code !== selectedLanguage.code).map((lang) => (
                        <TouchableOpacity
                            key={lang.code}
                            style={styles.languageItem}
                            onPress={() => {
                                onSelectLanguage(lang);
                                setIsExpanded(false);
                            }}
                        >
                            <View style={styles.languageFlagWrapper}>
                                {lang.flag}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

const ChatInnerView: React.FC<ChatInnerViewProps> = ({
    roomId,
    initialRoomName,
    isBubbleMode = false,
    onCloseBubble,
    onMinimizeBubble,
    autoTranslate = false,
    soundEnabled = true,
    members = []
}) => {
    const { t, i18n } = useTranslation();
    const { showToast } = useToast();
    const navigation = useNavigation<any>();
    const { user } = useUserStore();
    const currentUserId = user?.userId;
    const setCurrentViewedRoomId = useChatStore(s => s.setCurrentViewedRoomId);
    const userStatuses = useChatStore(s => s.userStatuses);

    const [inputText, setInputText] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    // Translation State
    const [localTranslations, setLocalTranslations] = useState<any>({});
    const [messagesToggleState, setMessagesToggleState] = useState<any>({});
    const [translationTargetLang, setTranslationTargetLang] = useState(i18n.language || 'vi');
    const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);

    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const [editingMessage, setEditingMessage] = useState<UIMessage | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<UserProfileResponse | MemberResponse | null>(null);
    const [isPopupVisible, setIsPopupVisible] = useState(false);

    const route = useRoute<RouteProp<Record<string, ChatInnerViewRouteParams>, string>>();

    // --- Language Options Logic ---
    const getLanguageOption = useCallback((langCode: string): LanguageOption => ({
        code: langCode,
        name: langCode.toUpperCase(),
        flag: getCountryFlag(langCode, 20),
    }), []);

    const availableLanguages: LanguageOption[] = useMemo(() => {
        const langs = user?.languages && user.languages.length > 0 ? user.languages : [i18n.language || 'en'];
        // Ensure current target lang is in the list
        if (!langs.includes(translationTargetLang)) {
            langs.push(translationTargetLang);
        }
        return Array.from(new Set(langs)).map(getLanguageOption);
    }, [user?.languages, i18n.language, translationTargetLang, getLanguageOption]);

    const selectedLanguageOption = useMemo(() =>
        availableLanguages.find(l => l.code === translationTargetLang) || getLanguageOption(translationTargetLang),
        [availableLanguages, translationTargetLang, getLanguageOption]);

    const handleSelectLanguage = (lang: LanguageOption) => {
        setTranslationTargetLang(lang.code);
    };

    // 🎯 MEMOIZE MEMBER LOOKUP
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

    const serverMessages = messagesByRoom[roomId] || [];
    const flatListRef = useRef<FlatList>(null);

    const messages: UIMessage[] = useMemo(() => {
        return serverMessages.map((msg: any) => {
            const senderId = msg?.senderId ?? 'unknown';
            const messageId = msg?.id?.chatMessageId || `${senderId}_${msg.sentAt}`;
            const dbTrans = msg.translatedLang === translationTargetLang ? msg.translatedText : null;
            const localTrans = localTranslations[messageId]?.[translationTargetLang];
            const finalTranslation = localTrans || dbTrans;
            const isAutoTranslated = autoTranslate && msg.senderId !== currentUserId;
            const hasMedia = !!(msg as any).mediaUrl || (msg as any).messageType !== 'TEXT';
            const showTranslation = !hasMedia && !!finalTranslation && (isAutoTranslated || !!localTrans || !!dbTrans);

            const senderProfile = msg.senderProfile || membersMap[senderId];

            return {
                id: messageId,
                sender: senderId === currentUserId ? 'user' : 'other',
                senderId: senderId,
                timestamp: formatMessageTime(msg?.id?.sentAt || new Date()),
                text: msg.content || '',
                content: msg.content || '',
                translatedText: finalTranslation,
                translatedLang: msg.translatedLang,
                mediaUrl: (msg as any).mediaUrl,
                messageType: (msg as any).messageType || 'TEXT',
                user: senderProfile?.fullname || senderProfile?.nickname || 'Unknown',
                avatar: senderProfile?.avatarUrl || null,
                sentAt: msg?.id?.sentAt,
                showTranslation: showTranslation,
                hasTargetLangTranslation: !!finalTranslation,
                isRead: msg.isRead,
                isLocal: (msg as any).isLocal,
                senderProfile: senderProfile,
                roomId: roomId,
                isDeleted: msg.isDeleted
            } as UIMessage;
        }).sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    }, [serverMessages, localTranslations, translationTargetLang, currentUserId, autoTranslate, membersMap]);

    useEffect(() => { loadMessages(roomId); }, [roomId]);
    useEffect(() => {
        if (!messages.length) return;
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
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

    const { mutate: translateMutate } = useMutation({
        mutationFn: async ({ text, target, id }: any) => {
            setTranslatingMessageId(id);
            const res = await instance.post('/api/py/translate', { text, target_lang: target, source_lang: 'auto' });
            return { text: res.data.result.translated_text, id, target };
        },
        onSuccess: (data) => {
            setLocalTranslations((prev: any) => ({ ...prev, [data.id]: { ...(prev[data.id] || {}), [data.target]: data.text } }));
            setMessagesToggleState((prev: any) => ({ ...prev, [data.id]: data.target }));
            setTranslatingMessageId(null);
        },
        onError: () => { setTranslatingMessageId(null); showToast({ message: t("error.translation"), type: "error" }); }
    });

    const handleTranslateClick = (id: string, text: string) => {
        const currentView = messagesToggleState[id];
        if (currentView && currentView !== 'original') { setMessagesToggleState((prev: any) => ({ ...prev, [id]: 'original' })); }
        else {
            if (localTranslations[id]?.[translationTargetLang]) { setMessagesToggleState((prev: any) => ({ ...prev, [id]: translationTargetLang })); }
            else { translateMutate({ text, target: translationTargetLang, id }); }
        }
    };

    const handleAvatarPress = (profile?: UserProfileResponse) => { if (profile) { setSelectedProfile(profile); setIsPopupVisible(true); } };

    const renderMessageItem = ({ item }: { item: UIMessage }) => {
        const isUser = item.sender === 'user';
        const isMedia = item.messageType !== 'TEXT' || !!item.mediaUrl;
        const displayData = getMessageDisplayData(item);
        const currentView = messagesToggleState[item.id];
        let displayText = item.text;
        let isTranslatedView = false;

        if (currentView && currentView !== 'original') {
            const localTrans = localTranslations[item.id]?.[currentView];
            displayText = localTrans || (item.translatedLang === currentView ? item.translatedText : item.text);
            isTranslatedView = true;
        } else if (displayData.isTranslated) {
            displayText = displayData.text;
            isTranslatedView = true;
        }

        const status = item.senderId !== 'unknown' ? userStatuses[item.senderId] : null;

        return (
            <Pressable onLongPress={() => isUser && !isMedia && setEditingMessage(item)} style={[styles.msgRow, isUser ? styles.rowUser : styles.rowOther, highlightedMessageId === item.id && styles.highlighted]}>
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
                    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleOther, item.isLocal && styles.localBubble]}>
                        {isMedia ? (
                            <View>
                                {item.messageType === 'IMAGE' && <Image source={{ uri: item.mediaUrl }} style={styles.msgImage} resizeMode="cover" />}
                                {item.messageType === 'VIDEO' && <View style={[styles.msgImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}><Icon name="play-circle-outline" size={50} color="#FFF" /></View>}
                                {item.text ? <Text style={[styles.text, isUser ? styles.textUser : styles.textOther, { marginTop: 5 }]}>{item.text}</Text> : null}
                            </View>
                        ) : (<Text style={[styles.text, isUser ? styles.textUser : styles.textOther]}>{displayText}</Text>)}
                        {isTranslatedView && <Text style={styles.transTag}>{currentView || displayData.lang || translationTargetLang}</Text>}
                        <View style={styles.metaRow}>
                            <Text style={[styles.time, isUser ? styles.timeUser : styles.timeOther]}>{item.timestamp}</Text>
                            {isUser && <Icon name={item.isRead ? "done-all" : "done"} size={12} color={item.isRead ? "#FFF" : "rgba(255,255,255,0.7)"} style={{ marginLeft: 4 }} />}
                        </View>
                    </View>
                    {!isUser && !isMedia && (
                        <TouchableOpacity onPress={() => handleTranslateClick(item.id, item.text)} style={styles.transBtn} disabled={translatingMessageId === item.id}>
                            {translatingMessageId === item.id ? <ActivityIndicator size="small" color="#6B7280" /> : <Icon name={isTranslatedView ? "undo" : "translate"} size={16} color={isTranslatedView ? "#3B82F6" : "#9CA3AF"} />}
                        </TouchableOpacity>
                    )}
                </View>
            </Pressable>
        );
    };

    return (
        <ScreenLayout style={styles.container}>
            {/* --- Chat Header Toolbar for Language Selection --- */}
            <View style={styles.chatHeaderToolbar}>
                <View style={{ flex: 1 }} />
                <ChatLanguageSelector
                    selectedLanguage={selectedLanguageOption}
                    onSelectLanguage={handleSelectLanguage}
                    availableLanguages={availableLanguages}
                />
            </View>

            <FlatList ref={flatListRef} data={messages} keyExtractor={item => item.id} style={styles.list} renderItem={renderMessageItem} />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={isBubbleMode ? 0 : 90}>
                {editingMessage && (
                    <View style={styles.editBanner}>
                        <Text style={styles.editText}>{t("chat.editing_message")}</Text>
                        <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(""); }}><Icon name="close" size={20} color="#6B7280" /></TouchableOpacity>
                    </View>
                )}
                <View style={styles.inputArea}>
                    <View style={{ zIndex: 10 }}>
                        <FileUploader mediaType="all" maxSizeMB={20} maxDuration={60} onUploadStart={() => setIsUploading(true)} onUploadEnd={() => setIsUploading(false)} onUploadSuccess={(url, type) => { sendMessage(roomId, type === 'IMAGE' ? 'Image Sent' : 'Media Sent', type, url); }} style={styles.attachBtn}>
                            {isUploading ? <ActivityIndicator color="#3B82F6" size="small" /> : <Icon name="attach-file" size={24} color="#3B82F6" />}
                        </FileUploader>
                    </View>
                    <TextInput style={styles.input} value={inputText} onChangeText={setInputText} placeholder={t("group.input.placeholder")} multiline />
                    <TouchableOpacity onPress={handleSendMessage} style={styles.sendBtn}><Icon name={editingMessage ? "check" : "send"} size={20} color="#FFF" /></TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
            <QuickProfilePopup visible={isPopupVisible} profile={selectedProfile} onClose={() => setIsPopupVisible(false)} onNavigateProfile={() => { setIsPopupVisible(false); if (selectedProfile) navigation.navigate("UserProfileViewScreen", { userId: selectedProfile.userId }); }} currentUserId={currentUserId || ""} statusInfo={selectedProfile ? userStatuses[selectedProfile.userId] : undefined} />
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: '#FFF' },
    chatHeaderToolbar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        backgroundColor: '#FFF',
        zIndex: 50,
    },
    // --- New Selector Styles ---
    languageSelectorContainer: {
        position: 'relative',
        zIndex: 50,
    },
    selectedLanguageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        justifyContent: 'center',
    },
    selectorLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginRight: 6,
    },
    languageDropdown: {
        position: 'absolute',
        top: 40,
        right: 0,
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        minWidth: 60,
        zIndex: 100,
    },
    languageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    languageFlagWrapper: {
        marginRight: 0,
    },
    // --- End Selector Styles ---
    list: { flex: 1, paddingHorizontal: 16 },
    msgRow: { flexDirection: 'row', marginVertical: 8 },
    rowUser: { justifyContent: 'flex-end' },
    rowOther: { justifyContent: 'flex-start' },
    highlighted: { backgroundColor: 'rgba(255, 235, 59, 0.3)', borderRadius: 8 },
    msgAvatarImg: { width: 32, height: 32, borderRadius: 16, marginRight: 8, marginTop: 4 },
    msgContent: { maxWidth: '75%' },
    senderName: { fontSize: 10, color: '#9CA3AF', marginBottom: 2 },
    bubble: { borderRadius: 16, padding: 12 },
    bubbleUser: { backgroundColor: '#3B82F6' },
    bubbleOther: { backgroundColor: '#F3F4F6' },
    localBubble: { opacity: 0.6 },
    msgImage: { width: 200, height: 200, borderRadius: 12, marginTop: 4, backgroundColor: '#EEE' },
    text: { fontSize: 16, lineHeight: 22 },
    textUser: { color: '#FFF' },
    textOther: { color: '#1F2937' },
    transTag: { fontSize: 10, color: '#9CA3AF', fontStyle: 'italic', marginTop: 2, textAlign: 'right' },
    metaRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 },
    time: { fontSize: 10 },
    timeUser: { color: 'rgba(255,255,255,0.7)' },
    timeOther: { color: '#9CA3AF' },
    transBtn: { marginTop: 4, padding: 4, alignSelf: 'flex-start' },
    inputArea: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#EEE', alignItems: 'flex-end', backgroundColor: '#FFF' },
    input: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100, marginLeft: 5 },
    attachBtn: { padding: 10 },
    sendBtn: { backgroundColor: '#3B82F6', borderRadius: 20, padding: 10, marginLeft: 8 },
    editBanner: { backgroundColor: '#FEF3C7', padding: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    editText: { color: '#D97706', fontSize: 12, fontWeight: 'bold' },
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
    viewProfileText: { color: '#6B7280', fontSize: 14 },
    activeDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', borderColor: '#FFF' }
});

export default ChatInnerView;