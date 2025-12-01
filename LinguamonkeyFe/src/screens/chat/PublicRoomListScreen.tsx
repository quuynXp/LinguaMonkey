import React, { useRef, useState, useEffect } from 'react';
import {
    Alert,
    Animated,
    FlatList,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useRooms } from '../../hooks/useRoom';
import { RoomResponse } from '../../types/dto';
import { RoomPurpose } from '../../types/enums';

const PublicRoomListScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const { usePublicRooms, useJoinRoom } = useRooms();
    const { mutate: joinRoomApi, isPending: isJoining } = useJoinRoom();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<RoomPurpose>(RoomPurpose.GROUP_CHAT);

    const [showCodeModal, setShowCodeModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const [roomCodeInput, setRoomCodeInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    const queryParams = {
        page: 0,
        size: 20,
        purpose: selectedFilter,
        roomName: searchQuery || undefined,
    };

    const { data: roomsData, isLoading, isError, refetch } = usePublicRooms(queryParams);
    const rooms = (roomsData?.data || []) as RoomResponse[];

    const handleJoinSuccess = (room: RoomResponse) => {
        setShowCodeModal(false);
        setShowPasswordModal(false);
        setRoomCodeInput('');
        setPasswordInput('');
        setSelectedRoomId(null);
        navigation.navigate('GroupChatScreen', {
            roomId: room.roomId,
            roomName: room.roomName
        });
    };

    const handleRoomPress = (room: RoomResponse) => {
        // Check if room has password (assuming room.password exists and is not null/empty if protected)
        if (room.roomCode) {
            setSelectedRoomId(room.roomId);
            setPasswordInput('');
            setShowPasswordModal(true);
        } else {
            joinRoomApi({ roomId: room.roomId }, {
                onSuccess: (data) => handleJoinSuccess(data),
                onError: () => Alert.alert(t('common.error'), t('room.join.failed'))
            });
        }
    };

    const submitJoinByCode = () => {
        if (!roomCodeInput.trim()) return;
        joinRoomApi({ roomCode: roomCodeInput.trim(), password: passwordInput || undefined }, {
            onSuccess: (data) => handleJoinSuccess(data),
            onError: (err: any) => {
                if (err?.response?.data?.code === 1009) {
                    Alert.alert(t('error'), t('room.password.required'), [
                        { text: 'OK', onPress: () => setShowCodeModal(false) }
                    ]);
                } else {
                    Alert.alert(t('error'), t('room.not.found.or.full'));
                }
            }
        });
    };

    const submitPasswordJoin = () => {
        if (!selectedRoomId) return;
        joinRoomApi({ roomId: selectedRoomId, password: passwordInput }, {
            onSuccess: (data) => handleJoinSuccess(data),
            onError: () => Alert.alert(t('error'), t('room.password.invalid'))
        });
    };

    const renderRoomItem = ({ item }: { item: RoomResponse }) => {
        const avatarSource = item.avatarUrl
            ? { uri: item.avatarUrl }
            : require('../../assets/images/ImagePlacehoderCourse.png');

        return (
            <TouchableOpacity style={styles.roomItem} onPress={() => handleRoomPress(item)}>
                <View style={styles.avatarContainer}>
                    <Image source={avatarSource} style={styles.avatar} />
                </View>

                <View style={styles.roomInfo}>
                    <View style={styles.roomHeader}>
                        <Text style={styles.roomName} numberOfLines={1}>{item.roomName}</Text>
                        {item.roomCode && (
                            <Icon name="lock" size={16} color="#EF4444" style={{ marginLeft: 4 }} />
                        )}
                    </View>

                    <View style={styles.detailsRow}>
                        <Text style={styles.roomCode}>ID: {item.roomCode || '---'}</Text>
                        <Text style={styles.dot}>•</Text>
                        <Text style={styles.memberCount}>{item.memberCount}/{item.maxMembers} {t('members')}</Text>
                    </View>

                    <Text style={styles.roomDescription} numberOfLines={1}>
                        {item.description || t('common.noDescription')}
                    </Text>
                </View>

                <Icon name="chevron-right" size={24} color="#9CA3AF" />
            </TouchableOpacity>
        );
    };

    return (
        <ScreenLayout style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
                        <Icon name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('room.community_lobby')}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowCodeModal(true)}>
                    <Icon name="dialpad" size={28} color="#4F46E5" />
                </TouchableOpacity>
            </View>

            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <View style={styles.searchContainer}>
                    <Icon name="search" size={20} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('room.search_public')}
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <View style={styles.filtersContainer}>
                    <TouchableOpacity
                        style={[styles.filterButton, selectedFilter === RoomPurpose.GROUP_CHAT && styles.activeFilterButton]}
                        onPress={() => setSelectedFilter(RoomPurpose.GROUP_CHAT)}
                    >
                        <Text style={[styles.filterButtonText, selectedFilter === RoomPurpose.GROUP_CHAT && styles.activeFilterButtonText]}>
                            {t('purpose.learning')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, selectedFilter === RoomPurpose.QUIZ_TEAM && styles.activeFilterButton]}
                        onPress={() => setSelectedFilter(RoomPurpose.QUIZ_TEAM)}
                    >
                        <Text style={[styles.filterButtonText, selectedFilter === RoomPurpose.QUIZ_TEAM && styles.activeFilterButtonText]}>
                            {t('purpose.quiz')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 20 }} />
                ) : isError ? (
                    <Text style={styles.emptyText}>{t('errors.loading')}</Text>
                ) : (
                    <FlatList
                        data={rooms}
                        renderItem={renderRoomItem}
                        keyExtractor={(item) => item.roomId}
                        contentContainerStyle={styles.listContent}
                        refreshing={isLoading}
                        onRefresh={refetch}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Icon name="public-off" size={48} color="#D1D5DB" />
                                <Text style={styles.emptyText}>{t('room.empty_public')}</Text>
                            </View>
                        }
                    />
                )}
            </Animated.View>

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('CreateRoomScreen')}
            >
                <Icon name="add" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Code Join Modal */}
            <Modal visible={showCodeModal} transparent animationType="slide" onRequestClose={() => setShowCodeModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('room.join.by.code')}</Text>
                            <TouchableOpacity onPress={() => setShowCodeModal(false)}><Icon name="close" size={24} color="#6B7280" /></TouchableOpacity>
                        </View>
                        <Text style={styles.modalDescription}>{t('room.join.by.code.desc')}</Text>

                        <TextInput
                            style={styles.codeInput}
                            placeholder="000000"
                            placeholderTextColor="#9CA3AF"
                            value={roomCodeInput}
                            onChangeText={setRoomCodeInput}
                            keyboardType="number-pad"
                            maxLength={6}
                            textAlign="center"
                        />
                        <TextInput
                            style={[styles.codeInput, { marginTop: 8, fontSize: 16, letterSpacing: 0, textAlign: 'left' }]}
                            placeholder={t('password.optional')}
                            placeholderTextColor="#9CA3AF"
                            value={passwordInput}
                            onChangeText={setPasswordInput}
                            secureTextEntry
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCodeModal(false)}>
                                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.joinButton, (!roomCodeInput || isJoining) && styles.joinButtonDisabled]}
                                onPress={submitJoinByCode}
                                disabled={!roomCodeInput || isJoining}
                            >
                                {isJoining ? <ActivityIndicator color="#FFF" /> : <Text style={styles.joinButtonText}>{t('join')}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Password Modal */}
            <Modal visible={showPasswordModal} transparent animationType="fade" onRequestClose={() => setShowPasswordModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('room.private.title')}</Text>
                        <Text style={styles.modalDescription}>{t('room.enter.password')}</Text>
                        <TextInput
                            style={styles.codeInput}
                            placeholder="******"
                            placeholderTextColor="#9CA3AF"
                            value={passwordInput}
                            onChangeText={setPasswordInput}
                            secureTextEntry
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowPasswordModal(false); setPasswordInput(''); }}>
                                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.joinButton} onPress={submitPasswordJoin}>
                                {isJoining ? <ActivityIndicator color="#FFF" /> : <Text style={styles.joinButtonText}>{t('confirm')}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: '#FFF' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        backgroundColor: '#FFF',
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    content: { flex: 1 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, margin: 16, paddingHorizontal: 12, paddingVertical: 8 },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#1F2937' },
    filtersContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
    filterButton: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
    activeFilterButton: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    filterButtonText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
    activeFilterButtonText: { color: '#FFFFFF' },
    listContent: { paddingVertical: 8 },

    roomItem: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB'
    },
    avatarContainer: { position: 'relative' },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E0E7FF' },
    roomInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
    roomHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
    roomName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginRight: 6 },
    detailsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
    roomCode: { fontSize: 12, color: '#4F46E5', fontFamily: 'monospace', fontWeight: 'bold' },
    dot: { fontSize: 12, color: '#9CA3AF', marginHorizontal: 4 },
    memberCount: { fontSize: 12, color: '#6B7280' },
    roomDescription: { fontSize: 13, color: '#9CA3AF' },

    fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#4F46E5', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 4 } },

    emptyContainer: { alignItems: 'center', marginTop: 50 },
    emptyText: { fontSize: 16, color: '#6B7280', marginTop: 12, fontWeight: '500' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
    modalDescription: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
    codeInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 24, letterSpacing: 4, color: '#1F2937', marginBottom: 16 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center' },
    cancelButtonText: { fontSize: 16, color: '#6B7280', fontWeight: '500' },
    joinButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#4F46E5', alignItems: 'center' },
    joinButtonDisabled: { backgroundColor: '#D1D5DB' },
    joinButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' }
});

export default PublicRoomListScreen;