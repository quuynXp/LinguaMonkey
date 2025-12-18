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
import { useCouples } from "../../hooks/useCouples";
import { useGetStudyHistory } from "../../hooks/useUserActivity";
import { useCourses } from "../../hooks/useCourses";
import { useFindOrCreatePrivateRoom } from "../../hooks/useRoom";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";
import { useToast } from "../../utils/useToast";
import { FriendshipStatus, CoupleStatus } from "../../types/enums";
import type { UserProfileResponse } from "../../types/dto";
import { getCountryFlag } from "../../utils/flagUtils";
import { getAvatarSource } from "../../utils/avatarUtils";
import { getCourseImage } from "../../utils/courseUtils";
import { useChatStore } from "../../stores/ChatStore";

const { width } = Dimensions.get("window");

const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  en: 'US', vi: 'VN', ja: 'JP', jp: 'JP', zh: 'CN', ko: 'KR',
  fr: 'FR', de: 'DE', es: 'ES', it: 'IT', ru: 'RU', in: 'IN'
};

const mapLangToFlag = (langCode: string) => {
  const code = langCode.toLowerCase();
  const countryCode = LANGUAGE_TO_COUNTRY[code];
  return countryCode ? getCountryFlag(countryCode) : langCode.toUpperCase();
};

type RootStackParamList = {
  UserProfileViewScreen: { userId: string };
  ChatStack: {
    screen: string;
    params: { roomId: string; roomName: string };
  };
  CourseStack: {
    screen: string;
    params: { courseId: string };
  };
};

const CoupleBadge = ({ coupleInfo, currentUserName, currentUserAvatar }: { coupleInfo: any, currentUserName: string, currentUserAvatar: any }) => {
  if (!coupleInfo) return null;

  return (
    <View style={styles.coupleCardContainer}>
      <View style={styles.coupleContent}>
        <View style={styles.coupleConnectorLine} />
        <View style={styles.coupleUserCol}>
          <Image source={currentUserAvatar} style={styles.coupleAvatar} />
          <Text style={styles.coupleNameText} numberOfLines={1}>{currentUserName}</Text>
        </View>
        <View style={styles.heartWrapper}>
          <View style={styles.heartCircle}>
            <Icon name="favorite" size={28} color="#E91E63" />
          </View>
          <View style={styles.daysBadge}>
            <Text style={styles.daysText}>{coupleInfo.daysInLove} days</Text>
          </View>
        </View>
        <View style={styles.coupleUserCol}>
          <Image
            source={{ uri: coupleInfo.partnerAvatar || "https://via.placeholder.com/100" }}
            style={styles.coupleAvatar}
          />
          <Text style={styles.coupleNameText} numberOfLines={1}>{coupleInfo.partnerNickname || coupleInfo.partnerName}</Text>
        </View>
      </View>
      {coupleInfo.status === 'EXPLORING' && (
        <View style={styles.exploringBanner}>
          <Icon name="explore" size={14} color="#B45309" />
          <Text style={styles.exploringText}>Exploring Phase</Text>
        </View>
      )}
    </View>
  );
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
        <View style={styles.iconCircleSmall}>
          <Icon name={icon} size={16} color="#666" />
        </View>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={1}>
        {String(displayValue)}
      </Text>
    </View>
  );
};

