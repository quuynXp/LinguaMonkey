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
import { useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useUserStore } from '../../stores/UserStore';
import { useUsers } from '../../hooks/useUsers';
import { useFriendships } from '../../hooks/useFriendships';
import { getAvatarSource } from '../../utils/avatarUtils';
import { getCountryFlag } from '../../utils/flagUtils';
import { UserResponse, FriendshipResponse, UserProfileResponse } from '../../types/dto';
import { gotoTab } from '../../utils/navigationRef';
import { FriendshipStatus, Country, AgeRange } from '../../types/enums';

type RouteParams = {
    SuggestedUsersScreen: {
        initialTab?: number;
    };
};

const FilterModal = ({ visible, onClose, onApply, currentFilters }: any) => {
    const { t } = useTranslation();
    const [country, setCountry] = useState(currentFilters.country);
    const [gender, setGender] = useState(currentFilters.gender);
    const [ageRange, setAgeRange] = useState(currentFilters.ageRange);

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

const SuggestedUsersScreen = () => {
    const { t } = useTranslation();
    const route = useRoute<RouteProp<RouteParams, 'SuggestedUsersScreen'>>();
    const user = useUserStore((state) => state.user);

    const [activeTab, setActiveTab] = useState(route.params?.initialTab ?? 0);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const [keyword, setKeyword] = useState('');
    const [filters, setFilters] = useState<any>({});
    const [showFilter, setShowFilter] = useState(false);

    const { useSearchPublicUsers, useSuggestedUsers } = useUsers();
    const { useAllFriendships, useCreateFriendship, useUpdateFriendship } = useFriendships();

    const createFriendshipMutation = useCreateFriendship();
    const updateFriendshipMutation = useUpdateFriendship();

    const { data: suggestionsData, refetch: refetchSuggestions } = useSuggestedUsers(user?.userId || '', 0, 10);
    const suggestions = suggestionsData?.content || [];

    const { data: allUsersData, refetch: refetchAllUsers, isLoading: loadingAllUsers } = useSearchPublicUsers({
        page: 0,
        size: 20,
        keyword: keyword,
        ...filters
    });
    const allUsers = allUsersData?.data || [];

    const { data: requestsData, refetch: refetchRequests } = useAllFriendships({
        receiverId: user?.userId,
        status: 'PENDING',
        page: 0,
        size: 50
    });
    const requests = requestsData?.content || [];

    const { data: friendsData, refetch: refetchFriends, isLoading: loadingFriends } = useAllFriendships({
        requesterId: user?.userId,
        status: 'ACCEPTED',
        page: 0,
        size: 50
    });

    const friendsList = useMemo(() => {
        return friendsData?.content.map(f => f.requesterId === user?.userId ? f.receiver : f.requester).filter(u => u) as UserResponse[] || [];
    }, [friendsData, user?.userId]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        if (activeTab === 0) {
            await Promise.all([refetchSuggestions(), refetchAllUsers()]);
        } else {
            await Promise.all([refetchRequests(), refetchFriends()]);
        }
        setRefreshing(false);
    }, [activeTab, refetchSuggestions, refetchAllUsers, refetchRequests, refetchFriends]);

    const handleAddFriend = async (targetId: string) => {
        if (!user?.userId) return;
        setActionLoadingId(targetId);
        try {
            await createFriendshipMutation.mutateAsync({
                requesterId: user.userId,
                receiverId: targetId,
                status: FriendshipStatus.PENDING
            });
            refetchAllUsers();
            refetchSuggestions();
        } catch (e) { console.error(e); } finally { setActionLoadingId(null); }
    };

    const handleAcceptRequest = async (friendship: FriendshipResponse) => {
        if (!user?.userId || !friendship.id) return;
        setActionLoadingId(friendship.id.toString());
        try {
            await updateFriendshipMutation.mutateAsync({
                user1Id: friendship.requesterId,
                user2Id: user.userId,
                req: { status: FriendshipStatus.ACCEPTED, requesterId: friendship.requesterId, receiverId: user.userId }
            });
            refetchRequests();
            refetchFriends();
        } catch (e) { console.error(e); } finally { setActionLoadingId(null); }
    };

    const renderActionButton = (item: UserResponse | UserProfileResponse, isActionLoading: boolean) => {
        const isProfile = 'friendRequestStatus' in item;
        const status = isProfile ? (item as UserProfileResponse).friendRequestStatus?.status : 'NONE';
        const isFriend = isProfile ? (item as UserProfileResponse).isFriend : false;
        const isSender = isProfile ? (item as UserProfileResponse).friendRequestStatus?.hasSentRequest : false;

        if (isFriend || status === 'ACCEPTED') {
            return (
                <TouchableOpacity style={styles.messageButton}>
                    <Icon name="chat-bubble-outline" size={20} color="#4F46E5" />
                </TouchableOpacity>
            );
        }

        if (status === 'PENDING') {
            if (isSender) {
                return (
                    <TouchableOpacity style={[styles.addButton, styles.sentButton]} disabled>
                        <Icon name="check" size={20} color="#FFF" />
                    </TouchableOpacity>
                );
            } else {
                // Received request context handled in Requests tab, but if found here:
                return (
                    <TouchableOpacity style={styles.messageButton} onPress={() => gotoTab('Profile', 'UserProfileViewScreen', { userId: item.userId })}>
                        <Text style={{ fontSize: 10, color: '#4F46E5' }}>View</Text>
                    </TouchableOpacity>
                )
            }
        }

        return (
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => handleAddFriend(item.userId)}
                disabled={isActionLoading}
            >
                {isActionLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Icon name="person-add" size={20} color="#FFF" />}
            </TouchableOpacity>
        );
    }

    const renderUserItem = ({ item, isRequest = false, friendshipId }: { item: UserResponse | UserProfileResponse, isRequest?: boolean, friendshipId?: string }) => {
        const isActionLoading = actionLoadingId === (isRequest ? friendshipId : item.userId);
        const gender = 'gender' in item ? item.gender : null;
        const vip = 'vip' in item ? item.vip : false;

        return (
            <TouchableOpacity
                style={styles.userCard}
                onPress={() => gotoTab('Profile', 'UserProfileViewScreen', { userId: item.userId })}
            >
                <View style={styles.avatarContainer}>
                    <Image source={getAvatarSource(item.avatarUrl, gender?.toString())} style={styles.avatar} />
                    {item.country && (
                        <View style={styles.flagBadge}>
                            <Text style={{ fontSize: 10 }}>{getCountryFlag(item.country)}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.userInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.userName} numberOfLines={1}>{item.fullname || item.nickname}</Text>
                        {vip && <Icon name="verified" size={14} color="#F59E0B" style={{ marginLeft: 4 }} />}
                    </View>
                    <Text style={styles.userSubtext}>@{item.nickname}</Text>
                    {item.languages && item.languages.length > 0 && (
                        <Text style={styles.langText} numberOfLines={1}>{item.languages.join(', ')}</Text>
                    )}
                </View>

                {isRequest ? (
                    <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => handleAcceptRequest({ id: friendshipId, requesterId: item.userId } as any)}
                        disabled={isActionLoading}
                    >
                        {isActionLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.acceptButtonText}>{t('common.accept')}</Text>}
                    </TouchableOpacity>
                ) : (
                    renderActionButton(item, isActionLoading)
                )}
            </TouchableOpacity>
        );
    };

    const SuggestionsHeader = () => {
        if (keyword.length > 0) return null;
        if (suggestions.length === 0) return null;

        return (
            <View style={styles.headerSection}>
                <Text style={styles.headerTitle}>{t('profile.suggestions')}</Text>
                <FlatList
                    horizontal
                    data={suggestions}
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.userId}
                    contentContainerStyle={{ paddingHorizontal: 4 }}
                    renderItem={({ item }) => {
                        // FIX: Explicitly cast `item` to `UserResponse` since `suggestions` array is of that type.
                        const userItem = item as UserResponse;
                        return (
                            <TouchableOpacity
                                style={styles.suggestionCardHorizontal}
                                onPress={() => gotoTab('Profile', 'UserProfileViewScreen', { userId: userItem.userId })}
                            >
                                <View style={{ position: 'relative' }}>
                                    <Image source={getAvatarSource(userItem.avatarUrl, userItem.gender)} style={styles.suggestionAvatar} />
                                    {userItem.country && <View style={styles.flagBadgeSmall}><Text style={{ fontSize: 9 }}>{getCountryFlag(userItem.country)}</Text></View>}
                                </View>
                                <Text style={styles.suggestionName} numberOfLines={1}>{userItem.fullname || userItem.nickname}</Text>
                                <TouchableOpacity style={styles.addSmallButton} onPress={() => handleAddFriend(userItem.userId)}>
                                    <Icon name="person-add" size={14} color="#FFF" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        );
                    }}
                />
                <View style={styles.divider} />
                <Text style={styles.headerTitle}>{t('profile.allUsers')}</Text>
            </View>
        );
    };

    const RequestsHeader = () => {
        if (requests.length === 0) return null;
        return (
            <View style={styles.headerSection}>
                <Text style={styles.headerTitle}>{t('profile.requests')} ({requests.length})</Text>
                {requests.map((req, index) => (
                    <View key={req.id || index}>
                        {/* FIX: Cast req.requester to UserResponse and ensure it exists */}
                        {req.requester && renderUserItem({ item: req.requester as UserResponse, isRequest: true, friendshipId: req.id })}
                    </View>
                ))}
                <View style={styles.divider} />
                <Text style={styles.headerTitle}>{t('profile.myFriends')}</Text>
            </View>
        );
    };

    const renderTab0 = () => (
        <View style={{ flex: 1 }}>
            <View style={styles.searchBarContainer}>
                <View style={styles.searchInputWrapper}>
                    <Icon name="search" size={20} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('common.searchByNameNickEmailPhone')}
                        value={keyword}
                        onChangeText={setKeyword}
                        onSubmitEditing={() => refetchAllUsers()}
                    />
                </View>
                <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilter(true)}>
                    <Icon name="filter-list" size={24} color="#4F46E5" />
                </TouchableOpacity>
            </View>

            <FlatList
            data={allUsers}
            renderItem={({ item }: { item: UserResponse | UserProfileResponse }) => renderUserItem({ item })}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListHeaderComponent={SuggestionsHeader}
            ListEmptyComponent={!loadingAllUsers ? <Text style={styles.emptyText}>{t('common.noResults')}</Text> : null}
        />
        </View>
    );

    const renderTab1 = () => (
        <FlatList
            data={friendsList}
            renderItem={({ item }) => renderUserItem({ item })}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListHeaderComponent={RequestsHeader}
            ListEmptyComponent={!loadingFriends && requests.length === 0 ? <Text style={styles.emptyText}>{t('profile.noFriends')}</Text> : null}
        />
    );

    return (
        <ScreenLayout>
            <View style={styles.container}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity style={[styles.tab, activeTab === 0 && styles.activeTab]} onPress={() => setActiveTab(0)}>
                        <Text style={[styles.tabText, activeTab === 0 && styles.activeTabText]}>{t('profile.allUsers')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, activeTab === 1 && styles.activeTab]} onPress={() => setActiveTab(1)}>
                        <Text style={[styles.tabText, activeTab === 1 && styles.activeTabText]}>{t('profile.myFriends')}</Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 0 ? renderTab0() : renderTab1()}

                <FilterModal
                    visible={showFilter}
                    onClose={() => setShowFilter(false)}
                    onApply={(newFilters: any) => { setFilters(newFilters); refetchAllUsers(); }}
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
    tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
    activeTabText: { color: '#4F46E5', fontWeight: '700' },
    listContent: { padding: 16, paddingBottom: 40 },
    userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 16, marginBottom: 12, elevation: 1 },
    avatarContainer: { position: 'relative', width: 50, height: 50 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E5E7EB' },
    flagBadge: { position: 'absolute', top: -2, left: -2, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: 1, elevation: 2 },
    userInfo: { flex: 1, marginLeft: 12 },
    userName: { fontSize: 16, fontWeight: '700', color: '#111827' },
    userSubtext: { fontSize: 13, color: '#6B7280' },
    langText: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
    addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' },
    sentButton: { backgroundColor: '#9CA3AF' },
    messageButton: { padding: 8, backgroundColor: '#EEF2FF', borderRadius: 20 },
    acceptButton: { backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    acceptButtonText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
    headerSection: { marginBottom: 16 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 },
    divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },
    suggestionCardHorizontal: { width: 100, alignItems: 'center', backgroundColor: '#FFF', padding: 10, borderRadius: 12, marginRight: 10, elevation: 1 },
    suggestionAvatar: { width: 50, height: 50, borderRadius: 25, marginBottom: 6 },
    suggestionName: { fontSize: 12, fontWeight: '600', textAlign: 'center', color: '#374151', marginBottom: 6 },
    addSmallButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' },
    flagBadgeSmall: { position: 'absolute', top: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 6, padding: 1 },
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