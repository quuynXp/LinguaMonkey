import React, { useRef } from 'react';
import {
    View,
    PanResponder,
    Animated,

    TouchableOpacity,
    Dimensions,
    Text,
    Modal,
    SafeAreaView,
    StyleSheet
} from 'react-native';
import { useChatStore } from '../../stores/ChatStore';
import ChatInnerView from './ChatInnerView';

const { width, height } = Dimensions.get('window');
const BUBBLE_SIZE = 60;

const ChatBubble = () => {
    const { activeBubbleRoomId, isBubbleOpen, openBubble, closeBubble, minimizeBubble } = useChatStore();

    // Dragging State
    const pan = useRef(new Animated.ValueXY({ x: width - BUBBLE_SIZE - 20, y: height / 2 })).current;

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only drag if moved more than 2 pixels (prevent accidental drags on tap)
                return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
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
            onPanResponderRelease: () => {
                pan.flattenOffset();
                // Snap to nearest edge logic could go here
            },
        })
    ).current;

    // Don't render anything if no active bubble
    if (!activeBubbleRoomId) return null;

    // Render the Modal (Full Chat) or the Bubble Head
    return (
        <>
            {/* 1. Floating Bubble Head */}
            {!isBubbleOpen && (
                <Animated.View
                    style={[
                        styles.bubbleContainer,
                        { transform: [{ translateX: pan.x }, { translateY: pan.y }] }
                    ]}
                    {...panResponder.panHandlers}
                >
                    <TouchableOpacity
                        onPress={() => openBubble(activeBubbleRoomId)}
                        activeOpacity={0.8}
                        style={styles.touchable}
                    >
                        {/* You can fetch the Room Avatar here using a small query or just a generic icon */}
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarText}>💬</Text>
                        </View>
                        <View style={styles.onlineBadge} />
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* 2. Expanded Chat Window (Modal) */}
            <Modal
                visible={isBubbleOpen}
                animationType="fade"
                transparent={true}
                onRequestClose={minimizeBubble}
            >
                <View style={styles.modalOverlay}>
                    {/* Transparent area to click out */}
                    <TouchableOpacity style={styles.modalBackground} onPress={minimizeBubble} />

                    <SafeAreaView style={styles.modalContentWrapper}>
                        <View style={styles.modalInner}>
                            <ChatInnerView
                                roomId={activeBubbleRoomId}
                                isBubbleMode={true}
                                onCloseBubble={closeBubble}
                                onMinimizeBubble={minimizeBubble}
                            />
                        </View>
                    </SafeAreaView>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    bubbleContainer: {
        position: 'absolute',
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        zIndex: 9999, // Ensure it's on top
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    touchable: {
        width: '100%',
        height: '100%',
    },
    avatarCircle: {
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        borderRadius: BUBBLE_SIZE / 2,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    avatarText: {
        fontSize: 24,
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 16,
        height: 16,
        backgroundColor: '#10B981',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)', // Slight dim
        justifyContent: 'flex-end',
    },
    modalBackground: {
        flex: 1,
    },
    modalContentWrapper: {
        flex: 5, // Take up 80% of screen height from bottom
        backgroundColor: 'transparent',
    },
    modalInner: {
        flex: 1,
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
        overflow: 'hidden',
    },
});

export default ChatBubble;