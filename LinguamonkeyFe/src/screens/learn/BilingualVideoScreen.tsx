import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import Video, { VideoRef } from "react-native-video";
import Slider from "@react-native-community/slider";
import NetInfo from "@react-native-community/netinfo";
import { Picker } from "@react-native-picker/picker";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../stores/appStore";
import {
    useVideos,
    useVideo,
    useVideoCategories,
    useTrackVideoProgress,
    useLikeVideo,
    useFavoriteVideo,
} from "../../hooks/useBilinguaVideo"; 
import type { BilingualVideo, Subtitle, VocabularyItem } from "../../types/api";
import { createScaledSheet } from "../../utils/scaledStyles";

const { width } = Dimensions.get("window");

const BilingualVideoScreen: React.FC<any> = ({ navigation }) => {
    const { t } = useTranslation();
    const {
        currentLanguage,
        languages = [],
        setCurrentLanguage,
    } = useAppStore();
    const [page, setPage] = useState(1);
    const [selectedVideo, setSelectedVideo] = useState<BilingualVideo | null>(
        null
    );
    const [showVideoPlayer, setShowVideoPlayer] = useState(false);

    const videoRef = useRef<VideoRef>(null);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    const [subtitleMode, setSubtitleMode] = useState<
        "native" | "learning" | "both"
    >("both");
    const defaultLearningCode =
  languages && languages.length > 0
    ? languages[0]
    : currentLanguage;

    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
    const [quality, setQuality] = useState<"auto" | "low" | "medium" | "high">(
        "auto"
    );
    const [networkType, setNetworkType] = useState<string>("unknown");

    const [showVocabulary, setShowVocabulary] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [selectedLevel, setSelectedLevel] = useState<string>("");
    const [showSettings, setShowSettings] = useState(false);

    const {
        data: videosData,
        isLoading: videosLoading,
        error: videosError,
    } = useVideos(page, 10, selectedCategory, selectedLevel);

    const { data: videoCategories } = useVideoCategories();
    const { data: currentVideoData } = useVideo(selectedVideo?.videoId || null);
    const { trackProgress } = useTrackVideoProgress();
    const { toggleLike, isToggling: isLiking } = useLikeVideo();
    const { toggleFavorite, isToggling: isFavoriting } = useFavoriteVideo();

    const videos: BilingualVideo[] = videosData?.data || [];
    const categories = ["All", ...(videoCategories || [])];

    useEffect(() => {
        if (currentVideoData) {
            setSelectedVideo(currentVideoData);
            if (currentVideoData.progress) {
                setCurrentTime(currentVideoData.progress);
            } else {
                setCurrentTime(0);
            }
            setIsPlaying(false);
        }
    }, [currentVideoData]);

    useEffect(() => {
        if (!selectedVideo || !isPlaying) return;
        const interval = setInterval(() => {
            trackProgress?.(selectedVideo.videoId, currentTime, duration).catch?.(
                console.error
            );
        }, 5000);
        return () => clearInterval(interval);
    }, [selectedVideo, isPlaying, currentTime, duration, trackProgress]);

    useEffect(() => {
        const sub = NetInfo.addEventListener((state) => {
            const type = state.type || "unknown";
            setNetworkType(type);

            if (quality === "auto") {
                const downlink = (state.details as any)?.downlink || 0; // Mbps
                if (type === "wifi" || downlink >= 5) {
                    setQuality("high");
                } else if (downlink >= 2) {
                    setQuality("medium");
                } else if (downlink > 0) {
                    setQuality("low");
                } else {
                    setQuality("medium");
                }
            }
        });

        return () => sub();
    }, [quality]);

    // helpers
    const formatTime = (seconds: number) => {
        if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const handleVideoPress = (video: BilingualVideo) => {
        setSelectedVideo(video);
        setShowVideoPlayer(true);
        setIsPlaying(false);
        // selectedVideo will be updated by useVideo hook (fetch detail) if available
    };

    const handlePlayPause = () => {
        // toggle
        setIsPlaying((p) => !p);
    };

    const handleSeek = (time: number) => {
        setCurrentTime(time);
        if (
            videoRef.current &&
            typeof (videoRef.current as any).seek === "function"
        ) {
            try {
                (videoRef.current as any).seek(time);
            } catch (e) {
                // some Video implementations require integer
                (videoRef.current as any).seek(Math.floor(time));
            }
        }
    };

    const handleLike = async () => {
        if (!selectedVideo || isLiking) return;
        try {
            await toggleLike(selectedVideo.videoId);
        } catch (error) {
            Alert.alert(t("common.error"), t("errors.unknown"));
        }
    };

    const handleFavorite = async () => {
        if (!selectedVideo || isFavoriting) return;
        try {
            await toggleFavorite(selectedVideo.videoId);
        } catch (error) {
            Alert.alert(t("common.error"), t("errors.unknown"));
        }
    };

    // find current subtitle object for currentTime
    const getCurrentSubtitle = (): Subtitle | null => {
        if (!selectedVideo || !selectedVideo.subtitles) return null;
        return (
            selectedVideo.subtitles.find(
                (s) =>
                    typeof s.startTime === "number" &&
                    currentTime >= s.startTime &&
                    currentTime <= s.endTime
            ) || null
        );
    };

    // derive video source uri based on selected quality
    const getVideoUriForQuality = (baseUrl: string | undefined) => {
        if (!baseUrl) return undefined;
        if (quality === "auto") return baseUrl;
        // naive: assume server supports ?quality=low/medium/high; adjust to your backend
        // If your backend uses a different pattern, change here.
        const sep = baseUrl.includes("?") ? "&" : "?";
        return `${baseUrl}${sep}quality=${quality}`;
    };

    const renderSubtitle = () => {
        const cur = getCurrentSubtitle();
        if (!cur) return null;

        const nativeSub = cur.originalText;
        const learningSub = cur.translatedText;

        return (
            <View style={styles.subtitleContainer}>
                {subtitleMode === "native" && nativeSub && (
                    <Text style={styles.originalSubtitle}>{nativeSub}</Text>
                )}

                {subtitleMode === "learning" && learningSub && (
                    <Text style={styles.translatedSubtitle}>{learningSub}</Text>
                )}

                {subtitleMode === "both" && (
                    <>
                        {nativeSub && (
                            <Text style={[styles.originalSubtitle, { marginBottom: 2 }]}>
                                {nativeSub}
                            </Text>
                        )}
                        {learningSub && (
                            <Text style={styles.translatedSubtitle}>{learningSub}</Text>
                        )}
                    </>
                )}
            </View>
        );
    };

    // render card simplified
    const renderVideoCard = (video: BilingualVideo) => (
        <TouchableOpacity
            key={video.videoId}
            style={styles.videoCard}
            onPress={() => handleVideoPress(video)}
        >
            <View style={styles.thumbnail}>
                <Text style={styles.thumbnailText}>{video.title}</Text>
                <View style={styles.playOverlay}>
                    <Icon
                        name="play-circle-filled"
                        size={48}
                        color="rgba(255,255,255,0.9)"
                    />
                </View>
                <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{video.duration}</Text>
                </View>
                {typeof video.progress === "number" && video.progress > 0 && (
                    <View style={styles.progressIndicator}>
                        <View
                            style={[styles.progressBar, { width: `${video.progress}%` }]}
                        />
                    </View>
                )}
            </View>
            <View style={styles.videoInfo}>
                <Text style={styles.videoTitle}>{video.title}</Text>
                <Text style={styles.videoDescription} numberOfLines={2}>
                    {video.description}
                </Text>
                <View style={styles.videoMeta}>
                    <View
                        style={[
                            styles.levelBadge,
                            { backgroundColor: getLevelColor(video.level) },
                        ]}
                    >
                        <Text style={styles.levelText}>
                            {t(`videos.levels.${video.level}`)}
                        </Text>
                    </View>
                    <Text style={styles.categoryText}>{video.category}</Text>
                    <View style={styles.videoStats}>
                        <Icon
                            name="favorite"
                            size={16}
                            color={video.isLiked ? "#F44336" : "#ccc"}
                        />
                        <Text style={styles.statsText}>{video.likesCount ?? 0}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    function getLevelColor(level?: string) {
        switch (level) {
            case "beginner":
                return "#4CAF50";
            case "intermediate":
                return "#FF9800";
            case "advanced":
                return "#F44336";
            default:
                return "#757575";
        }
    }

    if (videosError) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Icon name="error" size={64} color="#F44336" />
                    <Text style={styles.errorText}>{t("errors.networkError")}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => {
                            /* reload or refetch logic */
                        }}
                    >
                        <Text style={styles.retryText}>{t("common.retry")}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
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

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
            >
                {categories.map((category) => (
                    <TouchableOpacity
                        key={category}
                        style={[
                            styles.categoryButton,
                            selectedCategory === category && styles.selectedCategoryButton,
                        ]}
                        onPress={() => {
                            setSelectedCategory(category);
                            setPage(1);
                        }}
                    >
                        <Text
                            style={[
                                styles.categoryButtonText,
                                selectedCategory === category &&
                                styles.selectedCategoryButtonText,
                            ]}
                        >
                            {t(`videos.categories.${category.toLowerCase()}`) || category}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView style={styles.content}>
                <Text style={styles.sectionTitle}>
                    {selectedCategory === "All"
                        ? t("videos.categories.all")
                        : selectedCategory}
                </Text>

                {videosLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator />
                        <Text style={styles.loadingText}>{t("common.loading")}</Text>
                    </View>
                ) : (
                    videos.map(renderVideoCard)
                )}
            </ScrollView>

            {/* Video Player Modal */}
            <Modal
                visible={showVideoPlayer}
                animationType="slide"
                onRequestClose={() => setShowVideoPlayer(false)}
            >
                <SafeAreaView style={styles.playerContainer}>
                    <View style={styles.playerHeader}>
                        <TouchableOpacity onPress={() => setShowVideoPlayer(false)}>
                            <Icon name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.playerTitle} numberOfLines={1}>
                            {selectedVideo?.title}
                        </Text>
                        <View style={styles.playerActions}>
                            <TouchableOpacity onPress={handleLike} disabled={isLiking}>
                                <Icon
                                    name="favorite"
                                    size={24}
                                    color={selectedVideo?.isLiked ? "#F44336" : "#fff"}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleFavorite}
                                disabled={isFavoriting}
                            >
                                <Icon
                                    name="bookmark"
                                    size={24}
                                    color={selectedVideo?.isFavorited ? "#FFD700" : "#fff"}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowSettings(true)}>
                                <Icon name="settings" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.videoPlayerContainer}>
                        {selectedVideo ? (
                            <Video
                                ref={(r: VideoRef) => { videoRef.current = r; }}
                                source={{ uri: getVideoUriForQuality(selectedVideo.videoUrl) }}
                                style={styles.videoPlayer}
                                paused={!isPlaying}
                                rate={playbackSpeed}
                                onProgress={({ currentTime: ct }) => setCurrentTime(ct)}
                                onLoad={({ duration: d }) => setDuration(d)}
                                resizeMode="contain"
                            // handle buffering/ error events if needed
                            // onBuffer, onError...
                            />
                        ) : (
                            <View style={styles.playerPlaceholder}>
                                <ActivityIndicator />
                            </View>
                        )}

                        {renderSubtitle()}
                    </View>

                    <View style={styles.controlsContainer}>
                        <View style={styles.progressContainer}>
                            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                            <Slider
                                style={styles.progressSlider}
                                minimumValue={0}
                                maximumValue={duration || 0}
                                value={currentTime}
                                onValueChange={handleSeek}
                                minimumTrackTintColor="#2196F3"
                                maximumTrackTintColor="#ccc"
                                thumbTintColor="#2196F3"
                            />
                            <Text style={styles.timeText}>{formatTime(duration)}</Text>
                        </View>

                        <View style={styles.playbackControls}>
                            <TouchableOpacity
                                onPress={() => handleSeek(Math.max(0, currentTime - 10))}
                            >
                                <Icon name="replay-10" size={32} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handlePlayPause}
                                style={styles.playButton}
                            >
                                <Icon
                                    name={isPlaying ? "pause" : "play-arrow"}
                                    size={48}
                                    color="#fff"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleSeek(Math.min(duration, currentTime + 10))}
                            >
                                <Icon name="forward-10" size={32} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.settingsRow}>
                            <TouchableOpacity
                                style={styles.settingButton}
                                onPress={() =>
                                    setSubtitleMode((m) =>
                                        m === "native"
                                            ? "learning"
                                            : m === "learning"
                                                ? "both"
                                                : "native"
                                    )
                                }
                            >
                                <Icon name="subtitles" size={20} color="#fff" />
                                <Text style={styles.settingText}>
                                    {t(`videos.subtitleModes.${subtitleMode}`)}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.settingButton}
                                onPress={() => {
                                    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
                                    const i = speeds.indexOf(playbackSpeed);
                                    setPlaybackSpeed(speeds[(i + 1) % speeds.length]);
                                }}
                            >
                                <Icon name="speed" size={20} color="#fff" />
                                <Text style={styles.settingText}>{playbackSpeed}x</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.settingButton}
                                onPress={() => setShowSettings(true)}
                            >
                                <Icon name="tune" size={20} color="#fff" />
                                <Text style={styles.settingText}>
                                    {quality === "auto" ? `Auto(${networkType})` : quality}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </Modal>

            {/* Settings Modal */}
            <Modal
                visible={showSettings}
                animationType="slide"
                onRequestClose={() => setShowSettings(false)}
            >
                <SafeAreaView style={styles.settingsContainer}>
                    <View style={styles.vocabularyHeader}>
                        <TouchableOpacity onPress={() => setShowSettings(false)}>
                            <Icon name="close" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.vocabularyTitle}>{t("videos.settings")}</Text>
                        <View style={styles.headerRight} />
                    </View>

                    <ScrollView style={styles.settingsContent}>
                        <Text style={styles.settingsLabel}>
                            {t("videos.settings.playbackSpeed")}
                        </Text>
                        <View style={styles.row}>
                            {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[
                                        styles.speedButton,
                                        playbackSpeed === s && styles.speedButtonActive,
                                    ]}
                                    onPress={() => setPlaybackSpeed(s)}
                                >
                                    <Text style={styles.speedButtonText}>{s}x</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.settingsLabel}>
                            {t("videos.settings.subtitleDefault")}
                        </Text>
                        <View style={{ marginBottom: 12 }}>
                            <Text style={styles.smallLabel}>
                                {t("videos.settings.subtitleMode")}
                            </Text>
                            <Picker
                                selectedValue={subtitleMode}
                                onValueChange={(val) => setSubtitleMode(val)}
                            >
                                <Picker.Item
                                    label={t("videos.settings.native")}
                                    value="native"
                                />
                                <Picker.Item
                                    label={t("videos.settings.learning")}
                                    value="learning"
                                />
                                <Picker.Item label={t("videos.settings.both")} value="both" />
                            </Picker>
                        </View>

                        <Text style={styles.smallLabel}>
                            {t("videos.settings.learningLanguage")}
                        </Text>
                        <Picker
                            selectedValue={currentLanguage}
                            onValueChange={(val: string) => setCurrentLanguage(val)}
                        >
                            {languages.map((lang: string) => (
                                <Picker.Item
                                    key={lang}
                                    label={lang.toUpperCase()}
                                    value={lang}
                                />
                            ))}
                        </Picker>

                        <Text style={styles.settingsLabel}>
                            {t("videos.settings.quality")}
                        </Text>
                        <View style={styles.row}>
                            {(["auto", "low", "medium", "high"] as const).map((q) => (
                                <TouchableOpacity
                                    key={q}
                                    style={[
                                        styles.qualityButton,
                                        quality === q && styles.qualityButtonActive,
                                    ]}
                                    onPress={() => setQuality(q)}
                                >
                                    <Text style={styles.qualityText}>{q}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={{ height: 20 }} />

                        <Text style={styles.noteText}>
                            {t("videos.settings.autoQualityNote", { network: networkType })}
                        </Text>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Vocabulary Modal */}
            <Modal
                visible={showVocabulary}
                animationType="slide"
                onRequestClose={() => setShowVocabulary(false)}
            >
                <SafeAreaView style={styles.vocabularyModal}>
                    <View style={styles.vocabularyHeader}>
                        <TouchableOpacity onPress={() => setShowVocabulary(false)}>
                            <Icon name="close" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.vocabularyTitle}>{t("videos.vocabulary")}</Text>
                        <View style={styles.headerRight} />
                    </View>
                    <ScrollView style={styles.vocabularyContent}>
                        {selectedVideo?.vocabulary &&
                            selectedVideo.vocabulary.length > 0 ? (
                            selectedVideo.vocabulary.map((item, index) => (
                                <TouchableOpacity key={index} style={styles.vocabularyItem}>
                                    <View style={styles.vocabularyInfo}>
                                        <Text style={styles.vocabularyWord}>{item.word}</Text>
                                        <Text style={styles.vocabularyPronunciation}>
                                            {item.pronunciation}
                                        </Text>
                                        <Text style={styles.vocabularyMeaning}>{item.meaning}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.jumpButton}
                                        onPress={() => {
                                            handleSeek(item.timestamp);
                                            setShowVocabulary(false);
                                        }}
                                    >
                                        <Icon name="play-arrow" size={20} color="#2196F3" />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <Text style={{ padding: 12 }}>{t("videos.vocabularyEmpty")}</Text>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: "#fff" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 12,
    },
    headerTitle: { fontSize: 18, fontWeight: "600" },
    categoryScroll: { maxHeight: 56, paddingHorizontal: 12 },
    categoryButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginRight: 8,
        borderRadius: 20,
        backgroundColor: "#f2f2f2",
    },
    selectedCategoryButton: { backgroundColor: "#2196F3" },
    categoryButtonText: { color: "#333" },
    selectedCategoryButtonText: { color: "#fff" },
    content: { padding: 12 },
    sectionTitle: { fontSize: 16, marginBottom: 12 },
    videoCard: {
        flexDirection: "row",
        marginBottom: 12,
        backgroundColor: "#fff",
    },
    thumbnail: {
        width: 140,
        height: 84,
        backgroundColor: "#ddd",
        borderRadius: 8,
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
    },
    thumbnailText: { color: "#fff", fontWeight: "600" },
    playOverlay: { position: "absolute" },
    durationBadge: {
        position: "absolute",
        bottom: 6,
        right: 6,
        backgroundColor: "rgba(0,0,0,0.6)",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    durationText: { color: "#fff", fontSize: 12 },
    progressIndicator: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: "#eee",
    },
    subtitleContainer: {
  position: "absolute",
  bottom: 60,
  width: "100%",
  alignItems: "center",
  paddingHorizontal: 10,
},
originalSubtitle: {
  fontSize: 16,
  color: "#fff",
  textShadowColor: "rgba(0,0,0,0.8)",
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 3,
},
translatedSubtitle: {
  fontSize: 18,
  color: "#ffd700",
  fontWeight: "600",
  textShadowColor: "rgba(0,0,0,0.8)",
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 3,
},
    progressBar: { height: 4, backgroundColor: "#2196F3" },
    videoInfo: { flex: 1, paddingLeft: 12 },
    videoTitle: { fontWeight: "600" },
    videoDescription: { color: "#666", marginTop: 4 },
    videoMeta: { flexDirection: "row", alignItems: "center", marginTop: 8 },
    levelBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    levelText: { color: "#fff", fontSize: 12 },
    categoryText: { marginLeft: 8, color: "#666" },
    videoStats: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: "auto",
    },
    statsText: { marginLeft: 4, color: "#666" },

    // player
    playerContainer: { flex: 1, backgroundColor: "#000" },
    playerHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 12,
    },
    playerTitle: {
        color: "#fff",
        flex: 1,
        marginHorizontal: 12,
        fontWeight: "600",
    },
    playerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
    videoPlayerContainer: {
        width: "100%",
        height: (width * 9) / 16,
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
    },
    videoPlayer: { width: "100%", height: "100%" },
    playerPlaceholder: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
    },
    controlsContainer: { padding: 12 },
    progressContainer: { flexDirection: "row", alignItems: "center" },
    timeText: { color: "#fff", width: 48, textAlign: "center" },
    progressSlider: { flex: 1, marginHorizontal: 8 },
    playbackControls: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 8,
    },
    playButton: { marginHorizontal: 24 },
    settingsRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 12,
    },
    settingButton: { alignItems: "center" },
    settingText: { color: "#fff", fontSize: 12, marginTop: 4 },

    // settings modal & vocabulary
    settingsContainer: { flex: 1, backgroundColor: "#fff" },
    vocabularyModal: { flex: 1, backgroundColor: "#fff" },
    vocabularyHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 12,
    },
    vocabularyTitle: { fontSize: 18, fontWeight: "600" },
    vocabularyContent: { padding: 12 },
    vocabularyItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    vocabularyWord: { fontWeight: "700" },
    vocabularyPronunciation: { color: "#666", marginTop: 4 },
    vocabularyMeaning: { color: "#666", marginTop: 4 },
    jumpButton: { padding: 8 },

    settingsContent: { padding: 12 },
    settingsLabel: { fontWeight: "700", marginTop: 12 },
    smallLabel: { color: "#666", marginTop: 8, marginBottom: 6 },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    speedButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: "#f2f2f2",
        marginRight: 8,
        marginBottom: 8,
    },
    speedButtonActive: { backgroundColor: "#2196F3" },
    speedButtonText: {},
    qualityButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: "#f2f2f2",
        marginRight: 8,
    },
    qualityButtonActive: { backgroundColor: "#2196F3" },
    qualityText: {},
    noteText: { color: "#666", marginTop: 12 },

    loadingContainer: { padding: 24, alignItems: "center" },
    loadingText: { marginTop: 8 },
    errorContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    errorText: { marginTop: 12 },
    retryButton: {
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: "#2196F3",
        borderRadius: 6,
    },
    retryText: { color: "#fff" },

    headerRight: { width: 24 },
    vocabularyInfo: {
        flex: 1,
        paddingRight: 10,
    },
    
});

export default BilingualVideoScreen;
