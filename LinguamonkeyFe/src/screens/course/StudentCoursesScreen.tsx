import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Image,
  ListRenderItem,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";

import { useCourses } from "../../hooks/useCourses";
import { useUserStore } from "../../stores/UserStore";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";
import { getCourseImage } from "../../utils/courseUtils";
import { getDirectMediaUrl } from "../../utils/mediaUtils";
import { CourseResponse, CourseVersionEnrollmentResponse } from "../../types/dto";
import { CourseType } from "../../types/enums";
import { gotoTab } from "../../utils/navigationRef";

const PAGE_SIZE = 20;

type StudentCoursesRouteParams = {
  initialType?: CourseType;
  mode?: 'MARKETPLACE' | 'ENROLLED'; // Thêm mode để phân biệt
};

type StudentCoursesRouteProp = RouteProp<
  { StudentCoursesScreen: StudentCoursesRouteParams },
  'StudentCoursesScreen'
>;

const StudentCoursesScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<StudentCoursesRouteProp>();
  const { user } = useUserStore();

  const initialType = route.params?.initialType;
  const viewMode = route.params?.mode || 'MARKETPLACE'; // Mặc định là tìm kiếm khóa học mới

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedType, setSelectedType] = useState<CourseType | undefined>(initialType);
  const [page, setPage] = useState(0);

  // Hook Courses
  const { useAllCourses, useEnrollments } = useCourses();

  // 1. Query cho Marketplace (Tìm khóa học mới - Loại trừ khóa đã học nhờ Backend)
  const {
    data: marketData,
    isLoading: marketLoading,
    isFetching: marketFetching,
    refetch: refetchMarket
  } = useAllCourses({
    page,
    size: PAGE_SIZE,
    title: debouncedSearch,
    type: selectedType,
    isAdminCreated: undefined
  });

  // 2. Query cho Enrolled (Khóa học của tôi)
  const {
    data: enrolledData,
    isLoading: enrolledLoading,
    isFetching: enrolledFetching,
    refetch: refetchEnrolled
  } = useEnrollments({
    userId: user?.userId,
    page,
    size: PAGE_SIZE,
    // Note: Search cho enrollment có thể chưa support ở API enrollment, 
    // nếu cần thì filter client-side hoặc update API enrollment.
    // Ở đây tạm thời ta chỉ show list.
  });

  // Reset page khi search text đổi (chỉ áp dụng cho Marketplace)
  React.useEffect(() => {
    if (viewMode === 'MARKETPLACE') {
      const handler = setTimeout(() => {
        setDebouncedSearch(searchText);
        setPage(0);
      }, 500);
      return () => clearTimeout(handler);
    }
  }, [searchText, viewMode]);

  // Refresh data khi focus lại màn hình (quan trọng khi vừa mua xong quay lại)
  useFocusEffect(
    useCallback(() => {
      if (viewMode === 'MARKETPLACE') refetchMarket();
      else refetchEnrolled();
    }, [viewMode, refetchMarket, refetchEnrolled])
  );

  // Xác định data source dựa trên mode
  const courses = useMemo(() => {
    if (viewMode === 'MARKETPLACE') {
      return (marketData?.data as CourseResponse[]) || [];
    } else {
      return (enrolledData?.data as CourseVersionEnrollmentResponse[]) || [];
    }
  }, [viewMode, marketData, enrolledData]);

  const isLoading = viewMode === 'MARKETPLACE' ? marketLoading : enrolledLoading;
  const isFetching = viewMode === 'MARKETPLACE' ? marketFetching : enrolledFetching;
  const isLastPage = viewMode === 'MARKETPLACE'
    ? (marketData?.pagination?.isLast ?? true)
    : (enrolledData?.pagination?.isLast ?? true);

  const handleLoadMore = () => {
    if (!isLastPage && !isFetching) {
      setPage((prev) => prev + 1);
    }
  };

  const handleCoursePress = (item: any) => {
    if (viewMode === 'MARKETPLACE') {
      // Item là CourseResponse
      gotoTab("CourseStack", "CourseDetailsScreen", { courseId: item.courseId });
    } else {
      // Item là CourseVersionEnrollmentResponse
      const courseId = item.course?.courseId || item.courseVersion?.courseId;
      if (courseId) {
        gotoTab("CourseStack", "CourseDetailsScreen", { courseId, isPurchased: true });
      }
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {viewMode === 'MARKETPLACE'
            ? t("learn.allCourses", "Tìm khóa học mới")
            : t("learn.myCourses", "Khóa học của tôi")}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Chỉ hiện Search & Filter ở chế độ Marketplace */}
      {viewMode === 'MARKETPLACE' && (
        <>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t("common.searchPlaceholder", "Tìm kiếm khóa học...")}
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#9CA3AF"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Icon name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedType && styles.activeChip]}
              onPress={() => { setSelectedType(undefined); setPage(0); }}
            >
              <Text style={[styles.chipText, !selectedType && styles.activeChipText]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, selectedType === CourseType.FREE && styles.activeChip]}
              onPress={() => { setSelectedType(CourseType.FREE); setPage(0); }}
            >
              <Text style={[styles.chipText, selectedType === CourseType.FREE && styles.activeChipText]}>Free</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, selectedType === CourseType.PAID && styles.activeChip]}
              onPress={() => { setSelectedType(CourseType.PAID); setPage(0); }}
            >
              <Text style={[styles.chipText, selectedType === CourseType.PAID && styles.activeChipText]}>Paid</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  const renderItem: ListRenderItem<any> = ({ item }) => {
    // Logic render cho Marketplace (CourseResponse)
    if (viewMode === 'MARKETPLACE') {
      const course = item as CourseResponse;
      const rating = course.averageRating ? course.averageRating.toFixed(1) : "0.0";
      const reviewCount = course.reviewCount || 0;
      const price = course.latestPublicVersion?.price ?? 0;
      const rawThumbnailUrl = course.latestPublicVersion?.thumbnailUrl;
      const processedUrl = rawThumbnailUrl ? getDirectMediaUrl(rawThumbnailUrl) : null;
      const thumbSource = processedUrl ? { uri: processedUrl } : require("../../assets/images/ImagePlacehoderCourse.png");

      return (
        <TouchableOpacity style={styles.courseCard} onPress={() => handleCoursePress(course)}>
          <Image
            source={thumbSource}
            style={styles.courseImage}
          />
          <View style={styles.courseContent}>
            <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
            <Text style={styles.courseAuthor}>{t("common.by")} {course.creatorName || "Instructor"}</Text>

            <View style={styles.metaRow}>
              <View style={styles.ratingContainer}>
                <Icon name="star" size={14} color="#F59E0B" />
                <Text style={styles.metaText}>{rating} ({reviewCount})</Text>
              </View>
              <View style={styles.dot} />
              <Text style={styles.priceText}>
                {price === 0 ? "Free" : `$${price}`}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // Logic render cho Enrolled (CourseVersionEnrollmentResponse)
    else {
      const enrollment = item as CourseVersionEnrollmentResponse;
      const courseVersion = enrollment.courseVersion;
      if (!courseVersion) return null;

      const progress = enrollment.progress || 0;
      const title = courseVersion.title || enrollment.course?.title || "Untitled";
      const rawThumbnailUrl = courseVersion.thumbnailUrl;
      const processedUrl = rawThumbnailUrl ? getDirectMediaUrl(rawThumbnailUrl) : null;
      const thumbSource = processedUrl ? { uri: processedUrl } : require("../../assets/images/ImagePlacehoderCourse.png");

      return (
        <TouchableOpacity style={styles.courseCard} onPress={() => handleCoursePress(enrollment)}>
          <Image
            source={thumbSource}
            style={styles.courseImage}
          />
          <View style={styles.courseContent}>
            <Text style={styles.courseTitle} numberOfLines={2}>{title}</Text>
            <Text style={styles.courseAuthor}>
            </Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }
  };

  const renderFooter = () => {
    if (!isFetching) return <View style={{ height: 20 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color="#4F46E5" />
      </View>
    );
  };

  const onRefresh = () => {
    setPage(0);
    if (viewMode === 'MARKETPLACE') refetchMarket();
    else refetchEnrolled();
  };

  return (
    <ScreenLayout>
      <View style={styles.container}>
        {renderHeader()}

        {isLoading && page === 0 ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : (
          <FlatList
            data={courses}
            renderItem={renderItem}
            keyExtractor={(item) =>
              viewMode === 'MARKETPLACE'
                ? (item as CourseResponse).courseId
                : (item as CourseVersionEnrollmentResponse).enrollmentId
            }
            contentContainerStyle={styles.listContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            refreshControl={
              <RefreshControl refreshing={isLoading && page === 0} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {viewMode === 'MARKETPLACE'
                    ? t("common.noData", "Không tìm thấy khóa học nào")
                    : t("learn.noEnrolled", "Bạn chưa đăng ký khóa học nào")
                  }
                </Text>
              </View>
            }
          />
        )}
      </View>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
  },
  filterContainer: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activeChip: {
    backgroundColor: "#EEF2FF",
    borderColor: "#4F46E5",
  },
  chipText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  activeChipText: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
  },
  centerLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
  courseCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  courseImage: {
    width: 100,
    height: 70,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  courseContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  courseTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    lineHeight: 20,
  },
  courseAuthor: {
    fontSize: 12,
    color: "#6B7280",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    color: "#4B5563",
    marginLeft: 4,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#9CA3AF",
    marginHorizontal: 8,
  },
  priceText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4F46E5",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 16,
  },
  // New styles for enrolled items
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    marginRight: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    width: 30,
    textAlign: 'right'
  }
});

export default StudentCoursesScreen;