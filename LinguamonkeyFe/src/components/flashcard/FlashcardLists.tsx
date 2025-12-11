// import React, { useState } from 'react';
// import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import { useTranslation } from 'react-i18next';
// import { createScaledSheet } from '../../utils/scaledStyles';
// import { FlashcardResponse } from '../../types/dto';
// import { useFlashcards } from '../../hooks/useFlashcards';

// interface FlashcardListProps {
//     lessonId: string | null;
//     searchQuery: string;
//     isLoading: boolean;
//     data: FlashcardResponse[];
// }

// interface CommunityFlashcardListProps {
//     lessonId: string | null;
//     searchQuery: string;
// }

// // --- Common Renderer for Flashcard Item ---
// const FlashcardCard = ({ item, isCommunity = false, onClaim, isClaiming }: { item: FlashcardResponse, isCommunity?: boolean, onClaim?: (id: string) => void, isClaiming?: boolean }) => {
//     const { t } = useTranslation();

//     const renderOwnerInfo = () => (
//         <View style={styles.ownerInfo}>
//             <Icon name="person" size={14} color="#6B7280" />
//             <Text style={styles.ownerText}>{item.ownerUsername || t('flashcard.originalCreator')}</Text>
//             <Text style={styles.claimCount}>
//                 <Icon name="people" size={14} color="#6B7280" /> {item.claimCount || 0}
//             </Text>
//         </View>
//     );

//     const renderMediaIcon = () => {
//         if (item.mediaUrl) {
//             // A simple check/icon for media
//             return <Icon name="perm-media" size={18} color="#0077D6" style={{ marginRight: 8 }} />;
//         }
//         return null;
//     };

//     return (
//         <TouchableOpacity style={styles.card} onPress={() => { /* Navigate to detailed viewer or full-screen review */ }}>
//             <View style={styles.cardHeader}>
//                 <View style={styles.cardTypeTag}>
//                     <Text style={styles.cardTypeTagText}>{item.isPublic ? 'PUBLIC' : 'PRIVATE'}</Text>
//                 </View>
//                 {isCommunity && renderOwnerInfo()}
//             </View>
//             <View style={styles.cardContent}>
//                 {renderMediaIcon()}
//                 <Text style={styles.cardFrontText} numberOfLines={2}>{item.frontText}</Text>
//                 <Text style={styles.cardBackHint} numberOfLines={1}>({item.backText})</Text>
//             </View>

//             {isCommunity && onClaim && (
//                 <TouchableOpacity
//                     style={[styles.claimButton, item.isClaimed && styles.claimedButton]}
//                     onPress={() => onClaim(item.flashcardId)}
//                     disabled={item.isClaimed || isClaiming}
//                 >
//                     {isClaiming ? <ActivityIndicator color="#FFF" /> : (
//                         <Text style={styles.claimButtonText}>
//                             {item.isClaimed ? t('flashcard.claimed') : t('flashcard.claim')}
//                         </Text>
//                     )}
//                 </TouchableOpacity>
//             )}

//             {!isCommunity && (
//                 <View style={styles.srsInfo}>
//                     <Text style={styles.srsText}>{t('flashcard.due')}: {item.nextReviewDate ? new Date(item.nextReviewDate).toLocaleDateString() : t('flashcard.new')}</Text>
//                     <Text style={styles.srsText}>Interval: {item.interval} days</Text>
//                 </View>
//             )}
//         </TouchableOpacity>
//     );
// };


// // --- My Flashcards List ---
// export const FlashcardList = ({ data, isLoading }: FlashcardListProps) => {
//     const { t } = useTranslation();

//     if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} color="#37352F" />;

//     return (
//         <FlatList
//             data={data}
//             renderItem={({ item }) => <FlashcardCard item={item} />}
//             keyExtractor={item => item.flashcardId}
//             contentContainerStyle={styles.listContent}
//             ListEmptyComponent={
//                 <View style={styles.emptyState}>
//                     <Icon name="style" size={48} color="#E5E7EB" />
//                     <Text style={styles.emptyText}>{t("flashcard.emptyMy") ?? "No flashcards found. Create one or claim from Community."}</Text>
//                 </View>
//             }
//         />
//     );
// };

