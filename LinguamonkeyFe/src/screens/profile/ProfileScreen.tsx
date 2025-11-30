import React, { useState, useCallback, useEffect } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  RefreshControl,
  Clipboard,
  Dimensions,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useUserStore } from '../../stores/UserStore';
import { gotoTab } from '../../utils/navigationRef';
import { createScaledSheet } from '../../utils/scaledStyles';
import {
  Character3dResponse,
  FriendshipResponse,
  CoupleResponse,
  UserResponse,
} from '../../types/dto';
import { useWallet } from '../../hooks/useWallet';
import { getAvatarSource } from '../../utils/avatarUtils';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useGetStudyHistory } from '../../hooks/useUserActivity';
import { getCountryFlag } from '../../utils/flagUtils';
import { useBadgeProgress } from '../../hooks/useBadge';
import { useFriendships, AllFriendshipsParams } from '../../hooks/useFriendships';
import { useCouples } from '../../hooks/useCouples';
import { useUsers } from '../../hooks/useUsers';
import { FriendshipStatus } from '../../types/enums';

const { width } = Dimensions.get('window');

// --- Helper Components ---

const ActivityHeatmap = ({ userId }: { userId: string }) => {
  const { data: historyData, isLoading } = useGetStudyHistory(userId, 'year');
  const { t } = useTranslation();

  if (isLoading || !historyData) return <ActivityIndicator size="small" />;

  const today = new Date();
  const days = Array.from({ length: 84 }).map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (83 - i));
    const dateStr = d.toISOString().split('T')[0];
    const count = (historyData as any)[dateStr] || 0;
    return { date: dateStr, count };
  });

  const getColor = (count: number) => {
    if (count === 0) return '#ebedf0';
    if (count < 5) return '#9be9a8';
    if (count < 10) return '#40c463';
    if (count < 20) return '#30a14e';
    return '#216e39';
  };

  return (
    <View style={styles.heatmapContainer}>
      <Text style={styles.sectionTitle}>{t('profile.activity')}</Text>
      <View style={styles.heatmapGrid}>
        {days.map((day, index) => (
          <View
            key={index}
            style={[styles.heatmapCell, { backgroundColor: getColor(day.count) }]}
          />
        ))}
      </View>
    </View>
  );
};

const BadgeProgressSection = ({ userId }: { userId: string }) => {
  const { t } = useTranslation();
  const { data: badgeProgress, isLoading } = useBadgeProgress(userId);

  const handleSeeAllBadges = () => {
    gotoTab("Home", "DailyChallengeBadgeScreen", { initialTab: 'BADGE' });
  };

  if (isLoading) return <ActivityIndicator size="small" />;

  const displayedBadges = (badgeProgress || []).slice(0, 3);

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('profile.badges')}</Text>
        <TouchableOpacity onPress={handleSeeAllBadges}>
          <Text style={styles.seeAllText}>{t('common.seeAll')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.badgeGrid}>
        {displayedBadges.map((item, index) => {
          const isLocked = !item.isAchieved;

          return (
            <TouchableOpacity
              key={index}
              style={styles.badgeCard}
              onPress={handleSeeAllBadges}
            >
              <View style={[styles.badgeImageContainer, isLocked && styles.grayscale]}>
                <Image source={{ uri: item.imageUrl }} style={styles.badgeImageLarge} />
                {isLocked && (
                  <View style={styles.lockOverlay}>
                    {item.currentUserProgress >= item.criteriaThreshold ? (
                      <Icon name="redeem" size={20} color="#F59E0B" />
                    ) : (
                      <Icon name="lock" size={20} color="#FFF" />
                    )}
                  </View>
                )}
              </View>
              <Text style={styles.badgeName} numberOfLines={1}>{item.badgeName}</Text>
            </TouchableOpacity>
          );
        })}
        {displayedBadges.length === 0 && (
          <Text style={styles.emptyText}>{t('profile.noBadges')}</Text>
        )}
      </View>
    </View>
  );
};

