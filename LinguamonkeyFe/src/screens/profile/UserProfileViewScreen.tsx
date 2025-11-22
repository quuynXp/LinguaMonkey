import React, { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";

import { useUserStore } from "../../stores/UserStore";
import { useUsers } from "../../hooks/useUsers";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";
import type { UserProfileResponse } from "../../types/dto";
import type { User } from "../../types/entity";

interface RouteParams {
  userId: string;
}

const UserProfileViewScreen = ({ route }: { route: { params?: RouteParams } }) => {
  const { userId } = route?.params ?? {};
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  const { user: currentUser } = useUserStore();

  const {
    useUserProfile,
    useFriendRequestStatus,
    useCheckIfFriends,
    useSendFriendRequest,
    useAcceptFriendRequest,
  } = useUsers();

  const {
    data: userProfile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useUserProfile(userId) as {
    data: UserProfileResponse | undefined;
    isLoading: boolean;
    error: any;
    refetch: () => void;
  };

  const friendStatusQuery = useFriendRequestStatus(currentUser?.userId, userId);
  const areFriendsQuery = useCheckIfFriends(currentUser?.userId, userId);

  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();

  useEffect(() => {
    if (!userId) navigation.goBack();
  }, [userId, navigation]);

  const profileSafe = useMemo(() => {
    if (!userProfile) return null;

    const source: UserProfileResponse & Partial<User> =
      currentUser?.userId === userId ? { ...userProfile, ...currentUser } : userProfile;

    const sent = friendStatusQuery.data?.sent ?? false;
    const incoming = friendStatusQuery.data?.incoming ?? false;

    return {
      id: source.userId ?? userId,
      avatar: source.avatarUrl ?? null,
      fullname: source.fullname ?? "",
      nickname: source.nickname ?? "",
      email: source.email ?? "",
      bio: source.bio ?? "",
      country: source.country ?? "",
      level: source.level ?? null,
      exp: source.exp ?? 0,
      streak: source.streak ?? 0,
      badges: source.badges ?? [],
      isFriend: !!(source.isFriend || areFriendsQuery.data),
      friendRequestSent: sent,
      incomingFriendRequest: incoming,
    };
  }, [userProfile, friendStatusQuery.data, areFriendsQuery.data, currentUser, userId]);

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
              await sendRequest.mutateAsync(String(profileSafe.id));
              Alert.alert(t("common.success"), t("profile.requestSent"));
              refetchProfile();
            } catch {
              Alert.alert(t("common.error"), t("errors.unknown"));
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
      refetchProfile();
    } catch {
      Alert.alert(t("common.error"), t("errors.unknown"));
    }
  };

  const handleMessage = () => {
    if (!profileSafe?.id) return;
    navigation.navigate("ChatRoomListScreen", {
      userId: profileSafe.id,
      userName: profileSafe.fullname,
    });
  };

  // Không còn primaryLearningLanguage → tạm thời loại bỏ nút Roadmap
  // Khi backend bổ sung field này, sẽ bật lại

  if (profileError) {
    return (
      <ScreenLayout>
        <View style={styles.errorContainer}>
          <Icon name="error" size={64} color="#F44336" />
          <Text style={styles.errorText}>{t("errors.networkError")}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetchProfile}>
            <Text style={styles.retryText}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  if (profileLoading || !profileSafe) {
    return (
      <ScreenLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>{t("common.loading")}</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profile.title")}</Text>
        <TouchableOpacity>
          <Icon name="more-vert" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <Image
            source={{ uri: profileSafe.avatar ?? "https://via.placeholder.com/120" }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{profileSafe.fullname}</Text>
          <Text style={styles.username}>{profileSafe.nickname || profileSafe.email}</Text>
          <Text style={styles.bio}>
            {profileSafe.bio || profileSafe.country || t("profile.bioDefault")}
          </Text>

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
                  style={[styles.addFriendButton, styles.acceptButton]}
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
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {t("profile.stats.currentLevel")} {profileSafe.level ?? "-"}
            </Text>
            <Text style={styles.statLabel}>{t("profile.stats.level")}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {(profileSafe.exp ?? 0).toLocaleString?.() ?? profileSafe.exp}
            </Text>
            <Text style={styles.statLabel}>{t("profile.stats.totalXP")}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profileSafe.streak ?? 0}</Text>
            <Text style={styles.statLabel}>{t("profile.stats.dayStreak")}</Text>
          </View>
        </View>

        {profileSafe.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("profile.bio")}</Text>
            <Text style={styles.bioText}>{profileSafe.bio}</Text>
          </View>
        )}

        {profileSafe.badges?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("profile.badges")}</Text>
            <View style={styles.badgeContainer}>
              {profileSafe.badges.map((badge, i) => (
                <View key={i} style={styles.badgeItem}>
                  <Image
                    source={{ uri: badge.imageUrl ?? "https://via.placeholder.com/50" }}
                    style={styles.badgeImage}
                  />
                  {badge.badgeName && (
                    <Text style={styles.badgeName}>{badge.badgeName}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16, color: "#666", marginTop: 8 },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  errorText: { fontSize: 16, color: "#666", textAlign: "center", marginVertical: 20 },
  retryButton: { backgroundColor: "#2196F3", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "bold" },
  content: { paddingBottom: 40 },
  profileHeader: {
    backgroundColor: "#fff",
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 15 },
  name: { fontSize: 24, fontWeight: "bold", color: "#333", marginBottom: 5 },
  username: { fontSize: 16, color: "#666", marginBottom: 10 },
  bio: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20, marginBottom: 20, paddingHorizontal: 15 },
  actionButtons: { flexDirection: "row", gap: 15, marginBottom: 15 },
  addFriendButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
  },
  acceptButton: { backgroundColor: "#10B981" },
  addFriendText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  pendingButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
  },
  pendingText: { color: "#666", fontSize: 14, fontWeight: "bold" },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
  },
  messageText: { color: "#2196F3", fontSize: 14, fontWeight: "bold" },
  disabledButton: { backgroundColor: "#D1D5DB" },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 20, fontWeight: "bold", color: "#333", marginBottom: 5 },
  statLabel: { fontSize: 12, color: "#666" },
  section: { backgroundColor: "#fff", marginTop: 10, paddingHorizontal: 20, paddingVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 10 },
  bioText: { fontSize: 14, color: "#4B5563", lineHeight: 20 },
  badgeContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 15 },
  badgeItem: { alignItems: "center", width: 60 },
  badgeImage: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#F3F4F6" },
  badgeName: { fontSize: 10, color: "#6B7280", marginTop: 4, textAlign: "center" },
});

export default UserProfileViewScreen;