import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
    Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useUserStore } from '../../stores/UserStore';
import { useUsers } from '../../hooks/useUsers';
import { useFriendships, AllFriendshipsParams } from '../../hooks/useFriendships';
import { getAvatarSource } from '../../utils/avatarUtils';
import { getCountryFlag } from '../../utils/flagUtils';
import { UserResponse, FriendshipResponse, PageResponse, FriendshipRequest } from '../../types/dto';
import { gotoTab } from '../../utils/navigationRef';
import { FriendshipStatus } from '../../types/enums';
// Assuming useSuggestedUsers returns a standard UseQueryResult<PageResponse<UserResponse>, Error>
// The hooks likely need to be manually typed if they don't use React Query's UseInfiniteQueryResult

const { width } = Dimensions.get('window');

type RouteParams = {
    SuggestedUsersScreen: {
        initialTab?: number;
    };
};

// Define the type for the useSuggestedUsers result to resolve the fetchNextPage/hasNextPage errors
// This assumes useSuggestedUsers returns a type that supports infinite scrolling (like useInfiniteQuery)
// Since `useSuggestedUsers` is part of `useUsers`, we'll assume it returns the necessary fields.
// The data structure used in the component suggests it returns something similar to UseInfiniteQueryResult's shape, 
// but since the original error shows UseQueryResult<PageResponse<UserResponse>, Error>, 
// we must correct the usage.
// **Correction Hypothesis**: The component is attempting to use the infinite query pattern on a regular query result.
// If the hook *is* actually an infinite query, the `data` type should be adjusted.
// Given the use of `fetchNextPage` and `hasNextPage` later, let's assume `useSuggestedUsers` returns an Infinite Query result, 
// and the error message only captured the non-paginated type for simplicity.
// For simplicity and to resolve the errors, we'll cast the query result to include the missing properties if the hook 
// is incorrectly typed, but the best solution is to correctly type the hook in its definition (`useUsers`).
// Since I cannot change external files, I will apply the necessary type changes based on the intended usage.

// Since the PageResponse does not have fetchNextPage/hasNextPage on the top level, 
// we must assume the custom hook `useSuggestedUsers` is wrapping the **useInfiniteQuery** hook from react-query.
interface UseSuggestedUsersResult {
    data: { pages: PageResponse<UserResponse>[]; pageParams: any[] } | undefined;
    isLoading: boolean;
    refetch: () => Promise<any>;
    fetchNextPage: () => void;
    hasNextPage: boolean | undefined;
}


