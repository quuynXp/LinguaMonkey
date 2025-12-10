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
import { useMutation } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useChatStore } from "../../stores/ChatStore";
import { useUserStore } from "../../stores/UserStore";
import instance from "../../api/axiosClient";
import { useToast } from "../../utils/useToast";
import { MemberResponse, UserProfileResponse } from "../../types/dto";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";
import { getCountryFlag } from "../../utils/flagUtils";
import { getAvatarSource } from "../../utils/avatarUtils";
import { useAppStore } from "../../stores/appStore";

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

type LanguageOption = {
    code: string;
    name: string;
    flag: React.JSX.Element | null;
};

const formatMessageTime = (sentAt: string | number | Date, locale: string = 'en') => {
    const date = new Date(sentAt);
    if (isNaN(date.getTime())) return '...';
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    return date.toLocaleTimeString(locale, timeOptions);
};

const QuickProfilePopup = ({ visible, profile, onClose, onNavigateProfile, currentUserId, statusInfo }: any) => {
    if (!visible || !profile) return null;
    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <View style={styles.popupContainer}>
                    <Text style={styles.popupName}>{profile.fullname || profile.nickname}</Text>
                    <TouchableOpacity style={styles.viewProfileBtn} onPress={onNavigateProfile}>
                        <Text style={styles.viewProfileText}>View Profile</Text>
                    </TouchableOpacity>
                </View>
            </Pressable>
        </Modal>
    );
};

