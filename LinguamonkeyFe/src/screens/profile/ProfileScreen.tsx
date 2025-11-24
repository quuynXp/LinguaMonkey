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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next'; // <-- Cần thiết
import { useAppStore } from '../../stores/appStore';
import { useUserStore } from '../../stores/UserStore';
import { gotoTab, resetToAuth } from '../../utils/navigationRef';
import { createScaledSheet } from '../../utils/scaledStyles';
import { useShallow } from 'zustand/react/shallow';
import ScreenLayout from '../../components/layout/ScreenLayout';
import type { Character3dResponse } from '../../types/dto';

// --- UTILITY FUNCTIONS (Được giữ lại vì chúng không dùng 't') ---

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

const fmt = (v: unknown) => {
  if (v === null || v === undefined || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (typeof v === 'boolean') return v ? 'On' : 'Off';
  return String(v);
};

// Đã loại bỏ các hàm logout và handleLogout bên ngoài.

// --- ProfileScreen Component ---

const ProfileScreen: React.FC = () => {
  const { t } = useTranslation(); // <-- 't' hiện có sẵn trong phạm vi này

  const { notificationPreferences, privacySettings } = useAppStore(
    useShallow((state) => ({
      notificationPreferences: state.notificationPreferences,
      privacySettings: state.privacySettings,
    }))
  );

  const user = useUserStore((state) => state.user);
  const name = useUserStore((state) => state.name);
  const streak = useUserStore((state) => state.streak);
  const languages = useUserStore((state) => state.languages);
  const dailyGoal = useUserStore((state) => state.dailyGoal);
  const statusMessage = useUserStore((state) => state.statusMessage);
  const badges = useUserStore((state) => state.badges);
  const level = useUserStore((state) => state.level);
  const expToNextLevel = useUserStore((state) => state.expToNextLevel);
  const exp = useUserStore((state) => state.exp);
  const fetchCharacter3d = useUserStore((state) => state.fetchCharacter3d);

  const uploadTemp = useUserStore((state) => state.uploadTemp);
  const updateUserAvatar = useUserStore((state) => state.updateUserAvatar);
  const deleteTempFile = useUserStore((state) => state.deleteTempFile);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [previewUrl, setPreviewUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [character3d, setCharacter3d] = useState<Character3dResponse | null>(null);

  // --- LOGOUT FUNCTIONS (Được đưa vào trong component để sử dụng 't') ---

  const appLogout = useCallback(async () => {
    try {
      useUserStore.getState().logout();
      useAppStore.getState().logout();
      resetToAuth();
    } catch {
      // Dùng 't' an toàn ở đây
      Alert.alert(t('common.error'), t('profile.logoutFailed'));
    }
  }, [t]); // Thêm 't' vào dependency array

  const handleLogout = useCallback(() => {
    // Dùng 't' an toàn ở đây
    Alert.alert(t('profile.logoutConfirmTitle'), t('profile.logoutConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.logout'), style: 'destructive', onPress: appLogout },
    ]);
  }, [t, appLogout]);

  // --- END LOGOUT FUNCTIONS ---


  // Fetch 3D Character Data
  useEffect(() => {
    const loadCharacter3d = async () => {
      // NOTE: `character3d.modelUrl` used in renderProfileHeader is likely a placeholder 
      // for `character3d.renderUrl` or a similar field that contains the image URL.
      // Assuming `renderUrl` is the intended field from the DTO.
      try {
        const data = await fetchCharacter3d();
        setCharacter3d(data);
      } catch (e) {
        console.error("Failed to fetch 3D character data:", e);
      }
    };
    if (user?.userId) {
      loadCharacter3d();
    }
  }, [user?.userId, fetchCharacter3d]);

  const pickImage = useCallback(async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (res.canceled || !res.assets?.length) return;

    const asset = res.assets[0];
    const file = {
      uri: asset.uri,
      name: asset.fileName ?? 'avatar.jpg',
      type: asset.type ?? 'image/jpeg',
    } as any;

    if (!user?.userId) {
      Alert.alert(t('errors.userNotFound'));
      return;
    }

    setUploading(true);
    setPreviewUrl(asset.uri);
    let tempPath: string | null = null;

    try {
      tempPath = await uploadTemp(file);
      if (!tempPath) throw new Error(t('errors.uploadFailed'));

      const updatedUser = await updateUserAvatar(tempPath);
      setPreviewUrl(updatedUser.avatarUrl ?? null);
    } catch (e: any) {
      console.error('Avatar upload failed:', e);
      // Sử dụng key errors.server
      Alert.alert(t('errors.server'), e?.message ?? t('errors.uploadFailed'));
      setPreviewUrl(user?.avatarUrl ?? null);
      if (tempPath) deleteTempFile(tempPath);
    } finally {
      setUploading(false);
    }
  }, [user?.userId, uploadTemp, updateUserAvatar, deleteTempFile, user?.avatarUrl, t]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (user?.avatarUrl && !uploading && previewUrl !== user.avatarUrl) {
      setPreviewUrl(user.avatarUrl);
    }
  }, [user?.avatarUrl, uploading, previewUrl]);

  const expCurrent = useMemo(() => Number(exp ?? 0), [exp]);
  const expNext = useMemo(() => Number(expToNextLevel ?? 0), [expToNextLevel]);
  const expRatio = useMemo(() => {
    const denom = expCurrent + expNext;
    return denom > 0 ? Math.min(1, Math.max(0, expCurrent / denom)) : 0;
  }, [expCurrent, expNext]);

  const details = useMemo(
    () =>
      [
        // Details
        { key: 'email', label: t('profile.email'), icon: 'email', value: user?.email, color: '#3B82F6' },
        { key: 'phone', label: t('profile.phone'), icon: 'phone', value: user?.phone, color: '#10B981' },
        { key: 'country', label: t('profile.country'), icon: 'public', value: user?.country, flag: ccToFlag(user?.country), color: '#F97316' },
        { key: 'ageRange', label: t('profile.age'), icon: 'cake', value: user?.ageRange, color: '#8B5CF6' },
        { key: 'learningPace', label: t('profile.learningPace'), icon: 'timeline', value: user?.learningPace, color: '#EF4444' },
        { key: 'proficiency', label: t('profile.proficiency'), icon: 'insights', value: user?.proficiency, color: '#06B6D4' },
        { key: 'progress', label: t('profile.progress'), icon: 'show-chart', value: user?.progress, color: '#4F46E5' },
        { key: 'certificationIds', label: t('profile.certifications'), icon: 'verified', value: user?.certificationIds?.join(', '), color: '#F59E0B' },
        { key: 'interestestIds', label: t('profile.interests'), icon: 'interests', value: user?.interestestIds?.join(', '), color: '#10B981' },
        { key: 'goalIds', label: t('profile.goals'), icon: 'flag', value: user?.goalIds?.join(', '), color: '#3B82F6' },

        // Privacy Settings
        { key: 'privacy_profileVisibility', label: t('profile.profileVisibility'), icon: 'lock-open', value: privacySettings?.profileVisibility, color: '#4F46E5' },
        { key: 'privacy_progressSharing', label: t('profile.progressSharing'), icon: 'group', value: privacySettings?.progressSharing, color: '#10B981' },
        { key: 'privacy_dataCollection', label: t('profile.dataCollection'), icon: 'policy', value: privacySettings?.dataCollection, color: '#F97316' },
        { key: 'privacy_personalization', label: t('profile.personalization'), icon: 'tune', value: privacySettings?.personalization, color: '#8B5CF6' },
        { key: 'privacy_analytics', label: t('profile.analytics'), icon: 'analytics', value: privacySettings?.analytics, color: '#EF4444' },
        { key: 'privacy_crashReports', label: t('profile.crashReports'), icon: 'bug-report', value: privacySettings?.crashReports, color: '#06B6D4' },
        { key: 'privacy_locationTracking', label: t('profile.locationTracking'), icon: 'place', value: privacySettings?.locationTracking, color: '#4F46E5' },
        { key: 'privacy_contactSync', label: t('profile.contactSync'), icon: 'contacts', value: privacySettings?.contactSync, color: '#10B981' },

        // Notification Settings
        { key: 'notification_studyReminders', label: t('profile.studyReminders'), icon: 'alarm', value: notificationPreferences?.studyReminders, color: '#3B82F6' },
        { key: 'notification_streakReminders', label: t('profile.streakReminders'), icon: 'whatshot', value: notificationPreferences?.streakReminders, color: '#F97316' },
        { key: 'notification_message', label: t('profile.messageNotifications'), icon: 'chat', value: notificationPreferences?.messageNotifications, color: '#8B5CF6' },
        { key: 'notification_achievement', label: t('profile.achievementNotifications'), icon: 'emoji-events', value: notificationPreferences?.achievementNotifications, color: '#EF4444' },
        {
          key: 'notification_quiet',
          label: t('profile.quietHours'),
          icon: 'nightlight',
          // Sử dụng template string để i18n hóa các giá trị boolean và giờ
          value: t('profile.quietHoursValue', {
            status: notificationPreferences?.quietHours?.enabled ? t('profile.enabled') : t('profile.disabled'),
            start: notificationPreferences?.quietHours?.start ?? '00:00',
            end: notificationPreferences?.quietHours?.end ?? '00:00'
          }),
          color: '#06B6D4'
        },
      ].filter((i) => i.value !== undefined && i.value !== null && i.value !== ''),
    [t, user, privacySettings, notificationPreferences],
  );

  const navigationButtons = useMemo(
    () => [
      { label: t('profile.editProfile'), icon: 'edit', screen: 'EditProfileScreen', color: '#4F46E5' },
      { label: t('profile.transactionHistory'), icon: 'history', screen: 'TransactionHistoryScreen', color: '#10B981' },
      { label: t('profile.notificationHistory'), icon: 'notifications', screen: 'NotificationHistoryScreen', color: '#F59E0B' },
      { label: t('profile.privacySettings'), icon: 'lock', screen: 'PrivacySettingsScreen', color: '#3B82F6' },
      { label: t('profile.roadmap'), icon: 'map', screen: 'RoadmapScreen', color: '#EF4444' },
      { label: t('profile.notes'), icon: 'note', screen: 'NotesScreen', color: '#06B6D4' },
      { label: t('profile.helpSupport'), icon: 'help', screen: 'HelpSupportScreen', color: '#8B5CF6' },
      { label: t('profile.about'), icon: 'info', screen: 'AboutScreen', color: '#F97316' },
    ],
    [t],
  );

  const renderProfileHeader = useCallback(() => (
    <View style={styles.profileHeader}>
      {/* 3D Character or Avatar Section */}
      <View style={styles.characterContainer}>
        {character3d?.modelUrl ? (
          // Display 3D Character Render Image (using modelUrl as a placeholder for a dedicated render url)
          <Image source={{ uri: character3d.modelUrl }} style={styles.characterImage} resizeMode="contain" />
        ) : previewUrl ? (
          // Display Avatar Image
          <Image source={{ uri: previewUrl }} style={styles.avatarImage} />
        ) : (
          // Default Avatar
          <View style={styles.avatarPlaceholder}>
            <Icon name="person" size={50} color="#4F46E5" />
          </View>
        )}
        {uploading ? (
          <View style={[styles.editAvatarButton, { backgroundColor: t('profile.uploadingColor') }]}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        ) : (
          <TouchableOpacity style={styles.editAvatarButton} onPress={pickImage} disabled={uploading}>
            <Icon name="camera-alt" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Name and Bio Section */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <Text style={styles.userName}>
          {name || user?.nickname || user?.fullname || t('profile.noName')}
        </Text>
        <TouchableOpacity onPress={() => gotoTab('Profile', 'EditProfileScreen')}>
          <Icon name="edit" size={20} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <Text style={styles.levelBadge}>
        <Icon name="star" size={14} color="#F59E0B" /> {t('profile.level')} {level ?? user?.level ?? 0}
      </Text>

      {user?.bio || statusMessage ? (
        <Text style={styles.userBio} numberOfLines={3}>
          {user?.bio || statusMessage}
        </Text>
      ) : (
        <Text style={[styles.userBio, { color: '#9CA3AF' }]}>{t('profile.addABio')}</Text>
      )}

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatItem icon="whatshot" color="#F97316" value={streak ?? 0} label={t('profile.streakDays')} />
        <View style={styles.statDivider} />
        <StatItem
          icon="check-circle"
          color="#10B981"
          value={`${dailyGoal?.completedLessons ?? 0}/${dailyGoal?.totalLessons ?? 0}`}
          label={t('profile.dailyGoal')}
        />
        <View style={styles.statDivider} />
        <StatItem icon="language" color="#3B82F6" value={languages?.length ?? 0} label={t('profile.languages')} />
      </View>

      {/* XP Bar */}
      <View style={styles.expCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={styles.expLabel}>{t('profile.level')} {level ?? user?.level ?? 0}</Text>
          <Text style={styles.expLabel}>
            {t('profile.expShort')}: {expCurrent}/{expCurrent + expNext}
          </Text>
        </View>
        <View style={styles.expBarBg}>
          <View style={[styles.expBarFill, { width: `${Math.round(expRatio * 100)}%` }]} />
        </View>
        {expNext > 0 && <Text style={styles.expHint}>{t('profile.toNextLevel', { exp: expNext })}</Text>}
      </View>

      {/* Languages/Flags */}
      <View style={styles.flagRow}>
        {languages?.length ? (
          languages.map((lang) => (
            <View key={lang} style={styles.flagPill}>
              <Text style={styles.flagEmoji}>{langToFlag(lang)}</Text>
              <Text style={styles.flagText}>{lang}</Text>
            </View>
          ))
        ) : (
          <Text style={{ color: '#6B7280', fontSize: 13 }}>{t('profile.noLanguages')}</Text>
        )}
      </View>
    </View>
  ), [previewUrl, uploading, pickImage, name, user, t, streak, dailyGoal, languages, level, expCurrent, expNext, expRatio, statusMessage, character3d?.modelUrl]);

  const StatItem = ({ icon, color, value, label }: { icon: string; color: string; value: string | number; label: string }) => (
    <View style={styles.statItem}>
      <Icon name={icon as any} size={20} color={color} />
      <Text style={[styles.statValue, { color: color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderDetails = useCallback(() => (
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
              <Text style={styles.detailValue}>
                {d.flag ? `${d.flag} ${fmt(d.value)}` : fmt(d.value)}
              </Text>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.detailSeparator} />}
        scrollEnabled={false}
      />
    </View>
  ), [details, t]);

  const renderBadges = useCallback(() => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('profile.badges')}</Text>
      <View style={styles.badgesRow}>
        {badges?.length ? (
          badges.map((b) => (
            <View key={b} style={styles.badge}>
              <Icon name="emoji-events" size={16} color="#FFD700" style={{ marginRight: 4 }} />
              <Text style={styles.badgeText}>{b}</Text>
            </View>
          ))
        ) : (
          <Text style={{ color: '#6B7280' }}>{t('profile.noBadges')}</Text>
        )}
      </View>
    </View>
  ), [badges, t]);

  const renderNavigationButtons = useCallback(() => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('profile.actions')}</Text>
      {navigationButtons.map((btn, index) => (
        <TouchableOpacity
          key={btn.screen}
          style={[styles.actionButton, index === navigationButtons.length - 1 && { borderBottomWidth: 0 }]}
          onPress={() => gotoTab('Profile', btn.screen)}>
          <View style={[styles.actionIconContainer, { backgroundColor: `${btn.color}1A` }]}>
            <Icon name={btn.icon as any} size={22} color={btn.color} />
          </View>
          <Text style={styles.actionText}>{btn.label}</Text>
          <Icon name="chevron-right" size={24} color="#9CA3AF" />
        </TouchableOpacity>
      ))}
    </View>
  ), [navigationButtons, t]);

  const renderInfoNotices = useCallback(() => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('profile.aboutYourAccount')}</Text>
      <View style={styles.noticeRow}>
        <Icon name="shield" size={20} color="#10B981" />
        <Text style={styles.noticeText}>
          {t('profile.privacyNotice')}
        </Text>
      </View>
      <View style={styles.noticeRow}>
        <Icon name="star-rate" size={20} color="#F59E0B" />
        <Text style={styles.noticeText}>
          {t('profile.playStoreRating')}
        </Text>
      </View>
      <View style={styles.noticeRow}>
        <Icon name="policy" size={20} color="#3B82F6" />
        <Text style={styles.noticeText}>
          {t('profile.policySnippet')}
        </Text>
      </View>
    </View>
  ), [t]);

  return (
    <ScreenLayout>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('profile.title')}</Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => gotoTab('Profile', 'PrivacySettingsScreen')}>
              <Icon name="settings" size={26} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {renderProfileHeader()}
          {renderBadges()}
          {renderNavigationButtons()}
          {renderDetails()}
          {renderInfoNotices()}

          <View style={styles.actionSection}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Icon name="logout" size={22} color="#EF4444" />
              <Text style={styles.logoutText}>{t('profile.logout')}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </ScreenLayout>
  );
};

