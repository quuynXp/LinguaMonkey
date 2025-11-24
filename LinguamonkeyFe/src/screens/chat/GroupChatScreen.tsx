// /d:/LinguaApp/LinguamonkeyFe/src/screens/chat/GroupChatScreen.tsx

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Share,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";

import { useChatStore } from "../../stores/ChatStore";
import { useUserStore } from "../../stores/UserStore";
import instance from "../../api/axiosClient";
import { createScaledSheet } from "../../utils/scaledStyles";
import { useToast } from "../../utils/useToast";

import {
    RoomResponse,
    MemberResponse,
    AppApiResponse,
    RoomRequest,
    PythonTranslateResponse,
    TranslationRequestBody,
} from "../../types/dto";
import { ChatMessage } from "../../types/entity";
import { RoomPurpose, RoomRole, RoomType } from "../../types/enums";
import ScreenLayout from "../../components/layout/ScreenLayout";

type ChatRoomParams = {
    ChatRoom: {
        roomId: string;
        roomName: string;
    };
};

type UIMessage = {
    id: string;
    roomId: string;
    sender: 'user' | 'other';
    timestamp: string;
    text: string;
    translatedText?: string;
    translated: boolean;
    user: string;
    avatar: string | null;
    chatMessageId: string;
    reactions?: any;
    sentAt: string;
    content: string;
    currentDisplay: {
        text: string;
        lang: string;
        isTranslatedView: boolean;
    };
    hasTargetLangTranslation: boolean;
};

type UpdateRoomRequest = Omit<RoomRequest, 'isDeleted'>;

const SUPPORTED_TRANSLATION_LANGUAGES = [
    { code: 'vi', label: 'Vietnamese' },
    { code: 'en', label: 'English' },
    { code: 'zh', label: 'Chinese' },
    { code: 'ko', label: 'Korean' },
];

type LocalTranslationStore = {
    [msgId: string]: {
        [targetLang: string]: string;
    };
};

type MessageViewState = {
    [msgId: string]: string | 'original';
};

