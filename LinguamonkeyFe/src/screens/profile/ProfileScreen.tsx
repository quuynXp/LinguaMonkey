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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../stores/appStore';
import { useUserStore } from '../../stores/UserStore';
import { gotoTab, resetToAuth } from '../../utils/navigationRef';
import { createScaledSheet } from '../../utils/scaledStyles';
import { useShallow } from 'zustand/react/shallow';

/* ────────────────────── Helpers ────────────────────── */
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
  if (v === null || v === undefined) return '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (typeof v === 'boolean') return v ? 'On' : 'Off';
  return String(v);
};

const logout = async () => {
  try {
    useUserStore.getState().logout();
    useAppStore.getState().logout();
    resetToAuth('Login');
  } catch {
    Alert.alert('Error', 'Logout failed, please try again.');
  }
};

const handleLogout = () => {
  Alert.alert('Logout', 'Are you sure you want to logout?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Logout', style: 'destructive', onPress: logout },
  ]);
};

/* ────────────────────── Component ────────────────────── */
const ProfileScreen: React.FC = () => {
  const { t } = useTranslation();

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

  // Select methods - these are stable references
  const uploadTemp = useUserStore((state) => state.uploadTemp);
  const updateUserAvatar = useUserStore((state) => state.updateUserAvatar);
  const deleteTempFile = useUserStore((state) => state.deleteTempFile);

  /* ────── Local UI state ────── */
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [previewUrl, setPreviewUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [uploading, setUploading] = useState(false);

  /* ────── Avatar picker ────── */
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
      Alert.alert(t('errors.server'), e?.message ?? t('errors.uploadFailed'));
      setPreviewUrl(user?.avatarUrl ?? null);
      if (tempPath) deleteTempFile(tempPath);
    } finally {
      setUploading(false);
    }
  }, [user?.userId, uploadTemp, updateUserAvatar, deleteTempFile, user?.avatarUrl, t]);

  /* ────── Entrance animation (run once) ────── */
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  /* ────── Sync previewUrl with avatarUrl from store ────── */
  useEffect(() => {
    if (user?.avatarUrl && !uploading && previewUrl !== user.avatarUrl) {
      setPreviewUrl(user.avatarUrl);
    }
  }, [user?.avatarUrl, uploading, previewUrl]);

  /* ────── Computed values ────── */
  const expCurrent = useMemo(() => Number(exp ?? 0), [exp]);
  const expNext = useMemo(() => Number(expToNextLevel ?? 0), [expToNextLevel]);
  const expRatio = useMemo(() => {
    const denom = expCurrent + expNext;
    return denom > 0 ? Math.min(1, Math.max(0, expCurrent / denom)) : 0;
  }, [expCurrent, expNext]);

  /* ────── Details list (memoized) ────── */
  const details = useMemo(
    () =>
      [
        { key: 'email', label: t('profile.email'), icon: 'email', value: user?.email, editable: true },
        { key: 'phone', label: t('profile.phone'), icon: 'phone', value: user?.phone, editable: true },
        { key: 'country', label: t('profile.country'), icon: 'public', value: user?.country, flag: ccToFlag(user?.country), editable: true },
        { key: 'ageRange', label: t('profile.age'), icon: 'cake', value: user?.ageRange, editable: true },
        { key: 'learningPace', label: t('profile.learningPace'), icon: 'timeline', value: user?.learningPace, editable: true },
        { key: 'proficiency', label: t('profile.proficiency'), icon: 'insights', value: user?.proficiency, editable: true },
        { key: 'progress', label: t('profile.progress'), icon: 'show-chart', value: user?.progress },
        { key: 'certificationIds', label: t('profile.certifications'), icon: 'verified', value: user?.certificationIds?.join(', ') },
        { key: 'interestestIds', label: t('profile.interests'), icon: 'interests', value: user?.interestestIds?.join(', ') },
        { key: 'goalIds', label: t('profile.goals'), icon: 'flag', value: user?.goalIds?.join(', ') },

        { key: 'privacy_profileVisibility', label: t('profile.profileVisibility'), icon: 'lock-open', value: privacySettings?.profileVisibility },
        { key: 'privacy_progressSharing', label: t('profile.progressSharing'), icon: 'group', value: privacySettings?.progressSharing },
        { key: 'privacy_dataCollection', label: t('profile.dataCollection'), icon: 'policy', value: privacySettings?.dataCollection },
        { key: 'privacy_personalization', label: t('profile.personalization'), icon: 'tune', value: privacySettings?.personalization },
        { key: 'privacy_analytics', label: t('profile.analytics'), icon: 'analytics', value: privacySettings?.analytics },
        { key: 'privacy_crashReports', label: t('profile.crashReports'), icon: 'bug-report', value: privacySettings?.crashReports },
        { key: 'privacy_locationTracking', label: t('profile.locationTracking'), icon: 'place', value: privacySettings?.locationTracking },
        { key: 'privacy_contactSync', label: t('profile.contactSync'), icon: 'contacts', value: privacySettings?.contactSync },

        { key: 'notification_studyReminders', label: t('profile.studyReminders'), icon: 'alarm', value: notificationPreferences?.studyReminders },
        { key: 'notification_streakReminders', label: t('profile.streakReminders'), icon: 'whatshot', value: notificationPreferences?.streakReminders },
        { key: 'notification_message', label: t('profile.messageNotifications'), icon: 'chat', value: notificationPreferences?.messageNotifications },
        { key: 'notification_achievement', label: t('profile.achievementNotifications'), icon: 'emoji-events', value: notificationPreferences?.achievementNotifications },
        {
          key: 'notification_quiet',
          label: t('profile.quietHours'),
          icon: 'nightlight',
          value: `${notificationPreferences?.quietHours?.enabled ? 'On' : 'Off'} ${notificationPreferences?.quietHours?.start ?? ''}-${notificationPreferences?.quietHours?.end ?? ''}`,
        },
      ].filter((i) => i.value !== undefined && i.value !== null && i.value !== ''),
    [t, user, privacySettings, notificationPreferences],
  );

  const navigationButtons = useMemo(
    () => [
      { label: t('profile.editProfile'), icon: 'edit', screen: 'EditProfile' },
      { label: t('profile.transactionHistory'), icon: 'history', screen: 'TransactionHistoryScreen' },
      { label: t('profile.notification'), icon: 'notifications', screen: 'NotificationHistoryScreen' },
      { label: t('profile.about'), icon: 'help', screen: 'About' },
      { label: t('profile.roadmap'), icon: 'map', screen: 'RoadmapScreen' },
      { label: t('profile.notes'), icon: 'note', screen: 'NotesScreen' },
      { label: t('profile.helpSupport'), icon: 'help', screen: 'HelpSupport' },
      { label: t('profile.privacySettings'), icon: 'lock', screen: 'PrivacySettings' },
    ],
    [t],
  );

  /* ────── Render functions ────── */
  const renderProfileHeader = useCallback(() => (
    <View style={styles.profileHeader}>
      <View style={styles.avatarContainer}>
        {previewUrl ? (
          <Image source={{ uri: previewUrl }} style={{ width: 96, height: 96, borderRadius: 48 }} />
        ) : (
          <View style={styles.avatar}>
            <Icon name="person" size={44} color="#4F46E5" />
          </View>
        )}
        {uploading ? (
          <View style={[styles.editAvatarButton, { backgroundColor: '#9CA3AF' }]}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        ) : (
          <TouchableOpacity style={styles.editAvatarButton} onPress={pickImage} disabled={uploading}>
            <Icon name="camera-alt" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={styles.userName}>
          {name || user?.nickname || user?.fullname || t('profile.noName')}
        </Text>
        <TouchableOpacity onPress={() => gotoTab('Profile', 'EditProfile')}>
          <Icon name="edit" size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {user?.bio || statusMessage ? (
        <Text style={styles.userBio} numberOfLines={3}>
          {user?.bio || statusMessage}
        </Text>
      ) : (
        <Text style={[styles.userBio, { color: '#9CA3AF' }]}>{t('profile.addABio')}</Text>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Icon name="whatshot" size={18} color="#F97316" />
          <Text style={styles.statValue}>{streak ?? 0}</Text>
          <Text style={styles.statLabel}>{t('profile.streakDays')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Icon name="track-changes" size={18} color="#4F46E5" />
          <Text style={styles.statValue}>
            {dailyGoal?.completedLessons ?? 0}/{dailyGoal?.totalLessons ?? 0}
          </Text>
          <Text style={styles.statLabel}>{t('profile.dailyGoal')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Icon name="language" size={18} color="#10B981" />
          <Text style={styles.statValue}>{languages?.length ?? 0}</Text>
          <Text style={styles.statLabel}>{t('profile.languages')}</Text>
        </View>
      </View>

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

      <View style={styles.flagRow}>
        {languages?.length ? (
          languages.map((lang) => (
            <View key={lang} style={styles.flagPill}>
              <Text style={styles.flagEmoji}>{langToFlag(lang)}</Text>
              <Text style={styles.flagText}>{lang}</Text>
            </View>
          ))
        ) : (
          <Text style={{ color: '#6B7280' }}>{t('profile.noLanguages')}</Text>
        )}
      </View>
    </View>
  ), [previewUrl, uploading, pickImage, name, user, t, streak, dailyGoal, languages, level, expCurrent, expNext, expRatio, statusMessage]);

  const renderDetails = useCallback(() => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('profile.details')}</Text>
      {details.map((d) => (
        <View key={d.key} style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Icon name={d.icon as any} size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailLabel}>{d.label}</Text>
          </View>
          <Text style={styles.detailValue}>
            {d.flag ? `${d.flag} ${fmt(d.value)}` : fmt(d.value)}
          </Text>
        </View>
      ))}
    </View>
  ), [details, t]);

  const renderBadges = useCallback(() => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('profile.badges')}</Text>
      <View style={styles.badgesRow}>
        {badges?.length ? (
          badges.map((b) => (
            <View key={b} style={styles.badge}>
              <Text style={{ color: '#fff' }}>Trophy</Text>
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
      {navigationButtons.map((btn) => (
        <TouchableOpacity
          key={btn.screen}
          style={styles.actionButton}
          onPress={() => gotoTab('Profile', btn.screen)}>
          <Icon name={btn.icon as any} size={20} color="#4F46E5" />
          <Text style={styles.actionText}>{btn.label}</Text>
          <Icon name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      ))}
    </View>
  ), [navigationButtons, t]);

  const renderSettingsSummary = useCallback(() => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('profile.settingsSummary')}</Text>

      {notificationPreferences && (
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Icon name="notifications" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailLabel}>{t('profile.notifications')}</Text>
            <Text style={styles.detailValue}>
              {(notificationPreferences?.soundEnabled ? t('profile.enabled') : t('profile.disabled')) +
                ` · ` +
                (notificationPreferences?.vibrationEnabled ? t('profile.vibrationOn') : t('profile.vibrationOff'))}
            </Text>
            {notificationPreferences?.studyReminders && (
              <Text style={styles.detailSubValue}>
                {t('profile.studyReminders')} · {notificationPreferences.reminderFrequency} · {notificationPreferences.studyTime}
              </Text>
            )}
          </View>
        </View>
      )}

      {privacySettings && (
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Icon name="lock" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailLabel}>{t('profile.privacy')}</Text>
            <Text style={styles.detailValue}>
              {privacySettings.profileVisibility ? t('profile.public') : t('profile.private')}
              {' · '}
              {t('profile.dataCollection')}:{' '}
              {privacySettings.dataCollection ? t('profile.enabled') : t('profile.disabled')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => gotoTab('Profile', 'PrivacySettings')}>
            <Icon name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  ), [notificationPreferences, privacySettings, t]);

  const renderInfoNotices = useCallback(() => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('profile.aboutYourAccount')}</Text>
      <View style={styles.noticeRow}>
        <Icon name="shield" size={18} color="#10B981" />
        <Text style={styles.noticeText}>
          {t('profile.privacyNotice', 'Thông tin của bạn được bảo mật và chỉ dùng để cải thiện trải nghiệm học.')}
        </Text>
      </View>
      <View style={styles.noticeRow}>
        <Icon name="star-rate" size={18} color="#F59E0B" />
        <Text style={styles.noticeText}>
          {t('profile.playStoreRating', 'Ứng dụng được người dùng đánh giá 5★ trên CH Play.')}
        </Text>
      </View>
      <View style={styles.noticeRow}>
        <Icon name="policy" size={18} color="#3B82F6" />
        <Text style={styles.noticeText}>
          {t('profile.policySnippet', 'Xem Chính sách quyền riêng tư và Điều khoản để hiểu rõ cách chúng tôi xử lý dữ liệu.')}
        </Text>
      </View>
    </View>
  ), [t]);

  /* ────── JSX ────── */
  return (
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
            onPress={() => gotoTab('Profile', 'PrivacySettings')}>
            <Icon name="settings" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {renderProfileHeader()}
        {renderDetails()}
        {renderBadges()}
        {renderNavigationButtons()}
        {renderSettingsSummary()}
        {renderInfoNotices()}

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="logout" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ScrollView>
  );
};

