// import React, { useRef, useState, useEffect } from 'react';
// import {
//     ActivityIndicator,
//     Animated,
//     FlatList,
//     Text,
//     TouchableOpacity,
//     View,
//     Image
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import { useTranslation } from 'react-i18next';
// import { createScaledSheet } from '../../utils/scaledStyles';
// import ScreenLayout from '../../components/layout/ScreenLayout';
// import { useRooms } from '../../hooks/useRoom';
// import { RoomResponse } from '../../types/dto';
// import { RoomPurpose } from '../../types/enums';
// import { useUserStore } from '../../stores/UserStore';

// type FilterType = 'ALL' | 'FRIEND' | 'STRANGER' | 'COUPLE' | 'AI';

// const PrivateChatListScreen = ({ navigation }: any) => {
//     const { t } = useTranslation();
//     const { useJoinedRooms } = useRooms();
//     const { user } = useUserStore();
//     const [selectedFilter, setSelectedFilter] = useState<FilterType>('ALL');
//     const fadeAnim = useRef(new Animated.Value(0)).current;

//     const { data: roomsData, isLoading, isError } = useJoinedRooms({
//         page: 0,
//         size: 50,
//         purpose: selectedFilter === 'AI' ? RoomPurpose.AI_CHAT : undefined
//     });

//     const rooms = (roomsData?.data || []) as RoomResponse[];

//     useEffect(() => {
//         Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
//     }, []);

//     const getDisplayInfo = (room: RoomResponse) => {
//         if (room.purpose === RoomPurpose.AI_CHAT) {
//             return { name: room.roomName, avatar: null, isAI: true };
//         }

//         // Logic to find "The Other Person" name
//         // This is a simplified logic assuming roomName often contains names or we parse members in detail screen.
//         // Ideally, RoomResponse should contain a "recipient" field for 1-1 chats.
//         // Here we fallback to roomName which usually is "UserA & UserB" or similar from backend creation.
//         // Or better: The API we built returns "roomName" which might be generic.
//         // A robust solution requires fetching members for each room or backend populating a "displayRoomName".

//         let displayName = room.roomName;
//         if (displayName.includes('&')) {
//             // Try to remove my name
//             const parts = displayName.split('&').map(s => s.trim());
//             const other = parts.find(p => p !== user?.nickname && p !== user?.fullname);
//             if (other) displayName = other;
//         }
//         return { name: displayName, avatar: null, isAI: false };
//     };

//     const filteredRooms = rooms.filter(room => {
//         if (selectedFilter === 'ALL') return true;
//         if (selectedFilter === 'AI') return room.purpose === RoomPurpose.AI_CHAT;

//         // Basic filters for other types based on Purpose/Type logic
//         if (selectedFilter === 'COUPLE') return room.purpose === RoomPurpose.COUPLE; // If enum exists

//         // 'FRIEND' and 'STRANGER' logic would typically require checking a friends list 
//         // against the room members. For now, we show PRIVATE_CHAT rooms.
//         if (selectedFilter === 'FRIEND' || selectedFilter === 'STRANGER') {
//             return room.purpose === RoomPurpose.PRIVATE_CHAT;
//         }
//         return true;
//     });

//     const renderRoom = ({ item }: { item: RoomResponse }) => {
//         const info = getDisplayInfo(item);
//         return (
//             <TouchableOpacity
//                 style={styles.roomCard}
//                 onPress={() => navigation.navigate('GroupChatScreen', { roomId: item.roomId, roomName: info.name })}
//             >
//                 <View style={styles.avatarContainer}>
//                     {info.isAI ? (
//                         <View style={[styles.avatar, { backgroundColor: '#E0E7FF' }]}>
//                             <Icon name="smart-toy" size={24} color="#4F46E5" />
//                         </View>
//                     ) : (
//                         <View style={[styles.avatar, { backgroundColor: '#F3F4F6' }]}>
//                             <Text style={styles.avatarText}>{info.name.charAt(0).toUpperCase()}</Text>
//                         </View>
//                     )}
//                 </View>

//                 <View style={styles.roomInfo}>
//                     <View style={styles.roomHeader}>
//                         <Text style={styles.roomName} numberOfLines={1}>{info.name}</Text>
//                         <Text style={styles.timeText}>{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</Text>
//                     </View>
//                     <Text style={styles.lastMessage} numberOfLines={1}>
//                         {item.purpose === RoomPurpose.AI_CHAT ? t('chat.ai_assistant') : t('chat.click_to_view')}
//                     </Text>
//                 </View>
//             </TouchableOpacity>
//         );
//     };

//     return (
//         <ScreenLayout style={styles.container}>
//             <View style={styles.header}>
//                 <TouchableOpacity onPress={() => navigation.goBack()}>
//                     <Icon name="arrow-back" size={24} color="#374151" />
//                 </TouchableOpacity>
//                 <Text style={styles.headerTitle}>{t('chat.inbox')}</Text>
//                 <View style={{ width: 24 }} />
//             </View>

//             <View style={styles.filterScroll}>
//                 <FlatList
//                     horizontal
//                     showsHorizontalScrollIndicator={false}
//                     data={['ALL', 'AI', 'FRIEND', 'STRANGER', 'COUPLE']}
//                     keyExtractor={(item) => item}
//                     renderItem={({ item }) => (
//                         <TouchableOpacity
//                             style={[styles.filterChip, selectedFilter === item && styles.activeFilterChip]}
//                             onPress={() => setSelectedFilter(item as FilterType)}
//                         >
//                             <Text style={[styles.filterText, selectedFilter === item && styles.activeFilterText]}>
//                                 {t(`filter.${item.toLowerCase()}`)}
//                             </Text>
//                         </TouchableOpacity>
//                     )}
//                     contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
//                 />
//             </View>

//             <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
//                 {isLoading ? (
//                     <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 40 }} />
//                 ) : (
//                     <FlatList
//                         data={filteredRooms}
//                         renderItem={renderRoom}
//                         keyExtractor={(item) => item.roomId}
//                         contentContainerStyle={{ paddingBottom: 80 }}
//                         ListEmptyComponent={
//                             <View style={styles.emptyContainer}>
//                                 <Icon name="chat" size={48} color="#D1D5DB" />
//                                 <Text style={styles.emptyText}>{t('chat.no_messages')}</Text>
//                             </View>
//                         }
//                     />
//                 )}
//             </Animated.View>
//         </ScreenLayout>
//     );
// };

// const styles = createScaledSheet({
//     container: { flex: 1, backgroundColor: '#FFFFFF' },
//     header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
//     headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
//     filterScroll: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
//     filterChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
//     activeFilterChip: { backgroundColor: '#4F46E5' },
//     filterText: { fontSize: 13, fontWeight: '500', color: '#4B5563' },
//     activeFilterText: { color: '#FFFFFF' },
//     content: { flex: 1 },
//     roomCard: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F9FAFB', alignItems: 'center' },
//     avatarContainer: { marginRight: 12 },
//     avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
//     avatarText: { fontSize: 18, fontWeight: '600', color: '#6B7280' },
//     roomInfo: { flex: 1 },
//     roomHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
//     roomName: { fontSize: 16, fontWeight: '600', color: '#1F2937', flex: 1 },
//     timeText: { fontSize: 12, color: '#9CA3AF' },
//     lastMessage: { fontSize: 14, color: '#6B7280' },
//     emptyContainer: { alignItems: 'center', marginTop: 60 },
//     emptyText: { fontSize: 16, color: '#9CA3AF', marginTop: 12 }
// });

// export default PrivateChatListScreen;