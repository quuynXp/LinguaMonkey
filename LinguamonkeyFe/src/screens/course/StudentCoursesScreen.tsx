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
import { useNavigation } from "@react-navigation/native";

import { useCourses } from "../../hooks/useCourses";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";
import { getCourseImage } from "../../utils/courseUtils";
import { CourseResponse } from "../../types/dto";
import { CourseType } from "../../types/enums";
import { gotoTab } from "../../utils/navigationRef";

const PAGE_SIZE = 20;

const StudentCoursesScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  // Search & Filter State
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedType, setSelectedType] = useState<CourseType | undefined>(undefined);

  // Pagination State
  const [page, setPage] = useState(0);

  // Search Debounce Logic
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchText);
      setPage(0); // Reset to first page on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchText]);

  const { useAllCourses } = useCourses();

  // Fetch Data
  const {
    data,
    isLoading,
    isFetching,
    refetch
  } = useAllCourses({
    page,
    size: PAGE_SIZE,
    title: debouncedSearch,
    type: selectedType,
    isAdminCreated: undefined // Show all courses including admin and creators
  });

  const courses = useMemo(() => (data?.data as CourseResponse[]) || [], [data]);
  const isLastPage = data?.pagination?.isLast ?? true;

  const handleLoadMore = () => {
    if (!isLastPage && !isFetching) {
      setPage((prev) => prev + 1);
    }
  };

  const handleCoursePress = (course: CourseResponse) => {
    gotoTab("CourseStack", "CourseDetailsScreen", { courseId: course.courseId });
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("learn.allCourses", "Tất cả khóa học")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
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

      {/* Filter Chips */}
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
    </View>
  );

  const renderItem: ListRenderItem<CourseResponse> = ({ item }) => {
    const rating = item.averageRating ? item.averageRating.toFixed(1) : "0.0";
    const reviewCount = item.reviewCount || 0;
    const price = item.latestPublicVersion?.price ?? 0;
    // Using reviewCount or a specific enrollment count if available in DTO
    const students = item.reviewCount ? item.reviewCount * 5 : 0; // Mock calculation if real count missing, or use real field

    return (
      <TouchableOpacity style={styles.courseCard} onPress={() => handleCoursePress(item)}>
        <Image
          source={getCourseImage(item.latestPublicVersion?.thumbnailUrl)}
          style={styles.courseImage}
        />
        <View style={styles.courseContent}>
          <Text style={styles.courseTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.courseAuthor}>{t("common.by")} {item.creatorName || "Instructor"}</Text>

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
  };

  const renderFooter = () => {
    if (!isFetching) return <View style={{ height: 20 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color="#4F46E5" />
      </View>
    );
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
            keyExtractor={(item) => item.courseId}
            contentContainerStyle={styles.listContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            refreshControl={
              <RefreshControl refreshing={isLoading && page === 0} onRefresh={refetch} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t("common.noData", "Không tìm thấy khóa học nào")}</Text>
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
});

export default StudentCoursesScreen;