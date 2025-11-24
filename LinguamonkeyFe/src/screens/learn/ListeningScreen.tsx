import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useLessons } from "../../hooks/useLessons";
import { useLessonStructure } from "../../hooks/useLessonStructure";
import { LessonCategoryResponse, LessonResponse } from "../../types/dto";
import { SkillType } from "../../types/enums";
import { createScaledSheet } from "../../utils/scaledStyles";
import ScreenLayout from '../../components/layout/ScreenLayout';

const UI_COLORS = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#EC4899"];
const UI_ICONS = ["chat", "newspaper", "business", "flight", "school", "movie"];

const getCategoryStyle = (index: number) => ({
  color: UI_COLORS[index % UI_COLORS.length],
  icon: UI_ICONS[index % UI_ICONS.length],
});

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const PlayerModal = ({
  visible,
  content,
  onClose,
}: {
  visible: boolean;
  content: LessonResponse | null;
  onClose: () => void;
}) => {
  const videoSource = content?.videoUrls?.[0] ?? "";
  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = false;
    if (visible) player.play();
    else player.pause();
  });

  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showSpeedModal, setShowSpeedModal] = useState(false);

  if (!visible || !content) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.playerContainer}>
        <View style={styles.playerHeader}>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.playerTitle} numberOfLines={1}>{content.title}</Text>
          <TouchableOpacity onPress={() => setShowSpeedModal(true)}>
            <Text style={styles.speedButton}>{playbackRate}x</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mediaContainer}>
          {videoSource ? (
            <VideoView
              style={styles.videoPlayer}
              player={player}
              allowsFullscreen
              allowsPictureInPicture
            />
          ) : (
            <View style={styles.audioPlayer}>
              <Icon name="music-off" size={64} color="#9CA3AF" />
              <Text style={styles.audioTitle}>No Media Available</Text>
            </View>
          )}
        </View>

        <View style={styles.playerControls}>
          <View style={styles.contentMeta}>
            <Text style={styles.contentLevel}>{content.lessonType}</Text>
            <Text style={styles.contentDuration}>{formatTime(0)}</Text>
          </View>
        </View>

        <Modal visible={showSpeedModal} transparent animationType="fade" onRequestClose={() => setShowSpeedModal(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSpeedModal(false)}>
            <View style={styles.speedModal}>
              <Text style={styles.speedModalTitle}>Tốc độ phát</Text>
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                <TouchableOpacity
                  key={speed}
                  style={[styles.speedOption, playbackRate === speed && styles.speedOptionActive]}
                  onPress={() => {
                    setPlaybackRate(speed);
                    player.playbackRate = speed;
                    setShowSpeedModal(false);
                  }}
                >
                  <Text style={[styles.speedOptionText, playbackRate === speed && styles.speedOptionTextActive]}>
                    {speed}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </Modal>
  );
};

const ListeningScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<LessonCategoryResponse | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<LessonResponse | null>(null);

  const { useCategories } = useLessonStructure();
  const { useAllLessons } = useLessons();

  const categoriesQuery = useCategories({ size: 100 });
  const categories = (categoriesQuery.data?.data ?? []) as LessonCategoryResponse[];

  const lessonsQuery = useAllLessons({
    categoryId: selectedCategory?.lessonCategoryId,
    skillType: SkillType.LISTENING,
    size: 50,
  });

  const lessons = (lessonsQuery.data?.data ?? []) as LessonResponse[];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const renderTopicCard = (category: LessonCategoryResponse, index: number) => {
    const style = getCategoryStyle(index);
    return (
      <TouchableOpacity
        key={category.lessonCategoryId}
        style={styles.topicCard}
        onPress={() => setSelectedCategory(category)}
      >
        <View style={[styles.topicIcon, { backgroundColor: `${style.color}20` }]}>
          <Icon name={style.icon} size={24} color={style.color} />
        </View>
        <View style={styles.topicInfo}>
          <Text style={styles.topicTitle}>{category.lessonCategoryName}</Text>
          <Text style={styles.topicDescription} numberOfLines={1}>
            {category.description || t("common.noDescription")}
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  const renderContentItem = (lesson: LessonResponse) => {
    const hasVideo = lesson.videoUrls && lesson.videoUrls.length > 0;
    return (
      <TouchableOpacity
        key={lesson.lessonId}
        style={styles.contentItem}
        onPress={() => setSelectedLesson(lesson)}
      >
        <View style={styles.contentThumbnail}>
          <Icon
            name={hasVideo ? "play-circle" : "headphones"}
            size={32}
            color={hasVideo ? "#4F46E5" : "#10B981"}
          />
        </View>
        <View style={styles.contentInfo}>
          <Text style={styles.contentTitle}>{lesson.title}</Text>
          <View style={styles.contentMeta}>
            <Text style={styles.contentDuration}>{formatTime(0)}</Text>
            <Text style={styles.contentLevel}>{lesson.lessonType}</Text>
            <Text style={styles.contentType}>{hasVideo ? "Video" : "Audio"}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (selectedCategory) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedCategory(null)}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedCategory.lessonCategoryName}</Text>
          <View style={styles.placeholder} />
        </View>

        {lessonsQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : (
          <ScrollView style={styles.content}>
            <View style={styles.topicHeader}>
              <View style={[styles.topicIconLarge, { backgroundColor: "#EEF2FF" }]}>
                <Icon name="library-music" size={32} color="#4F46E5" />
              </View>
              <Text style={styles.topicTitleLarge}>{selectedCategory.lessonCategoryName}</Text>
              <Text style={styles.topicDescriptionLarge}>{selectedCategory.description}</Text>
            </View>

            <View style={styles.contentList}>
              {lessons.length > 0 ? (
                lessons.map(renderContentItem)
              ) : (
                <Text style={styles.emptyText}>{t("common.noData")}</Text>
              )}
            </View>
          </ScrollView>
        )}

        <PlayerModal
          visible={!!selectedLesson}
          content={selectedLesson}
          onClose={() => setSelectedLesson(null)}
        />
      </View>
    );
  }

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("listening.title")}</Text>
        <TouchableOpacity>
          <Icon name="search" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {categoriesQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[
              styles.scrollContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.welcomeSection}>
              <Icon name="headset" size={64} color="#4F46E5" />
              <Text style={styles.welcomeTitle}>{t("listening.welcomeTitle")}</Text>
              <Text style={styles.welcomeText}>{t("listening.welcomeSubtitle")}</Text>
            </View>

            <View style={styles.topicsSection}>
              <Text style={styles.sectionTitle}>{t("listening.chooseTopic")}</Text>
              {categories.map((cat, index) => renderTopicCard(cat, index))}
            </View>
          </Animated.View>
        </ScrollView>
      )}
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 20,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  welcomeText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  topicsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  topicCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topicIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  topicInfo: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  topicDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  topicHeader: {
    alignItems: "center",
    padding: 20,
    marginBottom: 10,
  },
  topicIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  topicTitleLarge: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  topicDescriptionLarge: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  contentList: {
    gap: 12,
    padding: 20,
  },
  contentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  contentThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  contentMeta: {
    flexDirection: "row",
    gap: 12,
  },
  contentDuration: {
    fontSize: 12,
    color: "#6B7280",
  },
  contentLevel: {
    fontSize: 12,
    color: "#6B7280",
  },
  contentType: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "500",
  },
  playerContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  playerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
  },
  playerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
  },
  speedButton: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "600",
  },
  mediaContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
  },
  videoPlayer: {
    width: "100%",
    height: 300,
  },
  audioPlayer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1F2937",
  },
  audioTitle: {
    fontSize: 18,
    color: "#9CA3AF",
    marginTop: 16,
  },
  playerControls: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  speedModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    minWidth: 150,
  },
  speedModalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
    textAlign: "center",
  },
  speedOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  speedOptionActive: {
    backgroundColor: "#4F46E5",
  },
  speedOptionText: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
  },
  speedOptionTextActive: {
    color: "#FFFFFF",
  },
});

export default ListeningScreen;