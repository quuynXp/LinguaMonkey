import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useChatStore } from '../../stores/ChatStore';

const IncomingCallModal = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const { incomingCallRequest, acceptIncomingCall, rejectIncomingCall } = useChatStore();

    // Animation for pulsing effect
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (incomingCallRequest) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
                ])
            ).start();
        } else {
            pulseAnim.stopAnimation();
        }
    }, [incomingCallRequest]);

    if (!incomingCallRequest) return null;

    const handleAccept = () => {
        const { roomId } = incomingCallRequest;
        acceptIncomingCall();
        navigation.navigate('WebRTCCallScreen', {
            roomId: roomId,
        });
    };

    const handleDecline = () => {
        rejectIncomingCall();
    };

    return (
        <Modal transparent visible={!!incomingCallRequest} animationType="fade" onRequestClose={handleDecline}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.avatarContainer}>
                        <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
                        <Icon name="videocam" size={40} color="#FFF" style={{ zIndex: 1 }} />
                    </View>

                    <Text style={styles.title}>{t('call.incoming_video_call')}</Text>
                    <Text style={styles.roomName}>{incomingCallRequest.roomName || 'Group Chat'}</Text>

                    <View style={styles.actions}>
                        <TouchableOpacity style={[styles.btn, styles.declineBtn]} onPress={handleDecline}>
                            <Icon name="call-end" size={28} color="#FFF" />
                            <Text style={styles.btnText}>{t('call.decline')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={handleAccept}>
                            <Icon name="call" size={28} color="#FFF" />
                            <Text style={styles.btnText}>{t('call.join')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '85%',
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        position: 'relative',
    },
    pulseCircle: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(79, 70, 229, 0.3)',
    },
    title: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 8,
    },
    roomName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 32,
        textAlign: 'center',
    },
    actions: {
        flexDirection: 'row',
        gap: 32,
        width: '100%',
        justifyContent: 'center',
    },
    btn: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    acceptBtn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#10B981',
    },
    declineBtn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#EF4444',
    },
    btnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
        marginTop: 4,
        position: 'absolute',
        bottom: -24,
        width: 80,
        textAlign: 'center',
    }
});

export default IncomingCallModal;