const InfoRow = ({ icon, label, value, copyable = false }: { icon: string; label: string; value?: string | null | number | boolean; copyable?: boolean }) => {
  if (value === undefined || value === null || value === '') return null;
  const handleCopy = () => {
    if (copyable && typeof value === 'string') {
      Clipboard.setString(value);
      Alert.alert('Copied', `${label} copied to clipboard`);
    }
  };
  return (
    <TouchableOpacity style={styles.infoRow} onPress={handleCopy} disabled={!copyable} activeOpacity={0.7}>
      <View style={styles.infoLabelContainer}>
        <Icon name={icon} size={18} color="#666" style={{ marginRight: 8 }} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
        <Text style={[styles.infoValue, label.includes('VIP') ? { color: '#D97706', fontWeight: 'bold' } : {}]}>{value}</Text>
        {copyable && <Icon name="content-copy" size={14} color="#9CA3AF" style={{ marginLeft: 6 }} />}
      </View>
    </TouchableOpacity>
  );
};

const SimpleUserAvatar = ({ imageUrl, gender, size }: { imageUrl?: string | null; gender?: string | null; size: number }) => {
  const avatarSource = getAvatarSource(imageUrl, gender);
  return <Image source={avatarSource} style={{ width: size, height: size, borderRadius: size / 2 }} />;
};