const ActivityHeatmap = ({ historyData }: { historyData: any }) => {
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
    if (count === 0) return '#F3F4F6';
    if (count <= 15) return '#D1FAE5';
    if (count <= 30) return '#6EE7B7';
    if (count <= 60) return '#10B981';
    return '#047857';
  };

  if (!historyData) return <ActivityIndicator size="small" />;

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>{t('profile.activity')}</Text>
        <Text style={styles.cardSubtitle}>{t('common.last_months', { count: 4 })}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        <View style={styles.heatmapGraph}>
          {chartData.map((week, wIndex) => (
            <View key={wIndex} style={styles.heatmapColumn}>
              {week.map((day) => (
                <Pressable
                  key={day.date}
                  style={[styles.heatmapCell, { backgroundColor: getLevelColor(day.count) }]}
                  onPress={() => showToast({ type: 'info', message: `${day.date}: ${day.count} mins` })}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.heatmapLegend}>
        <Text style={styles.legendText}>{t('common.less')}</Text>
        {[0, 15, 30, 60, 90].map((val, idx) => (
          <View key={idx} style={[styles.heatmapCellSmall, { backgroundColor: getLevelColor(val) }]} />
        ))}
        <Text style={styles.legendText}>{t('common.more')}</Text>
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

  const { useUserProfile, useAdmireUser } = useUsers();
  const { useCreateFriendship, useUpdateFriendship, useDeleteFriendship } = useFriendships();
  const { useCreateCouple, useUpdateCouple, useDeleteCouple } = useCouples();
  const { useCreatorCourses } = useCourses();
  const findOrCreateRoomMutation = useFindOrCreatePrivateRoom();

  const { data: userProfile, isLoading, refetch } = useUserProfile(userId);
  const { data: historyData, isLoading: isHistoryLoading } = useGetStudyHistory(userId, "year");
  const { data: creatorCoursesPage } = useCreatorCourses(userId, 0, 20);

  const createFriendshipMutation = useCreateFriendship();
  const updateFriendshipMutation = useUpdateFriendship();
  const deleteFriendshipMutation = useDeleteFriendship();
  const createCoupleMutation = useCreateCouple();
  const updateCoupleMutation = useUpdateCouple();
  const deleteCoupleMutation = useDeleteCouple();
  const admireMutation = useAdmireUser();

  const publicCourses = creatorCoursesPage?.data || [];
  const isSelf = currentUser?.userId === userId;
  const [modalVisible, setModalVisible] = useState(false);

  const profileData = useMemo<UserProfileResponse | null>(() => userProfile || null, [userProfile]);

  const handleMessage = async () => {
    if (!currentUser || !profileData) return;

    try {
      useChatStore.getState().initStompClient();
      const room = await findOrCreateRoomMutation.mutateAsync(profileData.userId);

      if (room && room.roomId) {
        navigation.navigate("ChatStack", {
          screen: "GroupChatScreen",
          params: {
            roomId: room.roomId,
            roomName: profileData.nickname || profileData.fullname
          },
        });
      } else {
        showToast({ type: "error", message: t("errors.cannot_create_chat") });
      }
    } catch (error) {
      console.error("Chat creation error:", error);
      showToast({ type: "error", message: t("errors.unknown") });
    }
  };

  const handleAddFriend = () => {
    if (!currentUser || !profileData || createFriendshipMutation.isPending) return;
    createFriendshipMutation.mutate({ requesterId: currentUser.userId, receiverId: profileData.userId, status: FriendshipStatus.PENDING }, {
      onSuccess: () => { showToast({ type: "success", message: t("profile.requestSent") }); refetch(); },
      onError: () => showToast({ type: "error", message: t("errors.unknown") })
    });
  };

  const handleCancelFriendRequest = () => {
    Alert.alert(t("profile.cancelRequest"), t("profile.cancelRequestConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.yes"), style: "destructive", onPress: () => deleteFriendshipMutation.mutate({ user1Id: currentUser!.userId, user2Id: profileData!.userId }, { onSuccess: () => refetch() }) }
    ]);
  };

  const handleAcceptFriendRequest = () => {
    updateFriendshipMutation.mutate({ user1Id: profileData!.userId, user2Id: currentUser!.userId, req: { requesterId: profileData!.userId, receiverId: currentUser!.userId, status: FriendshipStatus.ACCEPTED } }, {
      onSuccess: () => { showToast({ type: "success", message: t("profile.friendAccepted") }); refetch(); }
    });
  };

  const handleUnfriend = () => {
    Alert.alert(t("profile.unfriend"), t("profile.unfriendConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.yes"), style: "destructive", onPress: () => deleteFriendshipMutation.mutate({ user1Id: currentUser!.userId, user2Id: profileData!.userId }, { onSuccess: () => refetch() }) }
    ]);
  };

  const handleSendCoupleRequest = () => {
    if (!currentUser || !profileData) return;
    Alert.alert("Start Dating?", "Send a couple request to " + (profileData.nickname || profileData.fullname) + "?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send Love",
        onPress: () => {
          createCoupleMutation.mutate({
            user1Id: currentUser.userId,
            user2Id: profileData.userId,
            status: CoupleStatus.PENDING,
            startDate: new Date().toISOString()
          }, { onSuccess: () => { showToast({ type: 'success', message: 'Request sent!' }); refetch(); } });
        }
      }
    ]);
  };

  const handleCancelCoupleRequest = () => {
    if (!currentUser || !profileData) return;
    Alert.alert("Cancel", "Cancel couple request?", [
      { text: "No", style: "cancel" },
      { text: "Yes", style: "destructive", onPress: () => deleteCoupleMutation.mutate({ user1Id: currentUser.userId, user2Id: profileData.userId }, { onSuccess: () => refetch() }) }
    ]);
  };

  const handleAcceptCoupleRequest = () => {
    if (!currentUser || !profileData) return;
    updateCoupleMutation.mutate({
      user1Id: profileData.userId,
      user2Id: currentUser.userId,
      req: {
        user1Id: profileData.userId,
        user2Id: currentUser.userId,
        status: CoupleStatus.IN_LOVE,
        startDate: new Date().toISOString()
      }
    }, { onSuccess: () => { showToast({ type: 'success', message: "You are now a couple!" }); refetch(); } });
  };

  const handleRejectCoupleRequest = () => {
    if (!currentUser || !profileData) return;
    deleteCoupleMutation.mutate({ user1Id: profileData.userId, user2Id: currentUser.userId }, { onSuccess: () => refetch() });
  };

  const handleAdmire = () => {
    if (!profileData || profileData.hasAdmired || admireMutation.isPending) return;
    admireMutation.mutate(profileData.userId, { onSuccess: () => refetch() });
  };

  const handleBlock = () => { setModalVisible(false); showToast({ type: "success", message: "Block feature coming soon" }); };
  const handleReport = () => { setModalVisible(false); showToast({ type: "info", message: "Report feature coming soon" }); };

  const isChatLoading = findOrCreateRoomMutation.isPending;

  if (isLoading || !profileData) {
    return (
      <ScreenLayout>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </ScreenLayout>
    );
  }

  const { isFriend, friendRequestStatus, canSendFriendRequest, teacherCourses, badges, languages, stats, character3d, coupleInfo, friendshipDurationDays } = profileData;
  const hasSentFriend = friendRequestStatus?.hasSentRequest;
  const hasReceivedFriend = friendRequestStatus?.hasReceivedRequest;
  const canChat = isFriend || profileData.allowStrangerChat;

  const isCoupleActive = coupleInfo && [CoupleStatus.IN_LOVE, CoupleStatus.EXPLORING].includes(coupleInfo.status as CoupleStatus);

  const datingInvite = profileData.datingInviteSummary;
  const isCouplePending = datingInvite && datingInvite.status === 'PENDING';

  const didISendCoupleReq = isCouplePending && datingInvite.viewerIsSender;
  const didIReceiveCoupleReq = isCouplePending && !datingInvite.viewerIsSender;

  const isCoupleNone = !isCoupleActive && !isCouplePending && (!coupleInfo || [CoupleStatus.EXPIRED, CoupleStatus.BREAK_UP].includes(coupleInfo.status as CoupleStatus));

  return (
    <ScreenLayout style={styles.screenBackground}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profile.title")}</Text>
        <TouchableOpacity style={styles.iconButton} onPress={() => setModalVisible(true)}>
          <Icon name="more-vert" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {isCoupleActive && (
          <CoupleBadge
            coupleInfo={coupleInfo}
            currentUserName={profileData.nickname || profileData.fullname}
            currentUserAvatar={getAvatarSource(profileData.avatarUrl, profileData.gender)}
          />
        )}

        <View style={styles.profileMainCard}>
          <View style={styles.avatarContainer}>
            <Image source={getAvatarSource(profileData.avatarUrl, profileData.gender)} style={styles.mainAvatar} />
            {profileData.country && (
              <View style={styles.flagContainer}>
                {getCountryFlag(profileData.country, 24)}
              </View>
            )}
            {character3d && (
              <View style={styles.badge3D}>
                <Text style={styles.badge3DText}>3D</Text>
              </View>
            )}
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{profileData.fullname}</Text>
              {profileData.vip && <Icon name="verified" size={20} color="#2196F3" />}
            </View>
            <Text style={styles.profileHandle}>@{profileData.nickname || profileData.userId.substring(0, 8)}</Text>

            {isFriend && friendshipDurationDays !== undefined && (
              <View style={styles.friendPill}>
                <Icon name="favorite" size={12} color="#FFF" />
                <Text style={styles.friendPillText}>Friends • {friendshipDurationDays}d</Text>
              </View>
            )}

            <Text style={styles.profileBio}>{profileData.bio || t("profile.noBio")}</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profileData.level}</Text>
              <Text style={styles.statLabel}>{t("profile.stats.level")}</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{profileData.streak} 🔥</Text>
              <Text style={styles.statLabel}>{t("profile.stats.streak")}</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profileData.admirationCount}</Text>
              <Text style={styles.statLabel}>{t("profile.stats.admires")}</Text>
            </View>
          </View>

          {!isSelf && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.chatBtn, !canChat && styles.disabledBtn]}
                onPress={handleMessage}
                disabled={!canChat || isChatLoading}
              >
                {isChatLoading ? <ActivityIndicator color="#FFF" /> : <Icon name={canChat ? "chat" : "lock"} size={20} color="#FFF" />}
                <Text style={styles.btnText}>{canChat ? t("profile.message") : "Private"}</Text>
              </TouchableOpacity>

              {isFriend ? (
                <>
                  {isCoupleNone && (
                    <TouchableOpacity style={[styles.actionBtn, styles.dateBtn]} onPress={handleSendCoupleRequest}>
                      <Icon name="favorite" size={20} color="#FFF" />
                      <Text style={styles.btnText}>Date</Text>
                    </TouchableOpacity>
                  )}

                  {didISendCoupleReq && (
                    <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={handleCancelCoupleRequest}>
                      <Icon name="timelapse" size={20} color="#6B7280" />
                      <Text style={[styles.btnText, { color: '#6B7280' }]}>Waiting...</Text>
                    </TouchableOpacity>
                  )}

                  {didIReceiveCoupleReq && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={[styles.iconActionBtn, { backgroundColor: '#FEE2E2' }]} onPress={handleRejectCoupleRequest}>
                        <Icon name="close" size={20} color="#EF4444" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E11D48', minWidth: 80 }]} onPress={handleAcceptCoupleRequest}>
                        <Text style={styles.btnText}>Accept Love</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity style={[styles.iconActionBtn, styles.unfriendBtn]} onPress={handleUnfriend}>
                    <Icon name="person-remove" size={22} color="#EF4444" />
                  </TouchableOpacity>
                </>
              ) : hasReceivedFriend ? (
                <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={handleAcceptFriendRequest}>
                  <Icon name="check" size={20} color="#FFF" />
                  <Text style={styles.btnText}>{t("profile.accept")}</Text>
                </TouchableOpacity>
              ) : hasSentFriend ? (
                <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={handleCancelFriendRequest}>
                  <Icon name="close" size={20} color="#6B7280" />
                  <Text style={[styles.btnText, { color: '#6B7280' }]}>{t("profile.cancelRequest")}</Text>
                </TouchableOpacity>
              ) : canSendFriendRequest && (
                <TouchableOpacity style={[styles.actionBtn, styles.addBtn]} onPress={handleAddFriend}>
                  <Icon name="person-add" size={20} color="#FFF" />
                  <Text style={styles.btnText}>{t("profile.addFriend")}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.iconActionBtn, profileData.hasAdmired ? styles.admired : styles.notAdmired]}
                onPress={handleAdmire}
                disabled={profileData.hasAdmired}
              >
                <Icon name={profileData.hasAdmired ? "favorite" : "favorite-border"} size={24} color={profileData.hasAdmired ? "#FFF" : "#E91E63"} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isHistoryLoading ? (
          <ActivityIndicator size="small" color="#2196F3" style={{ marginVertical: 20 }} />
        ) : (
          <ActivityHeatmap historyData={historyData} />
        )}

        <View style={styles.cardContainer}>
          <Text style={styles.cardTitle}>{t("profile.details")}</Text>
          <View style={styles.infoList}>
            <InfoRow icon="person" label={t("profile.gender")} value={profileData.gender} />
            <InfoRow
              icon="cake"
              label={t("profile.age")}
              value={profileData.age ? profileData.age : profileData.ageRange}
            />
            <InfoRow icon="school" label={t("profile.proficiency")} value={profileData.proficiency} />
            <InfoRow icon="speed" label={t("profile.pace")} value={profileData.learningPace} />
            <InfoRow icon="flag" label={t("profile.country")} value={profileData.country} />
            {stats && (
              <>
                <InfoRow icon="translate" label={t("profile.translationsUsed")} value={stats.translationsUsed?.toLocaleString()} />
                <InfoRow icon="timer" label="Learning Time" value={`${Math.round((stats.exp || 0) / 60)}h`} />
              </>
            )}
          </View>
        </View>

        {languages && languages.length > 0 && (
          <View style={styles.cardContainer}>
            <Text style={styles.cardTitle}>{t("profile.languages")}</Text>
            <View style={styles.tagsWrapper}>
              {languages.map((lang, index) => (
                <View key={index} style={styles.flagItem}>
                  <Text style={styles.flagText}>{mapLangToFlag(lang)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {badges && badges.length > 0 && (
          <View style={styles.cardContainer}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>{t("profile.badges")}</Text>
              <Text style={styles.cardSubtitle}>{badges.length} unlocked</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll}>
              {badges.map((badge) => (
                <View key={badge.badgeId} style={styles.badgeCard}>
                  <Image source={{ uri: badge.imageUrl }} style={styles.badgeImg} />
                  <Text style={styles.badgeTxt} numberOfLines={1}>{badge.badgeName}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {(publicCourses.length > 0 || (profileData.isTeacher && teacherCourses?.length > 0)) && (
          <View style={styles.cardContainer}>
            <Text style={styles.cardTitle}>{t("profile.publicCourses")}</Text>
            {[...publicCourses, ...(teacherCourses || [])].slice(0, 5).map((course: any) => (
              <TouchableOpacity
                key={course.courseId}
                style={styles.courseRow}
                onPress={() => navigation.navigate("CourseStack", { screen: "CourseDetailScreen", params: { courseId: course.courseId } })}
              >
                <Image source={getCourseImage(course.latestPublicVersion?.thumbnailUrl || course.thumbnailUrl)} style={styles.courseThumb} />
                <View style={styles.courseContent}>
                  <Text style={styles.courseName} numberOfLines={2}>{course.title}</Text>
                  <View style={styles.courseMeta}>
                    <View style={styles.ratingBadge}>
                      <Icon name="star" size={12} color="#F59E0B" />
                      <Text style={styles.ratingVal}>{(course.averageRating ?? 0).toFixed(1)}</Text>
                    </View>
                    <Text style={styles.courseLvl}>{course.difficultyLevel || course.level}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.optionSheet}>
            <TouchableOpacity style={styles.sheetItem} onPress={handleReport}>
              <Icon name="report-problem" size={24} color="#F59E0B" />
              <Text style={styles.sheetText}>{t("profile.report")}</Text>
            </TouchableOpacity>
            {profileData.canBlock && (
              <TouchableOpacity style={styles.sheetItem} onPress={handleBlock}>
                <Icon name="block" size={24} color="#EF4444" />
                <Text style={[styles.sheetText, { color: "#EF4444" }]}>{t("profile.block")}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.sheetItem, { borderBottomWidth: 0 }]} onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color="#666" />
              <Text style={styles.sheetText}>{t("common.close")}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  screenBackground: { backgroundColor: '#F3F4F6' },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFF", elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 2 } },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: "#111", textAlign: "center" },
  iconButton: { padding: 8 },
  scrollContent: { paddingBottom: 40 },
  coupleCardContainer: { backgroundColor: '#FDF2F8', margin: 16, marginBottom: 0, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#FBCFE8', elevation: 3, shadowColor: "#E91E63", shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },
  coupleContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'relative', height: 100 },
  coupleConnectorLine: { position: 'absolute', top: 35, left: 40, right: 40, height: 2, backgroundColor: '#FBCFE8', zIndex: -1 },
  coupleUserCol: { alignItems: 'center', width: 80 },
  coupleAvatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: '#FFF' },
  coupleNameText: { marginTop: 6, fontSize: 13, fontWeight: '600', color: '#831843', textAlign: 'center' },
  heartWrapper: { alignItems: 'center', justifyContent: 'center', marginTop: -10 },
  heartCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: "#E91E63", shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  daysBadge: { marginTop: -8, backgroundColor: '#E91E63', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 2, borderColor: '#FFF' },
  daysText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  exploringBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF7ED', marginTop: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#FED7AA', gap: 6 },
  exploringText: { color: '#B45309', fontSize: 12, fontWeight: '600' },
  profileMainCard: { backgroundColor: '#FFF', margin: 16, borderRadius: 20, padding: 20, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, alignItems: 'center' },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  mainAvatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#F3F4F6' },
  flagContainer: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FFF', borderRadius: 15, padding: 4, elevation: 2 },
  badge3D: { position: 'absolute', top: 0, left: 0, backgroundColor: '#3B82F6', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badge3DText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  profileInfo: { alignItems: 'center', width: '100%' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#111' },
  profileHandle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  friendPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EC4899', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 8, gap: 4 },
  friendPillText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  profileBio: { marginTop: 12, fontSize: 14, color: '#4B5563', textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 24, paddingHorizontal: 10 },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  statLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2, textTransform: 'uppercase' },
  verticalDivider: { width: 1, height: '80%', backgroundColor: '#E5E7EB' },
  buttonRow: { flexDirection: 'row', marginTop: 24, gap: 12, width: '100%', justifyContent: 'center', flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 24, gap: 8, justifyContent: 'center', minWidth: 100 },
  chatBtn: { backgroundColor: '#8B5CF6' },
  addBtn: { backgroundColor: '#3B82F6' },
  acceptBtn: { backgroundColor: '#10B981' },
  cancelBtn: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB' },
  dateBtn: { backgroundColor: '#E11D48' },
  disabledBtn: { backgroundColor: '#9CA3AF' },
  btnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  iconActionBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  unfriendBtn: { backgroundColor: '#FEE2E2' },
  admired: { backgroundColor: '#BE185D' },
  notAdmired: { backgroundColor: '#FCE7F3', borderWidth: 1, borderColor: '#FBCFE8' },
  cardContainer: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 16, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 12 },
  cardSubtitle: { fontSize: 12, color: '#6B7280' },
  infoList: { gap: 12 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabelContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconCircleSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 14, color: "#4B5563" },
  infoValue: { fontSize: 14, fontWeight: "500", color: "#111" },
  heatmapGraph: { flexDirection: 'row', gap: 4 },
  heatmapColumn: { gap: 4 },
  heatmapCell: { width: 12, height: 12, borderRadius: 3 },
  heatmapCellSmall: { width: 10, height: 10, borderRadius: 2 },
  heatmapLegend: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 12 },
  legendText: { fontSize: 10, color: '#666' },
  tagsWrapper: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flagItem: { backgroundColor: "#F9FAFB", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  flagText: { fontSize: 24 },
  badgeScroll: { flexDirection: 'row' },
  badgeCard: { width: 70, alignItems: 'center', marginRight: 12 },
  badgeImg: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F3F4F6', marginBottom: 4 },
  badgeTxt: { fontSize: 10, color: '#4B5563', textAlign: 'center' },
  courseRow: { flexDirection: "row", marginBottom: 12, gap: 12, alignItems: 'center' },
  courseThumb: { width: 70, height: 50, borderRadius: 8, backgroundColor: '#E5E7EB' },
  courseContent: { flex: 1 },
  courseName: { fontSize: 14, fontWeight: "600", color: "#111", marginBottom: 4 },
  courseMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ratingBadge: { flexDirection: "row", alignItems: "center", backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 2 },
  ratingVal: { fontSize: 10, fontWeight: '700', color: '#B45309' },
  courseLvl: { fontSize: 12, color: "#6B7280" },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  optionSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 16 },
  sheetText: { fontSize: 16, fontWeight: '500', color: '#374151' },
});

export default UserProfileViewScreen;