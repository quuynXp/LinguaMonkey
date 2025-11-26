// import React, { useEffect } from 'react';
// import { View, Text, FlatList, RefreshControl, ActivityIndicator, StatusBar , StyleSheet } from 'react-native';
// import { useSocialStore } from '../../store/socialStore';
// import { SocialUserCard } from '../../components/social/SocialUserCard';
// import { UserProfile } from '../../types/social';
// import { createScaledSheet } from '../../utils/scaledStyles'; // Import trực tiếp tool của bạn

// export const SocialLobbyScreen = () => {
//     const {
//         partner,
//         onlineFriends,
//         offlineFriends,
//         fetchLobbyData,
//         inviteUser,
//         isLoading
//     } = useSocialStore();

//     useEffect(() => {
//         fetchLobbyData();
//     }, []);

//     const handleInvite = (user: UserProfile, isPartner: boolean) => {
//         inviteUser(user.userId, isPartner ? 'PARTNER' : 'FRIEND');
//     };

//     const renderHeader = () => (
//         <View>
//             <View style={styles.headerContainer}>
//                 <Text style={styles.headerTitle}>Study Together</Text>
//                 <Text style={styles.headerSubtitle}>Connect & Grow with friends</Text>
//             </View>

//             {partner && (
//                 <View style={styles.sectionContainer}>
//                     <Text style={styles.sectionTitle}>Your Partner</Text>
//                     <SocialUserCard
//                         user={partner.partner}
//                         coupleData={partner}
//                         onInvite={() => handleInvite(partner.partner, true)}
//                     />
//                 </View>
//             )}

//             {(onlineFriends.length > 0 || offlineFriends.length > 0) && (
//                 <Text style={styles.activeFriendsTitle}>
//                     Active Friends ({onlineFriends.length})
//                 </Text>
//             )}
//         </View>
//     );

//     const friendList = [...onlineFriends, ...offlineFriends];

//     return (
//         <View style={styles.container}>
//             <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />

//             {isLoading && friendList.length === 0 ? (
//                 <View style={styles.loadingContainer}>
//                     <ActivityIndicator size="large" color="#007AFF" />
//                 </View>
//             ) : (
//                 <FlatList
//                     data={friendList}
//                     keyExtractor={(item) => item.userId}
//                     renderItem={({ item }) => (
//                         <View style={styles.itemWrapper}>
//                             <SocialUserCard
//                                 user={item}
//                                 onInvite={() => handleInvite(item, false)}
//                             />
//                         </View>
//                     )}
//                     ListHeaderComponent={renderHeader}
//                     contentContainerStyle={styles.listContent}
//                     refreshControl={
//                         <RefreshControl refreshing={isLoading} onRefresh={fetchLobbyData} />
//                     }
//                     ListEmptyComponent={
//                         !isLoading ? (
//                             <View style={styles.emptyState}>
//                                 <Text style={styles.emptyText}>No friends online right now.</Text>
//                             </View>
//                         ) : null
//                     }
//                 />
//             )}
//         </View>
//     );
// };

// // Dùng trực tiếp createScaledSheet tại đây
// const styles = createScaledSheet({
//     container: {
//         flex: 1,
//         backgroundColor: '#F5F7FA',
//     },
//     loadingContainer: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     listContent: {
//         paddingBottom: 32, // Auto-scale
//     },
//     headerContainer: {
//         padding: 20, // Auto-scale
//         backgroundColor: '#FFFFFF',
//         borderBottomWidth: 1,
//         borderBottomColor: '#EEEEEE',
//         marginBottom: 16,
//     },
//     headerTitle: {
//         fontSize: 24, // Auto-scale font
//         fontWeight: '800',
//         color: '#1A1A1A',
//     },
//     headerSubtitle: {
//         fontSize: 14,
//         color: '#757575',
//         marginTop: 4,
//     },
//     sectionContainer: {
//         paddingHorizontal: 16,
//     },
//     sectionTitle: {
//         fontSize: 18,
//         fontWeight: '700',
//         color: '#333333',
//         marginBottom: 12,
//     },
//     activeFriendsTitle: {
//         fontSize: 18,
//         fontWeight: '700',
//         color: '#333333',
//         marginBottom: 12,
//         marginTop: 16,
//         marginLeft: 16
//     },
//     itemWrapper: {
//         paddingHorizontal: 16,
//     },
//     emptyState: {
//         padding: 32,
//         alignItems: 'center',
//     },
//     emptyText: {
//         color: '#999',
//         fontSize: 14,
//     },
// });