import React, { useRef } from 'react';
import {
    View,
    PanResponder,
    Animated,
    TouchableOpacity,
    Dimensions,
    Text,
    Modal,
    StyleSheet,
} from 'react-native';
import { useChatStore } from '../../stores/ChatStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChatInnerView from './ChatInnerView';

const { width, height } = Dimensions.get('window');
const BUBBLE_SIZE = 60;

const ChatBubble = () => {
    const { activeBubbleRoomId, isBubbleOpen, openBubble, closeBubble, minimizeBubble } = useChatStore();
    const pan = useRef(new Animated.ValueXY({ x: width - BUBBLE_SIZE - 20, y: height / 2 })).current;

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
            onPanResponderGrant: () => {
                // @ts-ignore
                pan.setOffset({ x: pan.x._value, y: pan.y._value });
            },
            onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
            onPanResponderRelease: () => pan.flattenOffset(),
        })
    ).current;

    if (!activeBubbleRoomId) return null;

    return (
        <>
            {!isBubbleOpen && (
                <Animated.View style={[styles.bubbleContainer, { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]} {...panResponder.panHandlers}>
                    <TouchableOpacity onPress={() => openBubble(activeBubbleRoomId)} activeOpacity={0.8} style={styles.touchable}>
                        <View style={styles.avatarCircle}><Text style={styles.avatarText}>💬</Text></View>
                        <View style={styles.onlineBadge} />
                    </TouchableOpacity>
                </Animated.View>
            )}
            <Modal visible={isBubbleOpen} animationType="fade" transparent={true} onRequestClose={minimizeBubble}>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalBackground} onPress={minimizeBubble} />
                    <SafeAreaView style={styles.modalContentWrapper}>
                        <View style={styles.modalInner}>
                            <ChatInnerView roomId={activeBubbleRoomId} isBubbleMode={true} onCloseBubble={closeBubble} onMinimizeBubble={minimizeBubble} />
                        </View>
                    </SafeAreaView>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    bubbleContainer: { position: 'absolute', width: BUBBLE_SIZE, height: BUBBLE_SIZE, zIndex: 9999, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
    touchable: { width: '100%', height: '100%' },
    avatarCircle: { width: BUBBLE_SIZE, height: BUBBLE_SIZE, borderRadius: BUBBLE_SIZE / 2, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
    avatarText: { fontSize: 24 },
    onlineBadge: { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, backgroundColor: '#10B981', borderRadius: 8, borderWidth: 2, borderColor: '#FFF' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' },
    modalBackground: { flex: 1 },
    modalContentWrapper: { flex: 5, backgroundColor: 'transparent' },
    modalInner: { flex: 1, backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10, overflow: 'hidden' },
});

export default ChatBubble;