// src/screens/UserProfileViewScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../../stores/appStore";
import {
  useUser,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useFriendRequestStatus,
  useCheckIfFriends,
} from "../../hooks/useUsers";

const { width } = Dimensions.get("window");

const UserProfileViewScreen = ({ route }: any) => {
  const { userId } = route?.params ?? {};
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { user: currentUser } = useAppStore();

  const [showAchievements, setShowAchievements] = useState(false); // kept if you add later

  // --- Hooks (from hooks/useUsers)
  const userQuery = useUser(userId);
  const { data: userProfile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = userQuery;


  // Friend-related
  const friendStatusQuery = useFriendRequestStatus(currentUser?.userId, userId);
  const areFriendsQuery = useCheckIfFriends(currentUser?.userId, userId);

  const sendRequest = useSendFriendRequest(); // mutation
  const acceptRequest = useAcceptFriendRequest(); // mutation

  useEffect(() => {
    if (!userId) {
      // invalid route param: go back
      (navigation as any).goBack();
    }
  }, [userId]);

  // Normalized / safe profile object (tolerant to backend field names)
  const profileSafe = useMemo(() => {
    if (!userProfile) return null;
    const id = userProfile.user_id ?? userProfile.userId ?? userProfile.id ?? userId;
    const avatar =
      userProfile.avatar_url ?? userProfile.avatarUrl ?? userProfile.avatar ?? null;
    const fullname = userProfile.fullname ?? userProfile.name ?? "";
    const nickname = userProfile.nickname ?? "";
    const email = userProfile.email ?? "";
    const country = userProfile.country ?? userProfile.location ?? "";
    const level = userProfile.level ?? null;
    const exp = userProfile.exp ?? 0;
    const streak = userProfile.streak ?? 0;
    const isFriend = !!(userProfile.isFriend || areFriendsQuery.data);
    // friendRequestSent / incomingFriendRequest from friendStatusQuery result (if backend returns such shape)
    const friendRequestSent = !!(friendStatusQuery.data?.sent ?? userProfile.friendRequestSent);
    const incomingFriendRequest = !!(friendStatusQuery.data?.incoming ?? userProfile.incomingFriendRequest);
    const stats = userProfile.stats ?? {};
    return {
      id,
      avatar,
      fullname,
      nickname,
      email,
      country,
      level,
      exp,
      streak,
      isFriend,
      friendRequestSent,
      incomingFriendRequest,
      stats,
    };
  }, [userProfile, friendStatusQuery.data, areFriendsQuery.data, userId]);

  // Handlers
  const handleAddFriend = () => {
    if (!profileSafe?.id || sendRequest.isPending) return;
    Alert.alert(
      t("profile.addFriend"),
      t("profile.addFriendConfirm", { name: profileSafe.fullname }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.confirm"),
          onPress: async () => {
            try {
              // sendRequest.mutateAsync accepts either string id (our hook supports that)
              await sendRequest.mutateAsync(String(profileSafe.id));
              Alert.alert(t("common.success"), t("profile.requestSent"));
              refetchProfile && refetchProfile();
            } catch (err: any) {
              Alert.alert(t("common.error"), err?.message ?? t("errors.unknown"));
            }
          },
        },
      ]
    );
  };

  const handleAcceptFriend = async () => {
    if (!profileSafe?.id || acceptRequest.isPending) return;
    try {
      await acceptRequest.mutateAsync({
        currentUserId: String(currentUser?.userId),
        otherUserId: String(profileSafe.id),
      });
      Alert.alert(t("common.success"), t("profile.friendAccepted"));
      refetchProfile && refetchProfile();
    } catch (err: any) {
      Alert.alert(t("common.error"), err?.message ?? t("errors.unknown"));
    }
  };

  const handleMessage = () => {
    if (!profileSafe?.id) return;
    // cast navigation to any to avoid strict typed navigation param errors
    (navigation as any).navigate("UserChatScreen", {
      userId: profileSafe.id,
      userName: profileSafe.fullname,
    });
  };

  const handleViewRoadmap = () => {
    if (!userProfile) return;
    const primaryLanguage =
      userProfile.learningLanguages?.[0]?.language_code ??
      userProfile.learningLanguages?.[0]?.language?.language_code ??
      userProfile.primaryLanguage ??
      null;
    (navigation as any).navigate("RoadmapScreen", {
      userId: profileSafe?.id,
      languageCode: primaryLanguage,
    });
  };

  // Error / loading UI
  if (profileError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="error" size={64} color="#F44336" />
          <Text style={styles.errorText}>{t("errors.networkError")}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetchProfile && refetchProfile()}>
            <Text style={styles.retryText}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (profileLoading || !profileSafe) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196f3" />
          <Text style={styles.loadingText}>{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (navigation as any).goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profile.title")}</Text>
        <TouchableOpacity>
          <Icon name="more-vert" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image
            source={{
              uri: profileSafe.avatar ?? "https://via.placeholder.com/120",
            }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{profileSafe.fullname}</Text>
          <Text style={styles.username}>{profileSafe.nickname || profileSafe.email}</Text>
          <Text style={styles.bio}>{profileSafe.country || t("profile.bioDefault")}</Text>

          {currentUser?.userId !== profileSafe.id && (
            <View style={styles.actionButtons}>
              {!profileSafe.isFriend && !profileSafe.friendRequestSent && (
                <TouchableOpacity
                  style={[styles.addFriendButton, sendRequest.isPending && styles.disabledButton]}
                  onPress={handleAddFriend}
                  disabled={sendRequest.isPending}
                >
                  <Icon name="person-add" size={20} color="#fff" />
                  <Text style={styles.addFriendText}>
                    {sendRequest.isPending ? t("common.loading") : t("profile.addFriend")}
                  </Text>
                </TouchableOpacity>
              )}

              {profileSafe.friendRequestSent && (
                <View style={styles.pendingButton}>
                  <Icon name="schedule" size={20} color="#666" />
                  <Text style={styles.pendingText}>{t("profile.requestSent")}</Text>
                </View>
              )}

              {profileSafe.incomingFriendRequest && (
                <TouchableOpacity
                  style={[styles.addFriendButton, styles.roadmapButton]}
                  onPress={handleAcceptFriend}
                  disabled={acceptRequest.isPending}
                >
                  <Icon name="how-to-reg" size={20} color="#fff" />
                  <Text style={styles.addFriendText}>
                    {acceptRequest.isPending ? t("common.loading") : t("profile.acceptRequest")}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
                <Icon name="message" size={20} color="#2196F3" />
                <Text style={styles.messageText}>{t("profile.message")}</Text>
              </TouchableOpacity>
            </View>
          )}

          {(currentUser?.userId === profileSafe.id || profileSafe.isFriend) && (
            <TouchableOpacity style={styles.roadmapButton} onPress={handleViewRoadmap}>
              <Icon name="map" size={20} color="#FFFFFF" />
              <Text style={styles.roadmapButtonText}>{t("profile.viewRoadmap")}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {t("profile.stats.currentLevel")} {profileSafe.level ?? "-"}
            </Text>
            <Text style={styles.statLabel}>{t("profile.stats.currentLevel")}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{(profileSafe.exp ?? 0).toLocaleString?.() ?? profileSafe.exp ?? 0}</Text>
            <Text style={styles.statLabel}>{t("profile.stats.totalXP")}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profileSafe.streak ?? 0}</Text>
            <Text style={styles.statLabel}>{t("profile.stats.dayStreak")}</Text>
          </View>
        </View>

        {/* Languages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.languages")}</Text>
          <View style={styles.languageContainer}>
            <View style={styles.languageItem}>
              <Text style={styles.languageLabel}>{t("profile.native")}</Text>
              <Text style={styles.languageValue}>
                {userProfile?.native_language_code ?? userProfile?.nativeLanguage ?? t("profile.notSpecified")}
              </Text>
            </View>
            <View style={styles.languageItem}>
              <Text style={styles.languageLabel}>{t("profile.learning")}</Text>
              <Text style={styles.languageValue}>
                {userProfile?.learningLanguages?.map((lang: any) => lang.language?.language_name ?? lang.language_name ?? lang).join(", ") || t("profile.none")}
              </Text>
            </View>
          </View>
        </View>

        {/* Detailed Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.stats.title")}</Text>
          <View style={styles.detailedStats}>
            <View style={styles.detailedStatItem}>
              <Icon name="schedule" size={24} color="#4CAF50" />
              <View style={styles.detailedStatInfo}>
                <Text style={styles.detailedStatNumber}>
                  {Math.floor((profileSafe.stats?.totalStudyTime ?? 0) / 60)}h {(profileSafe.stats?.totalStudyTime ?? 0) % 60}m
                </Text>
                <Text style={styles.detailedStatLabel}>{t("profile.stats.totalStudyTime")}</Text>
              </View>
            </View>

            <View style={styles.detailedStatItem}>
              <Icon name="book" size={24} color="#2196F3" />
              <View style={styles.detailedStatInfo}>
                <Text style={styles.detailedStatNumber}>{profileSafe.stats?.lessonsCompleted ?? 0}</Text>
                <Text style={styles.detailedStatLabel}>{t("profile.stats.lessonsCompleted")}</Text>
              </View>
            </View>

            <View style={styles.detailedStatItem}>
              <Icon name="translate" size={24} color="#FF9800" />
              <View style={styles.detailedStatInfo}>
                <Text style={styles.detailedStatNumber}>{profileSafe.stats?.wordsLearned ?? 0}</Text>
                <Text style={styles.detailedStatLabel}>{t("profile.stats.wordsLearned")}</Text>
              </View>
            </View>

            <View style={styles.detailedStatItem}>
              <Icon name="quiz" size={24} color="#9C27B0" />
              <View style={styles.detailedStatInfo}>
                <Text style={styles.detailedStatNumber}>{profileSafe.stats?.averageScore ?? 0}%</Text>
                <Text style={styles.detailedStatLabel}>{t("profile.stats.averageScore")}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Note: Achievements and Effort Map removed since backend doesn't support them */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 15, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e0e0e0" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16, color: "#666", marginTop: 8 },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  errorText: { fontSize: 16, color: "#666", textAlign: "center", marginVertical: 20 },
  retryButton: { backgroundColor: "#2196F3", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "bold" },
  content: { flex: 1 },
  profileHeader: { backgroundColor: "#fff", alignItems: "center", paddingVertical: 30, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#e0e0e0" },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 15 },
  name: { fontSize: 24, fontWeight: "bold", color: "#333", marginBottom: 5 },
  username: { fontSize: 16, color: "#666", marginBottom: 10 },
  bio: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20, marginBottom: 20 },
  actionButtons: { flexDirection: "row", gap: 15, marginBottom: 15 },
  addFriendButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#2196F3", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, gap: 8 },
  addFriendText: { color: "#fff", fontSize: 14, fontWeight: "bold", marginLeft: 8 },
  pendingButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f0f0", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, gap: 8 },
  pendingText: { color: "#666", fontSize: 14, fontWeight: "bold", marginLeft: 8 },
  messageButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: "#2196F3", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, gap: 8 },
  messageText: { color: "#2196F3", fontSize: 14, fontWeight: "bold", marginLeft: 8 },
  roadmapButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#10B981", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, gap: 8, marginTop: 8 },
  roadmapButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "bold" },
  disabledButton: { backgroundColor: "#D1D5DB" },
  statsContainer: { flexDirection: "row", backgroundColor: "#fff", paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: "#e0e0e0" },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 20, fontWeight: "bold", color: "#333", marginBottom: 5 },
  statLabel: { fontSize: 12, color: "#666" },
  section: { backgroundColor: "#fff", marginTop: 10, paddingHorizontal: 20, paddingVertical: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  viewAllText: { fontSize: 14, color: "#2196F3", fontWeight: "500" },
  languageContainer: { gap: 10 },
  languageItem: { flexDirection: "row", alignItems: "center" },
  languageLabel: { fontSize: 14, color: "#666", fontWeight: "500", minWidth: 70 },
  languageValue: { fontSize: 14, color: "#333" },
  detailedStats: { gap: 15 },
  detailedStatItem: { flexDirection: "row", alignItems: "center", gap: 15 },
  detailedStatInfo: { flex: 1 },
  detailedStatNumber: { fontSize: 18, fontWeight: "bold", color: "#333" },
  detailedStatLabel: { fontSize: 12, color: "#666" },
  modalContainer: { flex: 1, backgroundColor: "#fff" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#e0e0e0" },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  headerRight: { width: 24 },
});

export default UserProfileViewScreen;
