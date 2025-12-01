import React, { useMemo } from "react"
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Alert,
    RefreshControl,
    Image,
    StatusBar,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import { useNavigation } from "@react-navigation/native"
import { useCourses } from "../../hooks/useCourses"
import { useUserStore } from "../../stores/UserStore"
import ScreenLayout from "../../components/layout/ScreenLayout"
import type { CourseResponse } from "../../types/dto"
import { createScaledSheet } from "../../utils/scaledStyles"
import { getCourseImage } from "../../utils/courseUtils"

const CreatorDashboardScreen = () => {
    const { t } = useTranslation()
    const navigation = useNavigation<any>()
    const user = useUserStore((state) => state.user)

    const { useCreatorCourses, useCreateCourse } = useCourses()
    const {
        data: coursesData,
        isLoading,
        refetch,
    } = useCreatorCourses(user?.userId, 0, 50)

    const { mutate: createCourse, isPending: isCreating } = useCreateCourse()

    const courses = useMemo(() => {
        return (coursesData?.data as CourseResponse[]) || []
    }, [coursesData])

    const handleCreateNewCourse = () => {
        Alert.prompt(
            t("course.createTitle"),
            t("course.createPrompt"),
            [
                { text: t("common.cancel"), style: "cancel" },
                {
                    text: t("common.create"),
                    onPress: (title) => {
                        if (title && user?.userId) {
                            createCourse(
                                {
                                    title,
                                    price: 0,
                                    creatorId: user.userId,
                                },
                                {
                                    onSuccess: (newCourse) => {
                                        navigation.navigate("CourseManagerScreen", {
                                            courseId: newCourse.courseId,
                                        })
                                    },
                                    onError: () => {
                                        Alert.alert(t("error"), t("course.createFailed"))
                                    },
                                }
                            )
                        }
                    },
                },
            ],
            "plain-text"
        )
    }

    const renderCourseItem = ({ item }: { item: CourseResponse }) => {
        const publicVersion = item.latestPublicVersion
        const isApproved = item.approvalStatus === "APPROVED"

        return (
            <TouchableOpacity
                style={styles.courseCard}
                onPress={() =>
                    navigation.navigate("CourseManagerScreen", { courseId: item.courseId })
                }
            >
                <Image
                    source={getCourseImage(publicVersion?.thumbnailUrl)}
                    style={styles.courseThumb}
                />
                <View style={styles.courseContent}>
                    <Text style={styles.courseTitle} numberOfLines={2}>
                        {item.title}
                    </Text>
                    <View style={styles.metaRow}>
                        <View
                            style={[
                                styles.statusBadge,
                                { backgroundColor: isApproved ? "#DCFCE7" : "#FEF3C7" },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.statusText,
                                    { color: isApproved ? "#166534" : "#D97706" },
                                ]}
                            >
                                {item.approvalStatus}
                            </Text>
                        </View>
                        <Text style={styles.priceText}>
                            {item.latestPublicVersion.price === 0 ? "Free" : `$${item.latestPublicVersion.price}`}
                        </Text>
                    </View>
                    <View style={styles.statsRow}>
                        <Icon name="star" size={14} color="#F59E0B" />
                        <Text style={styles.statsText}>4.5</Text>
                        <Icon name="people" size={14} color="#6B7280" style={{ marginLeft: 8 }} />
                        <Text style={styles.statsText}>120 Students</Text>
                    </View>
                </View>
                <Icon name="edit" size={24} color="#4F46E5" />
            </TouchableOpacity>
        )
    }

    return (
        <ScreenLayout>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>{t("creator.dashboard")}</Text>
                    <Text style={styles.headerSubtitle}>
                        {t("creator.manageCoursesSubtitle")}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.createBtn}
                    onPress={handleCreateNewCourse}
                    disabled={isCreating}
                >
                    <Icon name="add" size={20} color="#FFF" />
                    <Text style={styles.createBtnText}>{t("common.create")}</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={courses}
                keyExtractor={(item) => item.courseId}
                renderItem={renderCourseItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#4F46E5" />
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.emptyState}>
                            <Icon name="school" size={64} color="#E5E7EB" />
                            <Text style={styles.emptyText}>{t("course.noCourses")}</Text>
                        </View>
                    ) : null
                }
            />
        </ScreenLayout>
    )
}

const styles = createScaledSheet({
    header: {
        padding: 20,
        backgroundColor: "#FFFFFF",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    headerTitle: { fontSize: 24, fontWeight: "800", color: "#1F2937" },
    headerSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
    createBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#4F46E5",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 6,
    },
    createBtnText: { color: "#FFF", fontWeight: "600", fontSize: 14 },
    listContent: { padding: 16, paddingBottom: 40 },
    courseCard: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    courseThumb: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: "#F3F4F6",
    },
    courseContent: { flex: 1, marginLeft: 12, marginRight: 8 },
    courseTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 6 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    statusText: { fontSize: 10, fontWeight: "700" },
    priceText: { fontSize: 14, fontWeight: "600", color: "#4F46E5" },
    statsRow: { flexDirection: "row", alignItems: "center" },
    statsText: { fontSize: 12, color: "#6B7280", marginLeft: 4, fontWeight: "500" },
    emptyState: { alignItems: "center", marginTop: 60 },
    emptyText: { color: "#9CA3AF", marginTop: 16, fontSize: 16 },
})

export default CreatorDashboardScreen