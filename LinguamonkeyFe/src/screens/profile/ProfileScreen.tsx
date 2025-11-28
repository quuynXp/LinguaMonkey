import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../stores/appStore';
import { useUserStore } from '../../stores/UserStore';
import { gotoTab, resetToAuth } from '../../utils/navigationRef';
import { createScaledSheet } from '../../utils/scaledStyles';
import { useShallow } from 'zustand/react/shallow';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useUsers } from '../../hooks/useUsers';
import { Character3dResponse } from '../../types/dto';
import { useWallet } from '../../hooks/useWallet';

const ccToFlag = (code?: string | null) => {
  if (!code) return '🏳️';
  const cc = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '🏳️';
  const A = 127397;
  return String.fromCodePoint(...[...cc].map((c) => A + c.charCodeAt(0)));
};

const langToFlag = (lang?: string | null) => {
  if (!lang) return '🏳️';
  const map: Record<string, string> = {
    vi: 'VN', en: 'US', en_GB: 'GB', en_US: 'US', ja: 'JP', ko: 'KR',
    zh: 'CN', fr: 'FR', de: 'DE', es: 'ES', it: 'IT', pt: 'PT',
    ru: 'RU', th: 'TH', id: 'ID',
  };
  const key = (lang || '').toLowerCase();
  const cc = map[key] || key.slice(-2).toUpperCase();
  return ccToFlag(cc);
};