const GroupChatScreen = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation();
    const route = useRoute<RouteProp<ChatRoomParams, 'ChatRoom'>>();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const { roomId, roomName: initialRoomName } = route.params;
    const { user } = useUserStore();
    const currentUserId = user?.userId;

    const [inputText, setInputText] = useState("");
    const [showRoomSettings, setShowRoomSettings] = useState(false);

    const [localTranslations, setLocalTranslations] = useState<LocalTranslationStore>({});
    const [messagesToggleState, setMessagesToggleState] = useState<MessageViewState>({});

    const [showMembersList, setShowMembersList] = useState(false);
    const [editingRoomName, setEditingRoomName] = useState(false);
    const [newRoomName, setNewRoomName] = useState(initialRoomName);
    const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);
    const [translationTargetLang, setTranslationTargetLang] = useState(i18n.language);
    const [showLanguagePicker, setShowLanguagePicker] = useState(false);

    const loadMessages = useChatStore(s => s.loadMessages);
    const sendMessage = useChatStore(s => s.sendMessage);
    const messagesByRoom = useChatStore(s => s.messagesByRoom);
    const serverMessages = messagesByRoom[roomId];
    const safeMessages = serverMessages ?? [];

    const flatListRef = useRef<FlatList<UIMessage>>(null);

    const roomQueryOptions: UseQueryOptions<RoomResponse, Error, RoomResponse, ['roomInfo', string]> = {
        queryKey: ['roomInfo', roomId],
        queryFn: async () => {
            const response = await instance.get<AppApiResponse<RoomResponse>>(`/api/v1/rooms/${roomId}`);
            return response.data.result;
        },
        enabled: !!roomId,
    };

    const { data: roomInfo, isLoading: isLoadingRoomInfo }: UseQueryResult<RoomResponse> = useQuery(roomQueryOptions);

    const safeRoomInfo: RoomResponse | undefined = roomInfo;

    useEffect(() => {
        if (safeRoomInfo) {
            setNewRoomName(safeRoomInfo.roomName);
        }
    }, [safeRoomInfo?.roomId]);

    useEffect(() => {
        setTranslationTargetLang(i18n.language);
    }, [i18n.language]);

    const { data: members = [], isLoading: isLoadingMembers } = useQuery<MemberResponse[]>({
        queryKey: ['roomMembers', roomId],
        queryFn: async () => {
            const response = await instance.get<AppApiResponse<MemberResponse[]>>(`/api/v1/rooms/${roomId}/members`);
            return response.data.result;
        },
        enabled: !!roomId,
    });

    const { mutate: translateMutate } = useMutation<
        PythonTranslateResponse & { messageId: string, targetLanguage: string, originalText: string },
        Error,
        { text: string, targetLanguage: string, messageId: string }
    >({
        mutationFn: async ({ text, targetLanguage, messageId }) => {
            setTranslatingMessageId(messageId);

            const payload: TranslationRequestBody = {
                text: text,
                source_lang: 'auto',
                target_lang: targetLanguage,
            } as TranslationRequestBody;

            const response = await instance.post<any>('/api/py/translate', payload);
            const responseData = response.data.result || response.data;
            const translatedText = responseData?.translated_text;

            if (!translatedText) {
                console.error("Translation API Error: Invalid response structure.", response.data);
                throw new Error("Invalid translation response structure or missing 'translated_text' field.");
            }

            return { translatedText: translatedText, messageId, targetLanguage, originalText: text };
        },
        onSuccess: (data) => {
            const translated = data.translatedText.trim();
            const original = data.originalText.trim();

            if (translated && translated.toLowerCase() !== original.toLowerCase()) {
                // 1. Lưu bản dịch
                setLocalTranslations(prev => ({
                    ...prev,
                    [data.messageId]: {
                        ...(prev[data.messageId] || {}), // Spread an toàn
                        [data.targetLanguage]: data.translatedText
                    }
                }));

                // 2. Kích hoạt view hiển thị bản dịch
                setMessagesToggleState(prev => ({
                    ...prev,
                    [data.messageId]: data.targetLanguage
                }));

                showToast({ message: t("translation.success") });
            } else {
                showToast({ message: t("translation.noChange"), type: "info" });
            }

            setTranslatingMessageId(null);
        },
        onError: (error) => {
            console.error("Translation API Error:", error);
            showToast({ message: t("translation.error"), type: "error" });
            setTranslatingMessageId(null);
        }
    });

    const { mutate: updateRoomNameMutate, isPending: isUpdatingRoom } = useMutation<any, Error, string>({
        mutationFn: (newName: string) => {
            if (!safeRoomInfo) throw new Error("Room info not loaded");
            const roomDescription = (safeRoomInfo as any).description || "";
            const payload: UpdateRoomRequest = {
                roomName: newName,
                creatorId: safeRoomInfo.creatorId,
                maxMembers: safeRoomInfo.maxMembers,
                purpose: safeRoomInfo.purpose,
                roomType: safeRoomInfo.roomType,
                description: roomDescription,
            };
            return instance.put(`/api/v1/rooms/${roomId}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roomInfo', roomId] });
            setEditingRoomName(false);
            showToast({ message: t("group.nameUpdateSuccess") });
        },
        onError: () => { showToast({ message: t('group.nameUpdateError'), type: "error" }); }
    });

    const { mutate: kickMemberMutate, isPending: isKicking } = useMutation<any, Error, string>({
        mutationFn: (userIdToKick: string) => {
            return instance.delete(`/api/v1/rooms/${roomId}/members`, {
                data: [userIdToKick]
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roomMembers', roomId] });
            queryClient.invalidateQueries({ queryKey: ['roomInfo', roomId] });
            showToast({ message: t("group.kick.success") });
        },
        onError: () => { showToast({ message: t('group.kick.error'), type: "error" }); }
    });

    const { mutate: leaveRoomMutate, isPending: isLeaving } = useMutation<any, Error, void>({
        mutationFn: () => {
            if (!currentUserId) throw new Error("User ID is missing");
            return instance.delete(`/api/v1/rooms/${roomId}/members`, {
                data: [currentUserId]
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roomMembers', roomId] });
            queryClient.invalidateQueries({ queryKey: ['roomInfo', roomId] });
            showToast({ message: t("group.leave.success") });
            navigation.goBack();
        },
        onError: () => { showToast({ message: t('group.leave.error'), type: "error" }); }
    });

    const messages: UIMessage[] = useMemo(() => {
        const targetLang = translationTargetLang;

        return safeMessages.map((msg, index) => {
            // FIX: ID ổn định. Nếu không có ID từ server, dùng sender + time thay vì Date.now()
            const sentAt = msg?.id?.sentAt ?? msg?.updatedAt ?? new Date().toISOString();
            const senderId = msg?.senderId ?? 'unknown';

            // Ưu tiên chatMessageId, fallback sang composite key string, fallback tiếp sang index (hạn chế dùng index)
            const messageId = msg?.id?.chatMessageId
                ?? (msg as any)?.chatMessageId
                ?? `${senderId}_${sentAt}`;

            const senderInfo = members.find(m => m.userId === senderId);

            // Logic hiển thị
            const currentView = messagesToggleState[messageId] || 'original';
            const localTranslation = localTranslations[messageId]?.[currentView as string];

            // Quan trọng: Nếu view hiện tại là ngôn ngữ (khác original) và có bản dịch -> hiển thị bản dịch
            const displayedText = (currentView !== 'original' && localTranslation)
                ? localTranslation
                : (msg?.content || '');

            const isTranslatedView = currentView !== 'original';
            const displayLang = isTranslatedView ? currentView : 'original';

            const serverTranslatedText = (msg as any)?.translatedText;
            const hasAnyLocalTranslation = localTranslations[messageId] && Object.keys(localTranslations[messageId]).length > 0;
            const hasCurrentTargetLangTranslation = !!localTranslations[messageId]?.[targetLang];

            return {
                id: messageId,
                chatMessageId: messageId,
                roomId: msg?.roomId ?? roomId,
                sender: senderId === currentUserId ? 'user' : 'other',
                timestamp: new Date(sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                text: msg?.content || '', // Text gốc luôn giữ ở đây
                content: msg?.content || '',
                sentAt,
                translatedText: serverTranslatedText,
                translated: !!serverTranslatedText || hasAnyLocalTranslation,
                user: senderInfo?.username || senderId,
                avatar: senderInfo?.avatarUrl || '👤',
                reactions: (msg as any)?.reactions,
                currentDisplay: {
                    text: displayedText,
                    lang: displayLang,
                    isTranslatedView: isTranslatedView,
                },
                hasTargetLangTranslation: hasCurrentTargetLangTranslation,
            } as UIMessage;
        }).sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    }, [safeMessages, members, localTranslations, currentUserId, roomId, messagesToggleState, translationTargetLang]);

    useEffect(() => {
        loadMessages(roomId);
    }, [roomId]);

    useEffect(() => {
        if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages.length]);

    const handleSendMessage = () => {
        if (inputText.trim() === "") return;
        sendMessage(roomId, inputText, 'TEXT');
        setInputText("");
    };

    const handleTyping = (text: string) => {
        setInputText(text);
    };

    const handleTranslate = (messageId: string, messageText: string) => {
        if (translatingMessageId === messageId) return;

        const targetLang = translationTargetLang;
        const localTranslation = localTranslations[messageId]?.[targetLang];
        const currentView = messagesToggleState[messageId] || 'original';

        // 1. Đang xem bản dịch: Chuyển về bản gốc
        if (currentView !== 'original') {
            setMessagesToggleState(prev => ({ ...prev, [messageId]: 'original' }));
            return;
        }

        // 2. Đang xem bản gốc VÀ đã có bản dịch cho targetLang: Chuyển sang bản dịch đó
        if (currentView === 'original' && localTranslation) {
            setMessagesToggleState(prev => ({ ...prev, [messageId]: targetLang }));
            return;
        }

        // 3. Gọi API nếu chưa có
        translateMutate({ messageId, text: messageText, targetLanguage: targetLang });
    };

    const handleToggleTranslation = (messageId: string) => {
        const targetLang = translationTargetLang;
        const hasCurrentTargetLangTranslation = localTranslations[messageId]?.[targetLang];
        const currentView = messagesToggleState[messageId] || 'original';

        if (currentView === 'original') {
            if (hasCurrentTargetLangTranslation) {
                setMessagesToggleState(prev => ({ ...prev, [messageId]: targetLang }));
            } else {
                const message = messages.find(m => m.id === messageId);
                if (message) handleTranslate(messageId, message.text);
            }
        } else {
            setMessagesToggleState(prev => ({ ...prev, [messageId]: 'original' }));
        }
    }

    const handleReact = (messageId: string) => {
        showToast({ message: t('Reaction feature is currently unavailable.'), type: "info" });
    };

    const handleLeaveGroup = () => {
        Alert.alert(t("group.leave.confirm"), t("group.leave.confirm.message"), [
            { text: t("cancel"), style: "cancel" },
            {
                text: t("confirm"),
                style: "destructive",
                onPress: () => leaveRoomMutate(),
            },
        ]);
    };

    const shareRoomId = async () => {
        const roomDescription = (safeRoomInfo as any)?.description || t("common.noDescription");
        if (!safeRoomInfo) return;
        try {
            await Share.share({
                message: t("group.share.message", { roomId: safeRoomInfo.roomId, description: roomDescription }),
                title: t("group.share.title"),
            });
        } catch (error) { console.error("Error sharing:", error); }
    };

    const handleUpdateRoomName = () => {
        if (newRoomName.trim() === "" || newRoomName === safeRoomInfo?.roomName) {
            setEditingRoomName(false);
            return;
        }
        updateRoomNameMutate(newRoomName.trim());
    };

    const handleKickMember = (member: MemberResponse) => {
        Alert.alert(t("group.kick.confirm"), t("group.kick.confirm.message", { name: member.username }), [
            { text: t("cancel"), style: "cancel" },
            {
                text: t("confirm"),
                style: "destructive",
                onPress: () => kickMemberMutate(member.userId),
            },
        ]);
    };

    const handleSelectTargetLanguage = (langCode: string) => {
        setTranslationTargetLang(langCode);
        setShowLanguagePicker(false);
        showToast({ message: t("translation.targetUpdated", { lang: langCode }) });
    };

    const scrollToBottom = useCallback(() => {
        requestAnimationFrame(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
        });
    }, []);

    const isUserAdmin = safeRoomInfo?.creatorId === currentUserId;

    const renderMessage = ({ item: message }: { item: UIMessage }) => {
        const { text: displayedText, lang: displayLang, isTranslatedView } = message.currentDisplay;

        const isCurrentTranslating = translatingMessageId === message.id;
        const hasCurrentTargetLangTranslation = message.hasTargetLangTranslation;

        const buttonStyle = hasCurrentTargetLangTranslation ? styles.translatedButton : {};
        const iconColor = hasCurrentTargetLangTranslation ? "#3B82F6" : "#6B7280";

        return (
            <View
                style={[
                    styles.messageContainer,
                    message.sender === "user" ? styles.userMessageContainer : styles.otherMessageContainer,
                ]}
            >
                {message.sender === "other" && (
                    <View style={styles.messageHeader}>
                        <Text style={styles.avatar}>{message.avatar || '👤'}</Text>
                        <Text style={styles.senderName}>{message.user}</Text>
                    </View>
                )}

                <View style={styles.messageRow}>
                    <TouchableOpacity
                        onLongPress={() => handleReact(message.id)}
                        onPress={() => handleToggleTranslation(message.id)}
                        style={[styles.messageContentWrapper]}
                    >
                        <View style={[styles.messageBubble, message.sender === "user" ? styles.userMessage : styles.otherMessage]}>
                            <Text style={[styles.messageText, message.sender === "user" ? styles.userMessageText : styles.otherMessageText]}>
                                {displayedText}
                            </Text>
                            {isTranslatedView && (
                                <Text style={styles.translationLangTag}>
                                    {displayLang.toUpperCase()} {t('translation.tag')}
                                </Text>
                            )}
                            <Text style={[styles.timestamp, message.sender === "user" ? styles.userTimestamp : styles.otherTimestamp]}>
                                {message.timestamp}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {message.sender === "other" && (
                        <View style={styles.translateButtonContainer}>
                            <TouchableOpacity
                                style={[styles.translateButton, buttonStyle]}
                                onPress={() => handleTranslate(message.id, message.text)}
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

    const renderMember = ({ item: member }: { item: MemberResponse }) => {
        const isCurrentAdmin = isUserAdmin;
        const currentId = currentUserId;

        return (
            <View style={styles.memberItem}>
                <View style={styles.memberInfo}>
                    <Text style={styles.memberAvatar}>{member.avatarUrl || '👤'}</Text>
                    <View style={styles.memberDetails}>
                        <Text style={styles.memberName}>{member.username}</Text>
                        <View style={styles.memberStatus}>
                            <View style={[styles.onlineIndicator, { backgroundColor: member.isOnline ? "#10B981" : "#6B7280" }]} />
                            <Text style={styles.memberRole}>{t(member.role.toLowerCase())}</Text>
                        </View>
                    </View>
                </View>

                {isCurrentAdmin && member.userId !== currentId && (
                    <TouchableOpacity style={styles.kickButton} onPress={() => handleKickMember(member)} disabled={isKicking}>
                        <Icon name="person-remove" size={18} color="#EF4444" />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const renderLanguageItem = ({ item }: { item: { code: string, label: string } }) => (
        <TouchableOpacity
            style={styles.languageItem}
            onPress={() => handleSelectTargetLanguage(item.code)}
        >
            <Text style={styles.languageLabel}>{item.label}</Text>
            {translationTargetLang === item.code && <Icon name="check-circle" size={20} color="#10B981" />}
        </TouchableOpacity>
    );

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
                        <View style={styles.roomInfo}>
                            <Text style={styles.roomName}>{safeRoomInfo?.roomName || initialRoomName}</Text>
                            <Text style={styles.memberCount}>{members.length}/{safeRoomInfo?.maxMembers || 0} {t("group.members")}</Text>
                        </View>
                        <TouchableOpacity style={styles.headerButton} onPress={() => setShowRoomSettings(true)}>
                            <Icon name="settings" size={22} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {isLoadingRoomInfo && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item.id}
                        style={styles.messagesContainer}
                        onContentSizeChange={scrollToBottom}
                        showsVerticalScrollIndicator={false}
                        extraData={{ messagesToggleState, localTranslations }} // FIX: Bắt buộc re-render khi state thay đổi
                    />

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder={t("group.input.placeholder")}
                            value={inputText}
                            onChangeText={handleTyping}
                            onSubmitEditing={handleSendMessage}
                            returnKeyType="send"
                            multiline
                        />
                        <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                            <Icon name="send" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Room Settings Modal */}
                    <Modal
                        visible={showRoomSettings}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setShowRoomSettings(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{t("group.settings")}</Text>
                                    <TouchableOpacity onPress={() => setShowRoomSettings(false)}>
                                        <Icon name="close" size={24} color="#374151" />
                                    </TouchableOpacity>
                                </View>
                                {!safeRoomInfo ? <ActivityIndicator style={{ padding: 20 }} /> : (
                                    <View style={styles.settingsContent}>

                                        {/* Translation Target Language Setting */}
                                        <TouchableOpacity
                                            style={styles.settingItem}
                                            onPress={() => setShowLanguagePicker(true)}
                                        >
                                            <Icon name="translate" size={20} color="#3B82F6" />
                                            <View style={styles.settingInfo}>
                                                <Text style={styles.settingLabel}>{t("translation.targetLang")}</Text>
                                                <Text style={styles.settingValue}>
                                                    {SUPPORTED_TRANSLATION_LANGUAGES.find(l => l.code === translationTargetLang)?.label || translationTargetLang.toUpperCase()}
                                                </Text>
                                            </View>
                                            <Icon name="chevron-right" size={16} color="#9CA3AF" />
                                        </TouchableOpacity>

                                        {/* Các cài đặt khác */}
                                        <View style={styles.settingItem}>
                                            <Icon name="chat-bubble" size={20} color="#6B7280" />
                                            <View style={styles.settingInfo}>
                                                <Text style={styles.settingLabel}>{t("group.name")}</Text>
                                                {editingRoomName ? (
                                                    <View style={styles.editNameContainer}>
                                                        <TextInput
                                                            style={styles.editNameInput}
                                                            value={newRoomName}
                                                            onChangeText={setNewRoomName}
                                                            onSubmitEditing={handleUpdateRoomName}
                                                            autoFocus
                                                        />
                                                        <TouchableOpacity onPress={handleUpdateRoomName} disabled={isUpdatingRoom}>
                                                            {isUpdatingRoom ? <ActivityIndicator size="small" /> : <Icon name="checkmark" size={20} color="#10B981" />}
                                                        </TouchableOpacity>
                                                    </View>
                                                ) : (
                                                    <TouchableOpacity onPress={() => isUserAdmin && setEditingRoomName(true)}>
                                                        <Text style={styles.settingValue}>{safeRoomInfo.roomName}</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                        <TouchableOpacity style={styles.settingItem} onPress={() => setShowMembersList(true)}>
                                            <Icon name="people" size={20} color="#6B7280" />
                                            <View style={styles.settingInfo}>
                                                <Text style={styles.settingLabel}>{t("group.members")}</Text>
                                                <Text style={styles.settingValue}>
                                                    {members.length}/{safeRoomInfo.maxMembers} {t("people")}
                                                </Text>
                                            </View>
                                            <Icon name="chevron-right" size={16} color="#9CA3AF" />
                                        </TouchableOpacity>
                                        <View style={styles.settingItem}>
                                            <Icon name="vpn-key" size={20} color="#6B7280" />
                                            <View style={styles.settingInfo}>
                                                <Text style={styles.settingLabel}>{t("group.id")}</Text>
                                                <Text style={styles.settingValue}>{safeRoomInfo.roomId}</Text>
                                            </View>
                                            <TouchableOpacity onPress={shareRoomId} style={styles.shareButton}>
                                                <Icon name="share" size={18} color="#3B82F6" />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.settingItem}>
                                            <Icon name="description" size={20} color="#6B7280" />
                                            <View style={styles.settingInfo}>
                                                <Text style={styles.settingLabel}>{t("group.desc")}</Text>
                                                <Text style={styles.settingValue}>{(safeRoomInfo as any).description || t("common.noDescription")}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.actionButtons}>
                                            <TouchableOpacity style={styles.actionButton} onPress={shareRoomId}>
                                                <Icon name="share" size={20} color="#3B82F6" />
                                                <Text style={styles.actionButtonText}>{t("group.share")}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.actionButton}>
                                                <Icon name="notifications" size={20} color="#3B82F6" />
                                                <Text style={styles.actionButtonText}>{t("group.notifications")}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.dangerButton]}
                                                onPress={handleLeaveGroup}
                                                disabled={isLeaving}
                                            >
                                                {isLeaving ? (
                                                    <ActivityIndicator size="small" color="#EF4444" />
                                                ) : (
                                                    <Icon name="exit-to-app" size={20} color="#EF4444" />
                                                )}
                                                <Text style={[styles.actionButtonText, styles.dangerButtonText]}>{t("group.leave")}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    </Modal>

                    {/* Members List Modal */}
                    <Modal
                        visible={showMembersList}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setShowMembersList(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{t("group.members.list")}</Text>
                                    <TouchableOpacity onPress={() => setShowMembersList(false)}>
                                        <Icon name="close" size={24} color="#374151" />
                                    </TouchableOpacity>
                                </View>
                                {isLoadingMembers ? <ActivityIndicator style={{ padding: 20 }} /> :
                                    <FlatList
                                        data={members}
                                        renderItem={renderMember}
                                        keyExtractor={(item) => item.userId}
                                        style={styles.membersList}
                                    />
                                }
                            </View>
                        </View>
                    </Modal>

                    {/* Language Picker Modal */}
                    <Modal
                        visible={showLanguagePicker}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setShowLanguagePicker(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={[styles.modalContent, styles.languageModalContent]}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{t("translation.selectTarget")}</Text>
                                    <TouchableOpacity onPress={() => setShowLanguagePicker(false)}>
                                        <Icon name="close" size={24} color="#374151" />
                                    </TouchableOpacity>
                                </View>
                                <FlatList
                                    data={SUPPORTED_TRANSLATION_LANGUAGES}
                                    renderItem={renderLanguageItem}
                                    keyExtractor={(item) => item.code}
                                    style={styles.languageList}
                                />
                            </View>
                        </View>
                    </Modal>
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
    roomInfo: {
        flex: 1,
        marginLeft: 12,
    },
    roomName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    memberCount: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 2,
    },
    headerButton: {
        padding: 8,
    },
    messagesContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    messageContainer: {
        marginBottom: 16,
    },
    messageRow: {
        flexDirection: "row",
        alignItems: "flex-end",
    },
    messageContentWrapper: {
        flexShrink: 1,
        maxWidth: '75%',
    },
    userMessageContainer: {
        alignItems: "flex-end",
    },
    otherMessageContainer: {
        alignItems: "flex-start",
    },
    messageHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
        marginLeft: 4,
    },
    avatar: {
        fontSize: 16,
        marginRight: 6,
    },
    senderName: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "500",
    },
    messageBubble: {
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    translationLangTag: {
        fontSize: 10,
        fontWeight: '500',
        color: '#9CA3AF',
        marginTop: 4,
    },
    userMessage: {
        backgroundColor: "#3B82F6",
    },
    otherMessage: {
        backgroundColor: "#F3F4F6",
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    userMessageText: {
        color: "#FFFFFF",
    },
    otherMessageText: {
        color: "#1F2937",
    },
    timestamp: {
        fontSize: 11,
        marginTop: 4,
    },
    userTimestamp: {
        color: "rgba(255, 255, 255, 0.7)",
    },
    otherTimestamp: {
        color: "#9CA3AF",
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
    inputContainer: {
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
    },
    input: {
        flex: 1,
        backgroundColor: "#F9FAFB",
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginRight: 8,
        maxHeight: 100,
        fontSize: 16,
    },
    sendButton: {
        backgroundColor: "#3B82F6",
        borderRadius: 20,
        padding: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "80%",
    },
    languageModalContent: {
        maxHeight: "60%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
    },
    settingsContent: {
        padding: 20,
    },
    settingItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    settingInfo: {
        flex: 1,
        marginLeft: 12,
    },
    settingLabel: {
        fontSize: 14,
        color: "#6B7280",
    },
    settingValue: {
        fontSize: 16,
        color: "#1F2937",
        marginTop: 2,
    },
    editNameContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 2,
    },
    editNameInput: {
        flex: 1,
        fontSize: 16,
        color: "#1F2937",
        borderBottomWidth: 1,
        borderBottomColor: "#3B82F6",
        paddingVertical: 2,
    },
    shareButton: {
        padding: 8,
    },
    actionButtons: {
        marginTop: 20,
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: "#F9FAFB",
    },
    dangerButton: {
        backgroundColor: "#FEF2F2",
    },
    actionButtonText: {
        fontSize: 16,
        color: "#3B82F6",
        marginLeft: 8,
    },
    dangerButtonText: {
        color: "#EF4444",
    },
    membersList: {
        maxHeight: 400,
    },
    languageList: {
        paddingHorizontal: 20,
    },
    languageItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    languageLabel: {
        fontSize: 16,
        color: "#1F2937",
    },
    memberItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    memberInfo: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    memberAvatar: {
        fontSize: 20,
        marginRight: 12,
    },
    memberDetails: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: "500",
        color: "#1F2937",
    },
    memberStatus: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 2,
    },
    onlineIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    memberRole: {
        fontSize: 12,
        color: "#6B7280",
    },
    kickButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: "#FEF2F2",
    },
});

export default GroupChatScreen;