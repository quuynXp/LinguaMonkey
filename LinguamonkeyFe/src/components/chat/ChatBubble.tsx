// components/chat/ChatBubble.tsx

import React, { useEffect, useRef, useMemo, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    PanResponder,
    Animated,
    Dimensions,
    StyleSheet,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
// ❌ ĐÃ XÓA import useNavigation
import { useTranslation } from "react-i18next";
import { useChatStore } from "../../stores/ChatStore";
import { useUserStore } from "../../stores/UserStore";
import { useRooms } from "../../hooks/useRoom";
import ChatInnerView from "./ChatInnerView";
import { createScaledSheet } from "../../utils/scaledStyles";
import { RoomPurpose } from "../../types/enums";
// 🎯 DÙNG gotoTab TỪ REF
import { gotoTab } from "../../utils/navigationRef";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BUBBLE_SIZE = 60;

const ChatBubble = () => {
    // ❌ KHÔNG DÙNG useNavigation Ở ĐÂY
    const { t } = useTranslation();

    // Stores
    const { user } = useUserStore();
    const {
        activeBubbleRoomId,
        isBubbleOpen,
        closeBubble,
        userStatuses
    } = useChatStore();

    // Hooks
    const { useRoomMembers, useRoom } = useRooms();
    const { data: members } = useRoomMembers(activeBubbleRoomId || "");
    const { data: roomInfo } = useRoom(activeBubbleRoomId || "");

    // Animations
    const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - BUBBLE_SIZE - 20, y: SCREEN_HEIGHT / 2 })).current;
    const [isMinimized, setIsMinimized] = useState(false);

    // --- LOGIC: Xác định đối phương và trạng thái Online ---
    const targetMember = useMemo(() => {
        if (!members || !user?.userId) return null;
        return members.find(m => m.userId !== user.userId);
    }, [members, user?.userId]);

    const isTargetOnline = useMemo(() => {
        if (!targetMember) return false;
        return userStatuses[targetMember.userId]?.isOnline ?? false;
    }, [userStatuses, targetMember]);

    const displayTitle = useMemo(() => {
        if (!roomInfo) return t('chat.loading');
        if (roomInfo.purpose === RoomPurpose.PRIVATE_CHAT && targetMember) {
            return targetMember.nickNameInRoom || targetMember.nickname || targetMember.fullname;
        }
        return roomInfo.roomName;
    }, [roomInfo, targetMember]);

    // --- DRAG GESTURE FOR MINIMIZED BUBBLE ---
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
            },
            onPanResponderGrant: () => {
                pan.setOffset({
                    // @ts-ignore
                    x: pan.x._value,
                    // @ts-ignore
                    y: pan.y._value,
                });
            },
            onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
            onPanResponderRelease: (_, gestureState) => {
                pan.flattenOffset();
            },
        })
    ).current;

    // Effects
    useEffect(() => {
        if (!isBubbleOpen) {
            setIsMinimized(false);
        }
    }, [isBubbleOpen]);

    const handleExpand = () => setIsMinimized(false);
    const handleMinimize = () => setIsMinimized(true);

    const handleClose = () => {
        closeBubble();
        setIsMinimized(false);
    };

    const handleOpenFullChat = () => {
        if (activeBubbleRoomId) {
            closeBubble();
            // 🎯 DÙNG gotoTab: Tab cha "Chat", screen con "GroupChatScreen"
            gotoTab(
                "Chat", // Tên Tab Navigator
                "GroupChatScreen", // Tên Screen trong ChatStack
                { roomId: activeBubbleRoomId, roomName: displayTitle }
            );
        }
    };

    if (!isBubbleOpen || !activeBubbleRoomId) return null;

    // --- RENDER: MINIMIZED MODE (ICON TRÒN) ---
    if (isMinimized) {
        return (
            <Animated.View
                style={[
                    styles.bubbleContainer,
                    { transform: [{ translateX: pan.x }, { translateY: pan.y }] }
                ]}
                {...panResponder.panHandlers}
            >
                <TouchableOpacity onPress={handleExpand} style={styles.bubbleTouch}>
                    <Image
                        source={
                            targetMember?.avatarUrl
                                ? { uri: targetMember.avatarUrl }
                                : require('../../assets/images/ImagePlacehoderCourse.png')
                        }
                        style={styles.bubbleImage}
                    />
                    {isTargetOnline && <View style={styles.onlineDotBubble} />}
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeBadge} onPress={handleClose}>
                    <Icon name="close" size={12} color="#FFF" />
                </TouchableOpacity>
            </Animated.View>
        );
    }

    // --- RENDER: EXPANDED MODE (CỬA SỔ CHAT) ---
    return (
        <View style={styles.expandedContainer} pointerEvents="box-none">
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.window}
            >
                {/* Header */}
                <View style={styles.header} {...panResponder.panHandlers}>
                    <View style={styles.headerInfo}>
                        <TouchableOpacity onPress={handleOpenFullChat} style={styles.headerTitleRow}>
                            <Text style={styles.headerTitle} numberOfLines={1}>{displayTitle}</Text>
                            <Icon name="open-in-new" size={16} color="#6B7280" style={{ marginLeft: 5 }} />
                        </TouchableOpacity>

                        {roomInfo?.purpose === RoomPurpose.PRIVATE_CHAT && (
                            <View style={styles.statusRow}>
                                {isTargetOnline && <View style={styles.onlineDotHeader} />}
                                <Text style={styles.statusText}>
                                    {isTargetOnline ? t('chat.active_now') : t('chat.offline')}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.headerControls}>
                        <TouchableOpacity onPress={handleMinimize} style={styles.controlBtn}>
                            <Icon name="remove" size={24} color="#4B5563" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleClose} style={styles.controlBtn}>
                            <Icon name="close" size={24} color="#4B5563" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <ChatInnerView
                        roomId={activeBubbleRoomId}
                        isBubbleMode={true}
                        initialRoomName={displayTitle}
                        initialFocusMessageId={null} // 🎯 QUAN TRỌNG: Truyền null vì bubble không cần focus lịch sử
                    />
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = createScaledSheet({
    // Minimized Styles
    bubbleContainer: {
        position: 'absolute',
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        zIndex: 9999,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    bubbleTouch: {
        width: '100%',
        height: '100%',
        borderRadius: BUBBLE_SIZE / 2,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
        overflow: 'hidden'
    },
    bubbleImage: {
        width: '100%',
        height: '100%',
    },
    closeBadge: {
        position: 'absolute',
        top: -5,
        right: 0,
        backgroundColor: '#EF4444',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    onlineDotBubble: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#FFF',
        zIndex: 5
    },

    // Expanded Styles
    expandedContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9998,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        pointerEvents: 'box-none', // Allow touches to pass through empty areas
    },
    window: {
        width: SCREEN_WIDTH * 0.9,
        height: SCREEN_HEIGHT * 0.65, // Chiều cao cửa sổ chat bubble
        backgroundColor: '#FFF',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderBottomLeftRadius: 0, // Gắn đáy màn hình hoặc float tùy ý
        marginRight: 10,
        marginBottom: 0, // Sát đáy hoặc cách 1 chút
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerInfo: {
        flex: 1,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        maxWidth: '85%'
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2
    },
    statusText: {
        fontSize: 12,
        color: '#6B7280',
    },
    onlineDotHeader: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
        marginRight: 4
    },
    headerControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    controlBtn: {
        padding: 4,
        marginLeft: 8
    },
    content: {
        flex: 1,
        backgroundColor: '#FFF'
    }
});

export default ChatBubble;