const ChatLanguageSelector = ({
    selectedLanguage,
    onSelectLanguage,
    availableLanguages,
    isAutoTranslateOn,
    onToggleAuto
}: {
    selectedLanguage: LanguageOption;
    onSelectLanguage: (lang: LanguageOption) => void;
    availableLanguages: LanguageOption[];
    isAutoTranslateOn: boolean;
    onToggleAuto: () => void;
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const canExpand = availableLanguages.length > 1;

    if (!availableLanguages || availableLanguages.length === 0) return null;

    return (
        <View style={styles.languageSelectorContainer}>
            <TouchableOpacity
                style={[styles.autoSwitch, isAutoTranslateOn && styles.autoSwitchActive]}
                onPress={onToggleAuto}
            >
                <Text style={[styles.autoText, isAutoTranslateOn && { color: '#FFF' }]}>
                    {isAutoTranslateOn ? "Auto: ON" : "Auto: OFF"}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.selectedLanguageButton, !canExpand && { paddingRight: 8 }]}
                onPress={() => canExpand && setIsExpanded(!isExpanded)}
                activeOpacity={canExpand ? 0.7 : 1}
                disabled={!canExpand}
            >
                <View style={styles.languageFlagWrapper}>
                    {selectedLanguage.flag}
                </View>
                {canExpand && (
                    <Icon name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={20} color="#6B7280" style={{ marginLeft: 0 }} />
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
                            <Text style={styles.languageName}>{lang.code.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
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
    const setChatSettings = useAppStore(state => state.setChatSettings);
    const nativeLanguage = useAppStore(state => state.nativeLanguage);

    const autoTranslate = chatSettings.autoTranslate;
    const translationTargetLang = chatSettings.targetLanguage || nativeLanguage || 'vi';

    const currentUserId = user?.userId;
    const setCurrentViewedRoomId = useChatStore(s => s.setCurrentViewedRoomId);
    const userStatuses = useChatStore(s => s.userStatuses);
    const eagerTranslations = useChatStore(s => s.eagerTranslations);
    const translateLastNMessages = useChatStore(s => s.translateLastNMessages);

    const [inputText, setInputText] = useState("");
    const [editingMessage, setEditingMessage] = useState<UIMessage | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<UserProfileResponse | MemberResponse | null>(null);
    const [isPopupVisible, setIsPopupVisible] = useState(false);
    const [translatingId, setTranslatingId] = useState<string | null>(null);

    const getLanguageOption = useCallback((langCode: string): LanguageOption => ({
        code: langCode,
        name: langCode === 'zh' || langCode.startsWith('zh') ? 'ZH' : langCode.toUpperCase(),
        flag: getCountryFlag(langCode, 24),
    }), []);

    const availableLanguages: LanguageOption[] = useMemo(() => {
        const uniqueLangs = new Set<string>();
        if (nativeLanguage) uniqueLangs.add(nativeLanguage);
        if (user?.languages && Array.isArray(user.languages)) {
            user.languages.forEach((l: any) => {
                if (typeof l === 'string') {
                    uniqueLangs.add(l);
                } else if (typeof l === 'object' && l !== null) {
                    const code = l.lang || l.code || l.language;
                    if (code) uniqueLangs.add(code);
                }
            });
        }
        if (translationTargetLang) uniqueLangs.add(translationTargetLang);
        if (uniqueLangs.size === 0) uniqueLangs.add('vi');
        return Array.from(uniqueLangs).map(getLanguageOption);
    }, [user?.languages, nativeLanguage, translationTargetLang, getLanguageOption]);

    const selectedLanguageOption = useMemo(() =>
        availableLanguages.find(l => l.code === translationTargetLang) || getLanguageOption(translationTargetLang),
        [availableLanguages, translationTargetLang, getLanguageOption]);

    useEffect(() => {
        if (!chatSettings.targetLanguage) {
            const defaultTarget = nativeLanguage || 'vi';
            setChatSettings({ targetLanguage: defaultTarget });
        }
    }, []);

    const handleSelectLanguage = (lang: LanguageOption) => {
        setChatSettings({
            targetLanguage: lang.code,
            autoTranslate: true
        });
        showToast({ message: `${t('chat.auto_translate_on')} ${lang.name}`, type: 'success' });
        translateLastNMessages(roomId, lang.code, 15);
    };

    const handleToggleAuto = () => {
        const newState = !autoTranslate;
        setChatSettings({ autoTranslate: newState });
        if (newState) {
            translateLastNMessages(roomId, translationTargetLang, 15);
        }
    };

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
            const messageId = msg?.id?.chatMessageId || `${senderId}_${msg.sentAt}`;

            // Priority: Eager Store > DB (Multi-lang JSON)
            const eagerTrans = eagerTranslations[messageId]?.[translationTargetLang];
            const dbMapTrans = msg.translationsMap ? msg.translationsMap[translationTargetLang] : null;
            const finalTranslation = eagerTrans || dbMapTrans;

            const senderProfile = msg.senderProfile || membersMap[senderId];

            return {
                id: messageId,
                sender: senderId === currentUserId ? 'user' : 'other',
                senderId: senderId,
                timestamp: formatMessageTime(msg?.id?.sentAt || new Date()),
                text: msg.content || '',
                content: msg.content || '',
                translatedText: finalTranslation,
                translatedLang: translationTargetLang,
                mediaUrl: (msg as any).mediaUrl,
                messageType: (msg as any).messageType || 'TEXT',
                user: senderProfile?.fullname || senderProfile?.nickname || 'Unknown',
                avatar: senderProfile?.avatarUrl || null,
                sentAt: msg?.id?.sentAt,
                isRead: msg.isRead,
                isLocal: (msg as any).isLocal,
                senderProfile: senderProfile,
                roomId: roomId,
                isDeleted: msg.isDeleted
            } as UIMessage;
        }).sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    }, [serverMessages, eagerTranslations, translationTargetLang, currentUserId, membersMap]);

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

    const handleManualTranslate = async (id: string, text: string) => {
        setTranslatingId(id);
        await performEagerTranslation(id, text, translationTargetLang);
        setTranslatingId(null);
    };

    const handleAvatarPress = (profile?: UserProfileResponse) => { if (profile) { setSelectedProfile(profile); setIsPopupVisible(true); } };

    const renderMessageItem = ({ item }: { item: UIMessage }) => {
        const isUser = item.sender === 'user';
        const isMedia = item.messageType !== 'TEXT' || !!item.mediaUrl;
        const status = item.senderId !== 'unknown' ? userStatuses[item.senderId] : null;

        // Display Dual Line if translation exists
        const showDual = !isMedia && !!item.translatedText;
        const isTranslating = translatingId === item.id;

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
                    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleOther, item.isLocal && styles.localBubble]}>
                        {isMedia ? (
                            <View>
                                {item.messageType === 'IMAGE' && <Image source={{ uri: item.mediaUrl }} style={styles.msgImage} resizeMode="cover" />}
                                {item.messageType === 'VIDEO' && <View style={[styles.msgImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}><Icon name="play-circle-outline" size={50} color="#FFF" /></View>}
                                {item.text ? <Text style={[styles.text, isUser ? styles.textUser : styles.textOther, { marginTop: 5 }]}>{item.text}</Text> : null}
                            </View>
                        ) : (
                            <View>
                                {/* Original Text Line */}
                                <Text style={[styles.text, isUser ? styles.textUser : styles.textOther]}>{item.text}</Text>

                                {/* Translated Text Line (Dual View) */}
                                {showDual && (
                                    <View style={styles.dualLineContainer}>
                                        <View style={styles.separator} />
                                        <Text style={[styles.translatedText, isUser ? styles.textUserTrans : styles.textOtherTrans]}>
                                            {item.translatedText}
                                        </Text>
                                        <Text style={styles.langTag}>{translationTargetLang.toUpperCase()}</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={styles.metaRow}>
                            <Text style={[styles.time, isUser ? styles.timeUser : styles.timeOther]}>{item.timestamp}</Text>
                            {isUser && <Icon name={item.isRead ? "done-all" : "done"} size={12} color={item.isRead ? "#FFF" : "rgba(255,255,255,0.7)"} style={{ marginLeft: 4 }} />}
                        </View>
                    </View>

                    {!isUser && !isMedia && !showDual && (
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
            <View style={styles.chatHeaderToolbar}>
                <ChatLanguageSelector
                    selectedLanguage={selectedLanguageOption}
                    onSelectLanguage={handleSelectLanguage}
                    availableLanguages={availableLanguages}
                    isAutoTranslateOn={autoTranslate}
                    onToggleAuto={handleToggleAuto}
                />
            </View>

            <FlatList ref={flatListRef} data={messages} keyExtractor={item => item.id} style={styles.list} renderItem={renderMessageItem} contentContainerStyle={{ paddingTop: 40 }} />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={isBubbleMode ? 0 : 90}>
                {editingMessage && (
                    <View style={styles.editBanner}>
                        <Text style={styles.editText}>{t("chat.editing_message")}</Text>
                        <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(""); }}><Icon name="close" size={20} color="#6B7280" /></TouchableOpacity>
                    </View>
                )}
                <View style={styles.inputArea}>
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
    chatHeaderToolbar: { position: 'absolute', top: 8, right: 16, zIndex: 100, backgroundColor: 'transparent', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
    languageSelectorContainer: { flexDirection: 'row', alignItems: 'center', position: 'relative', zIndex: 50 },
    autoSwitch: { backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
    autoSwitchActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
    autoText: { fontSize: 10, fontWeight: 'bold', color: '#6B7280' },
    selectedLanguageButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(243, 244, 246, 0.9)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    languageDropdown: { position: 'absolute', top: 45, right: 0, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, minWidth: 80, zIndex: 100, paddingVertical: 4 },
    languageItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', padding: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    languageFlagWrapper: { marginRight: 8 },
    languageName: { fontSize: 12, color: '#374151', fontWeight: '500' },
    list: { flex: 1, paddingHorizontal: 16 },
    msgRow: { flexDirection: 'row', marginVertical: 8 },
    rowUser: { justifyContent: 'flex-end' },
    rowOther: { justifyContent: 'flex-start' },
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
    metaRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 },
    time: { fontSize: 10 },
    timeUser: { color: 'rgba(255,255,255,0.7)' },
    timeOther: { color: '#9CA3AF' },
    transBtn: { marginTop: 4, padding: 4, alignSelf: 'flex-start' },
    inputArea: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#EEE', alignItems: 'flex-end', backgroundColor: '#FFF' },
    input: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100, marginLeft: 5 },
    sendBtn: { backgroundColor: '#3B82F6', borderRadius: 20, padding: 10, marginLeft: 8 },
    editBanner: { backgroundColor: '#FEF3C7', padding: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    editText: { color: '#D97706', fontSize: 12, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    popupContainer: { width: width * 0.8, backgroundColor: '#FFF', borderRadius: 16, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
    popupName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 10 },
    viewProfileBtn: { padding: 10, alignItems: 'center', borderTopWidth: 1, borderColor: '#EEE' },
    viewProfileText: { color: '#6B7280', fontSize: 14 },
    activeDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', borderColor: '#FFF' },

    // Dual Line Styles
    dualLineContainer: { marginTop: 6, paddingTop: 6 },
    separator: { height: 1, backgroundColor: 'rgba(0,0,0,0.1)', width: '100%', marginBottom: 4 },
    translatedText: { fontSize: 15, fontStyle: 'italic', lineHeight: 20 },
    textUserTrans: { color: '#E0F2FE' },
    textOtherTrans: { color: '#4B5563' },
    langTag: { fontSize: 8, color: 'rgba(0,0,0,0.4)', textAlign: 'right', marginTop: 2 }
});

export default ChatInnerView;