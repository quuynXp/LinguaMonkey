import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Image,
    TextInput,
    Modal,
    ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useUserStore } from '../../stores/UserStore';
import { useUsers } from '../../hooks/useUsers';
import { useFriendships } from '../../hooks/useFriendships';
import { useCouples } from '../../hooks/useCouples';
import { getAvatarSource } from '../../utils/avatarUtils';
import { getCountryFlag } from '../../utils/flagUtils';
import { UserResponse, UserProfileResponse } from '../../types/dto';
import { gotoTab } from '../../utils/navigationRef';
import { FriendshipStatus, Country, AgeRange } from '../../types/enums';

type RouteParams = {
    SuggestedUsersScreen: {
        initialTab?: number;
    };
};

// --- Filter Modal Component ---
const FilterModal = ({ visible, onClose, onApply, currentFilters }: any) => {
    const { t } = useTranslation();
    const [country, setCountry] = useState<Country | undefined>(currentFilters.country);
    const [gender, setGender] = useState<string | undefined>(currentFilters.gender);
    const [ageRange, setAgeRange] = useState<AgeRange | undefined>(currentFilters.ageRange);

    const handleApply = () => {
        onApply({ country, gender, ageRange });
        onClose();
    };

    const handleClear = () => {
        setCountry(undefined);
        setGender(undefined);
        setAgeRange(undefined);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('common.filter')}</Text>
                        <TouchableOpacity onPress={onClose}><Icon name="close" size={24} /></TouchableOpacity>
                    </View>
                    <ScrollView style={{ maxHeight: 400 }}>
                        <Text style={styles.filterLabel}>{t('profile.country')}</Text>
                        <View style={styles.chipContainer}>
                            {Object.values(Country).map((c) => (
                                <TouchableOpacity key={c} style={[styles.chip, country === c && styles.chipActive]} onPress={() => setCountry(c === country ? undefined : c)}>
                                    <Text style={[styles.chipText, country === c && styles.chipTextActive]}>{getCountryFlag(c, 16)} {c}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.filterLabel}>{t('profile.gender')}</Text>
                        <View style={styles.chipContainer}>
                            {['MALE', 'FEMALE', 'OTHER'].map((g) => (
                                <TouchableOpacity key={g} style={[styles.chip, gender === g && styles.chipActive]} onPress={() => setGender(g === gender ? undefined : g)}>
                                    <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{t(`gender.${g}`)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.filterLabel}>{t('profile.ageRange')}</Text>
                        <View style={styles.chipContainer}>
                            {Object.values(AgeRange).map((age) => (
                                <TouchableOpacity key={age} style={[styles.chip, ageRange === age && styles.chipActive]} onPress={() => setAgeRange(age === ageRange ? undefined : age)}>
                                    <Text style={[styles.chipText, ageRange === age && styles.chipTextActive]}>{age}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.resetButton} onPress={handleClear}><Text style={styles.resetButtonText}>{t('common.reset')}</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.applyButton} onPress={handleApply}><Text style={styles.applyButtonText}>{t('common.apply')}</Text></TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// --- Main Screen ---
const SuggestedUsersScreen = () => {
    const { t } = useTranslation();
    const route = useRoute<RouteProp<RouteParams, 'SuggestedUsersScreen'>>();
    const user = useUserStore((state) => state.user);
    const navigation = useNavigation<any>();

    // 0: Suggestions (Explore), 1: Requests (Friend/Couple), 2: Friends & Couple
    const [activeTab, setActiveTab] = useState(route.params?.initialTab ?? 0);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const [keyword, setKeyword] = useState('');
    const [filters, setFilters] = useState<any>({});
    const [showFilter, setShowFilter] = useState(false);

    // Hooks
    const { useSearchPublicUsers, useSuggestedUsers } = useUsers();
    const { useAllFriendships, useCreateFriendship, useUpdateFriendship } = useFriendships();
    const { useAllCouples } = useCouples();

    const createFriendshipMutation = useCreateFriendship();
    const updateFriendshipMutation = useUpdateFriendship();

    // --- DATA FETCHING ---

    // TAB 0: Explore / Suggestions
    const isSearching = !!keyword || !!filters.country || !!filters.gender || !!filters.ageRange;

    const { data: searchData, refetch: refetchSearch, isLoading: loadingSearch } = useSearchPublicUsers({
        page: 0, size: 50, keyword, ...filters
    });

    const { data: suggestedData, refetch: refetchSuggested, isLoading: loadingSuggested } = useSuggestedUsers(
        user?.userId || '', 0, 20
    );

    // FIX TYPE ERROR: Explicitly type the useMemo return to allow mixed types in FlatList
    const exploreUsers = useMemo((): (UserResponse | UserProfileResponse)[] => {
        if (isSearching) return (searchData?.data || []);
        return (suggestedData?.content || []);
    }, [isSearching, searchData, suggestedData]);

    const loadingExplore = isSearching ? loadingSearch : loadingSuggested;


    // TAB 1: Requests (Couple Pending + Friend Sent/Received)
    const { data: coupleReqData, refetch: refetchCoupleReq } = useAllCouples({
        user1Id: user?.userId,
        status: 'PENDING',
        page: 0, size: 20
    });

    const { data: friendSentData, refetch: refetchFriendSent } = useAllFriendships({
        requesterId: user?.userId,
        status: 'PENDING',
        page: 0, size: 20
    });

    const { data: friendRecData, refetch: refetchFriendRec } = useAllFriendships({
        receiverId: user?.userId,
        status: 'PENDING',
        page: 0, size: 20
    });

    // TAB 2: Friends & Active Couple
    const { data: friendsData, refetch: refetchFriends, isLoading: loadingFriends } = useAllFriendships({
        requesterId: user?.userId,
        status: 'ACCEPTED',
        page: 0, size: 100
    });

    // Fetch Active Couple (In Love)
    const { data: activeCoupleData, refetch: refetchActiveCouple } = useAllCouples({
        user1Id: user?.userId,
        status: 'IN_LOVE',
        page: 0, size: 1
    });
    // Fallback for EXPLORING status if needed
    const { data: exploringCoupleData, refetch: refetchExploringCouple } = useAllCouples({
        user1Id: user?.userId,
        status: 'EXPLORING',
        page: 0, size: 1
    });


    // --- AGGREGATE DATA ---

    const tab1Data = useMemo(() => {
        const filterFn = (item: any) => {
            const u = item.target;
            if (!u) return false;
            let match = true;
            if (keyword) match = match && (u.fullname?.toLowerCase().includes(keyword.toLowerCase()) || u.nickname?.toLowerCase().includes(keyword.toLowerCase()));
            return match;
        };

        const couples = (coupleReqData?.content || []).map(c => {
            const isMeUser1 = c.user1?.userId === user?.userId;
            return {
                ...c,
                type: isMeUser1 ? 'COUPLE_SENT' : 'COUPLE_RECEIVED',
                target: isMeUser1 ? c.user2 : c.user1
            };
        }).filter(filterFn);

        const friendSent = (friendSentData?.content || []).map(f => ({ ...f, type: 'FRIEND_SENT', target: f.receiver })).filter(filterFn);
        const friendRec = (friendRecData?.content || []).map(f => ({ ...f, type: 'FRIEND_RECEIVED', target: f.requester })).filter(filterFn);

        return { couples, friendSent, friendRec };
    }, [coupleReqData, friendSentData, friendRecData, keyword, user?.userId]);

    const tab2Data = useMemo(() => {
        const list = (friendsData?.content || []).map(f => {
            const isMeRequester = f.requester?.userId === user?.userId;
            return { ...f, targetUser: isMeRequester ? f.receiver : f.requester, type: 'FRIEND' };
        }).filter(item => item.targetUser !== null);

        const activeCouple = (activeCoupleData?.content && activeCoupleData.content.length > 0)
            ? activeCoupleData.content[0]
            : (exploringCoupleData?.content && exploringCoupleData.content.length > 0 ? exploringCoupleData.content[0] : null);

        let finalList: any[] = list;

        if (activeCouple) {
            const isMeUser1 = activeCouple.user1?.userId === user?.userId;
            const partner = isMeUser1 ? activeCouple.user2 : activeCouple.user1;
            if (partner) {
                finalList = list.filter(f => f.targetUser.userId !== partner.userId);
                finalList.unshift({
                    ...activeCouple,
                    targetUser: partner,
                    type: 'COUPLE_PARTNER',
                    coupleStatus: activeCouple.status
                });
            }
        }

        return finalList.filter(item => {
            const u = item.targetUser;
            let match = true;
            if (keyword) match = match && (u.fullname?.toLowerCase().includes(keyword.toLowerCase()) || u.nickname?.toLowerCase().includes(keyword.toLowerCase()));
            if (filters.country) match = match && u.country === filters.country;
            if (filters.gender) match = match && u.gender === filters.gender;
            if (filters.ageRange) match = match && u.ageRange === filters.ageRange;
            return match;
        });
    }, [friendsData, activeCoupleData, exploringCoupleData, user?.userId, keyword, filters]);


    // --- ACTIONS ---

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        if (activeTab === 0) {
            if (isSearching) await refetchSearch();
            else await refetchSuggested();
        }
        if (activeTab === 1) await Promise.all([refetchCoupleReq(), refetchFriendSent(), refetchFriendRec()]);
        if (activeTab === 2) await Promise.all([refetchFriends(), refetchActiveCouple(), refetchExploringCouple()]);
        setRefreshing(false);
    }, [activeTab, isSearching, refetchSearch, refetchSuggested, refetchCoupleReq, refetchFriendSent, refetchFriendRec, refetchFriends, refetchActiveCouple, refetchExploringCouple]);

    const handleAddFriend = async (targetId: string) => {
        if (!user?.userId) return;
        setActionLoadingId(targetId);
        try {
            await createFriendshipMutation.mutateAsync({
                requesterId: user.userId,
                receiverId: targetId,
                status: FriendshipStatus.PENDING
            });
            if (activeTab === 0) { isSearching ? refetchSearch() : refetchSuggested(); }
            refetchFriendSent();
        } catch (e) { console.error(e); } finally { setActionLoadingId(null); }
    };

    const handleAcceptRequestGeneric = async (requesterId: string) => {
        if (!user?.userId) return;
        setActionLoadingId(requesterId);
        try {
            await updateFriendshipMutation.mutateAsync({
                user1Id: requesterId,
                user2Id: user.userId,
                req: { status: FriendshipStatus.ACCEPTED, requesterId: requesterId, receiverId: user.userId }
            });
            refetchFriendRec();
            refetchFriends();
        } catch (e) { console.error(e); } finally { setActionLoadingId(null); }
    };

    const handleChat = (targetUser: any) => {
        console.log("Navigating to chat with", targetUser.userId);
        // navigation.navigate('ChatDetail', { partner: targetUser });
    };

    // --- RENDER ---

    const renderActionButton = (item: UserResponse | UserProfileResponse, isActionLoading: boolean) => {
        const profile = item as UserProfileResponse;

        const isFriend = profile.isFriend;
        const hasSent = profile.friendRequestStatus?.hasSentRequest;
        const hasReceived = profile.friendRequestStatus?.hasReceivedRequest;

        if (isFriend) {
            return (
                <TouchableOpacity style={styles.messageButton} onPress={() => handleChat(item)}>
                    <Icon name="chat-bubble-outline" size={20} color="#4F46E5" />
                </TouchableOpacity>
            );
        }
        if (hasReceived) {
            return (
                <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptRequestGeneric(item.userId)} disabled={isActionLoading}>
                    {isActionLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.acceptButtonText}>{t('common.accept')}</Text>}
                </TouchableOpacity>
            );
        }
        if (hasSent) {
            return (
                <TouchableOpacity style={[styles.addButton, styles.sentButton]} disabled>
                    <Icon name="check" size={20} color="#FFF" />
                </TouchableOpacity>
            );
        }
        return (
            <TouchableOpacity style={styles.addButton} onPress={() => handleAddFriend(item.userId)} disabled={isActionLoading}>
                {isActionLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Icon name="person-add" size={20} color="#FFF" />}
            </TouchableOpacity>
        );
    };

    const renderUserItem = ({ item, type, coupleStatus }: { item: any, type: string, coupleStatus?: string }) => {
        let displayUser = item;

        if (['COUPLE_SENT', 'COUPLE_RECEIVED', 'FRIEND_SENT', 'FRIEND_RECEIVED'].includes(type)) displayUser = item.target;
        if (type === 'FRIEND' || type === 'COUPLE_PARTNER') displayUser = item.targetUser;

        if (!displayUser) return null;

        const isActionLoading = actionLoadingId === displayUser.userId;
        const isCouplePartner = type === 'COUPLE_PARTNER';

        return (
            <TouchableOpacity
                style={[styles.userCard, isCouplePartner && styles.coupleCard]}
                onPress={() => gotoTab('Profile', 'UserProfileViewScreen', { userId: displayUser.userId })}
            >
                <View style={styles.avatarContainer}>
                    <Image source={getAvatarSource(displayUser.avatarUrl, displayUser.gender?.toString())} style={styles.avatar} />
                    {displayUser.country && (
                        <View style={styles.flagBadge}>
                            <Text style={{ fontSize: 10 }}>{getCountryFlag(displayUser.country)}</Text>
                        </View>
                    )}
                    {isCouplePartner && (
                        <View style={styles.heartBadge}>
                            <Icon name="favorite" size={12} color="#FFF" />
                        </View>
                    )}
                </View>

                <View style={styles.userInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.userName, isCouplePartner && { color: '#BE123C' }]} numberOfLines={1}>
                            {displayUser.fullname || displayUser.nickname}
                        </Text>
                        {displayUser.vip && <Icon name="verified" size={14} color="#F59E0B" style={{ marginLeft: 4 }} />}
                    </View>
                    <Text style={styles.userSubtext} numberOfLines={1}>
                        {type === 'COUPLE_SENT' && `Waiting couple response...`}
                        {type === 'COUPLE_RECEIVED' && `Wants to be your couple`}
                        {type === 'FRIEND_SENT' && `Request sent`}
                        {type === 'FRIEND_RECEIVED' && `Wants to be friends`}
                        {type === 'COUPLE_PARTNER' && `Your Partner (${coupleStatus})`}
                        {['FRIEND', 'PUBLIC'].includes(type) && `@${displayUser.nickname}`}
                    </Text>
                </View>

                {/* --- ACTIONS --- */}

                {type === 'PUBLIC' && renderActionButton(displayUser, isActionLoading)}

                {(type === 'FRIEND_RECEIVED' || type === 'COUPLE_RECEIVED') && (
                    <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptRequestGeneric(displayUser.userId)} disabled={isActionLoading}>
                        {isActionLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.acceptButtonText}>{t('common.accept')}</Text>}
                    </TouchableOpacity>
                )}

                {(type === 'FRIEND' || type === 'COUPLE_PARTNER') && (
                    <TouchableOpacity style={styles.messageButton} onPress={() => handleChat(displayUser)}>
                        <Icon name="chat-bubble-outline" size={20} color="#4F46E5" />
                    </TouchableOpacity>
                )}

                {(type === 'COUPLE_SENT' || type === 'FRIEND_SENT') && (
                    <View style={[styles.addButton, styles.sentButton]}>
                        <Icon name="access-time" size={20} color="#FFF" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderTab0_Explore = () => (
        <FlatList
            data={exploreUsers}
            renderItem={({ item }) => renderUserItem({ item, type: 'PUBLIC' })}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={!loadingExplore ? <Text style={styles.emptyText}>{t('common.noResults')}</Text> : null}
            ListHeaderComponent={!isSearching ? <Text style={styles.sectionHeader}>{t('Suggested for you')}</Text> : null}
        />
    );

    const renderTab1_Requests = () => {
        const { couples, friendSent, friendRec } = tab1Data;
        const flattenedData = [
            ...(couples.length ? [{ header: 'Couple Requests' }, ...couples] : []),
            ...(friendRec.length ? [{ header: 'Friend Requests (Received)' }, ...friendRec] : []),
            ...(friendSent.length ? [{ header: 'Friend Requests (Sent)' }, ...friendSent] : []),
        ];

        return (
            <FlatList
                data={flattenedData}
                keyExtractor={(item, index) => (item as any).id || index.toString()}
                renderItem={({ item }: { item: any }) => {
                    if (item.header) return <Text style={styles.sectionHeader}>{item.header}</Text>;
                    return renderUserItem({ item, type: item.type });
                }}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={<Text style={styles.emptyText}>{t('profile.noRequests')}</Text>}
            />
        );
    };

    const renderTab2_Friends = () => (
        <FlatList
            data={tab2Data}
            renderItem={({ item }) => renderUserItem({ item, type: item.type, coupleStatus: item.coupleStatus })}
            keyExtractor={(item) => item.id || item.targetUser.userId}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={!loadingFriends ? <Text style={styles.emptyText}>{t('profile.noFriends')}</Text> : null}
        />
    );

    return (
        <ScreenLayout>
            <View style={styles.container}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity style={[styles.tab, activeTab === 0 && styles.activeTab]} onPress={() => setActiveTab(0)}>
                        <Text style={[styles.tabText, activeTab === 0 && styles.activeTabText]}>{t('Suggested')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, activeTab === 1 && styles.activeTab]} onPress={() => setActiveTab(1)}>
                        <Text style={[styles.tabText, activeTab === 1 && styles.activeTabText]}>{t('Requests')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, activeTab === 2 && styles.activeTab]} onPress={() => setActiveTab(2)}>
                        <Text style={[styles.tabText, activeTab === 2 && styles.activeTabText]}>{t('Friends')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Filter & Search */}
                <View style={styles.searchBarContainer}>
                    <View style={styles.searchInputWrapper}>
                        <Icon name="search" size={20} color="#9CA3AF" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={t('common.searchByNameNickEmailPhone')}
                            value={keyword}
                            onChangeText={setKeyword}
                        />
                    </View>
                    <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilter(true)}>
                        <Icon name="filter-list" size={24} color="#4F46E5" />
                    </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                    {activeTab === 0 && renderTab0_Explore()}
                    {activeTab === 1 && renderTab1_Requests()}
                    {activeTab === 2 && renderTab2_Friends()}
                </View>

                <FilterModal
                    visible={showFilter}
                    onClose={() => setShowFilter(false)}
                    onApply={(newFilters: any) => { setFilters(newFilters); }}
                    currentFilters={filters}
                />
            </View>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: '#F4F7F9' },
    tabContainer: { flexDirection: 'row', backgroundColor: '#FFF', padding: 4, marginHorizontal: 16, marginVertical: 12, borderRadius: 12, elevation: 2 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    activeTab: { backgroundColor: '#EEF2FF' },
    tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
    activeTabText: { color: '#4F46E5', fontWeight: '700' },
    listContent: { padding: 16, paddingBottom: 40 },
    userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 16, marginBottom: 12, elevation: 1 },
    coupleCard: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3', borderWidth: 1 },
    avatarContainer: { position: 'relative', width: 50, height: 50 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E5E7EB' },
    flagBadge: { position: 'absolute', top: -2, left: -2, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: 1, elevation: 2 },
    heartBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#E11D48', borderRadius: 10, padding: 3, elevation: 2 },
    userInfo: { flex: 1, marginLeft: 12 },
    userName: { fontSize: 16, fontWeight: '700', color: '#111827' },
    userSubtext: { fontSize: 13, color: '#6B7280' },
    addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' },
    sentButton: { backgroundColor: '#9CA3AF' },
    messageButton: { padding: 10, backgroundColor: '#EEF2FF', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    acceptButton: { backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    acceptButtonText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
    sectionHeader: { fontSize: 14, fontWeight: '800', color: '#6B7280', marginTop: 10, marginBottom: 8, textTransform: 'uppercase' },
    searchBarContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10 },
    searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 12, height: 44, elevation: 1 },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#000' },
    filterButton: { marginLeft: 12, justifyContent: 'center', alignItems: 'center', width: 44, height: 44, backgroundColor: '#FFF', borderRadius: 12, elevation: 1 },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#6B7280' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '700' },
    filterLabel: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
    chipActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
    chipText: { fontSize: 13, color: '#4B5563' },
    chipTextActive: { color: '#4F46E5', fontWeight: '600' },
    modalFooter: { flexDirection: 'row', marginTop: 24, gap: 12 },
    resetButton: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
    resetButtonText: { fontWeight: '600', color: '#6B7280' },
    applyButton: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#4F46E5' },
    applyButtonText: { fontWeight: '600', color: '#FFF' },
});

export default SuggestedUsersScreen;