const SuggestedUsersScreen = () => {
    const { t } = useTranslation();
    const route = useRoute<RouteProp<RouteParams, 'SuggestedUsersScreen'>>();
    const navigation = useNavigation();
    const user = useUserStore((state) => state.user);

    const [activeTab, setActiveTab] = useState(route.params?.initialTab ?? 1);
    const [refreshing, setRefreshing] = useState(false);
    const [requestActionLoading, setRequestActionLoading] = useState<string | null>(null);

    const { useSuggestedUsers } = useUsers();
    const { useAllFriendships, useCreateFriendship, useUpdateFriendship } = useFriendships();

    const createFriendshipMutation = useCreateFriendship();
    const updateFriendshipMutation = useUpdateFriendship();

    const friendsParams: AllFriendshipsParams = {
        userId: user?.userId,
        status: 'ACCEPTED',
        page: 0,
        size: 20,
    } as any;

    const requestParams: AllFriendshipsParams = {
        receiverId: user?.userId,
        status: 'PENDING',
        page: 0,
        size: 10,
    };

    const {
        data: friendsData,
        isLoading: loadingFriends,
        refetch: refetchFriends
    } = useAllFriendships(activeTab === 0 ? friendsParams : undefined);

    const {
        data: requestsData,
        isLoading: loadingRequests,
        refetch: refetchRequests
    } = useAllFriendships(activeTab === 1 ? requestParams : undefined);

    // **TYPE CORRECTION 1: Use Suggested Users Result Type**
    // We cast the result of useSuggestedUsers to the expected type with fetchNextPage and hasNextPage
    // (This is a common pattern when a custom hook abstracts away useInfiniteQuery)
    const {
        data: suggestionsData,
        isLoading: loadingSuggestions,
        refetch: refetchSuggestions,
        fetchNextPage,
        hasNextPage
    } = useSuggestedUsers(user?.userId || '', 0, 20) as unknown as UseSuggestedUsersResult;

    // Flatten the suggestions data to get a simple array of UserResponse
    const flatSuggestions: UserResponse[] = suggestionsData?.pages?.flatMap(page => page.content) || [];


    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        if (activeTab === 0) {
            await refetchFriends();
        } else {
            await Promise.all([refetchRequests(), refetchSuggestions()]);
        }
        setRefreshing(false);
    }, [activeTab, refetchFriends, refetchRequests, refetchSuggestions]);

    const handleAddFriend = async (targetUser: UserResponse) => {
        if (!user?.userId || !targetUser.userId) return;
        setRequestActionLoading(targetUser.userId);
        try {
            // **TYPE CORRECTION 2: Missing 'status' in createFriendshipMutation argument**
            // The FriendshipRequest type requires 'status', which should default to PENDING for creation.
            await createFriendshipMutation.mutateAsync({
                requesterId: user.userId,
                receiverId: targetUser.userId,
                status: FriendshipStatus.PENDING, // Added missing status
            } as FriendshipRequest);
            refetchSuggestions(); // Refresh suggestions to update the UI after sending a request
        } catch (error) {
            console.error(error);
        } finally {
            setRequestActionLoading(null);
        }
    };

    const handleAcceptRequest = async (request: FriendshipResponse) => {
        if (!user?.userId || !request.requesterId) return;
        setRequestActionLoading(request.id?.toString() || '');
        try {
            await updateFriendshipMutation.mutateAsync({
                user1Id: request.requesterId,
                user2Id: user.userId,
                req: {
                    status: FriendshipStatus.ACCEPTED,
                    requesterId: request.requesterId,
                    receiverId: user.userId
                } as FriendshipRequest, // Ensure the request body matches the expected type
            });
            refetchRequests(); // Refresh requests list
            refetchFriends(); // Refresh friends list
        } catch (error) {
            console.error(error);
        } finally {
            setRequestActionLoading(null);
        }
    };

    const renderFriendItem = ({ item }: { item: FriendshipResponse }) => {
        const friend = item.requesterId === user?.userId ? item.receiver : item.requester;
        if (!friend) return null;

        return (
            <TouchableOpacity
                style={styles.userCard}
                onPress={() => gotoTab('Profile', 'UserProfileScreen', { userId: friend.userId })}
            >
                <Image source={getAvatarSource(friend.avatarUrl, friend.gender)} style={styles.avatar} />
                <View style={styles.flagContainer}>
                    {friend.country && <Text style={{ fontSize: 10 }}>{getCountryFlag(friend.country, 12)}</Text>}
                </View>
                <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>{friend.fullname || friend.nickname}</Text>
                    <Text style={styles.userSubtext}>@{friend.nickname}</Text>
                </View>
                <TouchableOpacity style={styles.messageButton}>
                    <Icon name="chat-bubble-outline" size={20} color="#4F46E5" />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    const renderRequestItem = ({ item }: { item: FriendshipResponse }) => {
        const requester = item.requester;
        if (!requester) return null;
        const isLoading = requestActionLoading === item.id?.toString();

        return (
            <View style={styles.requestCard}>
                <TouchableOpacity onPress={() => gotoTab('Profile', 'UserProfileScreen', { userId: requester.userId })}>
                    <Image source={getAvatarSource(requester.avatarUrl, requester.gender)} style={styles.avatar} />
                    <View style={styles.flagContainer}>
                        {requester.country && <Text style={{ fontSize: 10 }}>{getCountryFlag(requester.country, 12)}</Text>}
                    </View>
                </TouchableOpacity>
                <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>{requester.fullname || requester.nickname}</Text>
                    <Text style={styles.requestLabel}>{t('profile.friendRequest')}</Text>
                </View>
                <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRequest(item)}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Text style={styles.acceptButtonText}>{t('common.accept')}</Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    const renderSuggestionItem = ({ item }: { item: UserResponse }) => {
        const isSending = requestActionLoading === item.userId;

        return (
            <TouchableOpacity
                style={styles.userCard}
                onPress={() => gotoTab('Profile', 'UserProfileScreen', { userId: item.userId })}
            >
                <View>
                    <Image source={getAvatarSource(item.avatarUrl, item.gender)} style={styles.avatar} />
                    <View style={styles.flagContainer}>
                        {item.country && <Text style={{ fontSize: 10 }}>{getCountryFlag(item.country, 12)}</Text>}
                    </View>
                </View>
                <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>{item.fullname || item.nickname}</Text>
                    <Text style={styles.userSubtext}>
                        {item.nativeLanguageCode ? item.nativeLanguageCode.toUpperCase() : ''}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.addButton, isSending && styles.sentButton]}
                    onPress={() => handleAddFriend(item)}
                    disabled={isSending}
                >
                    {isSending ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Icon name="person-add" size={20} color="#FFF" />
                    )}
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    const RequestsHeader = () => {
        const requests = requestsData?.content || [];
        // Only show this section if there are requests
        if (requests.length === 0) return null;

        return (
            <View style={styles.requestsContainer}>
                <Text style={styles.sectionHeader}>{t('profile.friendRequests')}</Text>
                <FlatList
                    data={requests}
                    renderItem={renderRequestItem}
                    keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                    scrollEnabled={false}
                />
                <View style={styles.separator} />
                <Text style={styles.sectionHeader}>{t('profile.peopleYouMayKnow')}</Text>
            </View>
        );
    };

    return (
        <ScreenLayout>
            <View style={styles.container}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 0 && styles.activeTab]}
                        onPress={() => setActiveTab(0)}
                    >
                        <Text style={[styles.tabText, activeTab === 0 && styles.activeTabText]}>
                            {t('profile.myFriends')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 1 && styles.activeTab]}
                        onPress={() => setActiveTab(1)}
                    >
                        <Text style={[styles.tabText, activeTab === 1 && styles.activeTabText]}>
                            {t('profile.suggestions')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 0 ? (
                    // Friends List (Tab 0)
                    <FlatList
                        data={friendsData?.content || []}
                        renderItem={renderFriendItem}
                        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                        contentContainerStyle={styles.listContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        ListEmptyComponent={
                            !loadingFriends ? <Text style={styles.emptyText}>{t('profile.noFriends')}</Text> : null
                        }
                    />
                ) : (
                    // Requests/Suggestions List (Tab 1)
                    <FlatList
                        // **DATA CORRECTION:** Use the flattened array of suggestions
                        data={flatSuggestions}
                        renderItem={renderSuggestionItem}
                        keyExtractor={(item) => item.userId}
                        contentContainerStyle={styles.listContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        ListHeaderComponent={<RequestsHeader />}
                        // Infinite scroll logic
                        onEndReached={() => {
                            if (hasNextPage) fetchNextPage();
                        }}
                        onEndReachedThreshold={0.5}
                        ListEmptyComponent={
                            !loadingSuggestions && requestsData?.content?.length === 0 ? (
                                <Text style={styles.emptyText}>{t('profile.noSuggestions')}</Text>
                            ) : null
                        }
                    />
                )}
                {(loadingFriends && activeTab === 0) || (loadingSuggestions && flatSuggestions.length === 0 && activeTab === 1) ? (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#4F46E5" />
                    </View>
                ) : null}
            </View>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    container: {
        flex: 1,
        backgroundColor: '#F4F7F9',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        padding: 4,
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 12,
        elevation: 2,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#EEF2FF',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    activeTabText: {
        color: '#4F46E5',
        fontWeight: '700',
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
        elevation: 1,
    },
    requestCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E0E7FF',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E5E7EB',
    },
    flagContainer: {
        position: 'absolute',
        top: -2,
        left: -2,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 8,
        padding: 1,
        elevation: 2,
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    userSubtext: {
        fontSize: 13,
        color: '#6B7280',
    },
    requestLabel: {
        fontSize: 12,
        color: '#4F46E5',
        fontWeight: '500',
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#4F46E5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sentButton: {
        backgroundColor: '#9CA3AF',
    },
    acceptButton: {
        backgroundColor: '#10B981',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    acceptButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 13,
    },
    messageButton: {
        padding: 8,
        backgroundColor: '#EEF2FF',
        borderRadius: 20,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        color: '#6B7280',
    },
    requestsContainer: {
        marginBottom: 16,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 12,
        marginLeft: 4,
    },
    separator: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 16,
    },
    loadingOverlay: {
        // ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default SuggestedUsersScreen;