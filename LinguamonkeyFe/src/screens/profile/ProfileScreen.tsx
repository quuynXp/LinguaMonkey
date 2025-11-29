import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  RefreshControl,
  Clipboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { useAppStore } from '../../stores/appStore';
import { useUserStore } from '../../stores/UserStore';
import { gotoTab, resetToAuth } from '../../utils/navigationRef';
import { createScaledSheet } from '../../utils/scaledStyles';
import { Character3dResponse } from '../../types/dto';
import { useWallet } from '../../hooks/useWallet';
import { getAvatarSource } from '../../utils/avatarUtils';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useGetStudyHistory } from '../../hooks/useUserActivity';

const getFlagEmoji = (countryCode?: string) => {
  if (!countryCode) return "🌍";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const ActivityHeatmap = ({ userId }: { userId: string }) => {
  const { data: historyData, isLoading } = useGetStudyHistory(userId, "year");
  const { t } = useTranslation();

  if (isLoading || !historyData) {
    return <ActivityIndicator size="small" />;
  }

  const today = new Date();
  const days = Array.from({ length: 84 }).map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (83 - i));
    const dateStr = d.toISOString().split("T")[0];
    const count = (historyData as any)[dateStr] || 0;
    return { date: dateStr, count };
  });

  const getColor = (count: number) => {
    if (count === 0) return "#ebedf0";
    if (count < 5) return "#9be9a8";
    if (count < 10) return "#40c463";
    if (count < 20) return "#30a14e";
    return "#216e39";
  };

  return (
    <View style={styles.heatmapContainer}>
      <Text style={styles.sectionTitle}>{t("profile.activity")}</Text>
      <View style={styles.heatmapGrid}>
        {days.map((day, index) => (
          <View
            key={index}
            style={[styles.heatmapCell, { backgroundColor: getColor(day.count) }]}
          />
        ))}
      </View>
      <View style={styles.heatmapLegend}>
        <Text style={styles.legendText}>{t("common.less")}</Text>
        <View style={[styles.heatmapCell, { backgroundColor: "#ebedf0" }]} />
        <View style={[styles.heatmapCell, { backgroundColor: "#9be9a8" }]} />
        <View style={[styles.heatmapCell, { backgroundColor: "#40c463" }]} />
        <View style={[styles.heatmapCell, { backgroundColor: "#30a14e" }]} />
        <View style={[styles.heatmapCell, { backgroundColor: "#216e39" }]} />
        <Text style={styles.legendText}>{t("common.more")}</Text>
      </View>
    </View>
  );
};

const InfoRow = ({ icon, label, value, copyable = false }: { icon: string; label: string; value?: string | null | number | boolean; copyable?: boolean }) => {
  const displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value;

  if (value === undefined || value === null || value === '') return null;

  const handleCopy = () => {
    if (copyable && typeof displayValue === 'string') {
      Clipboard.setString(displayValue);
      Alert.alert('Copied', `${label} copied to clipboard`);
    }
  };

  return (
    <TouchableOpacity
      style={styles.infoRow}
      onPress={handleCopy}
      disabled={!copyable}
      activeOpacity={0.7}
    >
      <View style={styles.infoLabelContainer}>
        <Icon name={icon} size={18} color="#666" style={{ marginRight: 8 }} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[styles.infoValue, label === 'VIP Status' && value === true ? { color: '#D97706', fontWeight: 'bold' } : {}]} numberOfLines={1}>
          {displayValue}
        </Text>
        {copyable && <Icon name="content-copy" size={14} color="#9CA3AF" style={{ marginLeft: 6 }} />}
      </View>
    </TouchableOpacity>
  );
};

const ProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  const userStore = useUserStore();
  const { user, fetchCharacter3d, uploadTemp, updateUserAvatar, deleteTempFile, refreshUserProfile } = userStore;

  const { data: walletData } = useWallet().useWalletBalance(user?.userId);
  const balance = walletData?.balance || 0;

  const [uploading, setUploading] = useState(false);
  const [character3d, setCharacter3d] = useState<Character3dResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useFocusEffect(
    useCallback(() => {
      refreshUserProfile();
    }, [])
  );

  useEffect(() => {
    const loadCharacter3d = async () => {
      if (user?.userId) {
        try {
          const data = await fetchCharacter3d();
          setCharacter3d(data);
        } catch (e) {
          console.error("Failed to fetch 3D character data:", e);
        }
      }
    };
    loadCharacter3d();
  }, [user?.userId, fetchCharacter3d]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await refreshUserProfile();
    setIsRefreshing(false);
  };

  const handleLogout = useCallback(() => {
    Alert.alert(t('profile.logoutConfirmTitle'), t('profile.logoutConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: async () => {
          useUserStore.getState().logout();
          useAppStore.getState().logout();
          resetToAuth();
        }
      },
    ]);
  }, [t]);

  const pickImage = useCallback(async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (res.canceled || !res.assets?.length) return;

    const asset = res.assets[0];
    const file = {
      uri: asset.uri,
      name: asset.fileName ?? 'avatar.jpg',
      type: asset.type ?? 'image/jpeg',
    } as any;

    if (!user?.userId) return;

    setUploading(true);
    let tempPath: string | null = null;

    try {
      tempPath = await uploadTemp(file);
      if (!tempPath) throw new Error('Upload failed');
      await updateUserAvatar(tempPath);
      await refreshUserProfile();
    } catch (e: any) {
      Alert.alert(t('errors.server'), e?.message ?? t('errors.uploadFailed'));
      if (tempPath) deleteTempFile(tempPath);
    } finally {
      setUploading(false);
    }
  }, [user?.userId, uploadTemp, updateUserAvatar, deleteTempFile, refreshUserProfile, t]);

  const renderSingleHeader = () => {
    const singleAvatarSource = getAvatarSource(user?.avatarUrl, user?.gender);
    const isVip = user?.vip || userStore.isVip;

    return (
      <View style={styles.singleHeader}>
        <View style={styles.characterContainer}>
          {character3d?.modelUrl ? (
            <Image source={{ uri: character3d.modelUrl }} style={styles.characterImage} resizeMode="contain" />
          ) : (
            <Image source={singleAvatarSource} style={styles.avatarImage} />
          )}
          <TouchableOpacity style={styles.editAvatarButton} onPress={pickImage} disabled={uploading}>
            {uploading ? <ActivityIndicator size="small" color="#FFF" /> : <Icon name="camera-alt" size={18} color="#FFF" />}
          </TouchableOpacity>
        </View>

        <View style={styles.nameContainer}>
          <Text style={styles.fullname}>{user?.fullname || user?.nickname || t('profile.noName')}</Text>
          {isVip && (
            <View style={styles.vipBadge}>
              <Icon name="verified" size={24} color="#F59E0B" />
            </View>
          )}
        </View>

        {isVip && (
          <Text style={styles.vipLabel}>VIP Member</Text>
        )}

        <Text style={styles.userNickname}>@{user?.nickname}</Text>

        {user?.bio ? (
          <Text style={styles.userBio} numberOfLines={2}>{user.bio}</Text>
        ) : (
          <Text style={[styles.userBio, { color: '#9CA3AF', fontStyle: 'italic' }]}>{t('profile.addABio')}</Text>
        )}

        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => gotoTab('Profile', 'EditProfileScreen')}
        >
          <Icon name="edit" size={16} color="#4F46E5" />
          <Text style={styles.editProfileText}>{t('profile.editProfile')}</Text>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Icon name="whatshot" size={24} color="#F97316" />
            <Text style={[styles.statValue, { color: '#F97316' }]}>{user?.streak ?? 0}</Text>
            <Text style={styles.statLabel}>{t('profile.streak')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Icon name="monetization-on" size={24} color="#F59E0B" />
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{userStore.coins ?? 0}</Text>
            <Text style={styles.statLabel}>{t('profile.coins')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Icon name="star" size={24} color="#3B82F6" />
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{user?.level ?? 0}</Text>
            <Text style={styles.statLabel}>{t('profile.level')}</Text>
          </View>
        </View>

        <View style={styles.expCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={styles.expLabel}>{t('profile.progress')}</Text>
            <Text style={styles.expLabel}>{user?.exp}/{Number(user?.exp || 0) + Number(user?.expToNextLevel || 100)} XP</Text>
          </View>
          <View style={styles.expBarBg}>
            <View style={[styles.expBarFill, { width: `${Math.min(100, Math.max(0, (user?.exp || 0) / ((user?.exp || 0) + (user?.expToNextLevel || 100)) * 100))}%` }]} />
          </View>
        </View>
      </View>
    );
  };

  const renderWalletCard = () => (
    <View style={styles.walletCard}>
      <View style={styles.walletHeader}>
        <View style={styles.walletIconContainer}>
          <Icon name="account-balance-wallet" size={24} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.walletTitle}>{t('profile.myWallet')}</Text>
          <Text style={styles.walletBalance}>
            {balance.toLocaleString()} {user?.country === 'VIETNAM' ? 'VND' : 'USD'}
          </Text>
        </View>
      </View>

      <View style={styles.walletActions}>
        <TouchableOpacity
          style={styles.actionButtonPrimary}
          onPress={() => gotoTab('PaymentStack', 'DepositScreen')}
        >
          <Icon name="add" size={20} color="#FFF" />
          <Text style={styles.actionButtonTextPrimary}>{t('profile.deposit')}</Text>
        </TouchableOpacity>

        <View style={{ width: 12 }} />

        <TouchableOpacity
          style={styles.actionButtonSecondary}
          onPress={() => gotoTab('PaymentStack', 'TransactionHistoryScreen')}
        >
          <Text style={styles.actionButtonTextSecondary}>{t('profile.history')}</Text>
          <Icon name="history" size={20} color="#4F46E5" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenLayout>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('profile.title')}</Text>
            <TouchableOpacity style={styles.settingsButton} onPress={() => gotoTab('Profile', 'SettingsScreen')}>
              <Icon name="settings" size={26} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {renderSingleHeader()}

          {renderWalletCard()}

          {user?.userId && <ActivityHeatmap userId={user.userId} />}

          {userStore.badges && userStore.badges.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('profile.badges')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {userStore.badges.map((badge: any, index: number) => (
                  <View key={index} style={styles.badgeItem}>
                    <Image source={{ uri: badge.imageUrl || "https://via.placeholder.com/50" }} style={styles.badgeImage} />
                    <Text style={styles.badgeName} numberOfLines={1}>{badge.badgeName}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('profile.aboutMe')}</Text>
            <View style={styles.infoGrid}>
              <InfoRow
                icon="verified-user"
                label="VIP Status"
                value={user?.vip}
              />
              <InfoRow
                icon="fingerprint"
                label="User ID"
                value={user?.userId}
                copyable={true}
              />
              <InfoRow
                icon="badge"
                label={t('profile.nickname')}
                value={user?.nickname}
              />
              <InfoRow
                icon="email"
                label={t('profile.email')}
                value={user?.email}
              />
              <InfoRow
                icon="phone"
                label={t('profile.phone')}
                value={user?.phone}
              />
              <InfoRow
                icon="person"
                label={t('profile.gender')}
                value={user?.gender ? t(`gender.${user.gender}`) : null}
              />
              <InfoRow
                icon="cake"
                label={t('profile.age')}
                value={user?.ageRange ? t(`age.${user.ageRange}`) : null}
              />
              <InfoRow
                icon="event"
                label={t('profile.dayOfBirth')}
                value={user?.dayOfBirth}
              />
              <InfoRow
                icon="public"
                label={t('profile.country')}
                value={user?.country ? `${getFlagEmoji(user.country)} ${user.country}` : null}
              />
              <InfoRow
                icon="translate"
                label={t('profile.nativeLanguage')}
                value={user?.nativeLanguageCode}
              />
              <InfoRow
                icon="schedule"
                label={t('profile.joined')}
                value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : null}
              />

              {userStore.languages && userStore.languages.length > 0 && (
                <View style={styles.languagesContainer}>
                  <Icon name="language" size={18} color="#666" style={{ marginRight: 8 }} />
                  <View style={styles.languageTags}>
                    {userStore.languages.map((lang, idx) => (
                      <View key={idx} style={styles.langTag}>
                        <Text style={styles.langTagText}>{lang}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="logout" size={22} color="#EF4444" />
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </Animated.View>
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

  walletCard: { backgroundColor: '#111827', borderRadius: 20, padding: 20, marginBottom: 16, elevation: 4, shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  walletHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  walletIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  walletTitle: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },
  walletBalance: { fontSize: 28, color: '#FFF', fontWeight: '800', marginTop: 4 },
  walletActions: { flexDirection: 'row', marginTop: 16 },
  actionButtonPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F46E5', paddingVertical: 12, borderRadius: 12 },
  actionButtonTextPrimary: { color: '#FFF', fontWeight: '700', marginLeft: 6 },
  actionButtonSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', paddingVertical: 12, borderRadius: 12 },
  actionButtonTextSecondary: { color: '#4F46E5', fontWeight: '700', marginRight: 6 },

  singleHeader: { backgroundColor: '#fff', padding: 24, borderRadius: 24, alignItems: 'center', marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  characterContainer: { position: 'relative', width: 110, height: 110, marginBottom: 16 },
  characterImage: { width: '100%', height: '100%', borderRadius: 55, backgroundColor: '#EEF2FF' },
  avatarImage: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#E5E7EB' },
  editAvatarButton: { position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },

  nameContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  fullname: { fontSize: 24, fontWeight: '800', color: '#111827', textAlign: 'center', marginRight: 6 },
  userNickname: { fontSize: 14, color: '#6B7280', marginTop: 2, marginBottom: 4 },
  vipBadge: { justifyContent: 'center', alignItems: 'center' },
  vipLabel: { fontSize: 12, fontWeight: '700', color: '#D97706', marginTop: 2, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

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

  heatmapContainer: { backgroundColor: "#fff", padding: 16, borderRadius: 20, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' },
  heatmapCell: { width: 10, height: 10, borderRadius: 2 },
  heatmapLegend: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 4, justifyContent: 'flex-end' },
  legendText: { fontSize: 10, color: '#666' },

  card: { backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 16, paddingLeft: 4 },

  infoGrid: { gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  infoLabelContainer: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, color: '#111827', fontWeight: '600', maxWidth: '60%' },

  languagesContainer: { marginTop: 10, flexDirection: 'row', alignItems: 'flex-start' },
  languageTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },
  langTag: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  langTagText: { fontSize: 12, color: '#4B5563' },

  badgeItem: { alignItems: "center", width: 60, marginRight: 8 },
  badgeImage: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#F3F4F6", marginBottom: 4 },
  badgeName: { fontSize: 10, color: "#6B7280", textAlign: "center", width: '100%' },

  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, marginTop: 8, borderWidth: 1, borderColor: '#FECACA' },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#EF4444', marginLeft: 10 },
});

export default ProfileScreen;