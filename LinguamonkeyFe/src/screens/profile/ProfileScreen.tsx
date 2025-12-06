import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useUserStore } from '../../stores/UserStore';
import { gotoTab } from '../../utils/navigationRef';
import { createScaledSheet } from '../../utils/scaledStyles';
import {
  Character3dResponse,
  FriendshipResponse,
} from '../../types/dto';
import { useWallet } from '../../hooks/useWallet';
import { getAvatarSource } from '../../utils/avatarUtils';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useGetStudyHistory, useHeartbeat } from '../../hooks/useUserActivity';
import { getCountryFlag } from '../../utils/flagUtils';
import { useBadgeProgress } from '../../hooks/useBadge';
import { useFriendships, AllFriendshipsParams } from '../../hooks/useFriendships';
import { useUsers } from '../../hooks/useUsers';
import { FriendshipStatus } from '../../types/enums';
import FileUploader from '../../components/common/FileUploader';
import { useToast } from '../../utils/useToast';

const { width } = Dimensions.get('window');

const ActivityHeatmap = ({ userId }: { userId: string }) => {
  const { data: historyData, isLoading } = useGetStudyHistory(userId, 'year');
  const { t } = useTranslation();
  const { showToast } = useToast();

  const chartData = useMemo(() => {
    if (!historyData) return [];

    const today = new Date();
    const numWeeks = 16;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (numWeeks * 7));
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const weeks = [];
    let currentWeek = [];

    const itrDate = new Date(startDate);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (6 - today.getDay()));

    while (itrDate <= endDate) {
      const dateStr = itrDate.toISOString().split('T')[0];

      let count = 0;

      if (historyData.dailyActivity && typeof historyData.dailyActivity === 'object') {
        count = historyData.dailyActivity[dateStr] || 0;
      }
      else if (historyData[dateStr] && typeof historyData[dateStr] === 'number') {
        count = historyData[dateStr];
      }
      else if (historyData.sessions && Array.isArray(historyData.sessions)) {
        const sessions = historyData.sessions.filter((s: any) => {
          if (!s.date) return false;
          return s.date.startsWith(dateStr);
        });
        count = sessions.reduce((acc: number, curr: any) => acc + (Math.floor((curr.duration || 0) / 60)), 0);
      }

      currentWeek.push({ date: dateStr, count });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      itrDate.setDate(itrDate.getDate() + 1);
    }

    if (currentWeek.length > 0) weeks.push(currentWeek);

    return weeks;
  }, [historyData]);

  const getLevelColor = (count: number) => {
    if (count === 0) return '#EBEDF0';
    if (count <= 15) return '#9BE9A8';
    if (count <= 30) return '#40C463';
    if (count <= 60) return '#30A14E';
    return '#216E39';
  };

  const handleDayPress = (date: string, count: number) => {
    showToast({ type: 'info', message: `${date}: ${count} mins activity` });
  };

  if (isLoading) {
    return (
      <View style={[styles.heatmapContainer, { height: 180, justifyContent: 'center' }]}>
        <ActivityIndicator size="small" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.heatmapContainer}>
      <View style={styles.heatmapHeader}>
        <Text style={styles.sectionTitle}>{t('profile.activity')}</Text>
        <Text style={styles.heatmapSubtext}>{t('common.last_months', { count: 4 })}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.heatmapGraph}>
          {chartData.map((week, wIndex) => (
            <View key={wIndex} style={styles.heatmapColumn}>
              {week.map((day) => (
                <Pressable
                  key={day.date}
                  style={[
                    styles.heatmapCell,
                    { backgroundColor: getLevelColor(day.count) }
                  ]}
                  onPress={() => handleDayPress(day.date, day.count)}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.heatmapLegend}>
        <Text style={styles.legendText}>{t('common.less')}</Text>
        <View style={[styles.heatmapCell, { backgroundColor: '#EBEDF0' }]} />
        <View style={[styles.heatmapCell, { backgroundColor: '#9BE9A8' }]} />
        <View style={[styles.heatmapCell, { backgroundColor: '#40C463' }]} />
        <View style={[styles.heatmapCell, { backgroundColor: '#30A14E' }]} />
        <View style={[styles.heatmapCell, { backgroundColor: '#216E39' }]} />
        <Text style={styles.legendText}>{t('common.more')}</Text>
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

// Loại bỏ SimpleUserAvatar và logic cố định Google Drive URL.
// Chỉ sử dụng URL thô hoặc fallback qua getAvatarSource (dành cho ảnh mặc định)

const CombinedFriendsSection = () => {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  const currentUserId = user?.userId;
  const { useSuggestedUsers } = useUsers();
  const { useAllFriendships, useCreateFriendship, useUpdateFriendship, useDeleteFriendship } = useFriendships();

  const createFriendshipMutation = useCreateFriendship();
  const updateFriendshipMutation = useUpdateFriendship();
  const deleteFriendshipMutation = useDeleteFriendship();

  const requestParams: AllFriendshipsParams = { receiverId: currentUserId, status: 'PENDING', page: 0, size: 50 };
  const { data: friendRequestsData, isLoading: isLoadingRequests, refetch: refetchRequests } = useAllFriendships(requestParams);
  const friendRequests = friendRequestsData?.content || [];

  const { data: suggestionsData, isLoading: isLoadingSuggestions } = useSuggestedUsers(currentUserId || '', 0, 5) as any;
  const suggestions = suggestionsData?.content || [];

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set());

  const handleSeeAll = () => gotoTab('Profile', 'SuggestedUsersScreen', { initialTab: 0 });

  const handleAccept = async (request: FriendshipResponse) => {
    if (!currentUserId || !request.requesterId || !request.id) return;
    setActionLoadingId(request.id.toString());
    try {
      await updateFriendshipMutation.mutateAsync({
        user1Id: request.requesterId,
        user2Id: currentUserId,
        req: { status: FriendshipStatus.ACCEPTED, requesterId: request.requesterId, receiverId: currentUserId }
      });
      refetchRequests();
    } catch (error) { console.error(error); } finally { setActionLoadingId(null); }
  };

  const handleAddFriend = async (targetUserId: string) => {
    if (!currentUserId || !targetUserId) return;
    setActionLoadingId(targetUserId);
    try {
      await createFriendshipMutation.mutateAsync({
        requesterId: currentUserId,
        receiverId: targetUserId,
        status: FriendshipStatus.PENDING,
      });
      setSentRequestIds(prev => new Set(prev).add(targetUserId));
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelRequest = async (targetUserId: string) => {
    if (!currentUserId || !targetUserId) return;
    setActionLoadingId(targetUserId);
    try {
      await deleteFriendshipMutation.mutateAsync({
        user1Id: currentUserId,
        user2Id: targetUserId,
      });
      setSentRequestIds(prev => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const isLoading = isLoadingRequests || isLoadingSuggestions;

  const displayedItems: any[] = [
    ...friendRequests.slice(0, 2).map(req => ({ ...req, type: 'REQUEST' })),
    ...suggestions.slice(0, 3).map(sug => ({ ...sug, type: 'SUGGESTION' }))
  ];


  if (isLoading && displayedItems.length === 0) return <View style={[styles.card, { height: 150, justifyContent: 'center' }]}><ActivityIndicator /></View>;
  if (displayedItems.length === 0) return null;

  const renderItem = ({ item }: { item: any }) => {
    const isRequest = item.type === 'REQUEST';
    const userToDisplay = isRequest ? item.requester : item;
    const itemId = isRequest ? item.id : item.userId;
    const isLoadingItem = actionLoadingId === itemId;
    const isSent = !isRequest && sentRequestIds.has(userToDisplay.userId);

    if (!userToDisplay) return null;

    return (
      <TouchableOpacity
        key={itemId}
        style={styles.suggestionCard}
        onPress={() => gotoTab('Profile', 'UserProfileViewScreen', { userId: userToDisplay.userId })}
      >
        <View style={{ position: 'relative', width: 50, height: 50 }}>
          {/* FIX: Xoá SimpleUserAvatar, dùng trực tiếp Image với URL thô (hoặc getAvatarSource cho default) */}
          <Image
            source={userToDisplay.avatarUrl ? { uri: userToDisplay.avatarUrl } : getAvatarSource(null, userToDisplay.gender)}
            style={{ width: 50, height: 50, borderRadius: 25 }}
          />
          {userToDisplay.country && (
            <View style={styles.flagBadgeSmall}>
              <Text style={styles.flagTextSmall}>{getCountryFlag(userToDisplay.country)}</Text>
            </View>
          )}
        </View>

        <Text style={styles.suggestionName} numberOfLines={1}>{userToDisplay.fullname || userToDisplay.nickname}</Text>

        {isRequest ? (
          <TouchableOpacity
            style={styles.acceptButtonHorizontal}
            onPress={() => handleAccept(item)}
            disabled={isLoadingItem}
          >
            {isLoadingItem ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.acceptButtonTextHorizontal}>{t('common.accept')}</Text>}
          </TouchableOpacity>
        ) : isSent ? (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelRequest(userToDisplay.userId)}
            disabled={isLoadingItem}
          >
            {isLoadingItem ? <ActivityIndicator color="#6B7280" size="small" /> : <Icon name="close" size={16} color="#6B7280" />}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddFriend(userToDisplay.userId)}
            disabled={isLoadingItem}
          >
            {isLoadingItem ? <ActivityIndicator color="#FFF" size="small" /> : <Icon name="person-add" size={16} color="#FFF" />}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {t('profile.connect')} {friendRequests.length > 0 && `(${friendRequests.length} ${t('profile.requests')})`}
        </Text>
        <TouchableOpacity onPress={handleSeeAll}>
          <Text style={styles.seeAllText}>{t('common.seeAll')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={displayedItems}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.id?.toString() || item.userId || `temp-${index}`}
        contentContainerStyle={styles.suggestionList}
      />
    </View>
  );
};


const ProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const userStore = useUserStore();
  const { user, fetchCharacter3d, updateUserAvatar, refreshUserProfile } = userStore;
  const { data: walletData } = useWallet().useWalletBalance(user?.userId);
  const balance = walletData?.balance || 0;
  const [uploading, setUploading] = useState(false);
  const [character3d, setCharacter3d] = useState<Character3dResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useHeartbeat(true);

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

  const handleAvatarUploadSuccess = useCallback(async (response: any) => {
    if (!user?.userId) return;
    setUploading(true);
    try {
      const tempPath = response?.fileId || response?.id || response?.url || response;

      await updateUserAvatar(tempPath);
      await refreshUserProfile();
      Alert.alert(t('common.success'), t('profile.avatarUpdated'));
    } catch (e: any) {
      Alert.alert(t('errors.server'), e?.message ?? t('errors.uploadFailed'));
    } finally {
      setUploading(false);
    }
  }, [user?.userId, updateUserAvatar, refreshUserProfile, t]);

  const handleUploadStart = useCallback(() => setUploading(true), []);
  const handleUploadEnd = useCallback(() => setUploading(false), []);

  // FIX: Xóa hàm helper getFixedAvatarUrl theo yêu cầu

  const renderSingleHeader = () => {
    // FIX: Sử dụng URL thô ({ uri: URL }) cho ảnh động. 
    // Chỉ dùng getAvatarSource để lấy default nếu URL rỗng.
    const rawAvatarUrl = user?.avatarUrl;
    const singleAvatarSource = rawAvatarUrl ? { uri: rawAvatarUrl } : getAvatarSource(null, user?.gender);

    const vip = user?.vip || userStore.vip;
    const show3D = character3d && character3d.modelUrl && character3d.modelUrl.length > 0;

    return (
      <View style={styles.singleHeader}>
        <View style={styles.characterContainer}>
          {show3D ? <Image source={{ uri: character3d!.modelUrl }} style={styles.characterImage} resizeMode="contain" /> : <Image source={singleAvatarSource} style={styles.avatarImage} />}
          {user?.country && (
            <View style={styles.flagBadge}>
              <Text style={styles.flagTextSmall}>{getCountryFlag(user?.country)}</Text>
            </View>
          )}

          <FileUploader
            mediaType="image"
            allowEditing={true}
            onUploadSuccess={handleAvatarUploadSuccess}
            onUploadStart={handleUploadStart}
            onUploadEnd={handleUploadEnd}
            style={styles.editAvatarButton}
          >
            {uploading ? <ActivityIndicator size="small" color="#FFF" /> : <Icon name="camera-alt" size={18} color="#FFF" />}
          </FileUploader>
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
      <TouchableOpacity
        style={styles.walletHeader}
        onPress={() => gotoTab('PaymentStack', 'WalletScreen')}
        activeOpacity={0.8}
      >
        <View style={styles.walletIconContainer}><Icon name="account-balance-wallet" size={24} color="#FFF" /></View>
        <View style={{ flex: 1 }}><Text style={styles.walletTitle}>{t('profile.myWallet')}</Text><Text style={styles.walletBalance}>{balance.toLocaleString()} {user?.country === 'VIETNAM' ? 'VND' : 'USD'}</Text></View>
        <Icon name="chevron-right" size={24} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>

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

          {user?.userId && <CombinedFriendsSection />}

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
  flagBadge: { position: 'absolute', top: 0, left: 0, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 10, padding: 1 },
  flagTextSmall: { fontSize: 10 },
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
  heatmapContainer: { backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 16, elevation: 2, minHeight: 180 },
  heatmapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  heatmapSubtext: { fontSize: 12, color: '#6B7280' },
  heatmapGraph: { flexDirection: 'row', gap: 4, paddingBottom: 4 },
  heatmapColumn: { gap: 4, justifyContent: 'flex-start' },
  heatmapCell: { width: 12, height: 12, borderRadius: 2 },
  heatmapLegend: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4, justifyContent: 'flex-end' },
  legendText: { fontSize: 10, color: '#666', marginHorizontal: 4 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 16, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingRight: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', paddingLeft: 4 },
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
  seeAllText: { fontSize: 14, fontWeight: '600', color: '#4F46E5' },
  suggestionList: { paddingBottom: 8 },
  suggestionCard: { width: 120, alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 16, marginRight: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  suggestionName: { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 8, marginBottom: 2, textAlign: 'center' },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' },
  cancelButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  flagBadgeSmall: { position: 'absolute', top: -2, left: -2, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 8, padding: 1, elevation: 2 },
  acceptButtonHorizontal: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  acceptButtonTextHorizontal: { color: '#FFF', fontSize: 12, fontWeight: '600' },
});

export default ProfileScreen;