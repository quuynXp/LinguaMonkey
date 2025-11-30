import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useUserStore } from "../../stores/UserStore";
import { useUsers } from "../../hooks/useUsers";
import { useFriendships } from "../../hooks/useFriendships";
import { useGetStudyHistory } from "../../hooks/useUserActivity";
import { useCourses } from "../../hooks/useCourses";
import { useRooms } from "../../hooks/useRoom"; // <--- IMPORT MỚI
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";
import { useToast } from "../../utils/useToast";
import { FriendshipStatus } from "../../types/enums";
import type { UserProfileResponse } from "../../types/dto";
import { getCountryFlag } from "../../utils/flagUtils";
import { getAvatarSource } from "../../utils/avatarUtils";
import { getCourseImage } from "../../utils/courseUtils";

const { width } = Dimensions.get("window");

type RootStackParamList = {
  UserProfileViewScreen: { userId: string };
  ChatStack: {
    screen: string;
    params: { roomId: string; roomName: string }; // <--- Cập nhật params điều hướng
  };
  CourseStack: {
    screen: string;
    params: { courseId: string };
  };
};

const InfoRow = ({ icon, label, value, isBoolean }: { icon: string; label: string; value?: string | number | null | boolean; isBoolean?: boolean }) => {
  if (value === undefined || value === null) return null;
  let displayValue = value;
  if (isBoolean) {
    displayValue = value ? "Yes" : "No";
  }

  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabelContainer}>
        <Icon name={icon} size={18} color="#666" style={styles.infoIcon} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={1}>
        {String(displayValue)}
      </Text>
    </View>
  );
};

const ActivityHeatmap = ({ userId, historyData }: { userId: string; historyData: any }) => {
  const { t } = useTranslation();

  if (!historyData) return <ActivityIndicator size="small" />;

  const today = new Date();
  const days = Array.from({ length: 70 }).map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (69 - i));
    const dateStr = d.toISOString().split("T")[0];
    const count = historyData[dateStr] || 0;
    return { date: dateStr, count };
  });

  const getColor = (count: number) => {
    if (count === 0) return "#ebedf0";
    if (count < 15) return "#9be9a8";
    if (count < 30) return "#40c463";
    if (count < 60) return "#30a14e";
    return "#216e39";
  };

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{t("profile.activityHeatmap")}</Text>
      <View style={styles.heatmapContainer}>
        <View style={styles.heatmapGrid}>
          {days.map((day, index) => (
            <View key={index} style={[styles.heatmapBox, { backgroundColor: getColor(day.count) }]} />
          ))}
        </View>
      </View>
    </View>
  );
};

const UserProfileViewScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, "UserProfileViewScreen">>();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user: currentUser } = useUserStore();
  const { userId } = route.params;

  // Hooks
  const { useUserProfile, useAdmireUser } = useUsers();
  const { useCreateFriendship, useUpdateFriendship, useDeleteFriendship } = useFriendships();
  const { useCreatorCourses } = useCourses();
  const { useFindOrCreatePrivateRoom } = useRooms(); // <--- Sử dụng Hook Room

  // Data Queries
  const { data: userProfile, isLoading, refetch } = useUserProfile(userId);
  const { data: historyData, isLoading: isHistoryLoading } = useGetStudyHistory(userId, "year");
  const { data: creatorCoursesPage } = useCreatorCourses(userId, 0, 20);

  // Mutations
  const createFriendshipMutation = useCreateFriendship();
  const updateFriendshipMutation = useUpdateFriendship();
  const deleteFriendshipMutation = useDeleteFriendship();
  const admireMutation = useAdmireUser();
  const { mutate: findOrCreateRoom, isPending: isCreatingRoom } = useFindOrCreatePrivateRoom(); // <--- Mutation tìm/tạo phòng

  const publicCourses = creatorCoursesPage?.data || [];
  const isSelf = currentUser?.userId === userId;
  const [modalVisible, setModalVisible] = useState(false);

  const profileData = useMemo<UserProfileResponse | null>(() => {
    if (!userProfile) return null;
    return userProfile;
  }, [userProfile]);

  // --- LOGIC MỚI: CHAT 1-1 ---
  const handleMessage = () => {
    if (!currentUser || !profileData || isCreatingRoom) return;

    // Gọi API tìm hoặc tạo phòng
    findOrCreateRoom(profileData.userId, {
      onSuccess: (room) => {
        // Sau khi có roomId, navigate thẳng vào màn hình Chat Chi Tiết (GroupChatScreen)
        // Thay vì màn hình list
        navigation.navigate("ChatStack", {
          screen: "GroupChatScreen", // Hoặc tên màn hình bạn định nghĩa trong Stack
          params: {
            roomId: room.roomId,
            // Với chat 1-1, tên phòng hiển thị chính là tên User kia
            roomName: profileData.nickname || profileData.fullname
          },
        });
      },
      onError: () => {
        showToast({ type: "error", message: t("errors.cannot_create_chat") });
      }
    });
  };
  // ---------------------------

  const handleAddFriend = () => {
    if (!currentUser || !profileData || createFriendshipMutation.isPending) return;
    createFriendshipMutation.mutate(
      {
        requesterId: currentUser.userId,
        receiverId: profileData.userId,
        status: FriendshipStatus.PENDING,
      },
      {
        onSuccess: () => {
          showToast({ type: "success", message: t("profile.requestSent") });
          refetch();
        },
        onError: () => showToast({ type: "error", message: t("errors.unknown") }),
      }
    );
  };

  const handleCancelRequest = () => {
    if (!currentUser || !profileData || deleteFriendshipMutation.isPending) return;
    Alert.alert(t("profile.cancelRequest"), t("profile.cancelRequestConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.yes"),
        style: "destructive",
        onPress: () => {
          deleteFriendshipMutation.mutate(
            { user1Id: currentUser.userId, user2Id: profileData.userId },
            {
              onSuccess: () => {
                showToast({ type: "info", message: t("profile.requestCancelled") });
                refetch();
              },
              onError: () => showToast({ type: "error", message: t("errors.unknown") }),
            }
          );
        },
      },
    ]);
  };

  const handleAcceptRequest = () => {
    if (!currentUser || !profileData || updateFriendshipMutation.isPending) return;
    updateFriendshipMutation.mutate(
      {
        user1Id: profileData.userId,
        user2Id: currentUser.userId,
        req: {
          requesterId: profileData.userId,
          receiverId: currentUser.userId,
          status: FriendshipStatus.ACCEPTED,
        },
      },
      {
        onSuccess: () => {
          showToast({ type: "success", message: t("profile.friendAccepted") });
          refetch();
        },
        onError: () => showToast({ type: "error", message: t("errors.unknown") }),
      }
    );
  };

  const handleUnfriend = () => {
    if (!currentUser || !profileData || deleteFriendshipMutation.isPending) return;
    Alert.alert(t("profile.unfriend"), t("profile.unfriendConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.yes"),
        style: "destructive",
        onPress: () => {
          deleteFriendshipMutation.mutate(
            { user1Id: currentUser.userId, user2Id: profileData.userId },
            {
              onSuccess: () => {
                showToast({ type: "info", message: t("profile.unfriended") });
                refetch();
              },
              onError: () => showToast({ type: "error", message: t("errors.unknown") }),
            }
          );
        },
      },
    ]);
  };

  const handleAdmire = () => {
    if (!profileData || profileData.hasAdmired || admireMutation.isPending) return;
    admireMutation.mutate(profileData.userId, {
      onSuccess: () => refetch(),
    });
  };

  const openOptions = () => {
    setModalVisible(true);
  };

  const handleBlock = () => {
    setModalVisible(false);
    if (!profileData?.canBlock) return;
    Alert.alert("Block User", "Are you sure you want to block this user?", [
      { text: "Cancel", style: "cancel" },
      { text: "Block", style: "destructive", onPress: () => showToast({ type: "success", message: "User blocked" }) }
    ]);
  };

  const handleReport = () => {
    setModalVisible(false);
    showToast({ type: "info", message: "Report feature coming soon" });
  };

  if (isLoading || !profileData) {
    return (
      <ScreenLayout>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </ScreenLayout>
    );
  }

  const {
    isFriend,
    friendRequestStatus,
    canSendFriendRequest,
    teacherCourses,
    badges,
    languages,
    stats,
    character3d,
  } = profileData;

  const hasSent = friendRequestStatus?.hasSentRequest;
  const hasReceived = friendRequestStatus?.hasReceivedRequest;
  const canChat = isFriend || profileData.allowStrangerChat;

  return (
    <ScreenLayout>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profile.title")}</Text>
        <TouchableOpacity style={styles.moreButton} onPress={openOptions}>
          <Icon name="more-vert" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <Image
              source={getAvatarSource(profileData.avatarUrl, profileData.gender)}
              style={styles.avatar}
            />
            {profileData.country && (
              <View style={styles.flagBadgeTopLeft}>
                {getCountryFlag(profileData.country, 20)}
              </View>
            )}
            {character3d && (
              <View style={styles.threeDBadge}>
                <Text style={styles.threeDBadgeText}>3D</Text>
              </View>
            )}
          </View>

          <View style={styles.nameSection}>
            <Text style={styles.fullname}>{profileData.fullname}</Text>
            {profileData.vip && (
              <Icon name="verified" size={20} color="#2196F3" style={{ marginLeft: 4 }} />
            )}
          </View>
          <Text style={styles.nickname}>@{profileData.nickname || profileData.userId}</Text>

          {profileData.bio ? (
            <Text style={styles.bio}>{profileData.bio}</Text>
          ) : (
            <Text style={styles.bioPlaceholder}>{t("profile.noBio")}</Text>
          )}

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileData.level}</Text>
              <Text style={styles.statLabel}>{t("profile.stats.level")}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileData.streak} 🔥</Text>
              <Text style={styles.statLabel}>{t("profile.stats.streak")}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileData.admirationCount}</Text>
              <Text style={styles.statLabel}>{t("profile.stats.admires")}</Text>
            </View>
          </View>

          {!isSelf && (
            <View style={styles.actionButtons}>
              {/* UPDATE: Message Button with Loading State */}
              {canChat ? (
                <TouchableOpacity
                  style={[styles.messageBtn, isCreatingRoom && styles.btnDisabled]}
                  onPress={handleMessage}
                  disabled={isCreatingRoom}
                >
                  {isCreatingRoom ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Icon name="chat" size={20} color="#FFF" />
                      <Text style={styles.primaryBtnText}>{t("profile.message")}</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.disabledChatBtn}>
                  <Icon name="lock" size={16} color="#9CA3AF" />
                  <Text style={styles.disabledChatText}>{t("profile.chatPrivate")}</Text>
                </View>
              )}

              {/* Friend Actions */}
              {isFriend ? (
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleUnfriend} disabled={deleteFriendshipMutation.isPending}>
                  <Icon name="person-remove" size={20} color="#EF4444" />
                </TouchableOpacity>
              ) : hasReceived ? (
                <TouchableOpacity style={styles.primaryBtn} onPress={handleAcceptRequest} disabled={updateFriendshipMutation.isPending}>
                  <Icon name="check" size={20} color="#FFF" />
                  <Text style={styles.primaryBtnText}>{t("profile.accept")}</Text>
                </TouchableOpacity>
              ) : hasSent ? (
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleCancelRequest} disabled={deleteFriendshipMutation.isPending}>
                  <Icon name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              ) : canSendFriendRequest && (
                <TouchableOpacity style={styles.primaryBtn} onPress={handleAddFriend} disabled={createFriendshipMutation.isPending}>
                  <Icon name="person-add" size={20} color="#FFF" />
                  <Text style={styles.primaryBtnText}>{t("profile.addFriend")}</Text>
                </TouchableOpacity>
              )}

              {/* Admire */}
              <TouchableOpacity
                style={[styles.admireBtn, profileData.hasAdmired && styles.admiredBtn]}
                onPress={handleAdmire}
                disabled={profileData.hasAdmired || admireMutation.isPending}
              >
                <Icon
                  name={profileData.hasAdmired ? "favorite" : "favorite-border"}
                  size={24}
                  color={profileData.hasAdmired ? "#FFF" : "#E91E63"}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Heatmap */}
        {isHistoryLoading ? (
          <View style={styles.sectionContainer}>
            <ActivityIndicator size="small" color="#2196F3" />
          </View>
        ) : (
          <ActivityHeatmap userId={userId} historyData={historyData} />
        )}

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t("profile.details")}</Text>
          <View style={styles.detailsCard}>
            <InfoRow icon="person" label={t("profile.gender")} value={profileData.gender} />
            <InfoRow icon="cake" label={t("profile.age")} value={profileData.ageRange} />
            <InfoRow icon="school" label={t("profile.proficiency")} value={profileData.proficiency} />
            <InfoRow icon="speed" label={t("profile.pace")} value={profileData.learningPace} />
            <InfoRow icon="flag" label={t("profile.country")} value={profileData.country} />
            <InfoRow icon="star" label="VIP" value={profileData.vip} isBoolean />
            <InfoRow icon="security" label={t("profile.chatAccess")} value={profileData.allowStrangerChat ? t("common.public") : t("common.private")} />
            {stats && (
              <>
                <InfoRow icon="translate" label={t("profile.translationsUsed")} value={stats.translationsUsed?.toLocaleString()} />
                <InfoRow icon="timer" label="Learning Time (min)" value={Math.round((stats.exp || 0) / 60)} />
              </>
            )}
            <InfoRow icon="military-tech" label={t("profile.totalExp")} value={profileData.exp?.toLocaleString()} />
          </View>
        </View>

        {languages && languages.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{t("profile.languages")}</Text>
            <View style={styles.tagsContainer}>
              {languages.map((lang, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{lang}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {badges && badges.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{t("profile.badges")}</Text>
            <View style={styles.badgesGrid}>
              {badges.map((badge) => (
                <View key={badge.badgeId} style={styles.badgeItem}>
                  <Image source={{ uri: badge.imageUrl }} style={styles.badgeImage} />
                  <Text style={styles.badgeName} numberOfLines={1}>{badge.badgeName}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {(publicCourses && publicCourses.length > 0) && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{t("profile.publicCourses")}</Text>
            {publicCourses.map((course: any) => (
              <TouchableOpacity
                key={course.courseId}
                style={styles.courseCard}
                onPress={() => navigation.navigate("CourseStack", { screen: "CourseDetailScreen", params: { courseId: course.courseId } })}
              >
                <Image source={getCourseImage(course.latestPublicVersion?.thumbnailUrl)} style={styles.courseThumb} />
                <View style={styles.courseInfo}>
                  <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
                  <View style={styles.courseMeta}>
                    <Text style={styles.courseLevel}>{course.difficultyLevel || course.level}</Text>
                    <View style={styles.ratingContainer}>
                      <Icon name="star" size={14} color="#FFC107" />
                      <Text style={styles.ratingText}>{(course.averageRating ?? 0).toFixed(1)}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {profileData.isTeacher && teacherCourses && teacherCourses.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{t("profile.createdCourses")}</Text>
            {teacherCourses.map((course) => (
              <TouchableOpacity
                key={course.courseId}
                style={styles.courseCard}
                onPress={() => navigation.navigate("CourseStack", { screen: "CourseDetailScreen", params: { courseId: course.courseId } })}
              >
                <Image source={{ uri: course.thumbnailUrl || "https://via.placeholder.com/80" }} style={styles.courseThumb} />
                <View style={styles.courseInfo}>
                  <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
                  <View style={styles.courseMeta}>
                    <Text style={styles.courseLevel}>{course.level}</Text>
                    <View style={styles.ratingContainer}>
                      <Icon name="star" size={14} color="#FFC107" />
                      <Text style={styles.ratingText}>{(course.averageRating ?? 0).toFixed(1)}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.footerSpacing} />
      </ScrollView>

      {/* Option Block Modal */}
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.optionBlock}>
            <TouchableOpacity style={styles.optionItem} onPress={handleReport}>
              <Icon name="report-problem" size={24} color="#F59E0B" />
              <Text style={styles.optionText}>{t("profile.report")}</Text>
            </TouchableOpacity>
            <View style={styles.optionDivider} />
            {profileData.canBlock && (
              <TouchableOpacity style={styles.optionItem} onPress={handleBlock}>
                <Icon name="block" size={24} color="#EF4444" />
                <Text style={[styles.optionText, { color: "#EF4444" }]}>{t("profile.block")}</Text>
              </TouchableOpacity>
            )}
            <View style={styles.optionDivider} />
            <TouchableOpacity style={styles.optionItem} onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color="#6B7280" />
              <Text style={styles.optionText}>{t("common.close")}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },
  backButton: {
    padding: 8,
  },
  moreButton: {
    padding: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: "#FFF",
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  avatarSection: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#F3F4F6",
  },
  flagBadgeTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 10,
    backgroundColor: "#FFF",
    borderRadius: 12,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  threeDBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#2196F3",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  threeDBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  nameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fullname: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
  },
  nickname: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  bio: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  bioPlaceholder: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 20,
    fontStyle: "italic",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    width: "100%",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "uppercase",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
  },
  actionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 8,
  },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#9C27B0",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 8,
  },
  btnDisabled: {
    opacity: 0.7
  },
  disabledChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 24,
    gap: 5,
  },
  disabledChatText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  primaryBtnText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  admireBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FCE7F3",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FBCFE8",
  },
  admiredBtn: {
    backgroundColor: "#E91E63",
    borderColor: "#E91E63",
  },
  sectionContainer: {
    backgroundColor: "#FFF",
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 16,
  },
  detailsCard: {
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  infoLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoIcon: {
    width: 20,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111",
    maxWidth: "60%",
    textAlign: "right",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "600",
  },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  badgeItem: {
    width: (width - 64) / 4,
    alignItems: "center",
    gap: 4,
  },
  badgeImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F3F4F6",
  },
  badgeName: {
    fontSize: 10,
    color: "#4B5563",
    textAlign: "center",
  },
  courseCard: {
    flexDirection: "row",
    marginBottom: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 10,
    gap: 12,
  },
  courseThumb: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  courseInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    marginBottom: 4,
  },
  courseMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  courseLevel: {
    fontSize: 12,
    color: "#6B7280",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  heatmapContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  heatmapBox: {
    width: 10,
    height: 10,
    backgroundColor: "#10B981",
    borderRadius: 2,
  },
  footerSpacing: {
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  optionBlock: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 15,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 5,
  },
});

export default UserProfileViewScreen;