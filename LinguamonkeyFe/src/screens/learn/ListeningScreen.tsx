import Icon from 'react-native-vector-icons/MaterialIcons'; 
import { useEffect, useRef, useState } from "react";
import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { VideoPlayer } from 'expo-video';

interface Topic {
  id: string
  title: string
  description: string
  level: "beginner" | "intermediate" | "advanced"
  icon: string
  color: string
  contentCount: number
}

interface Content {
  id: string
  title: string
  type: "video" | "audio"
  duration: number
  level: string
  transcript: string
  url: string
  thumbnail?: string
}

const ListeningScreen = ({ navigation }) => {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [selectedContent, setSelectedContent] = useState<Content | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [showTranscript, setShowTranscript] = useState(false)
  const [showSpeedModal, setShowSpeedModal] = useState(false)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

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
    ]).start()
  }, [])

  const topics: Topic[] = [
    {
      id: "1",
      title: "Hội thoại hàng ngày",
      description: "Các cuộc trò chuyện thường ngày",
      level: "beginner",
      icon: "chat",
      color: "#10B981",
      contentCount: 24,
    },
    {
      id: "2",
      title: "Tin tức & Thời sự",
      description: "Nghe hiểu tin tức và báo chí",
      level: "intermediate",
      icon: "newspaper",
      color: "#3B82F6",
      contentCount: 18,
    },
    {
      id: "3",
      title: "Kinh doanh",
      description: "Tiếng Anh thương mại",
      level: "advanced",
      icon: "business",
      color: "#8B5CF6",
      contentCount: 15,
    },
    {
      id: "4",
      title: "Du lịch",
      description: "Giao tiếp khi đi du lịch",
      level: "beginner",
      icon: "flight",
      color: "#F59E0B",
      contentCount: 20,
    },
    {
      id: "5",
      title: "Học thuật",
      description: "Bài giảng và thuyết trình",
      level: "advanced",
      icon: "school",
      color: "#EF4444",
      contentCount: 12,
    },
    {
      id: "6",
      title: "Giải trí",
      description: "Phim, nhạc và văn hóa",
      level: "intermediate",
      icon: "movie",
      color: "#EC4899",
      contentCount: 22,
    },
  ]

  const mockContent: Content[] = [
    {
      id: "1",
      title: "Ordering Food at a Restaurant",
      type: "video",
      duration: 180,
      level: "Beginner",
      transcript:
        "Waiter: Good evening! Welcome to our restaurant. How many people are in your party?\nCustomer: Good evening. Table for two, please.\nWaiter: Right this way. Here are your menus. Can I start you off with something to drink?\nCustomer: I'll have a glass of water, please.\nWaiter: And for you, sir?\nCustomer 2: I'd like a coffee, please.",
      url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
      thumbnail: "https://via.placeholder.com/300x200",
    },
    {
      id: "2",
      title: "Weather Conversation",
      type: "audio",
      duration: 120,
      level: "Beginner",
      transcript:
        "Person A: What's the weather like today?\nPerson B: It's quite sunny and warm. Perfect for a walk in the park.\nPerson A: That sounds great! Should we go out?\nPerson B: Yes, let's go. Don't forget to bring your sunglasses.",
      url: "https://sample-audio.com/sample.mp3",
    },
  ]

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "beginner":
        return "#10B981"
      case "intermediate":
        return "#F59E0B"
      case "advanced":
        return "#EF4444"
      default:
        return "#6B7280"
    }
  }

  const renderTopicCard = (topic: Topic) => (
    <TouchableOpacity key={topic.id} style={styles.topicCard} onPress={() => setSelectedTopic(topic)}>
      <View style={[styles.topicIcon, { backgroundColor: `${topic.color}20` }]}>
        <Icon name={topic.icon} size={24} color={topic.color} />
      </View>
      <View style={styles.topicInfo}>
        <Text style={styles.topicTitle}>{topic.title}</Text>
        <Text style={styles.topicDescription}>{topic.description}</Text>
        <View style={styles.topicMeta}>
          <View style={[styles.levelBadge, { backgroundColor: `${getLevelColor(topic.level)}20` }]}>
            <Text style={[styles.levelText, { color: getLevelColor(topic.level) }]}>
              {topic.level === "beginner" ? "Sơ cấp" : topic.level === "intermediate" ? "Trung cấp" : "Nâng cao"}
            </Text>
          </View>
          <Text style={styles.contentCount}>{topic.contentCount} bài</Text>
        </View>
      </View>
      <Icon name="chevron-right" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  )

  const renderContentItem = (content: Content) => (
    <TouchableOpacity key={content.id} style={styles.contentItem} onPress={() => setSelectedContent(content)}>
      <View style={styles.contentThumbnail}>
        {content.type === "video" ? (
          <Icon name="play-circle" size={32} color="#4F46E5" />
        ) : (
          <Icon name="headphones" size={32} color="#10B981" />
        )}
      </View>
      <View style={styles.contentInfo}>
        <Text style={styles.contentTitle}>{content.title}</Text>
        <View style={styles.contentMeta}>
          <Text style={styles.contentDuration}>{formatTime(content.duration)}</Text>
          <Text style={styles.contentLevel}>{content.level}</Text>
          <Text style={styles.contentType}>{content.type === "video" ? "Video" : "Audio"}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  const renderPlayer = () => {
    if (!selectedContent) return null

    return (
      <Modal visible={!!selectedContent} animationType="slide">
        <View style={styles.playerContainer}>
          <View style={styles.playerHeader}>
            <TouchableOpacity onPress={() => setSelectedContent(null)}>
              <Icon name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.playerTitle}>{selectedContent.title}</Text>
            <TouchableOpacity onPress={() => setShowSpeedModal(true)}>
              <Text style={styles.speedButton}>{playbackRate}x</Text>
            </TouchableOpacity>
          </View>
{/* 
          <View style={styles.mediaContainer}>
            {selectedContent.type === "video" ? (
              <Video
                source={{ uri: selectedContent.url }}
                style={styles.videoPlayer}
                controls={false}
                resizeMode="contain"
                paused={!isPlaying}
                rate={playbackRate}
                onLoad={(data) => setDuration(data.duration)}
                onProgress={(data) => setCurrentTime(data.currentTime)}
              />
            ) : (
              <View style={styles.audioPlayer}>
                <Icon name="music-note" size={64} color="#4F46E5" />
                <Text style={styles.audioTitle}>{selectedContent.title}</Text>
              </View>
            )}
          </View> */}

          <View style={styles.playerControls}>
            <View style={styles.progressContainer}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

            <View style={styles.controlButtons}>
              <TouchableOpacity style={styles.controlButton}>
                <Icon name="replay-10" size={24} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.playButton} onPress={() => setIsPlaying(!isPlaying)}>
                <Icon name={isPlaying ? "pause" : "play-arrow"} size={32} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlButton}>
                <Icon name="forward-10" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.playerActions}>
            <TouchableOpacity
              style={[styles.actionButton, showTranscript && styles.actionButtonActive]}
              onPress={() => setShowTranscript(!showTranscript)}
            >
              <Icon name="subtitles" size={20} color={showTranscript ? "#FFFFFF" : "#6B7280"} />
              <Text style={[styles.actionButtonText, showTranscript && styles.actionButtonTextActive]}>Phụ đề</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Icon name="bookmark-border" size={20} color="#6B7280" />
              <Text style={styles.actionButtonText}>Lưu</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Icon name="share" size={20} color="#6B7280" />
              <Text style={styles.actionButtonText}>Chia sẻ</Text>
            </TouchableOpacity>
          </View>

          {showTranscript && (
            <ScrollView style={styles.transcriptContainer}>
              <Text style={styles.transcriptTitle}>Phụ đề</Text>
              <Text style={styles.transcriptText}>{selectedContent.transcript}</Text>
            </ScrollView>
          )}
        </View>

        {/* Speed Modal */}
        <Modal visible={showSpeedModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.speedModal}>
              <Text style={styles.speedModalTitle}>Tốc độ phát</Text>
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                <TouchableOpacity
                  key={speed}
                  style={[styles.speedOption, playbackRate === speed && styles.speedOptionActive]}
                  onPress={() => {
                    setPlaybackRate(speed)
                    setShowSpeedModal(false)
                  }}
                >
                  <Text style={[styles.speedOptionText, playbackRate === speed && styles.speedOptionTextActive]}>
                    {speed}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </Modal>
    )
  }

  if (selectedTopic) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedTopic(null)}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedTopic.title}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.topicHeader}>
            <View style={[styles.topicIconLarge, { backgroundColor: `${selectedTopic.color}20` }]}>
              <Icon name={selectedTopic.icon} size={32} color={selectedTopic.color} />
            </View>
            <Text style={styles.topicTitleLarge}>{selectedTopic.title}</Text>
            <Text style={styles.topicDescriptionLarge}>{selectedTopic.description}</Text>
          </View>

          <View style={styles.contentList}>{mockContent.map(renderContentItem)}</View>
        </ScrollView>

        {renderPlayer()}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Luyện nghe</Text>
        <TouchableOpacity>
          <Icon name="search" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

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
            <Text style={styles.welcomeTitle}>Luyện kỹ năng nghe</Text>
            <Text style={styles.welcomeText}>Chọn chủ đề và luyện nghe với video hoặc audio chất lượng cao</Text>
          </View>

          <View style={styles.topicsSection}>
            <Text style={styles.sectionTitle}>Chọn chủ đề</Text>
            {topics.map(renderTopicCard)}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
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
  welcomeSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  welcomeAnimation: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
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
    marginBottom: 8,
  },
  topicMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 10,
    fontWeight: "600",
  },
  contentCount: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  topicHeader: {
    alignItems: "center",
    padding: 20,
    marginBottom: 20,
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
  },
  topicDescriptionLarge: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  contentList: {
    gap: 12,
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
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  playerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
  },
  speedButton: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "600",
  },
  mediaContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  videoPlayer: {
    flex: 1,
  },
  audioPlayer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1F2937",
  },
  audioAnimation: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  audioTitle: {
    fontSize: 18,
    color: "#FFFFFF",
    textAlign: "center",
  },
  playerControls: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  timeText: {
    fontSize: 12,
    color: "#6B7280",
    minWidth: 40,
  },
  progressSlider: {
    flex: 1,
    marginHorizontal: 12,
  },
  sliderThumb: {
    backgroundColor: "#4F46E5",
  },
  controlButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 30,
  },
  controlButton: {
    padding: 8,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
  },
  playerActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  actionButton: {
    alignItems: "center",
    gap: 4,
  },
  actionButtonActive: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#6B7280",
  },
  actionButtonTextActive: {
    color: "#FFFFFF",
  },
  transcriptContainer: {
    backgroundColor: "#FFFFFF",
    maxHeight: 200,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  transcriptTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  transcriptText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
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
})

export default ListeningScreen
