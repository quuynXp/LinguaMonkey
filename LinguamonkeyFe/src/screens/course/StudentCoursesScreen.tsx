import React, { useState, useMemo, useCallback } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  FlatList,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import { useCourses } from "../../hooks/useCourses"
import { useUserStore } from "../../stores/UserStore"
import ScreenLayout from "../../components/layout/ScreenLayout"
import { CourseResponse, CourseVersionEnrollmentResponse } from "../../types/dto"
import { createScaledSheet } from "../../utils/scaledStyles"
import { getCourseImage } from "../../utils/courseUtils"

const FilterChip = ({ label, isSelected, onPress }: any) => (
  <TouchableOpacity
    style={[styles.chip, isSelected && styles.chipActive]}
    onPress={onPress}
  >
    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
)

const CourseCard = ({ item, onPress, isEnrolled }: any) => {
  const version = item.latestPublicVersion || item.courseVersion
  const imageSource = getCourseImage(version?.thumbnailUrl)

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image source={imageSource} style={styles.thumbnail} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardLevel}>{item.difficultyLevel || "General"}</Text>
          {!isEnrolled && (
            <Text style={styles.cardPrice}>
              {item.price === 0 ? "Free" : `$${item.price}`}
            </Text>
          )}
          {isEnrolled && (
            <View style={styles.enrolledBadge}>
              <Icon name="check-circle" size={12} color="#FFFFFF" />
              <Text style={styles.enrolledText}>Enrolled</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const StudentCoursesScreen = ({ navigation }: any) => {
  const { t } = useTranslation()
  const { user } = useUserStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()

  const {
    useEnrollments,
    useAllCourses,
    useCourseCategories,
  } = useCourses()

  const { data: categories } = useCourseCategories()

  const {
    data: enrolledData,
    isLoading: enrolledLoading,
    refetch: refetchEnrolled
  } = useEnrollments({ userId: user?.userId, size: 100 })

  const {
    data: allCoursesData,
    isLoading: marketLoading,
    refetch: refetchMarket
  } = useAllCourses({
    title: searchQuery || undefined,
    categoryCode: selectedCategory,
    size: 20
  })

  const enrolledIds = useMemo(() => {
    const list = (enrolledData?.data as CourseVersionEnrollmentResponse[]) || []
    return new Set(list.map(e => e.courseId))
  }, [enrolledData])

  const marketCourses = useMemo(() => {
    const raw = (allCoursesData?.data as CourseResponse[]) || []
    return raw.filter(c => !enrolledIds.has(c.courseId))
  }, [allCoursesData, enrolledIds])

  const enrolledList = (enrolledData?.data as CourseVersionEnrollmentResponse[]) || []

  const handleRefresh = () => {
    refetchEnrolled()
    refetchMarket()
  }

  const renderItem = useCallback(({ item }: { item: any }) => {
    const isEnrolled = enrolledIds.has(item.courseId)
    return (
      <CourseCard
        item={item}
        isEnrolled={isEnrolled}
        onPress={() => navigation.navigate("CourseDetailsScreen", { courseId: item.courseId })}
      />
    )
  }, [enrolledIds, navigation])

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder={t("student.searchCoursesPlaceholder")}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        <FlatList
          data={categories || []}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }: any) => (
            <FilterChip
              label={item}
              isSelected={selectedCategory === item}
              onPress={() => setSelectedCategory(selectedCategory === item ? undefined : item)}
            />
          )}
          keyExtractor={(item) => item}
        />
      </View>

      {enrolledList.length > 0 && !searchQuery && !selectedCategory && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("student.myLearning")}</Text>
          </View>
          <View style={styles.horizontalListContainer}>
            <FlatList
              data={enrolledList}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.enrollmentId}
              renderItem={({ item }: any) => (
                <TouchableOpacity
                  style={styles.horizontalCard}
                  onPress={() => navigation.navigate("CourseDetailsScreen", { courseId: item.courseId })}
                >
                  <Image
                    source={getCourseImage(null)}
                    style={styles.horizontalThumbnail}
                  />
                  <View style={styles.horizontalContent}>
                    <Text style={styles.horizontalTitle} numberOfLines={1}>
                      {item.courseTitle}
                    </Text>
                    <View style={styles.progressRow}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '30%' }]} />
                      </View>
                      <Text style={styles.progressText}>30%</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {searchQuery ? t("student.searchResults") : t("student.exploreCourses")}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate("SuggestedCoursesScreen")}>
          <Text style={styles.seeAllText}>{t("common.seeAll")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <ScreenLayout>
      <View style={styles.container}>
        {enrolledLoading || marketLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : (
          <FlatList
            data={marketCourses}
            renderItem={renderItem}
            keyExtractor={(item) => item.courseId}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={enrolledLoading || marketLoading} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t("student.noCoursesFound")}</Text>
              </View>
            )}
          />
        )}
      </View>
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingBottom: 20 },
  headerContainer: { paddingVertical: 16 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 48,
    marginBottom: 16,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: "#1F2937" },
  filterContainer: { marginBottom: 16 },
  filterList: { paddingHorizontal: 16 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#EEF2FF", borderColor: "#4F46E5" },
  chipText: { fontSize: 14, color: "#6B7280" },
  chipTextActive: { color: "#4F46E5", fontWeight: "600" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  seeAllText: { fontSize: 14, color: "#4F46E5", fontWeight: "600" },

  // Vertical Card
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: { width: 80, height: 80, borderRadius: 8, backgroundColor: "#E5E7EB" },
  cardContent: { flex: 1, marginLeft: 12, justifyContent: "space-between" },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
  cardMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLevel: { fontSize: 12, color: "#6B7280", backgroundColor: "#F3F4F6", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  cardPrice: { fontSize: 16, fontWeight: "700", color: "#10B981" },
  enrolledBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#10B981", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  enrolledText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700", marginLeft: 4 },

  // Horizontal Card (My Learning)
  horizontalListContainer: { height: 140, marginBottom: 20 },
  horizontalCard: {
    width: 260,
    backgroundColor: "#FFFFFF",
    marginLeft: 16,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  horizontalThumbnail: { width: "100%", height: 80, backgroundColor: "#E5E7EB" },
  horizontalContent: { padding: 12 },
  horizontalTitle: { fontSize: 14, fontWeight: "600", color: "#1F2937", marginBottom: 8 },
  progressRow: { flexDirection: "row", alignItems: "center" },
  progressBar: { flex: 1, height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, marginRight: 8 },
  progressFill: { height: "100%", backgroundColor: "#4F46E5", borderRadius: 2 },
  progressText: { fontSize: 10, color: "#6B7280" },

  emptyContainer: { padding: 32, alignItems: "center" },
  emptyText: { color: "#9CA3AF", fontSize: 16 },
})

export default StudentCoursesScreen