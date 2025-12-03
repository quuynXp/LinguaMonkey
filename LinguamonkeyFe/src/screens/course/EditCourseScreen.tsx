import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useCourses } from "../../hooks/useCourses";
import { useUserStore } from "../../stores/UserStore";

import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";
import { DifficultyLevel, VersionStatus } from "../../types/enums";
import type { CourseLessonResponse } from "../../types/dto";

// Tạm thời định nghĩa kiểu dữ liệu cho lessons nhận được từ API/State.
// Đã loại bỏ 'duration' vì nó gây ra lỗi TypeScript.
interface LocalLessonType {
  lessonId: string;
  title: string;
  // duration: string; // Đã loại bỏ
  orderIndex: number;
}

const EditCourseScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { courseId: initialCourseId } = route.params || {};
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);

  // --- State ---
  const [isCreateMode, setIsCreateMode] = useState(!initialCourseId);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("0");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DifficultyLevel.A1);

  // Local state for lessons to handle immediate UI reordering
  const [localLessons, setLocalLessons] = useState<LocalLessonType[]>([]);

  // --- Hooks ---
  const {
    useCourse,
    useCourseVersions,
    useCreateCourse,
    useUpdateCourseDetails,
    useUpdateCourseVersion,
    useCreateDraftVersion,
    usePublishVersion
  } = useCourses();

  // Fetch Data
  const { data: courseData, refetch: refetchCourse } = useCourse(initialCourseId);
  const { data: versionsData, refetch: refetchVersions } = useCourseVersions(initialCourseId);

  // Determine Working Version (Draft > Public)
  const workingVersion = useMemo(() => {
    if (!versionsData || versionsData.length === 0) return null;
    return versionsData.find(v => v.status === VersionStatus.DRAFT) || versionsData.find(v => v.status === VersionStatus.PUBLIC);
  }, [versionsData]);

  const isDraft = workingVersion?.status === VersionStatus.DRAFT;

  // --- Effects ---

  // 1. Load Course Data
  useEffect(() => {
    if (courseData) {
      setTitle(courseData.title);
      setIsCreateMode(false);
    }
  }, [courseData]);

  // 2. Load Version Data
  useEffect(() => {
    if (workingVersion) {
      setDescription(workingVersion.description || "");
      setThumbnailUrl(workingVersion.thumbnailUrl || "");
      setPrice(workingVersion.price?.toString() || "0");
      setDifficulty(workingVersion.difficultyLevel || DifficultyLevel.A1);

      // Load lessons into local state for manipulation
      if (workingVersion.lessons) {
        // Sửa lỗi TypeScript: Ép kiểu sang LocalLessonType[] đã được sửa đổi
        const sorted = (workingVersion.lessons as LocalLessonType[]).sort((a, b) => a.orderIndex - b.orderIndex);
        setLocalLessons(sorted);
      }
    }
  }, [workingVersion]);

  // Refetch when screen focuses (e.g. coming back from CreateLessonScreen)
  useFocusEffect(
    useCallback(() => {
      if (initialCourseId) {
        refetchVersions();
      }
    }, [initialCourseId, refetchVersions])
  );

  // --- Mutations ---
  const { mutate: createCourseMutate, isPending: isCreating } = useCreateCourse();
  const { mutate: updateDetailsMutate, isPending: isUpdatingDetails } = useUpdateCourseDetails();
  const { mutate: updateVersionMutate, isPending: isUpdatingVersion } = useUpdateCourseVersion();
  const { mutate: createDraftMutate, isPending: isCreatingDraft } = useCreateDraftVersion();

  const isSaving = isCreating || isUpdatingDetails || isUpdatingVersion || isCreatingDraft;

  // --- Handlers ---

  const handlePreview = () => {
    // Only allow preview if we have a courseId
    if (initialCourseId) {
      navigation.navigate("CourseDetailsScreen", { courseId: initialCourseId });
    }
  };

  const handleCreateLesson = () => {
    if (!workingVersion) return;
    // Navigate to Create Lesson Screen
    navigation.navigate("CreateLessonScreen", {
      courseId: initialCourseId,
      versionId: workingVersion.versionId
    });
  };

  // Reordering Logic (Move Up/Down)
  const moveLesson = (index: number, direction: 'up' | 'down') => {
    const newLessons = [...localLessons];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newLessons.length) return;

    // Swap
    const temp = newLessons[index];
    newLessons[index] = newLessons[targetIndex];
    newLessons[targetIndex] = temp;

    setLocalLessons(newLessons);
  };

  const removeLesson = (index: number) => {
    Alert.alert(
      t("common.confirm"),
      t("course.confirmRemoveLesson"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            const newLessons = [...localLessons];
            newLessons.splice(index, 1);
            setLocalLessons(newLessons);
          }
        }
      ]
    );
  };

  const handleSave = () => {
    if (!title) {
      Alert.alert(t("error"), t("course.titleRequired"));
      return;
    }

    if (isCreateMode) {
      // Create New Course
      createCourseMutate({
        title,
        price: parseFloat(price) || 0,
        creatorId: user?.userId || "",
      }, {
        onSuccess: (newCourse) => {
          Alert.alert(t("success"), t("course.createSuccess"));
          navigation.replace("EditCourseScreen", { courseId: newCourse.courseId });
        },
        onError: () => Alert.alert(t("error"), t("course.createFailed"))
      });
    } else {
      // Update Existing Course
      if (!workingVersion) return;

      if (!isDraft) {
        // If current version is PUBLIC, prompt to create new Draft
        Alert.alert(
          t("course.liveVersion"),
          t("course.createDraftPrompt"),
          [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("common.ok"),
              onPress: () => createDraftMutate(initialCourseId, {
                onSuccess: () => refetchVersions()
              })
            }
          ]
        );
        return;
      }

      // 1. Update Details (Title)
      updateDetailsMutate({
        id: initialCourseId,
        req: { title }
      });

      // 2. Update Version (Content & Order)
      const lessonIds = localLessons.map(l => l.lessonId); // Extract ordered IDs

      updateVersionMutate({
        versionId: workingVersion.versionId,
        req: {
          description,
          thumbnailUrl,
          price: parseFloat(price) || 0,
          difficultyLevel: difficulty,
          lessonIds: lessonIds // Send ordered list
        }
      }, {
        onSuccess: () => {
          Alert.alert(t("success"), t("course.saved"));
          refetchVersions();
        },
        onError: () => Alert.alert(t("error"), t("course.saveFailed"))
      });
    }
  };

  // --- Render Components ---

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
        <Icon name="close" size={24} color="#374151" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>
        {isCreateMode ? t("course.createNew") : t("course.edit")}
      </Text>
      <View style={styles.headerRight}>
        {!isCreateMode && (
          <TouchableOpacity onPress={handlePreview} style={styles.headerBtn}>
            <Icon name="visibility" size={24} color="#4F46E5" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.saveHeaderBtn}>
          {isSaving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveHeaderText}>{t("common.save")}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  // Sử dụng LocalLessonType đã sửa đổi
  const renderLessonItem = ({ item, index }: { item: LocalLessonType, index: number }) => (
    <View style={styles.lessonCard}>
      <View style={styles.lessonOrder}>
        <Text style={styles.lessonOrderText}>{index + 1}</Text>
      </View>
      <View style={styles.lessonInfo}>
        <Text style={styles.lessonTitle} numberOfLines={1}>{item.title}</Text>
        {/* Loại bỏ Text hiển thị duration */}
        {/* <Text style={styles.lessonDuration}>{item.duration}</Text> */}
      </View>

      {/* Reorder & Actions */}
      <View style={styles.lessonActions}>
        <TouchableOpacity
          onPress={() => moveLesson(index, 'up')}
          disabled={index === 0}
          style={styles.actionBtn}
        >
          <Icon name="arrow-upward" size={20} color={index === 0 ? "#E5E7EB" : "#6B7280"} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => moveLesson(index, 'down')}
          disabled={index === localLessons.length - 1}
          style={styles.actionBtn}
        >
          <Icon name="arrow-downward" size={20} color={index === localLessons.length - 1 ? "#E5E7EB" : "#6B7280"} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => removeLesson(index)} style={styles.actionBtn}>
          <Icon name="delete" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenLayout>
      {renderHeader()}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>

          {/* Basic Info Section */}
          <View style={styles.section}>
            <Text style={styles.label}>{t("course.title")}</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t("course.titlePlaceholder")}
            />

            <View style={styles.row}>
              <View style={[styles.column, { marginRight: 12 }]}>
                <Text style={styles.label}>{t("course.price")} ($)</Text>
                <TextInput
                  style={styles.input}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  placeholder="0.00"
                />
              </View>
              <View style={styles.column}>
                <Text style={styles.label}>{t("course.difficulty")}</Text>
                {/* Simple input for now, could be a Picker */}
                <TextInput
                  style={styles.input}
                  value={difficulty}
                  onChangeText={(t) => setDifficulty(t as DifficultyLevel)}
                />
              </View>
            </View>

            <Text style={styles.label}>{t("course.description")}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder={t("course.descPlaceholder")}
            />

            <Text style={styles.label}>{t("course.thumbnailUrl")}</Text>
            <TextInput
              style={styles.input}
              value={thumbnailUrl}
              onChangeText={setThumbnailUrl}
              placeholder="https://..."
            />
            {thumbnailUrl ? (
              <Image source={{ uri: thumbnailUrl }} style={styles.previewImage} />
            ) : null}
          </View>

          {/* Lessons Section - Only visible if course exists (not create mode) */}
          {!isCreateMode && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t("course.curriculum")}</Text>
                {isDraft && (
                  <TouchableOpacity
                    style={styles.addLessonBtn}
                    onPress={handleCreateLesson}
                  >
                    <Icon name="add" size={18} color="#FFF" />
                    <Text style={styles.addLessonText}>{t("course.createLesson")}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {localLessons.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>{t("course.noLessons")}</Text>
                </View>
              ) : (
                localLessons.map((item, index) => (
                  <View key={item.lessonId || index}>
                    {renderLessonItem({ item, index })}
                  </View>
                ))
              )}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerBtn: {
    padding: 4,
  },
  saveHeaderBtn: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveHeaderText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
  },
  section: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: "#1F2937",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
  },
  column: {
    flex: 1,
  },
  previewImage: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: "#E5E7EB",
  },

  // Lesson List Styles
  addLessonBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addLessonText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  lessonCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  lessonOrder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  lessonOrderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  lessonDuration: {
    fontSize: 12,
    color: "#6B7280",
  },
  lessonActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    padding: 4,
  },
  emptyState: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: "#9CA3AF",
    fontStyle: "italic",
  },
});

export default EditCourseScreen;