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

    Platform

} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';

import { useTranslation } from 'react-i18next';

import { createScaledSheet } from '../../utils/scaledStyles';

import ScreenLayout from '../../components/layout/ScreenLayout';

import { useRooms } from '../../hooks/useRoom';

import { RoomResponse } from '../../types/dto';

import { RoomPurpose, RoomType } from '../../types/enums';



const getLanguageFlag = (language?: string): string => {

    switch (language?.toLowerCase()) {

        case 'en': return '🇬🇧';

        case 'vi': return '🇻🇳';

        case 'jp': return '🇯🇵';

        case 'kr': return '🇰🇷';

        case 'cn': return '🇨🇳';

        default: return '🌐';

    }

};



const PublicRoomListScreen = ({ navigation }: any) => {

    const { t } = useTranslation();

    const { usePublicRooms, useJoinRoom } = useRooms();

    const { mutate: joinRoomApi, isPending: isJoining } = useJoinRoom();



    const [searchQuery, setSearchQuery] = useState('');

    // FIX: Default to GROUP_CHAT only for the Lobby

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

        purpose: selectedFilter, // Only fetch based on selected Public filter

        roomName: searchQuery || undefined,

    };



    const { data: roomsData, isLoading, isError } = usePublicRooms(queryParams);

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

        if (room.roomType === RoomType.PRIVATE) {

            setSelectedRoomId(room.roomId);

            setShowPasswordModal(true);

        } else {

            joinRoomApi({ roomId: room.roomId }, {

                onSuccess: (data) => handleJoinSuccess(data),

                onError: (err) => Alert.alert(t('common.error'), t('room.join.failed'))

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

                        {

                            text: 'OK', onPress: () => {

                                setShowCodeModal(false);

                            }

                        }

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



    const renderRoom = ({ item }: { item: RoomResponse }) => (

        <TouchableOpacity

            style={styles.roomCard}

            onPress={() => handleRoomPress(item)}

        >

            <View style={styles.roomHeader}>

                <View style={styles.roomTitleContainer}>

                    <Text style={styles.roomFlag}>{getLanguageFlag('en')}</Text>

                    <View style={styles.roomTitleInfo}>

                        <Text style={styles.roomName}>{item.roomName}</Text>

                        <Text style={styles.roomCreator}>

                            {t('room.created.by')} {item.creatorName || t('user.anonymous')}

                        </Text>

                    </View>

                </View>



                <View style={styles.roomBadges}>

                    <View style={styles.codeBadge}>

                        <Text style={styles.codeText}>#{item.roomCode || '---'}</Text>

                    </View>

                    <View style={[

                        styles.purposeBadge,

                        item.purpose === RoomPurpose.GROUP_CHAT ? styles.learningBadge : styles.socialBadge

                    ]}>

                        <Text style={[

                            styles.purposeText,

                            item.purpose === RoomPurpose.GROUP_CHAT ? styles.learningText : styles.socialText

                        ]}>

                            {item.purpose === RoomPurpose.GROUP_CHAT ? t('purpose.learning') : t('purpose.social')}

                        </Text>

                    </View>

                </View>

            </View>



            <Text style={styles.roomDescription} numberOfLines={2}>

                {item.description || t('common.noDescription')}

            </Text>



            <View style={styles.roomFooter}>

                <View style={styles.memberInfo}>

                    <Icon name="group" size={16} color="#6B7280" />

                    <Text style={styles.memberCount}>

                        {item.memberCount || 0}/{item.maxMembers} {t('members')}

                    </Text>

                </View>



                <View style={styles.roomActions}>

                    <Text style={styles.roomTime}>

                        {new Date(item.createdAt).toLocaleDateString('vi-VN')}

                    </Text>

                    {item.roomType === RoomType.PRIVATE && (

                        <Icon name="lock" size={16} color="#EF4444" />

                    )}

                </View>

            </View>

        </TouchableOpacity>

    );



    return (

        <ScreenLayout style={styles.container}>

            <View style={styles.header}>

                <TouchableOpacity onPress={() => navigation.goBack()}>

                    <Icon name="arrow-back" size={24} color="#374151" />

                </TouchableOpacity>

                <Text style={styles.headerTitle}>{t('room.community_lobby')}</Text>

                <View style={{ flexDirection: 'row', gap: 12 }}>

                    {/* Button to navigate to Private Chats */}

                    <TouchableOpacity onPress={() => navigation.navigate('PrivateChatListScreen')}>

                        <Icon name="chat" size={24} color="#4F46E5" />

                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setShowCodeModal(true)}>

                        <Icon name="dialpad" size={24} color="#4F46E5" />

                    </TouchableOpacity>

                </View>

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

                    {/* Removed 'ALL' to force purpose selection for cleaner Public/Private separation */}

                    <TouchableOpacity style={[styles.filterButton, selectedFilter === RoomPurpose.GROUP_CHAT && styles.activeFilterButton]} onPress={() => setSelectedFilter(RoomPurpose.GROUP_CHAT)}>

                        <Text style={[styles.filterButtonText, selectedFilter === RoomPurpose.GROUP_CHAT && styles.activeFilterButtonText]}>{t('purpose.learning')}</Text>

                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.filterButton, selectedFilter === RoomPurpose.QUIZ_TEAM && styles.activeFilterButton]} onPress={() => setSelectedFilter(RoomPurpose.QUIZ_TEAM)}>

                        <Text style={[styles.filterButtonText, selectedFilter === RoomPurpose.QUIZ_TEAM && styles.activeFilterButtonText]}>{t('purpose.quiz')}</Text>

                    </TouchableOpacity>

                </View>



                {isLoading ? (

                    <ActivityIndicator size="large" style={{ marginTop: 20 }} color="#4F46E5" />

                ) : isError ? (

                    <Text style={styles.emptyText}>{t('errors.loading')}</Text>

                ) : (

                    <FlatList

                        data={rooms}

                        renderItem={renderRoom}

                        keyExtractor={(item) => item.roomId}

                        showsVerticalScrollIndicator={false}

                        contentContainerStyle={styles.roomsList}

                        ListEmptyComponent={

                            <View style={styles.emptyContainer}>

                                <Icon name="chat-bubble-outline" size={48} color="#D1D5DB" />

                                <Text style={styles.emptyText}>{t('room.empty_public')}</Text>

                            </View>

                        }

                    />

                )}



                <TouchableOpacity

                    style={styles.createRoomButton}

                    onPress={() => navigation.navigate('CreateRoomScreen')}

                >

                    <Icon name="add" size={24} color="#FFFFFF" />

                    <Text style={styles.createRoomButtonText}>{t('room.create')}</Text>

                </TouchableOpacity>

            </Animated.View>



            {/* Code & Password Modals (Kept same as original) */}

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

                            style={[styles.codeInput, { marginTop: 8 }]}

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

    container: { flex: 1, backgroundColor: '#F8FAFC' },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },

    headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },

    content: { flex: 1, padding: 20 },

    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, elevation: 2 },

    searchInput: { flex: 1, fontSize: 16, color: '#1F2937', marginLeft: 12 },

    filtersContainer: { flexDirection: 'row', marginBottom: 20, gap: 8 },

    filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },

    activeFilterButton: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },

    filterButtonText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },

    activeFilterButtonText: { color: '#FFFFFF' },

    roomsList: { paddingBottom: 80 },



    roomCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },

    roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },

    roomTitleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },

    roomFlag: { fontSize: 24, marginRight: 12 },

    roomTitleInfo: { flex: 1 },

    roomName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },

    roomCreator: { fontSize: 12, color: '#6B7280', marginTop: 2 },



    roomBadges: { gap: 4, alignItems: 'flex-end' },

    codeBadge: { backgroundColor: '#E0E7FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },

    codeText: { fontSize: 12, fontWeight: '700', color: '#4F46E5', fontFamily: 'monospace' },



    purposeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },

    learningBadge: { backgroundColor: '#ECFDF5' },

    socialBadge: { backgroundColor: '#EEF2FF' },

    purposeText: { fontSize: 10, fontWeight: '500' },

    learningText: { color: '#10B981' },

    socialText: { color: '#4F46E5' },



    roomDescription: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 12 },

    roomFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

    memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },

    memberCount: { fontSize: 12, color: '#6B7280' },

    roomActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

    roomTime: { fontSize: 12, color: '#9CA3AF' },



    createRoomButton: { position: 'absolute', bottom: 20, right: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#4F46E5', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, elevation: 8, gap: 8 },

    createRoomButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },



    emptyContainer: { alignItems: 'center', paddingVertical: 40 },

    emptyText: { fontSize: 16, color: '#6B7280', marginTop: 12, fontWeight: '500' },



    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },

    modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },

    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },

    modalTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },

    modalDescription: { fontSize: 14, color: '#6B7280', marginBottom: 20 },

    codeInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 24, letterSpacing: 4, color: '#1F2937', marginBottom: 20 },

    modalActions: { flexDirection: 'row', gap: 12 },

    cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center' },

    cancelButtonText: { fontSize: 16, color: '#6B7280', fontWeight: '500' },

    joinButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#4F46E5', alignItems: 'center' },

    joinButtonDisabled: { backgroundColor: '#D1D5DB' },

    joinButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' }

});



export default PublicRoomListScreen;