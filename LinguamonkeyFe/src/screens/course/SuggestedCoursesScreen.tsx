import React from "react"
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import { useCourses } from "../../hooks/useCourses"
import { useUserStore } from "../../stores/UserStore"
import ScreenLayout from "../../components/layout/ScreenLayout"
import { createScaledSheet } from "../../utils/scaledStyles"
import { getCourseImage } from "../../utils/courseUtils"

const SuggestedCoursesScreen = ({ navigation }: any) => {
    const { t } = useTranslation()
    const { user } = useUserStore()
    const { data: courses, isLoading } = useCourses().useRecommendedCourses(user?.userId, 20)

    const renderItem = ({ item }: any) => {
        const version = item.latestPublicVersion
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("CourseDetailsScreen", { courseId: item.courseId })}
            >
                <Image
                    source={getCourseImage(version?.thumbnailUrl)}
                    style={styles.thumbnail}
                />
                <View style={styles.info}>
                    <View style={styles.header}>
                        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                        <View style={styles.aiBadge}>
                            <Icon name="auto-awesome" size={12} color="#FFF" />
                            <Text style={styles.aiText}>AI Pick</Text>
                        </View>
                    </View>
                    <Text style={styles.creator}>{t("course.by")} {item.creatorId}</Text>

                    <View style={styles.footer}>
                        <Text style={styles.price}>
                            {item.price === 0 ? t("course.free") : `$${item.price}`}
                        </Text>
                        <View style={styles.ratingBox}>
                            <Icon name="star" size={12} color="#F59E0B" />
                            <Text style={styles.ratingText}>4.8</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        )
    }

    return (
        <ScreenLayout>
            <View style={styles.container}>
                {isLoading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#4F46E5" />
                        <Text style={styles.loadingText}>{t("course.findingBestMatches")}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={courses || []}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.courseId}
                        contentContainerStyle={styles.list}
                        ListHeaderComponent={
                            <View style={styles.aiHeader}>
                                <Icon name="psychology" size={32} color="#4F46E5" />
                                <Text style={styles.aiHeaderText}>
                                    {t("course.aiSuggestionSubtitle")}
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </ScreenLayout>
    )
}

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: "#F3F4F6" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    loadingText: { marginTop: 12, color: "#6B7280", fontSize: 14 },
    list: { padding: 16 },

    aiHeader: { flexDirection: "row", alignItems: "center", backgroundColor: "#EEF2FF", padding: 16, borderRadius: 12, marginBottom: 16 },
    aiHeaderText: { flex: 1, marginLeft: 12, color: "#4338CA", fontSize: 14 },

    card: { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 12, marginBottom: 12, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    thumbnail: { width: 110, height: 110, backgroundColor: "#E5E7EB" },
    info: { flex: 1, padding: 12, justifyContent: "space-between" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    title: { fontSize: 16, fontWeight: "bold", color: "#1F2937", flex: 1, marginRight: 8 },
    aiBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#8B5CF6", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    aiText: { color: "#FFF", fontSize: 10, fontWeight: "bold", marginLeft: 2 },
    creator: { fontSize: 12, color: "#6B7280", marginTop: 4 },
    footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
    price: { fontSize: 16, fontWeight: "bold", color: "#10B981" },
    ratingBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFBEB", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    ratingText: { fontSize: 12, fontWeight: "bold", color: "#D97706", marginLeft: 4 },
})

export default SuggestedCoursesScreen