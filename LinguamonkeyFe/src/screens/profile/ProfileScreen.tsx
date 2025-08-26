import Icon from 'react-native-vector-icons/MaterialIcons';
import React, { useRef, useState, useEffect } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { uploadAvatarToTemp } from '../../services/cloudinary';
import { useUserStore } from '../../stores/UserStore';
import { resetToAuth } from '../../utils/navigationRef';

// Logout handler
const logout = async () => {
  try {
    useUserStore.getState().logout();
    resetToAuth('Login');
  } catch (err) {
    Alert.alert('Error', 'Logout failed, please try again.');
  }
};

const handleLogout = () => {
  Alert.alert(
    'Logout',
    'Are you sure you want to logout?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]
  );
};

const ProfileScreen = () => {
  const { t } = useTranslation();
  const {
    user,
    name,
    streak,
    languages,
    dailyGoal,
    recentLessons,
    statusMessage,
    badges,
    nativeLanguage,
    setProfileData,
  } = useUserStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Avatar state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tempPublicId, setTempPublicId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    const file = {
      uri: asset.uri,
      name: asset.fileName ?? 'avatar.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    };
    try {
      setUploading(true);
      const up = await uploadAvatarToTemp(file);
      setPreviewUrl(up.secureUrl);
      setTempPublicId(up.publicId);
      // update vào store
      setProfileData({ user: { ...user, avatarUrl: up.secureUrl } as any });
    } catch (e: any) {
      Alert.alert(t('error'), e.message);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  if (uploading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  const renderProfileHeader = () => (
    <View style={styles.profileHeader}>
      <View style={styles.avatarContainer}>
        {previewUrl || user?.avatar_url ? (
          <Image
            source={{ uri: previewUrl ?? user?.avatar_url }}
            style={{ width: 80, height: 80, borderRadius: 40 }}
          />
        ) : (
          <View style={styles.avatar}>
            <Icon name="person" size={40} color="#4F46E5" />
          </View>
        )}
        <TouchableOpacity style={styles.editAvatarButton} onPress={pickImage}>
          <Icon name="camera-alt" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Text style={styles.userName}>{name || user?.nickname || "No name"}</Text>
      <Text style={styles.userEmail}>{user?.email ?? "No email"}</Text>
      {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>{t('streakDays')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{dailyGoal.completedLessons}/{dailyGoal.totalLessons}</Text>
          <Text style={styles.statLabel}>{t('dailyGoal')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{languages.length}</Text>
          <Text style={styles.statLabel}>{t('languages')}</Text>
        </View>
      </View>
    </View>
  );

  const renderLanguages = () => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('languages')}</Text>
      {languages.map((lang) => (
        <View key={lang.language_code} style={styles.langItem}>
          <View style={[styles.langIcon, { backgroundColor: lang.language_name }]}>
          </View>
          <Text style={styles.langName}>{lang.name}</Text>
          <Text style={styles.langQuickLesson}>⚡ {lang.quickLessonTime}m</Text>
        </View>
      ))}
    </View>
  );

  const renderRecentLessons = () => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('recentLessons')}</Text>
      {recentLessons.map((lesson) => (
        <View key={lesson.id} style={styles.lessonItem}>
          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <Text style={styles.lessonMeta}>
            {lesson.language} #{lesson.lessonNumber}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderBadges = () => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('badges')}</Text>
      <View style={styles.badgesRow}>
        {badges.map((b) => (
          <View key={b} style={styles.badge}>
            <Text style={{ color: '#fff' }}>🏅</Text>
            <Text style={styles.badgeText}>{b}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View style={[styles.content, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('profile')}</Text>
          <TouchableOpacity style={styles.settingsButton}>
            <Icon name="settings" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {renderProfileHeader()}
        {renderLanguages()}
        {renderRecentLessons()}
        {renderBadges()}

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="logout" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>{t("logout")}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1F2937' },
  settingsButton: { padding: 8 },
  profileHeader: { backgroundColor: '#fff', padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 30 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  editAvatarButton: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  userEmail: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  status: { fontSize: 14, color: '#10B981', marginBottom: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { alignItems: 'center', paddingHorizontal: 20 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#4F46E5' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: '#E5E7EB' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
  langItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  langIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  langName: { fontSize: 14, color: '#111827', flex: 1 },
  langQuickLesson: { fontSize: 12, color: '#6B7280' },
  lessonItem: { marginBottom: 8 },
  lessonTitle: { fontSize: 14, fontWeight: '500', color: '#111827' },
  lessonMeta: { fontSize: 12, color: '#6B7280' },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4F46E5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 8, marginBottom: 8 },
  badgeText: { fontSize: 12, color: '#fff', marginLeft: 4 },
  actionSection: { marginTop: 20, marginBottom: 30 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FEE2E2' },
  logoutText: { fontSize: 16, fontWeight: '500', color: '#EF4444', marginLeft: 8 },
});

export default ProfileScreen;