/* ────── Styles ────── */
const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1F2937' },
  settingsButton: { padding: 8 },

  profileHeader: { backgroundColor: '#fff', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 16 },
  avatarContainer: { position: 'relative', marginBottom: 10 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  userName: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  userBio: { fontSize: 14, color: '#374151', marginTop: 6, textAlign: 'center' },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  statItem: { alignItems: 'center', paddingHorizontal: 18, gap: 2 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6B7280' },
  statDivider: { width: 1, height: 36, backgroundColor: '#E5E7EB' },

  expCard: { width: '100%', marginTop: 14, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 10 },
  expLabel: { fontSize: 12, color: '#374151', fontWeight: '600' },
  expBarBg: { height: 10, backgroundColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden' },
  expBarFill: { height: 10, backgroundColor: '#4F46E5', borderRadius: 8 },
  expHint: { fontSize: 12, color: '#6B7280', marginTop: 6 },

  flagRow: { width: '100%', marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  flagPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18, backgroundColor: '#EEF2FF', marginRight: 8, marginBottom: 8 },
  flagEmoji: { fontSize: 16, marginRight: 6 },
  flagText: { color: '#1F2937', fontWeight: '600', fontSize: 12 },

  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 10 },

  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  noticeText: { flex: 1, color: '#374151' },

  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  detailIcon: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  detailLabel: { fontSize: 12, color: '#6B7280' },
  detailValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
  detailSubValue: { fontSize: 12, color: '#6B7280', marginTop: 4 },

  badgesRow: { flexDirection: 'row', flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4F46E5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 8, marginBottom: 8 },
  badgeText: { fontSize: 12, color: '#fff', marginLeft: 6 },

  actionSection: { marginTop: 14, marginBottom: 24 },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  actionText: { flex: 1, fontSize: 16, color: '#374151', marginLeft: 12 },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: { fontSize: 16, fontWeight: '500', color: '#EF4444', marginLeft: 8 },
});

export default ProfileScreen;