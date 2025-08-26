"use client"

import Slider from "@react-native-community/slider"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Alert, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Icon from 'react-native-vector-icons/MaterialIcons';
import Video from "react-native-video"
import { useAppStore } from "../../stores/appStore"
import type { BilingualVideo, Subtitle } from "../../types/api"

const { width, height } = Dimensions.get("window")

const BilingualVideoScreen = ({ navigation }: any) => {
  const { t } = useTranslation()
  const { language } = useAppStore()

  const [selectedVideo, setSelectedVideo] = useState<BilingualVideo | null>(null)
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showSubtitles, setShowSubtitles] = useState(true)
  const [subtitleLanguage, setSubtitleLanguage] = useState<"original" | "translated" | "both">("both")
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [showVocabulary, setShowVocabulary] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedLevel, setSelectedLevel] = useState<string>("")
  const [page, setPage] = useState(1)

  const videoRef = useRef<Video>(null)

  // API hooks
  const { useVideos, useVideo, useVideoCategories, useTrackVideoProgress, useLikeVideo, useFavoriteVideo } = useVideos()

  const {
    data: videosData,
    isLoading: videosLoading,
    error: videosError,
  } = useVideos(page, 10, selectedCategory, selectedLevel)

  const { data: videoCategories } = useVideoCategories()
  const { data: currentVideoData } = useVideo(selectedVideo?.id || null)
  const { trackProgress, isTracking } = useTrackVideoProgress()
  const { toggleLike, isToggling: isLiking } = useLikeVideo()
  const { toggleFavorite, isToggling: isFavoriting } = useFavoriteVideo()

  const videos = videosData?.data || []
  const categories = ["All", ...(videoCategories || [])]

  const filteredVideos = videos

  useEffect(() => {
    if (currentVideoData) {
      setSelectedVideo(currentVideoData)
    }
  }, [currentVideoData])

  // Track video progress every 5 seconds
  useEffect(() => {
    if (selectedVideo && isPlaying && currentTime > 0) {
      const interval = setInterval(() => {
        trackProgress(selectedVideo.id, currentTime, duration).catch(console.error)
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [selectedVideo, isPlaying, currentTime, duration, trackProgress])

  const getLevelColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "#4CAF50"
      case "intermediate":
        return "#FF9800"
      case "advanced":
        return "#F44336"
      default:
        return "#757575"
    }
  }

  const getCurrentSubtitle = (): Subtitle | null => {
    if (!selectedVideo) return null
    return (
      selectedVideo.subtitles.find(
        (subtitle) => currentTime >= subtitle.startTime && currentTime <= subtitle.endTime,
      ) || null
    )
  }

  const handleVideoPress = (video: BilingualVideo) => {
    setSelectedVideo(video)
    setShowVideoPlayer(true)
    setCurrentTime(video.progress || 0)
    setIsPlaying(false)
  }

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (time: number) => {
    setCurrentTime(time)
    if (videoRef.current) {
      videoRef.current.seek(time)
    }
  }

  const handleLike = async () => {
    if (!selectedVideo || isLiking) return

    try {
      await toggleLike(selectedVideo.id)
    } catch (error) {
      Alert.alert(t("common.error"), t("errors.unknown"))
    }
  }

  const handleFavorite = async () => {
    if (!selectedVideo || isFavoriting) return

    try {
      await toggleFavorite(selectedVideo.id)
    } catch (error) {
      Alert.alert(t("common.error"), t("errors.unknown"))
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const renderVideoCard = (video: BilingualVideo) => (
    <TouchableOpacity key={video.id} style={styles.videoCard} onPress={() => handleVideoPress(video)}>
      <View style={styles.thumbnail}>
        <Text style={styles.thumbnailText}>{video.title}</Text>
        <View style={styles.playOverlay}>
          <Icon name="play-circle-filled" size={48} color="rgba(255,255,255,0.9)" />
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{video.duration}</Text>
        </View>
        {video.progress && video.progress > 0 && (
          <View style={styles.progressIndicator}>
            <View style={[styles.progressBar, { width: `${video.progress}%` }]} />
          </View>
        )}
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle}>{video.title}</Text>
        <Text style={styles.videoDescription} numberOfLines={2}>
          {video.description}
        </Text>
        <View style={styles.videoMeta}>
          <View style={[styles.levelBadge, { backgroundColor: getLevelColor(video.level) }]}>
            <Text style={styles.levelText}>{t(`videos.levels.${video.level}`)}</Text>
          </View>
          <Text style={styles.categoryText}>{video.category}</Text>
          <View style={styles.videoStats}>
            <Icon name="favorite" size={16} color={video.isLiked ? "#F44336" : "#ccc"} />
            <Text style={styles.statsText}>{video.likesCount}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )

  const renderSubtitle = () => {
    const currentSubtitle = getCurrentSubtitle()
    if (!currentSubtitle || !showSubtitles) return null

    return (
      <View style={styles.subtitleContainer}>
        {(subtitleLanguage === "original" || subtitleLanguage === "both") && (
          <Text style={styles.originalSubtitle}>{currentSubtitle.originalText}</Text>
        )}
        {(subtitleLanguage === "translated" || subtitleLanguage === "both") && (
          <Text style={styles.translatedSubtitle}>{currentSubtitle.translatedText}</Text>
        )}
      </View>
    )
  }

  if (videosError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="error" size={64} color="#F44336" />
          <Text style={styles.errorText}>{t("errors.networkError")}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => window.location.reload()}>
            <Text style={styles.retryText}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("videos.title")}</Text>
        <TouchableOpacity onPress={() => setShowVocabulary(true)}>
          <Icon name="book" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[styles.categoryButton, selectedCategory === category && styles.selectedCategoryButton]}
            onPress={() => {
              setSelectedCategory(category)
              setPage(1)
            }}
          >
            <Text
              style={[styles.categoryButtonText, selectedCategory === category && styles.selectedCategoryButtonText]}
            >
              {t(`videos.categories.${category.toLowerCase()}`) || category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>
          {selectedCategory === "All" ? t("videos.categories.all") : selectedCategory}
        </Text>

        {videosLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t("common.loading")}</Text>
          </View>
        ) : (
          filteredVideos.map(renderVideoCard)
        )}
      </ScrollView>

      {/* Video Player Modal */}
      <Modal visible={showVideoPlayer} animationType="slide" onRequestClose={() => setShowVideoPlayer(false)}>
        <SafeAreaView style={styles.playerContainer}>
          <View style={styles.playerHeader}>
            <TouchableOpacity onPress={() => setShowVideoPlayer(false)}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.playerTitle}>{selectedVideo?.title}</Text>
            <View style={styles.playerActions}>
              <TouchableOpacity onPress={handleLike} disabled={isLiking}>
                <Icon name="favorite" size={24} color={selectedVideo?.isLiked ? "#F44336" : "#fff"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleFavorite} disabled={isFavoriting}>
                <Icon name="bookmark" size={24} color={selectedVideo?.isFavorited ? "#FFD700" : "#fff"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowVocabulary(true)}>
                <Icon name="book" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.videoPlayerContainer}>
            {selectedVideo && (
              <Video
                ref={videoRef}
                source={{ uri: selectedVideo.videoUrl }}
                style={styles.videoPlayer}
                paused={!isPlaying}
                rate={playbackSpeed}
                onProgress={({ currentTime }) => setCurrentTime(currentTime)}
                onLoad={({ duration }) => setDuration(duration)}
                resizeMode="contain"
              />
            )}
            {renderSubtitle()}
          </View>

          <View style={styles.controlsContainer}>
            <View style={styles.progressContainer}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <Slider
                style={styles.progressSlider}
                minimumValue={0}
                maximumValue={duration}
                value={currentTime}
                onValueChange={handleSeek}
                minimumTrackTintColor="#2196F3"
                maximumTrackTintColor="#ccc"
                thumbStyle={styles.sliderThumb}
              />
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

            <View style={styles.playbackControls}>
              <TouchableOpacity onPress={() => handleSeek(Math.max(0, currentTime - 10))}>
                <Icon name="replay-10" size={32} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
                <Icon name={isPlaying ? "pause" : "play-arrow"} size={48} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleSeek(Math.min(duration, currentTime + 10))}>
                <Icon name="forward-10" size={32} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsRow}>
              <TouchableOpacity style={styles.settingButton} onPress={() => setShowSubtitles(!showSubtitles)}>
                <Icon name="subtitles" size={20} color={showSubtitles ? "#2196F3" : "#ccc"} />
                <Text style={[styles.settingText, { color: showSubtitles ? "#2196F3" : "#ccc" }]}>
                  {t("videos.controls.subtitles")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingButton}
                onPress={() => {
                  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
                  const currentIndex = speeds.indexOf(playbackSpeed)
                  const nextIndex = (currentIndex + 1) % speeds.length
                  setPlaybackSpeed(speeds[nextIndex])
                }}
              >
                <Icon name="speed" size={20} color="#fff" />
                <Text style={styles.settingText}>{playbackSpeed}x</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingButton}
                onPress={() => {
                  const languages = ["original", "translated", "both"] as const
                  const currentIndex = languages.indexOf(subtitleLanguage)
                  const nextIndex = (currentIndex + 1) % languages.length
                  setSubtitleLanguage(languages[nextIndex])
                }}
              >
                <Icon name="translate" size={20} color="#fff" />
                <Text style={styles.settingText}>{t(`videos.subtitleModes.${subtitleLanguage}`)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Vocabulary Modal */}
      <Modal visible={showVocabulary} animationType="slide" onRequestClose={() => setShowVocabulary(false)}>
        <SafeAreaView style={styles.vocabularyModal}>
          <View style={styles.vocabularyHeader}>
            <TouchableOpacity onPress={() => setShowVocabulary(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.vocabularyTitle}>{t("videos.vocabulary")}</Text>
            <View style={styles.headerRight} />
          </View>
          <ScrollView style={styles.vocabularyContent}>
            {selectedVideo?.vocabulary.map((item, index) => (
              <TouchableOpacity key={index} style={styles.vocabularyItem}>
                <View style={styles.vocabularyInfo}>
                  <Text style={styles.vocabularyWord}>{item.word}</Text>
                  <Text style={styles.vocabularyPronunciation}>{item.pronunciation}</Text>
                  <Text style={styles.vocabularyMeaning}>{item.meaning}</Text>
                </View>
                <TouchableOpacity
                  style={styles.jumpButton}
                  onPress={() => {
                    handleSeek(item.timestamp)
                    setShowVocabulary(false)
                  }}
                >
                  <Icon name="play-arrow" size={20} color="#2196F3" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  headerRight: {
    width: 24,
  },
  categoryScroll: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  selectedCategoryButton: {
    backgroundColor: "#2196F3",
  },
  categoryButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  selectedCategoryButtonText: {
    color: "#fff",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginVertical: 20,
  },
  retryButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "bold",
  },
  videoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  thumbnail: {
    height: 180,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  thumbnailText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  playOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -24 }, { translateY: -24 }],
  },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  progressIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#2196F3",
  },
  videoInfo: {
    padding: 15,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  videoDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 10,
  },
  videoMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  levelText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  categoryText: {
    fontSize: 12,
    color: "#999",
    flex: 1,
    marginLeft: 10,
  },
  videoStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statsText: {
    fontSize: 12,
    color: "#666",
  },
  playerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  playerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  playerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 20,
  },
  playerActions: {
    flexDirection: "row",
    gap: 15,
  },
  videoPlayerContainer: {
    flex: 1,
    justifyContent: "center",
  },
  videoPlayer: {
    width: "100%",
    height: 250,
  },
  subtitleContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 15,
    borderRadius: 8,
  },
  originalSubtitle: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 5,
  },
  translatedSubtitle: {
    color: "#FFD700",
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
  },
  controlsContainer: {
    backgroundColor: "rgba(0,0,0,0.9)",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  timeText: {
    color: "#fff",
    fontSize: 12,
    minWidth: 40,
    textAlign: "center",
  },
  progressSlider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  sliderThumb: {
    backgroundColor: "#2196F3",
    width: 16,
    height: 16,
  },
  playbackControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  playButton: {
    marginHorizontal: 30,
  },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  settingButton: {
    alignItems: "center",
    padding: 10,
  },
  settingText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
  },
  vocabularyModal: {
    flex: 1,
    backgroundColor: "#fff",
  },
  vocabularyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  vocabularyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  vocabularyContent: {
    flex: 1,
    padding: 20,
  },
  vocabularyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  vocabularyInfo: {
    flex: 1,
  },
  vocabularyWord: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  vocabularyPronunciation: {
    fontSize: 14,
    color: "#2196F3",
    fontStyle: "italic",
    marginVertical: 2,
  },
  vocabularyMeaning: {
    fontSize: 14,
    color: "#666",
  },
  jumpButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#e3f2fd",
  },
})

export default BilingualVideoScreen