// // --- Community Flashcards List ---
// export const CommunityFlashcardList = ({ lessonId, searchQuery }: CommunityFlashcardListProps) => {
//     const { t } = useTranslation();
//     const [sort, setSort] = useState('popular');
//     const { useGetCommunityFlashcards, useClaimFlashcard } = useFlashcards();
//     const { mutate: claimFlashcard, isPending: isClaiming } = useClaimFlashcard();

//     const { data: communityPage, isLoading, refetch } = useGetCommunityFlashcards(lessonId, {
//         page: 0,
//         size: 20,
//         query: searchQuery.length > 2 ? searchQuery : undefined,
//         sort
//     });

//     const handleClaim = (flashcardId: string) => {
//         if (!lessonId) return;
//         claimFlashcard({ lessonId, flashcardId }, {
//             onSuccess: () => Alert.alert(t('common.success'), t('flashcard.claimSuccess')),
//             onError: () => Alert.alert('Error', t('flashcard.claimFail')),
//         });
//     };

//     const communityCards = communityPage?.data || [];

//     return (
//         <View style={{ flex: 1 }}>
//             <View style={styles.sortContainer}>
//                 <Text style={styles.sortLabel}>{t('flashcard.sortBy')}:</Text>
//                 {(['popular', 'newest'] as const).map(s => (
//                     <TouchableOpacity
//                         key={s}
//                         onPress={() => setSort(s)}
//                         style={[styles.sortChip, sort === s && styles.activeChip]}
//                     >
//                         <Text style={[styles.sortChipText, sort === s && styles.activeChipText]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
//                     </TouchableOpacity>
//                 ))}
//             </View>
//             {isLoading ? (
//                 <ActivityIndicator style={{ marginTop: 40 }} color="#37352F" />
//             ) : (
//                 <FlatList
//                     data={communityCards}
//                     renderItem={({ item }) => <FlashcardCard item={item} isCommunity={true} onClaim={handleClaim} isClaiming={isClaiming} />}
//                     keyExtractor={item => item.flashcardId}
//                     contentContainerStyle={styles.listContent}
//                     ListEmptyComponent={
//                         <View style={styles.emptyState}>
//                             <Icon name="public" size={48} color="#E5E7EB" />
//                             <Text style={styles.emptyText}>{t("flashcard.emptyCommunity") ?? "Be the first to share a flashcard!"}</Text>
//                         </View>
//                     }
//                 />
//             )}
//         </View>
//     );
// };

// const styles = createScaledSheet({
//     listContent: { padding: 16, paddingBottom: 80 },
//     card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E9E9E9', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
//     cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
//     cardTypeTag: { backgroundColor: '#F0F9FF', borderRadius: 4, paddingVertical: 4, paddingHorizontal: 8 },
//     cardTypeTagText: { fontSize: 10, color: '#0077D6', fontWeight: '700' },
//     cardContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
//     cardFrontText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#37352F' },
//     cardBackHint: { fontSize: 14, color: '#9CA3AF', marginLeft: 10 },
//     ownerInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
//     ownerText: { fontSize: 12, color: '#6B7280', marginLeft: 4 },
//     claimCount: { fontSize: 12, color: '#6B7280', marginLeft: 8 },
//     srsInfo: { borderTopWidth: 1, borderTopColor: '#F7F7F7', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
//     srsText: { fontSize: 12, color: '#6B7280' },
//     emptyState: { alignItems: 'center', marginTop: 60 },
//     emptyText: { color: '#9CA3AF', marginTop: 12, textAlign: 'center' },
//     sortContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 5, paddingBottom: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#F1F1F1' },
//     sortLabel: { fontSize: 13, color: '#37352F', fontWeight: '500' },
//     sortChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: '#D1D5DB' },
//     activeChip: { backgroundColor: '#37352F', borderColor: '#37352F' },
//     sortChipText: { fontSize: 12, color: '#37352F' },
//     activeChipText: { color: '#FFF' },
//     claimButton: { backgroundColor: '#0077D6', paddingVertical: 8, borderRadius: 8, alignItems: 'center', marginTop: 8 },
//     claimedButton: { backgroundColor: '#22C55E' },
//     claimButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 }
// });