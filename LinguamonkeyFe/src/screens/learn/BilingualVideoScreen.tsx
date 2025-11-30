import React, { useEffect, useState, useRef } from "react";
import {
    Alert,
    Dimensions,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
    BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { WebView } from "react-native-webview";
import { Picker } from "@react-native-picker/picker";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../stores/appStore";
import {
    useVideos,
    useVideo,
    useVideoCategories,
    useVideoReviews,
    useCreateReview,
    useReactReview,
    useVideoInteractions,
    useTrackVideoProgress,
} from "../../hooks/useBilinguaVideo";
import type {
    BilingualVideoResponse,
    VideoResponse,
    VideoReviewResponse,
    CreateReviewRequest,
} from "../../types/dto";
import { useUserStore } from "../../stores/UserStore";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";

const { width } = Dimensions.get("window");

const BilingualVideoScreen: React.FC<any> = ({ navigation }) => {
    const { t } = useTranslation();
    const { nativeLanguage, languages = [], setNativeLanguage } = useAppStore();
    const { user } = useUserStore();

    // Navigation & Data State
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

    // List View State
    const [page, setPage] = useState(1);
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [selectedLevel, setSelectedLevel] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [filterLanguage, setFilterLanguage] = useState<string>("");
    const [sortBy, setSortBy] = useState<string>("popular");

    // Detail View State
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [subtitleMode, setSubtitleMode] = useState<"native" | "learning" | "both">("both");
    const [newReviewRating, setNewReviewRating] = useState<number>(5);
    const [newReviewContent, setNewReviewContent] = useState<string>("");

    // Queries
    const {
        data: videosData,
        isLoading: videosLoading,
        error: videosError,
    } = useVideos(page, 10, selectedCategory, selectedLevel, searchQuery, filterLanguage, sortBy);

    const { data: videoCategories } = useVideoCategories();

    // Detail Queries (Only active when selectedVideoId is present)
    const { data: currentVideoData, isLoading: videoDetailLoading } = useVideo(selectedVideoId);
    const { data: reviews = [], isLoading: reviewsLoading } = useVideoReviews(selectedVideoId);

    // Mutations
    const { createReview, isCreating } = useCreateReview();
    const { reactReview, isReacting } = useReactReview();
    const { toggleLike, toggleFavorite } = useVideoInteractions();
    const { trackProgress } = useTrackVideoProgress();

    const isLiking = false;
    const isDisliking = false;
    const isFavoriting = false;

    const videos: BilingualVideoResponse[] = (videosData as any)?.data || [];
    const categories = ["All", ...(videoCategories || [])];

    // Hardware Back Handler for Detail View
    useEffect(() => {
        const backAction = () => {
            if (selectedVideoId) {
                setSelectedVideoId(null);
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
        return () => backHandler.remove();
    }, [selectedVideoId]);

    useEffect(() => {
        if (!selectedVideoId || !currentVideoData) return;

        const interval = setInterval(() => {
            trackProgress?.({
                videoId: selectedVideoId,
                req: {
                    userId: user?.userId || "",
                    currentTime: currentTime,
                    duration: 0 // Duration difficult to grab from raw iframe without bridge
                }
            }).catch(() => { });
        }, 10000);
        return () => clearInterval(interval);
    }, [selectedVideoId, currentVideoData, trackProgress, user?.userId, currentTime]);

    const handleVideoPress = (video: BilingualVideoResponse) => {
        setSelectedVideoId(video.videoId);
        setCurrentTime(0);
    };

    const handleGoBack = () => {
        if (selectedVideoId) {
            setSelectedVideoId(null);
        } else {
            navigation.goBack();
        }
    };

    const handleLike = async () => {
        if (!currentVideoData || isLiking) return;
        try {
            await toggleLike({ videoId: currentVideoData.videoId, isLiked: currentVideoData.isLiked });
        } catch {
            Alert.alert(t("common.error"), t("errors.unknown"));
        }
    };

    const handleDislike = async () => {
        if (!currentVideoData || isDisliking) return;
        try {
            await toggleFavorite({ videoId: currentVideoData.videoId, isFavorited: currentVideoData.isDisliked });
        } catch {
            Alert.alert(t("common.error"), t("errors.unknown"));
        }
    };

    const handleFavorite = async () => {
        if (!currentVideoData || isFavoriting) return;
        try {
            await toggleFavorite({ videoId: currentVideoData.videoId, isFavorited: currentVideoData.isFavorited });
        } catch {
            Alert.alert(t("common.error"), t("errors.unknown"));
        }
    };

    const handleCreateReview = async () => {
        if (!selectedVideoId || isCreating || !newReviewContent) return;
        try {
            const req: CreateReviewRequest = {
                userId: user?.userId || "",
                rating: newReviewRating,
                content: newReviewContent,
            };
            await createReview({ videoId: selectedVideoId, req });
            setNewReviewContent("");
            setNewReviewRating(5);
            Alert.alert(t("common.success"), t("videos.reviewSuccess"));
        } catch {
            Alert.alert(t("common.error"), t("errors.unknown"));
        }
    };

    const handleReactReview = async (reviewId: string, reaction: number) => {
        if (isReacting) return;
        try {
            await reactReview({ reviewId, reaction });
        } catch {
            Alert.alert(t("common.error"), t("errors.unknown"));
        }
    };

    const getLevelColor = (level?: string) => {
        switch (level) {
            case "BEGINNER": return "#4CAF50";
            case "INTERMEDIATE": return "#FF9800";
            case "ADVANCED": return "#F44336";
            default: return "#757575";
        }
    };

    // --- Render Functions ---

    const renderReviewItem = (review: VideoReviewResponse) => (
        <View key={review.reviewId} style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
                <View style={styles.reviewerInfo}>
                    {/* Placeholder Avatar if needed, or just name */}
                    <Text style={styles.reviewerName}>{review.userId.substring(0, 8)}...</Text>
                    <Text style={styles.reviewRating}>{"★".repeat(review.rating)}</Text>
                </View>
                <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.reviewContent}>{review.content}</Text>
            <View style={styles.reviewActions}>
                <TouchableOpacity onPress={() => handleReactReview(review.reviewId, 1)} disabled={isReacting} style={styles.actionBtn}>
                    <Icon name="thumb-up" size={16} color="#757575" />
                    <Text style={styles.actionText}>{review.likeCount ?? 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleReactReview(review.reviewId, -1)} disabled={isReacting} style={styles.actionBtn}>
                    <Icon name="thumb-down" size={16} color="#757575" />
                    <Text style={styles.actionText}>{review.dislikeCount ?? 0}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderSubtitle = () => {
        if (!currentVideoData?.subtitles) return null;

        // NOTE: Without a YouTube IFrame Bridge, getting exact 'currentTime' from the WebView is complex.
        // For this structure, we display the subtitle container which would populate if currentTime was synced.
        // We can display a list of all subtitles or the current one if we had the time.
        // For now, we display a placeholder or the first subtitle to show the UI structure.

        const cur = currentVideoData.subtitles.find(
            (s: any) => typeof s.startTime === "number" && currentTime >= s.startTime && currentTime <= s.endTime
        ) || currentVideoData.subtitles[0]; // Fallback to first for UI demo if time is 0

        if (!cur) return (
            <View style={styles.subtitleContainer}>
                <Text style={styles.subtitlePlaceholder}>{t("videos.noSubtitles")}</Text>
            </View>
        );

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
                        {nativeSub && <Text style={[styles.originalSubtitle, { marginBottom: 4 }]}>{nativeSub}</Text>}
                        {learningSub && <Text style={styles.translatedSubtitle}>{learningSub}</Text>}
                    </>
                )}
            </View>
        );
    };

    const renderVideoCard = (video: BilingualVideoResponse) => (
        <TouchableOpacity
            key={video.videoId}
            style={styles.videoCard}
            onPress={() => handleVideoPress(video)}
        >
            <View style={styles.thumbnail}>
                {/* If backend provides thumbnail URL use it, else placeholder */}
                <Text style={styles.thumbnailText}>{video.title.substring(0, 1)}</Text>
                <View style={styles.playOverlay}>
                    <Icon name="play-circle-filled" size={48} color="rgba(255,255,255,0.9)" />
                </View>
            </View>
            <View style={styles.videoInfo}>
                <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
                <Text style={styles.videoDescription} numberOfLines={1}>
                    {video.category}
                </Text>
                <View style={styles.videoMeta}>
                    <View style={[styles.levelBadge, { backgroundColor: getLevelColor(video.level) }]}>
                        <Text style={styles.levelText}>{t(`videos.levels.${video.level}`)}</Text>
                    </View>
                    <Text style={styles.categoryText}>{video.category}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (videosError) {
        return (
            <ScreenLayout>
                <View style={styles.errorContainer}>
                    <Icon name="error" size={64} color="#F44336" />
                    <Text style={styles.errorText}>{t("errors.networkError")}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => setPage(p => p)}>
                        <Text style={styles.retryText}>{t("common.retry")}</Text>
                    </TouchableOpacity>
                </View>
            </ScreenLayout>
        );
    }

    // === DETAIL VIEW ===
    if (selectedVideoId) {
        if (videoDetailLoading || !currentVideoData) {
            return (
                <ScreenLayout>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#2196F3" />
                    </View>
                </ScreenLayout>
            );
        }

        return (
            <ScreenLayout>
                {/* Detail Header */}
                <View style={styles.detailHeader}>
                    <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                        <Icon name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.detailTitle} numberOfLines={1}>{currentVideoData.title}</Text>
                </View>

                <ScrollView style={styles.detailContent} contentContainerStyle={{ paddingBottom: 40 }}>
                    {/* 1. YouTube Iframe WebView */}
                    <View style={styles.videoFrameContainer}>
                        <WebView
                            style={styles.webview}
                            source={{ uri: currentVideoData.videoUrl }}
                            allowsInlineMediaPlayback={true}
                            mediaPlaybackRequiresUserAction={false}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                        />
                    </View>

                    {/* 2. Interaction Bar */}
                    <View style={styles.interactionBar}>
                        <TouchableOpacity onPress={handleLike} disabled={isLiking} style={styles.interactionBtn}>
                            <Icon name="thumb-up" size={24} color={currentVideoData.isLiked ? "#2196F3" : "#757575"} />
                            <Text style={styles.interactionText}>{t("videos.like")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDislike} disabled={isDisliking} style={styles.interactionBtn}>
                            <Icon name="thumb-down" size={24} color={currentVideoData.isDisliked ? "#F44336" : "#757575"} />
                            <Text style={styles.interactionText}>{t("videos.dislike")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleFavorite} disabled={isFavoriting} style={styles.interactionBtn}>
                            <Icon name="bookmark" size={24} color={currentVideoData.isFavorited ? "#FFD700" : "#757575"} />
                            <Text style={styles.interactionText}>{t("videos.save")}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 3. Subtitle Section */}
                    <View style={styles.subtitleSection}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionHeader}>{t("videos.subtitles")}</Text>
                            <View style={styles.subtitleControls}>
                                <TouchableOpacity
                                    style={[styles.modeBtn, subtitleMode === 'native' && styles.modeBtnActive]}
                                    onPress={() => setSubtitleMode('native')}
                                >
                                    <Text style={[styles.modeText, subtitleMode === 'native' && styles.modeTextActive]}>Orig</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modeBtn, subtitleMode === 'learning' && styles.modeBtnActive]}
                                    onPress={() => setSubtitleMode('learning')}
                                >
                                    <Text style={[styles.modeText, subtitleMode === 'learning' && styles.modeTextActive]}>User</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modeBtn, subtitleMode === 'both' && styles.modeBtnActive]}
                                    onPress={() => setSubtitleMode('both')}
                                >
                                    <Text style={[styles.modeText, subtitleMode === 'both' && styles.modeTextActive]}>Both</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        {renderSubtitle()}
                    </View>

                    <View style={styles.divider} />

                    {/* 4. Comments/Reviews Component */}
                    <View style={styles.commentsSection}>
                        <Text style={styles.sectionHeader}>{t("videos.reviews")}</Text>

                        {/* Add Review Box */}
                        <View style={styles.addReviewBox}>
                            <View style={styles.ratingRow}>
                                <Text style={styles.label}>{t("videos.yourRating")}:</Text>
                                <View style={styles.starPicker}>
                                    {[1, 2, 3, 4, 5].map((r) => (
                                        <TouchableOpacity key={r} onPress={() => setNewReviewRating(r)}>
                                            <Icon
                                                name="star"
                                                size={28}
                                                color={r <= newReviewRating ? "#FFD700" : "#E0E0E0"}
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                            <TextInput
                                style={styles.reviewInput}
                                placeholder={t("videos.reviewPlaceholder")}
                                value={newReviewContent}
                                onChangeText={setNewReviewContent}
                                multiline
                            />
                            <TouchableOpacity
                                style={[styles.postButton, (!newReviewContent || isCreating) && styles.postButtonDisabled]}
                                onPress={handleCreateReview}
                                disabled={!newReviewContent || isCreating}
                            >
                                {isCreating ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.postButtonText}>{t("common.submit")}</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Review List */}
                        {reviewsLoading ? (
                            <ActivityIndicator style={{ marginTop: 20 }} />
                        ) : (
                            reviews.map(renderReviewItem)
                        )}
                        {reviews.length === 0 && !reviewsLoading && (
                            <Text style={styles.emptyText}>{t("videos.noReviews")}</Text>
                        )}
                    </View>
                </ScrollView>
            </ScreenLayout>
        );
    }

    // === LIST VIEW ===
    return (
        <ScreenLayout>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t("videos.title")}</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.filterContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder={t("videos.searchPlaceholder")}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
                    {/* Simple Chips for Filters */}
                    <TouchableOpacity
                        style={[styles.chip, sortBy === 'popular' && styles.chipActive]}
                        onPress={() => setSortBy('popular')}
                    >
                        <Text style={[styles.chipText, sortBy === 'popular' && styles.chipTextActive]}>{t("videos.sortPopular")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.chip, sortBy === 'recent' && styles.chipActive]}
                        onPress={() => setSortBy('recent')}
                    >
                        <Text style={[styles.chipText, sortBy === 'recent' && styles.chipTextActive]}>{t("videos.sortRecent")}</Text>
                    </TouchableOpacity>
                    {languages.map(lang => (
                        <TouchableOpacity
                            key={lang}
                            style={[styles.chip, filterLanguage === lang && styles.chipActive]}
                            onPress={() => setFilterLanguage(lang === filterLanguage ? "" : lang)}
                        >
                            <Text style={[styles.chipText, filterLanguage === lang && styles.chipTextActive]}>{lang.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
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
                                selectedCategory === category && styles.selectedCategoryButtonText,
                            ]}
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
                        <ActivityIndicator size="large" color="#2196F3" />
                        <Text style={styles.loadingText}>{t("common.loading")}</Text>
                    </View>
                ) : (
                    videos.map(renderVideoCard)
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12 },
    headerTitle: { fontSize: 18, fontWeight: "600" },

    // List View Styles
    filterContainer: { padding: 12 },
    searchInput: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 12, backgroundColor: "#fff" },
    chipContainer: { flexDirection: "row" },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f0f0f0", marginRight: 8, borderWidth: 1, borderColor: "#e0e0e0" },
    chipActive: { backgroundColor: "#E3F2FD", borderColor: "#2196F3" },
    chipText: { color: "#666", fontSize: 12 },
    chipTextActive: { color: "#2196F3", fontWeight: "600" },

    categoryScroll: { maxHeight: 56, paddingHorizontal: 12 },
    categoryButton: { paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, borderRadius: 20, backgroundColor: "#f2f2f2" },
    selectedCategoryButton: { backgroundColor: "#2196F3" },
    categoryButtonText: { color: "#333" },
    selectedCategoryButtonText: { color: "#fff" },

    content: { padding: 12, flex: 1 },
    sectionTitle: { fontSize: 16, marginBottom: 12, fontWeight: "600", color: "#333" },

    videoCard: { flexDirection: "row", marginBottom: 12, backgroundColor: "#fff", borderRadius: 8, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    thumbnail: { width: 120, height: 90, backgroundColor: "#333", justifyContent: "center", alignItems: "center" },
    thumbnailText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
    playOverlay: { position: "absolute" },
    videoInfo: { flex: 1, padding: 10, justifyContent: "space-between" },
    videoTitle: { fontWeight: "600", fontSize: 14, color: "#333" },
    videoDescription: { color: "#666", fontSize: 12 },
    videoMeta: { flexDirection: "row", alignItems: "center", marginTop: 4 },
    levelBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    levelText: { color: "#fff", fontSize: 10, fontWeight: "600" },
    categoryText: { marginLeft: 8, color: "#666", fontSize: 11 },

    // Detail View Styles
    detailHeader: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
    backButton: { marginRight: 12 },
    detailTitle: { fontSize: 16, fontWeight: "600", flex: 1 },
    detailContent: { flex: 1, backgroundColor: "#fff" },

    videoFrameContainer: { width: "100%", height: width * 0.5625, backgroundColor: "#000" }, // 16:9 Aspect Ratio
    webview: { flex: 1 },

    interactionBar: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
    interactionBtn: { alignItems: "center", flexDirection: "row" },
    interactionText: { marginLeft: 6, color: "#555", fontSize: 13 },

    subtitleSection: { padding: 16 },
    sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    sectionHeader: { fontSize: 16, fontWeight: "700", color: "#333" },
    subtitleControls: { flexDirection: "row", backgroundColor: "#f0f0f0", borderRadius: 8, padding: 2 },
    modeBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    modeBtnActive: { backgroundColor: "#fff", elevation: 1 },
    modeText: { fontSize: 12, color: "#666" },
    modeTextActive: { color: "#2196F3", fontWeight: "600" },

    subtitleContainer: { padding: 16, backgroundColor: "#FAFAFA", borderRadius: 8, borderWidth: 1, borderColor: "#EEEEEE", minHeight: 80, justifyContent: "center", alignItems: "center" },
    originalSubtitle: { fontSize: 16, color: "#333", textAlign: "center", fontWeight: "500" },
    translatedSubtitle: { fontSize: 15, color: "#2196F3", textAlign: "center", marginTop: 4 },
    subtitlePlaceholder: { color: "#999", fontStyle: "italic" },

    divider: { height: 8, backgroundColor: "#F5F5F5" },

    commentsSection: { padding: 16 },
    addReviewBox: { marginBottom: 20, backgroundColor: "#F9F9F9", padding: 12, borderRadius: 8 },
    ratingRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    label: { fontSize: 14, fontWeight: "600", marginRight: 8 },
    starPicker: { flexDirection: "row" },
    reviewInput: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd", borderRadius: 6, padding: 10, height: 80, textAlignVertical: "top", marginBottom: 12 },
    postButton: { backgroundColor: "#2196F3", paddingVertical: 10, borderRadius: 6, alignItems: "center" },
    postButtonDisabled: { backgroundColor: "#B0BEC5" },
    postButtonText: { color: "#fff", fontWeight: "600" },

    reviewItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
    reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    reviewerInfo: { flexDirection: "row", alignItems: "center" },
    reviewerName: { fontWeight: "600", marginRight: 8, fontSize: 13 },
    reviewRating: { color: "#FFD700", fontSize: 12 },
    reviewDate: { color: "#999", fontSize: 11 },
    reviewContent: { color: "#444", fontSize: 14, lineHeight: 20 },
    reviewActions: { flexDirection: "row", marginTop: 8 },
    actionBtn: { flexDirection: "row", alignItems: "center", marginRight: 16 },
    actionText: { fontSize: 12, color: "#757575", marginLeft: 4 },
    emptyText: { textAlign: "center", color: "#999", marginTop: 20, fontStyle: "italic" },

    loadingContainer: { padding: 40, alignItems: "center" },
    loadingText: { marginTop: 12, color: "#666" },
    errorContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    errorText: { marginTop: 12, color: "#666" },
    retryButton: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#2196F3", borderRadius: 6 },
    retryText: { color: "#fff" },
});

export default BilingualVideoScreen;