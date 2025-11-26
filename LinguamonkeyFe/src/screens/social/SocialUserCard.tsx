// import React from 'react';
// import { View, Text, Image, TouchableOpacity , StyleSheet } from 'react-native';
// import { UserProfile, CoupleData } from '../../types/api';
// import { createScaledSheet } from '../../utils/scaledStyles'; // Import trực tiếp tool

// interface Props {
//     user: UserProfile;
//     coupleData?: CoupleData;
//     onInvite: () => void;
// }

// export const SocialUserCard: React.FC<Props> = ({ user, coupleData, onInvite }) => {
//     const isPartner = !!coupleData;

//     return (
//         <View style={[styles.card, isPartner && styles.partnerCard]}>
//             <View style={styles.avatarContainer}>
//                 <Image
//                     source={{ uri: user.avatarUrl || 'https://via.placeholder.com/100' }}
//                     style={styles.avatar}
//                 />
//                 {user.isOnline && <View style={styles.onlineBadge} />}
//             </View>

//             <View style={styles.infoContainer}>
//                 <Text style={styles.name}>{user.fullname}</Text>
//                 <Text style={styles.level}>Level {user.level} • {isPartner ? 'My Soulmate 💖' : 'Friend'}</Text>

//                 {isPartner && coupleData && (
//                     <View style={styles.coupleStats}>
//                         <Text style={styles.treeText}>🌱 {coupleData.treeStatus}</Text>
//                         <Text style={styles.scoreText}>Scores: {coupleData.coupleScore}</Text>
//                     </View>
//                 )}
//             </View>

//             <TouchableOpacity
//                 style={[styles.inviteButton, isPartner && styles.partnerButton]}
//                 onPress={onInvite}
//             >
//                 <Text style={styles.inviteText}>
//                     {isPartner ? 'Date 💌' : 'Study 📚'}
//                 </Text>
//             </TouchableOpacity>
//         </View>
//     );
// };

// const styles = createScaledSheet({
//     card: {
//         flexDirection: 'row',
//         backgroundColor: '#FFFFFF',
//         borderRadius: 16, // Auto-scale (radius logic)
//         padding: 12,
//         marginBottom: 12,
//         alignItems: 'center',
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.05,
//         shadowRadius: 4,
//         elevation: 2,
//         borderWidth: 1,
//         borderColor: '#F0F0F0',
//     },
//     partnerCard: {
//         backgroundColor: '#FFF0F5',
//         borderColor: '#FF69B4',
//         borderWidth: 1.5,
//     },
//     avatarContainer: {
//         position: 'relative',
//         marginRight: 12,
//     },
//     avatar: {
//         width: 56, // Auto-scale
//         height: 56, // Auto-scale vertical
//         borderRadius: 28,
//         backgroundColor: '#E0E0E0',
//     },
//     onlineBadge: {
//         position: 'absolute',
//         bottom: 2,
//         right: 2,
//         width: 14,
//         height: 14,
//         borderRadius: 7,
//         backgroundColor: '#4CAF50',
//         borderWidth: 2,
//         borderColor: '#FFFFFF',
//     },
//     infoContainer: {
//         flex: 1,
//     },
//     name: {
//         fontSize: 16,
//         fontWeight: '700',
//         color: '#333333',
//         marginBottom: 4,
//     },
//     level: {
//         fontSize: 12,
//         color: '#757575',
//         marginBottom: 4,
//     },
//     coupleStats: {
//         flexDirection: 'row',
//         // gap không có trong logic scale của bạn, dùng margin thay thế nếu cần scale chuẩn, hoặc giữ nguyên nếu layout flex đã ổn
//         gap: 8,
//     },
//     treeText: {
//         fontSize: 11,
//         color: '#2E7D32',
//         fontWeight: '600',
//     },
//     scoreText: {
//         fontSize: 11,
//         color: '#E91E63',
//         fontWeight: '600',
//     },
//     inviteButton: {
//         backgroundColor: '#E3F2FD',
//         paddingHorizontal: 16,
//         paddingVertical: 8,
//         borderRadius: 20,
//     },
//     partnerButton: {
//         backgroundColor: '#FCE4EC',
//     },
//     inviteText: {
//         fontSize: 13,
//         fontWeight: '600',
//         color: '#1976D2',
//     },
// });