// --- Suggested Friends Section ---
const SuggestedFriendsSection = () => {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  const { useSuggestedUsers } = useUsers();
  const { useCreateFriendship } = useFriendships();

  const createFriendshipMutation = useCreateFriendship();
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  const { data: suggestionsData, isLoading } = useSuggestedUsers(user?.userId || '', 0, 5);
  const suggestions = suggestionsData?.content || [];

  const handleSeeAll = () => {
    gotoTab('Profile', 'SuggestedUsersScreen', { initialTab: 1 });
  };

  const handleAddFriend = async (targetUserId: string) => {
    if (!user?.userId || !targetUserId) {
      // Cần có cả ID người gửi và người nhận
      console.error("Missing user ID or target user ID for friend request.");
      return;
    }

    try {
      setSentRequests(prev => new Set(prev).add(targetUserId));
      await createFriendshipMutation.mutateAsync({
        requesterId: user.userId, // Người gửi (User đang đăng nhập)
        receiverId: targetUserId, // Người nhận (User được đề xuất)
        status: FriendshipStatus.PENDING,
      });
      // Gửi thành công, không cần làm gì thêm ngoài cập nhật UI
    } catch (error) {
      console.error("Failed to add friend:", error);
      // Hoàn tác trạng thái nếu gửi thất bại
      setSentRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  if (isLoading) return <View style={[styles.card, { height: 150, justifyContent: 'center' }]}><ActivityIndicator /></View>;
  if (!suggestions || suggestions.length === 0) return null;

  const renderItem = ({ item }: { item: UserResponse }) => {
    const isSent = sentRequests.has(item.userId);

    return (
      <TouchableOpacity style={styles.suggestionCard} onPress={() => gotoTab('Profile', 'UserProfileScreen', { userId: item.userId })}>
        <View>
          <SimpleUserAvatar imageUrl={item.avatarUrl} gender={item.gender} size={50} />
          <View style={styles.smallFlagContainer}>
            {item.country && <Text style={{ fontSize: 8 }}>{getCountryFlag(item.country, 10)}</Text>}
          </View>
        </View>
        <Text style={styles.suggestionName} numberOfLines={1}>{item.fullname || item.nickname}</Text>
        <Text style={styles.suggestionCommon} numberOfLines={1}>
          {item.nativeLanguageCode?.toUpperCase()}
        </Text>
        <TouchableOpacity
          style={[styles.addButton, isSent && styles.sentButton]}
          onPress={() => handleAddFriend(item.userId)}
          disabled={isSent}
        >
          {isSent ? (
            <Icon name="check" size={16} color="#FFF" />
          ) : (
            <>
              <Icon name="person-add" size={16} color="#FFF" />
              <Text style={styles.addButtonText}>{t('common.add')}</Text>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('profile.peopleYouMayKnow')}</Text>
        <TouchableOpacity onPress={handleSeeAll}>
          <Text style={styles.seeAllText}>{t('common.seeAll')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={suggestions}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={renderItem}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.suggestionList}
      />
    </View>
  );
};

const RequestListSection = () => {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  const currentUserId = user?.userId;
  const { useAllFriendships, useUpdateFriendship } = useFriendships();
  const { useAllCouples } = useCouples();
  const updateFriendshipMutation = useUpdateFriendship();

  const friendParams: AllFriendshipsParams = { receiverId: currentUserId, status: 'PENDING', page: 0, size: 3 };
  const coupleParams = { status: 'PENDING', page: 0, size: 3 };

  const { data: friendRequestsData, isLoading: isLoadingFriends } = useAllFriendships(friendParams);
  const { data: coupleRequestsData, isLoading: isLoadingCouples } = useAllCouples(coupleParams);

  const friendRequests = friendRequestsData?.content || [];
  const totalFriendRequests = friendRequestsData?.totalElements || 0;
  const coupleRequests = coupleRequestsData?.content || [];
  const totalCoupleRequests = coupleRequestsData?.totalElements || 0;
  const hasRequests = totalFriendRequests > 0 || totalCoupleRequests > 0;

  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (request: FriendshipResponse | CoupleResponse, type: 'FRIEND' | 'COUPLE') => {
    if (!currentUserId || !request.id) return;
    setProcessingId(request.id.toString());
    try {
      if (type === 'FRIEND') {
        const fReq = request as FriendshipResponse;
        // Logic: Update status to ACCEPTED
        if (fReq.requesterId) {
          await updateFriendshipMutation.mutateAsync({
            user1Id: fReq.requesterId, // Người gửi yêu cầu ban đầu
            user2Id: currentUserId, // Người nhận yêu cầu (và chấp nhận)
            req: { status: FriendshipStatus.ACCEPTED, requesterId: fReq.requesterId, receiverId: currentUserId }
          });
        }
      } else {
        // Handle couple acceptance logic here if needed, keeping placeholder for now
      }
    } catch (error) {
      console.error(error);
    } finally {
      setProcessingId(null);
    }
  };

  const getOtherUser = (request: FriendshipResponse | CoupleResponse): UserResponse | undefined => {
    if ('requesterId' in request) {
      if (request.requester && currentUserId !== request.requester.userId) return request.requester;
      if (request.receiver && currentUserId !== request.receiver.userId) return request.receiver;
    }
    if ('user1Id' in request) {
      if (request.user1 && currentUserId !== request.user1.userId) return request.user1;
      if (request.user2 && currentUserId !== request.user2.userId) return request.user2;
    }
    return undefined;
  };

  const renderRequestItem = (request: FriendshipResponse | CoupleResponse, type: 'FRIEND' | 'COUPLE') => {
    const userToShow = getOtherUser(request);
    const requestId = request.id;
    if (!userToShow || !requestId) return null;
    const isProcessing = processingId === requestId.toString();

    return (
      <TouchableOpacity
        key={requestId.toString()}
        style={styles.requestItem}
        onPress={() => gotoTab('Profile', 'UserProfileScreen', { userId: userToShow.userId })}
      >
        <SimpleUserAvatar size={40} imageUrl={userToShow.avatarUrl} gender={userToShow.gender} />
        <View style={styles.requestInfo}>
          <Text style={styles.requestName} numberOfLines={1}>{userToShow.fullname || userToShow.nickname || t('profile.noName')}</Text>
          <Text style={styles.requestType}>{type === 'FRIEND' ? t('profile.friendRequest') : t('profile.coupleRequest')}</Text>
        </View>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAccept(request, type)}
          disabled={isProcessing}
        >
          {isProcessing ? <ActivityIndicator size="small" color="#FFF" /> : <Icon name="check" size={18} color="#FFF" />}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (isLoadingFriends || isLoadingCouples) return <View style={styles.card}><ActivityIndicator size="small" /></View>;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('profile.requests')}</Text>
      {!hasRequests && <Text style={styles.noRequestsText}>{t('profile.noPendingRequests')}</Text>}
      {hasRequests && (
        <>
          {[...friendRequests, ...coupleRequests].slice(0, 3).map((request) =>
            renderRequestItem(request, (request as FriendshipResponse).requesterId ? 'FRIEND' : 'COUPLE')
          )}
          {(totalFriendRequests > 3 || totalCoupleRequests > 3) && (
            <TouchableOpacity style={styles.seeAllButton} onPress={() => gotoTab('Profile', 'SuggestedUsersScreen', { initialTab: 1 })}>
              <Text style={styles.seeAllButtonText}>{t('profile.seeAllRequests')} ({totalFriendRequests + totalCoupleRequests})</Text>
              <Icon name="arrow-forward-ios" size={14} color="#4F46E5" />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

const ProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const userStore = useUserStore();
  const { user, fetchCharacter3d, uploadTemp, updateUserAvatar, refreshUserProfile } = userStore;
  const { data: walletData } = useWallet().useWalletBalance(user?.userId);
  const balance = walletData?.balance || 0;
  const [uploading, setUploading] = useState(false);
  const [character3d, setCharacter3d] = useState<Character3dResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { refreshUserProfile(); }, []));

  useEffect(() => {
    let isMounted = true;
    const loadCharacter3d = async () => {
      if (user?.userId) {
        try {
          const data = await fetchCharacter3d();
          if (isMounted) setCharacter3d(data);
        } catch (e) { console.error('Failed to fetch 3D character data:', e); }
      }
    };
    loadCharacter3d();
    return () => { isMounted = false; };
  }, [user?.userId, fetchCharacter3d]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await refreshUserProfile();
    const charData = await fetchCharacter3d();
    setCharacter3d(charData);
    setIsRefreshing(false);
  };

  const pickImage = useCallback(async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [1, 1] });
      if (res.canceled || !res.assets?.length) return;
      if (!user?.userId) return;
      setUploading(true);
      const tempPath = await uploadTemp({ uri: res.assets[0].uri, name: 'avatar.jpg', type: 'image/jpeg' });
      if (!tempPath) throw new Error('Upload failed');
      await updateUserAvatar(tempPath);
      await refreshUserProfile();
      Alert.alert(t('common.success'), t('profile.avatarUpdated'));
    } catch (e: any) { Alert.alert(t('errors.server'), e?.message ?? t('errors.uploadFailed')); } finally { setUploading(false); }
  }, [user?.userId, uploadTemp, updateUserAvatar, refreshUserProfile, t]);

  const renderSingleHeader = () => {
    const singleAvatarSource = getAvatarSource(user?.avatarUrl, user?.gender);
    const vip = user?.vip || userStore.vip;
    const show3D = character3d && character3d.modelUrl && character3d.modelUrl.length > 0;

    return (
      <View style={styles.singleHeader}>
        <View style={styles.characterContainer}>
          {show3D ? <Image source={{ uri: character3d!.modelUrl }} style={styles.characterImage} resizeMode="contain" /> : <Image source={singleAvatarSource} style={styles.avatarImage} />}
          <View style={styles.flagBadge}>{getCountryFlag(user?.country, 20)}</View>
          <TouchableOpacity style={styles.editAvatarButton} onPress={pickImage} disabled={uploading}>
            {uploading ? <ActivityIndicator size="small" color="#FFF" /> : <Icon name="camera-alt" size={18} color="#FFF" />}
          </TouchableOpacity>
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.fullname}>{user?.fullname || user?.nickname || t('profile.noName')}</Text>
          {vip && <View style={styles.vipBadge}><Icon name="verified" size={24} color="#F59E0B" /></View>}
        </View>
        {!vip && <Text style={styles.userNickname}>@{user?.nickname}</Text>}
        <Text style={styles.userBio}>{user?.bio || t('profile.addABio')}</Text>
        <TouchableOpacity style={styles.editProfileButton} onPress={() => gotoTab('Profile', 'EditProfileScreen')}>
          <Icon name="edit" size={16} color="#4F46E5" />
          <Text style={styles.editProfileText}>{t('profile.editProfile')}</Text>
        </TouchableOpacity>
        <View style={styles.statsRow}>
          <View style={styles.statItem}><Icon name="whatshot" size={24} color="#F97316" /><Text style={[styles.statValue, { color: '#F97316' }]}>{user?.streak ?? 0}</Text><Text style={styles.statLabel}>{t('profile.streak')}</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}><Icon name="monetization-on" size={24} color="#F59E0B" /><Text style={[styles.statValue, { color: '#F59E0B' }]}>{userStore.coins ?? 0}</Text><Text style={styles.statLabel}>{t('profile.coins')}</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}><Icon name="star" size={24} color="#3B82F6" /><Text style={[styles.statValue, { color: '#3B82F6' }]}>{user?.level ?? 0}</Text><Text style={styles.statLabel}>{t('profile.level')}</Text></View>
        </View>
        <View style={styles.expCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}><Text style={styles.expLabel}>{t('profile.progress')}</Text><Text style={styles.expLabel}>{user?.exp}/{Number(user?.exp || 0) + Number(user?.expToNextLevel || 100)} XP</Text></View>
          <View style={styles.expBarBg}><View style={[styles.expBarFill, { width: `${Math.min(100, Math.max(0, ((user?.exp || 0) / ((user?.exp || 0) + (user?.expToNextLevel || 100))) * 100))}%` }]} /></View>
        </View>
      </View>
    );
  };

  const renderWalletCard = () => (
    <View style={styles.walletCard}>
      <View style={styles.walletHeader}>
        <View style={styles.walletIconContainer}><Icon name="account-balance-wallet" size={24} color="#FFF" /></View>
        <View style={{ flex: 1 }}><Text style={styles.walletTitle}>{t('profile.myWallet')}</Text><Text style={styles.walletBalance}>{balance.toLocaleString()} {user?.country === 'VIETNAM' ? 'VND' : 'USD'}</Text></View>
      </View>
      <View style={styles.walletActions}>
        <TouchableOpacity style={styles.actionButtonPrimary} onPress={() => gotoTab('PaymentStack', 'DepositScreen')}><Icon name="add" size={20} color="#064E3B" /><Text style={styles.actionButtonTextPrimary}>{t('profile.deposit')}</Text></TouchableOpacity>
        <View style={{ width: 12 }} />
        <TouchableOpacity style={styles.actionButtonSecondary} onPress={() => gotoTab('PaymentStack', 'TransactionHistoryScreen')}><Text style={styles.actionButtonTextSecondary}>{t('profile.history')}</Text><Icon name="history" size={20} color="#FFF" /></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenLayout>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('profile.title')}</Text>
            <TouchableOpacity style={styles.settingsButton} onPress={() => gotoTab('Profile', 'SettingsScreen')}><Icon name="settings" size={26} color="#6B7280" /></TouchableOpacity>
          </View>
          {renderSingleHeader()}
          {renderWalletCard()}
          {user?.userId && <RequestListSection />}
          {user?.userId && <SuggestedFriendsSection />}
          {user?.userId && <ActivityHeatmap userId={user.userId} />}
          {user?.userId && <BadgeProgressSection userId={user.userId} />}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('profile.aboutMe')}</Text>
            <View style={styles.infoGrid}>
              <InfoRow icon="verified-user" label="VIP Status" value={userStore.vip ? `${userStore.vipDaysRemaining || 0} days remaining` : t('common.no')} />
              <InfoRow icon="badge" label={t('profile.nickname')} value={user?.nickname} />
              <InfoRow icon="email" label={t('profile.email')} value={user?.email} />
              <InfoRow icon="phone" label={t('profile.phone')} value={user?.phone} />
              <InfoRow icon="person" label={t('profile.gender')} value={user?.gender ? t(`gender.${user.gender}`) : null} />
              <InfoRow icon="event" label={t('profile.dayOfBirth')} value={user?.dayOfBirth} />
              <InfoRow icon="public" label={t('profile.country')} value={user?.country} />
              <InfoRow icon="schedule" label={t('profile.joined')} value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : null} />
              {userStore.languages && userStore.languages.length > 0 && (
                <View style={styles.languagesContainer}>
                  <Icon name="language" size={18} color="#666" style={{ marginRight: 8 }} />
                  <View style={styles.languageTags}>{userStore.languages.map((lang, idx) => (<View key={idx} style={styles.langTag}><View style={{ marginRight: 4 }}>{getCountryFlag(lang, 14)}</View><Text style={styles.langTagText}>{lang.toUpperCase()}</Text></View>))}</View>
                </View>
              )}
            </View>
          </View>
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: '#F4F7F9' },
  content: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  settingsButton: { padding: 8, backgroundColor: '#FFF', borderRadius: 20 },
  walletCard: { backgroundColor: '#064E3B', borderRadius: 20, padding: 20, marginBottom: 16, elevation: 4 },
  walletHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  walletIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  walletTitle: { fontSize: 14, color: '#A7F3D0', fontWeight: '600' },
  walletBalance: { fontSize: 28, color: '#FFF', fontWeight: '800', marginTop: 4 },
  walletActions: { flexDirection: 'row', marginTop: 16 },
  actionButtonPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', paddingVertical: 12, borderRadius: 12 },
  actionButtonTextPrimary: { color: '#064E3B', fontWeight: '700', marginLeft: 6 },
  actionButtonSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 12, borderRadius: 12 },
  actionButtonTextSecondary: { color: '#FFF', fontWeight: '700', marginRight: 6 },
  singleHeader: { backgroundColor: '#fff', padding: 24, borderRadius: 24, alignItems: 'center', marginBottom: 16, elevation: 4 },
  characterContainer: { position: 'relative', width: 110, height: 110, marginBottom: 16 },
  characterImage: { width: '100%', height: '100%', borderRadius: 55, backgroundColor: '#EEF2FF' },
  avatarImage: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#E5E7EB' },
  flagBadge: { position: 'absolute', top: 0, left: 0, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 12, padding: 2 },
  editAvatarButton: { position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  nameContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  fullname: { fontSize: 24, fontWeight: '800', color: '#111827', textAlign: 'center', marginRight: 6 },
  userNickname: { fontSize: 14, color: '#6B7280', marginTop: 2, marginBottom: 4 },
  vipBadge: { justifyContent: 'center', alignItems: 'center' },
  userBio: { fontSize: 14, color: '#4B5563', marginTop: 8, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },
  editProfileButton: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: '#EEF2FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  editProfileText: { color: '#4F46E5', fontWeight: '600', marginLeft: 6, fontSize: 13 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, width: '100%', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  statDivider: { width: 1, height: 30, backgroundColor: '#E5E7EB' },
  expCard: { width: '100%', marginTop: 24, backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16 },
  expLabel: { fontSize: 12, color: '#374151', fontWeight: '700' },
  expBarBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginTop: 6 },
  expBarFill: { height: 8, backgroundColor: '#4F46E5', borderRadius: 4 },
  heatmapContainer: { backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 16, elevation: 2 },
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' },
  heatmapCell: { width: 10, height: 10, borderRadius: 2 },
  heatmapLegend: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 4, justifyContent: 'flex-end' },
  legendText: { fontSize: 10, color: '#666' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 16, paddingLeft: 4 },
  infoGrid: { gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  infoLabelContainer: { flexDirection: 'row', alignItems: 'center', width: 120 },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, color: '#111827', fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  languagesContainer: { marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  languageTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },
  langTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  langTagText: { fontSize: 12, color: '#4B5563' },
  emptyText: { fontSize: 12, color: '#4B5563' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  badgeCard: { width: (width - 64) / 3, alignItems: 'center', marginBottom: 16 },
  badgeImageContainer: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 8 },
  badgeImageLarge: { width: 60, height: 60, borderRadius: 30 },
  grayscale: { opacity: 0.5, backgroundColor: '#E5E7EB' },
  lockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  badgeName: { fontSize: 11, fontWeight: '600', color: '#4B5563', textAlign: 'center', marginBottom: 4 },
  progressContainer: { width: '80%', alignItems: 'center' },
  progressBarBg: { width: '100%', height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginBottom: 2 },
  progressBarFill: { height: 4, backgroundColor: '#F59E0B', borderRadius: 2 },
  progressText: { fontSize: 9, color: '#9CA3AF' },
  noRequestsText: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingVertical: 10 },
  requestItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F9FAFB', gap: 12 },
  requestInfo: { flex: 1, justifyContent: 'center' },
  requestName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  requestType: { fontSize: 12, color: '#4F46E5' },
  acceptButton: { backgroundColor: '#10B981', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  seeAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#EEF2FF', borderRadius: 12 },
  seeAllButtonText: { fontSize: 14, fontWeight: '700', color: '#4F46E5' },
  // New Styles for Suggestions
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingRight: 4 },
  seeAllText: { fontSize: 14, fontWeight: '600', color: '#4F46E5' },
  suggestionList: { paddingBottom: 8 },
  suggestionCard: { width: 120, alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 16, marginRight: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  suggestionName: { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 8, marginBottom: 2, textAlign: 'center' },
  suggestionCommon: { fontSize: 11, color: '#6B7280', marginBottom: 12, textAlign: 'center' },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4F46E5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, minWidth: 60, justifyContent: 'center' },
  addButtonText: { color: '#FFF', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  sentButton: { backgroundColor: '#9CA3AF' },
  smallFlagContainer: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'white', borderRadius: 4, padding: 1 },
});

export default ProfileScreen;