const ProfileScreen: React.FC = () => {
  const { t } = useTranslation();

  const userStore = useUserStore();
  const { user, fetchCharacter3d, uploadTemp, updateUserAvatar, deleteTempFile } = userStore;
  const { useUser, useUserProfile } = useUsers();
  const { data: walletData } = useWallet().useWalletBalance(user?.userId);
  const balance = walletData?.balance || 0;

  const { data: fullProfile, refetch: refetchProfile, isRefetching } = useUser(user?.userId);

  const partnerId = fullProfile?.coupleProfile?.partnerId;
  const { data: partnerProfile } = useUserProfile(partnerId || undefined);

  const [uploading, setUploading] = useState(false);
  const [character3d, setCharacter3d] = useState<Character3dResponse | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const randomGreeting = useMemo(() => {
    const keys = ['profile.greeting.1', 'profile.greeting.2', 'profile.greeting.3', 'profile.greeting.4'];
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return t(randomKey, { name: user?.nickname || user?.fullname || t('common.user') });
  }, [t, user?.nickname, user?.fullname]);

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

    if (fullProfile?.coupleProfile) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [fadeAnim, slideAnim, pulseAnim, fullProfile?.coupleProfile]);

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
      refetchProfile();
    } catch (e: any) {
      Alert.alert(t('errors.server'), e?.message ?? t('errors.uploadFailed'));
      if (tempPath) deleteTempFile(tempPath);
    } finally {
      setUploading(false);
    }
  }, [user?.userId, uploadTemp, updateUserAvatar, deleteTempFile, refetchProfile, t]);

  const menuActions = useMemo(() => [
    { label: t('profile.editProfile'), icon: 'edit', screen: 'EditProfileScreen', color: '#4F46E5' },
    { label: t('profile.roadmap'), icon: 'map', screen: 'RoadmapScreen', color: '#EF4444' },
    { label: t('profile.notes'), icon: 'note', screen: 'NotesScreen', color: '#06B6D4' },
  ], [t]);

  const details = useMemo(() => [
    { key: 'email', label: t('profile.email'), icon: 'email', value: user?.email, color: '#3B82F6' },
    { key: 'phone', label: t('profile.phone'), icon: 'phone', value: user?.phone, color: '#10B981' },
    { key: 'country', label: t('profile.country'), icon: 'public', value: user?.country, flag: ccToFlag(user?.country), color: '#F97316' },
    { key: 'gender', label: t('profile.gender'), icon: 'person', value: user?.gender, color: '#EC4899' },
    { key: 'ageRange', label: t('profile.age'), icon: 'cake', value: user?.ageRange, color: '#8B5CF6' },
    { key: 'learningPace', label: t('profile.learningPace'), icon: 'timeline', value: user?.learningPace, color: '#EF4444' },
    { key: 'proficiency', label: t('profile.proficiency'), icon: 'insights', value: user?.proficiency, color: '#06B6D4' },
  ].filter(i => i.value), [t, user]);

  const renderExpBar = (current: number, next: number, level: number, color: string) => {
    const total = current + next;
    const ratio = total > 0 ? Math.min(1, current / total) : 0;
    return (
      <View style={styles.miniExpContainer}>
        <View style={styles.miniExpRow}>
          <Text style={styles.miniLevelText}>Lv.{level}</Text>
          <Text style={styles.miniExpText}>{Math.round(ratio * 100)}%</Text>
        </View>
        <View style={styles.miniExpBg}>
          <View style={[styles.miniExpFill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  const renderCoupleHeader = () => {
    const partner = partnerProfile;
    const couple = fullProfile?.coupleProfile;

    if (!couple || !partner) return null;

    return (
      <View style={styles.coupleContainer}>
        <View style={styles.coupleWrapper}>
          <View style={styles.userColumn}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: user?.avatarUrl || 'https://via.placeholder.com/150' }} style={styles.coupleAvatar} />
              <TouchableOpacity style={styles.editBadge} onPress={pickImage} disabled={uploading}>
                {uploading ? <ActivityIndicator size="small" color="#FFF" /> : <Icon name="camera-alt" size={14} color="#FFF" />}
              </TouchableOpacity>
            </View>
            <Text style={styles.coupleName} numberOfLines={1}>{user?.nickname || user?.fullname}</Text>
            {renderExpBar(user?.exp || 0, user?.expToNextLevel || 100, user?.level || 0, '#4F46E5')}
          </View>

          <View style={styles.heartColumn}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Icon name="favorite" size={40} color="#EF4444" />
            </Animated.View>
            <Text style={styles.daysText}>{couple.daysTogether}</Text>
            <Text style={styles.daysLabel}>{t('profile.days')}</Text>
          </View>

          <View style={styles.userColumn}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: partner.avatarUrl || 'https://via.placeholder.com/150' }} style={styles.coupleAvatar} />
              <View style={[styles.editBadge, { backgroundColor: '#10B981' }]}>
                <Icon name="verified" size={14} color="#FFF" />
              </View>
            </View>
            <Text style={styles.coupleName} numberOfLines={1}>{partner.nickname || partner.fullname}</Text>
            {renderExpBar(partner.exp, 1000, partner.level, '#10B981')}
          </View>
        </View>

        <View style={styles.greetingBox}>
          <Text style={styles.greetingText}>✨ {randomGreeting}</Text>
        </View>
      </View>
    );
  };

  const renderSingleHeader = () => (
    <View style={styles.singleHeader}>
      <View style={styles.characterContainer}>
        {character3d?.modelUrl ? (
          <Image source={{ uri: character3d.modelUrl }} style={styles.characterImage} resizeMode="contain" />
        ) : (
          <Image source={{ uri: user?.avatarUrl || 'https://via.placeholder.com/150' }} style={styles.avatarImage} />
        )}
        <TouchableOpacity style={styles.editAvatarButton} onPress={pickImage} disabled={uploading}>
          {uploading ? <ActivityIndicator size="small" color="#FFF" /> : <Icon name="camera-alt" size={18} color="#FFF" />}
        </TouchableOpacity>
      </View>

      <Text style={styles.userName}>{user?.nickname || user?.fullname || t('profile.noName')}</Text>

      {user?.bio ? (
        <Text style={styles.userBio} numberOfLines={2}>{user.bio}</Text>
      ) : (
        <Text style={[styles.userBio, { color: '#9CA3AF', fontStyle: 'italic' }]}>{t('profile.addABio')}</Text>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Icon name="whatshot" size={24} color="#F97316" />
          <Text style={[styles.statValue, { color: '#F97316' }]}>{user?.streak ?? 0}</Text>
          <Text style={styles.statLabel}>{t('profile.streakDays')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Icon name="star" size={24} color="#F59E0B" />
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{user?.level ?? 0}</Text>
          <Text style={styles.statLabel}>{t('profile.level')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Icon name="language" size={24} color="#3B82F6" />
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{user?.languages?.length ?? 0}</Text>
          <Text style={styles.statLabel}>{t('profile.languages')}</Text>
        </View>
      </View>

      <View style={styles.expCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={styles.expLabel}>{t('profile.currentLevel')}</Text>
          <Text style={styles.expLabel}>{user?.exp}/{Number(user?.exp || 0) + Number(user?.expToNextLevel || 100)} XP</Text>
        </View>
        <View style={styles.expBarBg}>
          <View style={[styles.expBarFill, { width: `${Math.min(100, Math.max(0, (user?.exp || 0) / ((user?.exp || 0) + (user?.expToNextLevel || 100)) * 100))}%` }]} />
        </View>
      </View>
    </View>
  );

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
            {/* Logic hiển thị tiền tệ có thể tuỳ biến */}
          </Text>
        </View>
      </View>

      <View style={styles.walletActions}>
        {/* Nút Nạp tiền (Mới) */}
        <TouchableOpacity
          style={styles.actionButtonPrimary}
          onPress={() => gotoTab('Profile', 'DepositScreen')}
        >
          <Icon name="add" size={20} color="#FFF" />
          <Text style={styles.actionButtonTextPrimary}>{t('profile.deposit', 'Nạp tiền')}</Text>
        </TouchableOpacity>

        <View style={{ width: 12 }} />

        {/* Nút Lịch sử (Cũ) */}
        <TouchableOpacity
          style={styles.actionButtonSecondary}
          onPress={() => gotoTab('Profile', 'TransactionHistoryScreen')}
        >
          <Text style={styles.actionButtonTextSecondary}>{t('profile.history', 'Lịch sử')}</Text>
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
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchProfile} />}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('profile.title')}</Text>
            <TouchableOpacity style={styles.settingsButton} onPress={() => gotoTab('Profile', 'SettingsScreen')}>
              <Icon name="settings" size={26} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {fullProfile?.coupleProfile ? renderCoupleHeader() : renderSingleHeader()}

          {renderWalletCard()}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('profile.menu')}</Text>
            {menuActions.map((btn, index) => (
              <TouchableOpacity
                key={btn.screen}
                style={[styles.actionButton, index === menuActions.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => gotoTab('Profile', btn.screen)}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: `${btn.color}1A` }]}>
                  <Icon name={btn.icon as any} size={22} color={btn.color} />
                </View>
                <Text style={styles.actionText}>{btn.label}</Text>
                <Icon name="chevron-right" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('profile.details')}</Text>
            <FlatList
              data={details}
              keyExtractor={(item) => item.key}
              renderItem={({ item: d }) => (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: d.color }]}>
                    <Icon name={d.icon as any} size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>{d.label}</Text>
                    <Text style={styles.detailValue}>{d.value}</Text>
                  </View>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={styles.detailSeparator} />}
              scrollEnabled={false}
            />
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

  // Wallet
  walletCard: { backgroundColor: '#111827', borderRadius: 20, padding: 20, marginBottom: 16, elevation: 4, shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  walletHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  walletIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  walletTitle: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },
  walletBalance: { fontSize: 28, color: '#FFF', fontWeight: '800', marginTop: 4 },
  transactionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', paddingVertical: 12, borderRadius: 12 },
  transactionButtonText: { color: '#4F46E5', fontWeight: '700', marginRight: 8 },
  walletActions: { flexDirection: 'row', marginTop: 16 },
  actionButtonPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F46E5', paddingVertical: 12, borderRadius: 12 },
  actionButtonTextPrimary: { color: '#FFF', fontWeight: '700', marginLeft: 6 },
  actionButtonSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', paddingVertical: 12, borderRadius: 12 },
  actionButtonTextSecondary: { color: '#4F46E5', fontWeight: '700', marginRight: 6 },
  // Couple Styles
  coupleContainer: { marginBottom: 24 },
  coupleWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: 24, padding: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  userColumn: { flex: 1, alignItems: 'center' },
  heartColumn: { width: 80, alignItems: 'center', justifyContent: 'center' },
  avatarWrapper: { position: 'relative', marginBottom: 8 },
  coupleAvatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: '#FFF' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#4F46E5', borderRadius: 10, padding: 4, borderWidth: 2, borderColor: '#FFF' },
  coupleName: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 4, textAlign: 'center' },
  daysText: { fontSize: 18, fontWeight: '900', color: '#EF4444', marginTop: 4 },
  daysLabel: { fontSize: 11, color: '#EF4444', fontWeight: '600', textTransform: 'uppercase' },
  greetingBox: { marginTop: 16, padding: 12, backgroundColor: '#FFF', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  greetingText: { fontSize: 14, color: '#4B5563', fontStyle: 'italic', textAlign: 'center' },

  // Mini Progress Bar
  miniExpContainer: { width: '80%', alignItems: 'center' },
  miniExpRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 2 },
  miniLevelText: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
  miniExpText: { fontSize: 10, color: '#9CA3AF' },
  miniExpBg: { width: '100%', height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 },
  miniExpFill: { height: 4, borderRadius: 2 },

  // Single Profile Styles
  singleHeader: { backgroundColor: '#fff', padding: 24, borderRadius: 24, alignItems: 'center', marginBottom: 24, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  characterContainer: { position: 'relative', width: 110, height: 110, marginBottom: 16 },
  characterImage: { width: '100%', height: '100%', borderRadius: 55, backgroundColor: '#EEF2FF' },
  avatarImage: { width: 110, height: 110, borderRadius: 55 },
  editAvatarButton: { position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  userName: { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center' },
  userBio: { fontSize: 15, color: '#4B5563', marginTop: 8, textAlign: 'center', paddingHorizontal: 20, lineHeight: 22 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, width: '100%', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  statDivider: { width: 1, height: 30, backgroundColor: '#E5E7EB' },
  expCard: { width: '100%', marginTop: 24, backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16 },
  expLabel: { fontSize: 13, color: '#374151', fontWeight: '700' },
  expBarBg: { height: 10, backgroundColor: '#E5E7EB', borderRadius: 5, overflow: 'hidden', marginTop: 6 },
  expBarFill: { height: 10, backgroundColor: '#4F46E5', borderRadius: 5 },

  // Common Sections
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 16, paddingLeft: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  detailSeparator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 56 },
  detailIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  detailLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500', marginBottom: 2 },
  detailValue: { fontSize: 15, color: '#111827', fontWeight: '600' },
  actionIconContainer: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  actionText: { flex: 1, fontSize: 16, color: '#374151', marginLeft: 16, fontWeight: '600' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', padding: 18, borderRadius: 16, marginTop: 8, borderWidth: 1, borderColor: '#FECACA' },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#EF4444', marginLeft: 10 },
});

export default ProfileScreen;