// --- STYLES (unchanged) ---

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: '#F4F7F9' },
  content: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#1F2937' },
  settingsButton: { padding: 4 },

  profileHeader: { backgroundColor: '#fff', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84 },

  // Character/Avatar Styles
  characterContainer: { position: 'relative', width: 120, height: 120, marginBottom: 15 },
  characterImage: { width: '100%', height: '100%', borderRadius: 60, backgroundColor: '#E0E7FF' }, // BG for 3D render placeholder
  avatarImage: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  editAvatarButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },

  userName: { fontSize: 24, fontWeight: '800', color: '#111827' },
  levelBadge: { fontSize: 14, color: '#F59E0B', fontWeight: '700', marginTop: 4 },
  userBio: { fontSize: 14, color: '#4B5563', marginTop: 8, textAlign: 'center', paddingHorizontal: 10 },

  // Stats Row
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, backgroundColor: '#F9FAFB', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 5, width: '100%', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', flex: 1, gap: 2 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB' },

  // XP Bar
  expCard: { width: '100%', marginTop: 16, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12 },
  expLabel: { fontSize: 13, color: '#374151', fontWeight: '600' },
  expBarBg: { height: 12, backgroundColor: '#E5E7EB', borderRadius: 6, overflow: 'hidden', marginTop: 4 },
  expBarFill: { height: 12, backgroundColor: '#4F46E5', borderRadius: 6 },
  expHint: { fontSize: 12, color: '#6B7280', marginTop: 8, textAlign: 'right' },

  // Languages/Flags
  flagRow: { width: '100%', marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  flagPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: '#EEF2FF', marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#C7D2FE' },
  flagEmoji: { fontSize: 18, marginRight: 6 },
  flagText: { color: '#4F46E5', fontWeight: '700', fontSize: 13 },

  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2.5 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 8 },

  // Details
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  detailSeparator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 54 },
  detailIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  detailLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  detailValue: { fontSize: 15, color: '#111827', fontWeight: '600', marginTop: 2 },

  // Badges
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4F46E5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#6366F1' },
  badgeText: { fontSize: 13, color: '#fff', fontWeight: '600' },

  // Actions/Navigation
  actionIconContainer: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  actionText: { flex: 1, fontSize: 16, color: '#374151', marginLeft: 14, fontWeight: '500' },

  // Notices
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12, paddingHorizontal: 5 },
  noticeText: { flex: 1, color: '#4B5563', fontSize: 13, lineHeight: 18 },

  // Logout
  actionSection: { marginTop: 14, marginBottom: 24 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#EF4444', marginLeft: 10 },
});

export default ProfileScreen;