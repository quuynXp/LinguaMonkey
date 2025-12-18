import React, { useEffect, useRef, useMemo, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    PanResponder,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    StyleSheet
} from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChatStore } from "../../stores/ChatStore";
import { useUserStore } from "../../stores/UserStore";
import { useRoomMembers, useRoom } from "../../hooks/useRoom";
import ChatInnerView from "./ChatInnerView";
import { createScaledSheet } from "../../utils/scaledStyles";
import { RoomPurpose, RoomType } from "../../types/enums";
import { gotoTab } from "../../utils/navigationRef";
import RoomAvatar from '../common/RoomAvatar';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BUBBLE_SIZE = 60;

const ChatBubble = () => {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    const { user } = useUserStore();
    const {
        activeBubbleRoomId,
        isBubbleOpen,
        closeBubble,
        userStatuses
    } = useChatStore();

    const { data: members } = useRoomMembers(activeBubbleRoomId || "");
    const { data: roomInfo } = useRoom(activeBubbleRoomId || "");

    const [isMinimized, setIsMinimized] = useState(true);

    const initialX = SCREEN_WIDTH - BUBBLE_SIZE - 20;
    const initialY = insets.top + 100;
    const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;

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
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (_, gestureState) => {
                pan.flattenOffset();
                const currentX = (pan.x as any)._value;
                const currentY = (pan.y as any)._value;

                let newX = currentX;
                let newY = currentY;

                if (currentX < insets.left) newX = insets.left + 10;
                if (currentX > SCREEN_WIDTH - BUBBLE_SIZE - insets.right) newX = SCREEN_WIDTH - BUBBLE_SIZE - insets.right - 10;

                if (currentY < insets.top) newY = insets.top + 10;
                if (currentY > SCREEN_HEIGHT - BUBBLE_SIZE - insets.bottom) newY = SCREEN_HEIGHT - BUBBLE_SIZE - insets.bottom - 50;

                Animated.spring(pan, {
                    toValue: { x: newX, y: newY },
                    useNativeDriver: false,
                    friction: 5
                }).start();
            },
        })
    ).current;

    const handleToggleExpand = () => {
        setIsMinimized(!isMinimized);
    };

    const handleClose = () => {
        closeBubble();
        setIsMinimized(true);
    };

    const handleOpenFullChat = () => {
        if (activeBubbleRoomId) {
            closeBubble();
            gotoTab(
                "ChatStack",
                "GroupChatScreen",
                {
                    roomId: activeBubbleRoomId,
                    roomName: displayTitle,
                    ChatRoom: {
                        roomId: activeBubbleRoomId,
                        roomName: displayTitle
                    }
                }
            );
        }
    };

    useEffect(() => {
        if (isBubbleOpen) {
            setIsMinimized(true);
        }
    }, [isBubbleOpen, activeBubbleRoomId]);

    if (!isBubbleOpen || !activeBubbleRoomId) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {!isMinimized && (
                <View style={styles.expandedWrapper} pointerEvents="box-none">
                    <TouchableOpacity
                        style={styles.backdrop}
                        activeOpacity={1}
                        onPress={() => setIsMinimized(true)}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={[styles.window, { marginTop: insets.top + 60, marginBottom: insets.bottom + 20 }]}
                    >
                        <View style={styles.header}>
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
                                <TouchableOpacity onPress={() => setIsMinimized(true)} style={styles.controlBtn}>
                                    <Icon name="remove" size={24} color="#4B5563" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleClose} style={styles.controlBtn}>
                                    <Icon name="close" size={24} color="#4B5563" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.content}>
                            <ChatInnerView
                                roomId={activeBubbleRoomId}
                                isBubbleMode={true}
                                members={members || []}
                            />
                        </View>
                    </KeyboardAvoidingView>
                </View>
            )}

            <Animated.View
                style={[
                    styles.bubbleContainer,
                    { transform: [{ translateX: pan.x }, { translateY: pan.y }] }
                ]}
                {...panResponder.panHandlers}
            >
                <TouchableOpacity
                    onPress={handleToggleExpand}
                    style={styles.bubbleTouch}
                    activeOpacity={0.9}
                >
                    <RoomAvatar
                        avatarUrl={roomInfo?.avatarUrl}
                        members={members || []}
                        isGroup={roomInfo?.roomType !== RoomType.PRIVATE}
                        size={BUBBLE_SIZE}
                    />

                    {roomInfo?.purpose === RoomPurpose.PRIVATE_CHAT && isTargetOnline && (
                        <View style={styles.onlineDotBubble} />
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.closeBadge} onPress={handleClose}>
                    <Icon name="close" size={12} color="#FFF" />
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = createScaledSheet({
    bubbleContainer: {
        position: 'absolute',
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        zIndex: 9999,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    bubbleTouch: {
        width: '100%',
        height: '100%',
        borderRadius: BUBBLE_SIZE / 2,
        backgroundColor: '#FFF',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    closeBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#EF4444',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        elevation: 9,
        borderWidth: 1,
        borderColor: '#FFF'
    },
    onlineDotBubble: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#FFF',
        zIndex: 5
    },
    expandedWrapper: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9990,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    window: {
        width: SCREEN_WIDTH * 0.9,
        height: SCREEN_HEIGHT * 0.7,
        backgroundColor: '#FFF',
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        zIndex: 9991
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