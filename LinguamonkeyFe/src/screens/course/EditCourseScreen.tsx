import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Modal,
  StyleSheet
} from "react-native";
import { useTranslation } from "react-i18next";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation, useRoute } from "@react-navigation/native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useVideoPlayer, VideoView } from 'expo-video';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from "@tanstack/react-query"; // <--- THÊM IMPORT NÀY

import { useCourses, courseKeys } from "../../hooks/useCourses";
import { useUserStore } from "../../stores/UserStore";
import { createScaledSheet } from "../../utils/scaledStyles";
import { DifficultyLevel, VersionStatus, Country } from "../../types/enums";
import { getLessonImage } from "../../utils/courseUtils";
import { getDirectMediaUrl } from "../../utils/mediaUtils";
import { getCountryFlag } from "../../utils/flagUtils";
import {
  LessonResponse,
  CourseVersionDiscountResponse,
  CourseVersionDiscountRequest,
} from "../../types/dto";
import FileUploader from "../../components/common/FileUploader";
import ScreenLayout from "../../components/layout/ScreenLayout";

// --- Language Options & Utils ---
// Map language code to Country Enum for Flag display only
const SUPPORTED_INSTRUCTION_LANGUAGES = [
  { code: 'vi', label: 'Vietnamese', countryEnum: Country.VIETNAM },
  { code: 'en', label: 'English', countryEnum: Country.UNITED_STATES },
  { code: 'zh', label: 'Chinese', countryEnum: Country.CHINA },
];

interface DiscountModalProps {
  visible: boolean;
  onClose: () => void;
  versionId: string;
  initialData?: CourseVersionDiscountResponse;
  onSuccess: (versionId: string) => void;
}

const DiscountModal = ({ visible, onClose, versionId, initialData, onSuccess }: DiscountModalProps) => {
  const { t } = useTranslation();
  const [code, setCode] = useState(initialData?.code || "");
  const [percentage, setPercentage] = useState(initialData?.discountPercentage?.toString() || "10");

  const [startDate, setStartDate] = useState(initialData?.startDate ? new Date(initialData.startDate) : new Date());
  const [endDate, setEndDate] = useState(initialData?.endDate ? new Date(initialData.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const { useCreateDiscount, useUpdateDiscount } = useCourses();
  const createDiscount = useCreateDiscount();
  const updateDiscount = useUpdateDiscount();

  const isEdit = !!initialData;
  const isPending = createDiscount.isPending || updateDiscount.isPending;

  useEffect(() => {
    if (visible) {
      setCode(initialData?.code || "");
      setPercentage(initialData?.discountPercentage?.toString() || "10");
      setStartDate(initialData?.startDate ? new Date(initialData.startDate) : new Date());
      setEndDate(initialData?.endDate ? new Date(initialData.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    }
  }, [visible, initialData]);

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedDate) setStartDate(selectedDate);
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedDate) setEndDate(selectedDate);
  };

  const handleSubmit = () => {
    if (!code || !percentage) {
      Alert.alert(t("error"), t("course.invalidDiscountInput") || "Invalid input");
      return;
    }

    if (endDate <= startDate) {
      Alert.alert(t("error"), "End date must be after start date");
      return;
    }

    const payload: CourseVersionDiscountRequest = {
      versionId: versionId,
      code: code.toUpperCase().trim(),
      discountPercentage: parseInt(percentage, 10),
      isActive: true,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isDeleted: false
    };

    const options = {
      onSuccess: () => {
        onSuccess(versionId);
        onClose();
      },
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.message || t("course.discountFailed");
        Alert.alert(t("error"), errorMessage);
      }
    };

    if (isEdit && initialData) {
      updateDiscount.mutate({ id: initialData.discountId, req: payload }, options);
    } else {
      createDiscount.mutate(payload, options);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{isEdit ? t("course.editDiscount") : t("course.createDiscount")}</Text>

          <Text style={styles.label}>Discount Code</Text>
          <TextInput
            style={styles.input}
            placeholder="CODE (e.g. SUMMER2025)"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            editable={!isEdit}
          />

          <Text style={styles.label}>Percentage (%)</Text>
          <TextInput
            style={styles.input}
            value={percentage}
            onChangeText={(v) => setPercentage(v.replace(/[^0-9]/g, ""))}
            keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
            maxLength={2}
            placeholder="10"
          />

          <View style={styles.row}>
            <View style={[styles.column, { marginRight: 8 }]}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
                <Text style={styles.dateText}>{startDate.toLocaleDateString()}</Text>
                <Icon name="calendar-today" size={16} color="#4F46E5" />
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onStartDateChange}
                />
              )}
            </View>

            <View style={[styles.column, { marginLeft: 8 }]}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
                <Text style={styles.dateText}>{endDate.toLocaleDateString()}</Text>
                <Icon name="event" size={16} color="#4F46E5" />
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={startDate}
                  onChange={onEndDateChange}
                />
              )}
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSubmit} disabled={isPending} style={styles.confirmBtn}>
              {isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmText}>{isEdit ? t("common.update") : t("common.create")}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const PublishReasonModal = ({ visible, onClose, onConfirm }: { visible: boolean; onClose: () => void; onConfirm: (reason: string) => void; }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (visible) setReason("");
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t("course.publishTitle")}</Text>
          <Text style={{ marginBottom: 8 }}>{t("course.publishReasonPrompt")}</Text>
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={reason}
            onChangeText={setReason}
            placeholder={t("course.publishReasonPlaceholder") || "Reason for publishing"}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onConfirm(reason)} style={styles.confirmBtn}>
              <Text style={styles.confirmText}>{t("common.publish")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const LanguageSelectionModal = ({ visible, onClose, onSelect, selectedCode }: any) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.langModalWrap}>
        <View style={styles.langModalCard}>
          <Text style={styles.modalTitle}>Select Instruction Language</Text>
          <FlatList
            data={SUPPORTED_INSTRUCTION_LANGUAGES}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => {
              const isSelected = selectedCode === item.code;
              return (
                <TouchableOpacity
                  style={[styles.langOptionRow, isSelected && { backgroundColor: '#EEF2FF' }]}
                  onPress={() => onSelect(item.code)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, marginRight: 12 }}>{getCountryFlag(item.countryEnum)}</Text>
                    <Text style={[styles.langOptionText, isSelected && { color: '#4F46E5', fontWeight: '700' }]}>
                      {item.label}
                    </Text>
                  </View>
                  {isSelected && <Icon name="check" size={20} color="#4F46E5" />}
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const EditCourseScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialCourseId = route.params?.courseId;
  const isNew = route.params?.isNew;

  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  const queryClient = useQueryClient(); // <--- KHỞI TẠO QUERY CLIENT

  const [activeCourseId, setActiveCourseId] = useState<string | undefined>(initialCourseId);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("0");
  const [description, setDescription] = useState("");
  const [localThumbnailUrl, setLocalThumbnailUrl] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DifficultyLevel.A1);
  const [instructionLanguage, setInstructionLanguage] = useState<string>("vi");
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<CourseVersionDiscountResponse | undefined>(undefined);
  const [publishModalVisible, setPublishModalVisible] = useState(false);

  const {
    useCourse,
    useCourseVersions,
    useUpdateCourseDetails,
    useUpdateCourseVersion,
    useCreateDraftVersion,
    usePublishVersion,
    useInfiniteLessonsByVersion,
    useDiscounts,
    useDeleteDiscount,
    useCreateCourse
  } = useCourses();

  const { data: courseData } = useCourse(activeCourseId || null);
  const { data: versionsData, refetch: refetchVersions, isLoading: isLoadingVersions } = useCourseVersions(activeCourseId || null);
  const deleteDiscount = useDeleteDiscount();

  const workingVersion = useMemo(() => {
    if (!versionsData || versionsData.length === 0) return null;
    return versionsData.find(v => v.status === VersionStatus.DRAFT) ||
      versionsData.find(v => v.status === VersionStatus.PUBLIC) ||
      versionsData[0];
  }, [versionsData]);

  const isDraft = useMemo(() => {
    if (!activeCourseId) return true;
    if (!workingVersion) return false;
    return workingVersion.status === VersionStatus.DRAFT;
  }, [activeCourseId, workingVersion]);

  const {
    data: lessonsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteLessonsByVersion({
    versionId: workingVersion?.versionId,
    size: 50
  });

  const [localLessons, setLocalLessons] = useState<LessonResponse[]>([]);

  const serverLessonsList = useMemo(() => {
    const pages = lessonsData?.pages;
    if (!pages) return [] as LessonResponse[];
    return (pages.flatMap((page: any) => page.data || []) as LessonResponse[]);
  }, [lessonsData]);

  useEffect(() => {
    if (serverLessonsList.length > 0) {
      setLocalLessons(serverLessonsList);
    }
  }, [serverLessonsList]);

  const { data: discountsData, refetch: refetchDiscounts } = useDiscounts({
    versionId: workingVersion?.versionId,
    page: 0,
    size: 50
  });

  const handlePriceChange = useCallback((text: string) => {
    const numericValue = text.replace(/[^0-9.]/g, '');
    setPrice(numericValue);
  }, []);

  const handleRefetchDiscounts = (versionId: string) => {
    refetchDiscounts();
  }

  // LOGIC CHÍNH: Set Instruction Language mặc định từ Native Language của User
  useEffect(() => {
    if (isNew && user) {
      // Kiểm tra xem nativeLanguage của user có được hỗ trợ hay không (vi, en, zh)
      // Lưu ý: user.nativeLanguage có thể là undefined, check an toàn
      const userNative = (user as any).nativeLanguage;
      const isSupported = SUPPORTED_INSTRUCTION_LANGUAGES.some(l => l.code === userNative);
      if (isSupported) {
        setInstructionLanguage(userNative);
      } else {
        // Fallback mặc định là 'vi' hoặc ngôn ngữ phổ biến
        setInstructionLanguage('vi');
      }
    }
  }, [isNew, user]);

  useEffect(() => {
    if (courseData) {
      setTitle(courseData.title);
    }
  }, [courseData]);

  useEffect(() => {
    if (workingVersion) {
      if (workingVersion.description) setDescription(workingVersion.description);
      if (workingVersion.price !== undefined && workingVersion.price !== null) {
        setPrice(workingVersion.price.toString());
      }
      if (workingVersion.difficultyLevel) setDifficulty(workingVersion.difficultyLevel);

      // Load instructionLanguage từ version nếu có (Edit mode)
      if ((workingVersion as any).instructionLanguage) {
        setInstructionLanguage((workingVersion as any).instructionLanguage);
      } else if (user) {
        // Nếu đang edit draft cũ chưa có field này, init lại từ user.nativeLanguage
        const userNative = (user as any).nativeLanguage;
        const isSupported = SUPPORTED_INSTRUCTION_LANGUAGES.some(l => l.code === userNative);
        setInstructionLanguage(isSupported ? userNative : 'vi');
      }
    }
  }, [workingVersion, user]);

  const { mutateAsync: createCourseMutateAsync, isPending: isCreatingCourse } = useCreateCourse();
  const { mutateAsync: updateDetailsMutateAsync, isPending: isUpdatingDetails } = useUpdateCourseDetails();
  const { mutateAsync: updateVersionMutateAsync, isPending: isUpdatingVersion } = useUpdateCourseVersion();
  const { mutateAsync: createDraftMutateAsync, isPending: isCreatingDraft } = useCreateDraftVersion();
  const { mutate: publishMutate, isPending: isPublishing } = usePublishVersion();

  const isSaving = isCreatingCourse || isUpdatingDetails || isUpdatingVersion || isCreatingDraft || isPublishing;

  const processedMediaUrl = useMemo(() => {
    const rawUrl = localThumbnailUrl || workingVersion?.thumbnailUrl;
    return getDirectMediaUrl(rawUrl);
  }, [localThumbnailUrl, workingVersion?.thumbnailUrl]);

  const isVideo = useMemo(() => {
    if (!processedMediaUrl) return false;
    const lower = processedMediaUrl.toLowerCase();
    return lower.endsWith('.mp4') || lower.includes('video') || lower.includes('format=mp4');
  }, [processedMediaUrl]);

  const player = useVideoPlayer(isVideo && processedMediaUrl ? processedMediaUrl : "", player => {
    player.loop = true;
    player.muted = true;
    if (isVideo) player.play();
  });

  const handleUploadSuccess = (result: any) => {
    let finalUrl = result.secure_url || result.url || result.fileUrl;
    if (!finalUrl && result.id) {
      finalUrl = `https://drive.google.com/uc?export=download&id=${result.id}`;
    }
    if (!finalUrl && typeof result === 'string') {
      finalUrl = result;
    }

    if (finalUrl) {
      setLocalThumbnailUrl(finalUrl);
    } else {
      Alert.alert(t("error"), "Could not retrieve file URL.");
    }
  };

  const renderLessonItem = ({ item, getIndex, drag, isActive }: RenderItemParams<LessonResponse>) => {
    const index = getIndex() ?? 0;

    return (
      <ScaleDecorator>
        <TouchableOpacity
          style={[
            styles.lessonItem,
            { backgroundColor: isActive ? '#EEF2FF' : '#FFF', opacity: isActive ? 0.9 : 1 }
          ]}
          onPress={() => navigateToLesson(item.lessonId)}
          onLongPress={drag}
          disabled={isActive}
        >
          <Ionicons name="menu" size={24} color="#CCC" style={{ marginRight: 10 }} />
          <Image
            source={getLessonImage(item.thumbnailUrl)}
            style={styles.lessonThumb}
          />
          <View style={styles.lessonContent}>
            <Text style={styles.lessonTitle} numberOfLines={1}>
              {index + 1}. {item.title || item.lessonName}
            </Text>
            <Text style={styles.lessonMeta}>
              {item.isFree ? "Free Preview" : "Locked"} • {item.lessonType}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color="#9CA3AF" />
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  const getFlagForCurrentInstructionLang = () => {
    const lang = SUPPORTED_INSTRUCTION_LANGUAGES.find(l => l.code === instructionLanguage);
    return lang ? getCountryFlag(lang.countryEnum) : "🏳️";
  };

  const getLabelForCurrentInstructionLang = () => {
    const lang = SUPPORTED_INSTRUCTION_LANGUAGES.find(l => l.code === instructionLanguage);
    return lang ? lang.label : instructionLanguage;
  };

  const headerElement = useMemo(() => (
    <View style={styles.contentContainer}>
      <View style={styles.thumbnailContainer}>
        {isVideo && processedMediaUrl ? (
          <VideoView
            player={player}
            style={styles.thumbnail}
            contentFit="cover"
          />
        ) : (
          <Image
            source={processedMediaUrl ? { uri: processedMediaUrl } : require("../../assets/images/ImagePlacehoderCourse.png")}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        )}

        <View style={styles.thumbnailOverlay} />

        <FileUploader
          mediaType="all"
          style={styles.editThumbBtn}
          onUploadSuccess={handleUploadSuccess}
          onUploadStart={() => setIsUploadingThumb(true)}
          onUploadEnd={() => setIsUploadingThumb(false)}
          maxSizeMB={50}
        >
          {isUploadingThumb ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Icon name="edit" size={20} color="#FFF" />
              <Text style={styles.editThumbText}>{t("common.change")}</Text>
            </>
          )}
        </FileUploader>
        <View style={[styles.statusBadge, !isDraft && { backgroundColor: '#10B981' }]}>
          <Text style={styles.statusText}>
            {isDraft ? "DRAFT MODE" : "PUBLIC MODE"}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t("course.title")}</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Course Title (Required)"
        />

        {/* Instruction Language Selector */}
        <Text style={styles.label}>Instruction Language</Text>
        <TouchableOpacity style={styles.langSelector} onPress={() => setShowLangModal(true)}>
          <Text style={{ fontSize: 22, marginRight: 10 }}>{getFlagForCurrentInstructionLang()}</Text>
          <Text style={styles.langSelectorText}>{getLabelForCurrentInstructionLang()}</Text>
          <Icon name="arrow-drop-down" size={24} color="#6B7280" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        <View style={styles.row}>
          <View style={[styles.column, { marginRight: 8 }]}>
            <Text style={styles.label}>{t("course.price")} ($)</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={handlePriceChange}
              keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
              returnKeyType="done"
              autoCorrect={false}
              placeholder="0"
            />
          </View>
          <View style={[styles.column, { marginLeft: 8 }]}>
            <Text style={styles.label}>{t("course.difficulty")}</Text>
            <TextInput style={styles.input} value={String(difficulty)} onChangeText={(t) => setDifficulty(t as DifficultyLevel)} />
          </View>
        </View>

        <Text style={styles.label}>{t("course.description")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Course description (min 20 chars)"
        />
      </View>

      {activeCourseId && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("course.promotions")}</Text>
            <TouchableOpacity
              onPress={() => { setSelectedDiscount(undefined); setShowDiscountModal(true); }}
              disabled={!isDraft || !workingVersion}
            >
              <Text style={[styles.actionLink, (!isDraft || !workingVersion) && { opacity: 0.5 }]}>+ {t("course.addCode")}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={(discountsData?.data || []) as CourseVersionDiscountResponse[]}
            keyExtractor={(item) => item.discountId}
            showsHorizontalScrollIndicator={false}
            ListEmptyComponent={<Text style={styles.emptyText}>{t("course.noDiscounts")}</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.discountCard}
                onPress={() => {
                  if (!isDraft) return;
                  Alert.alert(t("common.options"), item.code, [
                    { text: t("common.cancel"), style: "cancel" },
                    { text: t("common.edit"), onPress: () => { setSelectedDiscount(item); setShowDiscountModal(true); } },
                    { text: t("common.delete"), style: "destructive", onPress: () => handleDeleteDiscount(item.discountId) }
                  ]);
                }}
              >
                <Text style={styles.discountCode}>{item.code}</Text>
                <Text style={styles.discountDetail}>{item.discountPercentage}% OFF</Text>
                <Text style={styles.discountUsage}>
                  {item.isActive ? "Active" : "Inactive"}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {activeCourseId && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("course.curriculum")}</Text>
          <TouchableOpacity style={styles.addLessonBtn} onPress={() => navigateToLesson()}>
            <Icon name="add" size={18} color="#FFF" />
            <Text style={styles.addLessonText}>{t("course.addLesson")}</Text>
          </TouchableOpacity>
        </View>
      )}
      {activeCourseId && localLessons.length > 0 && <Text style={{ fontSize: 12, color: '#999', marginBottom: 10, fontStyle: 'italic', textAlign: 'center' }}>Ấn giữ vào bài học để di chuyển vị trí</Text>}
    </View>
  ), [
    processedMediaUrl,
    isVideo,
    player,
    isUploadingThumb,
    title,
    price,
    description,
    difficulty,
    instructionLanguage,
    discountsData,
    isDraft,
    localLessons.length,
    activeCourseId,
    workingVersion,
    t
  ]);

  const handleSave = async () => {
    if (!title) return Alert.alert(t("error"), t("course.titleRequired"));

    try {
      let targetCourseId = activeCourseId;
      let targetVersion = workingVersion;

      if (!targetCourseId) {
        if (!user?.userId) return Alert.alert(t("error"), "User authentication missing.");

        const newCourse = await createCourseMutateAsync({
          title: title,
          creatorId: user.userId,
          price: parseFloat(price) || 0,
        });

        targetCourseId = newCourse.courseId;
        setActiveCourseId(targetCourseId);
        navigation.setParams({ courseId: targetCourseId, isNew: false });

        Alert.alert(t("success"), t("course.createdSuccess"), [
          { text: "OK", onPress: () => refetchVersions() }
        ]);
        return;
      }

      if (!targetVersion && !isNew) {
        return Alert.alert(t("error"), "Course data is not fully loaded yet. Please wait.");
      }

      await updateDetailsMutateAsync({ id: targetCourseId, req: { title } });

      const versionPayload = {
        description,
        thumbnailUrl: localThumbnailUrl || workingVersion?.thumbnailUrl || "",
        price: parseFloat(price) || 0,
        difficultyLevel: difficulty,
        languageCode: "en", // Target Language mặc định, có thể sửa sau
        instructionLanguage: instructionLanguage, // Field mới
        lessonIds: localLessons.map((l: LessonResponse) => l.lessonId)
      };

      if (isDraft && targetVersion) {
        await updateVersionMutateAsync({
          versionId: targetVersion.versionId,
          req: versionPayload
        });
        Alert.alert(t("success"), t("course.saved"));
      } else if (!isDraft) {
        Alert.alert(
          t("course.editMode"),
          t("course.createDraftPrompt"),
          [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("common.continue"),
              onPress: async () => {
                try {
                  const newDraft = await createDraftMutateAsync(targetCourseId!);
                  await updateVersionMutateAsync({
                    versionId: newDraft.versionId,
                    req: versionPayload
                  });
                  await refetchVersions();
                  Alert.alert(t("success"), t("course.draftCreatedAndSaved"));
                } catch (err) {
                  Alert.alert(t("error"), t("course.saveFailed"));
                }
              }
            }
          ]
        );
      }
    } catch (err: any) {
      console.error("Save error:", err);
      const msg = err?.response?.data?.message || t("course.saveFailed");
      Alert.alert(t("error"), msg);
    }
  };

  const handlePublishConfirm = (reason?: string) => {
    if (!isDraft || !workingVersion) {
      Alert.alert(t("notice"), t("course.noDraftToPublish"));
      setPublishModalVisible(false);
      return;
    }

    publishMutate({
      versionId: workingVersion.versionId,
      req: { reasonForChange: reason || "Update content" }
    }, {
      onSuccess: () => {
        setPublishModalVisible(false);
        refetchVersions();

        // FIX CACHE: Invalidate toàn bộ các danh sách khóa học để người dùng khác thấy update
        queryClient.invalidateQueries({ queryKey: courseKeys.lists() }); // Danh sách Market
        queryClient.invalidateQueries({ queryKey: courseKeys.topSelling(10) }); // Top Selling
        queryClient.invalidateQueries({ queryKey: courseKeys.all }); // NUCLEAR OPTION: Clear hết liên quan đến courses

        Alert.alert(t("success"), t("course.publishSuccess"));
      },
      onError: (err: any) => {
        setPublishModalVisible(false);
        const msg = err?.response?.data?.message || t("course.publishFailed");
        Alert.alert(t("error"), msg);
      }
    });
  };

  const handlePublish = () => {
    if (!isDraft || !workingVersion) {
      Alert.alert(t("notice"), t("course.noDraftToPublish"));
      return;
    }

    if (description !== workingVersion.description || (localThumbnailUrl && localThumbnailUrl !== workingVersion.thumbnailUrl)) {
      Alert.alert(t("notice"), "You have unsaved changes. Please save the course before publishing.");
      return;
    }

    if (!workingVersion.description || workingVersion.description.length < 20) {
      Alert.alert(t("error"), "Description is too short (min 20 chars). Please update and save.");
      return;
    }

    if (!workingVersion.thumbnailUrl) {
      Alert.alert(t("error"), "Course thumbnail is required. Please upload and save.");
      return;
    }

    if (localLessons.length === 0) {
      Alert.alert(t("error"), "Course must have at least one lesson. Please add lessons and save.");
      return;
    }

    setPublishModalVisible(true);
  };

  const handleDeleteDiscount = (id: string) => {
    Alert.alert(t("common.confirm"), t("common.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => deleteDiscount.mutate(id, { onSuccess: () => handleRefetchDiscounts(id) })
      }
    ]);
  };

  const navigateToLesson = (lessonId?: string) => {
    if (!activeCourseId) {
      Alert.alert(t("notice"), "Please save the course first to create lessons.");
      return;
    }
    if (!workingVersion || !workingVersion.versionId) {
      Alert.alert(t("error"), "Draft version not ready. Please try again or save course.");
      return;
    }

    if (!isDraft) {
      Alert.alert(t("notice"), t("course.mustCreateDraftToEditLesson"), [
        { text: "Cancel", style: "cancel" },
        { text: "Create Draft", onPress: handleSave }
      ]);
      return;
    }

    navigation.navigate("CreateLessonScreen", {
      courseId: activeCourseId,
      versionId: workingVersion.versionId,
      lessonId: lessonId,
      // Pass the instruction language to lesson so it can default correctly
      instructionLanguage: instructionLanguage
    });
  };

  if (activeCourseId && (!workingVersion && !isNew) && isLoadingVersions) {
    return (
      <ScreenLayout>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={{ marginTop: 10, color: '#6B7280' }}>Loading course versions...</Text>
        </View>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {(!activeCourseId || isNew) ? t("course.setupNew") : t("course.edit")}
        </Text>
        <View style={styles.headerRight}>
          {isDraft && activeCourseId && (
            <TouchableOpacity
              onPress={handlePublish}
              disabled={isSaving || !workingVersion}
              style={[styles.saveHeaderBtn, { backgroundColor: '#059669', marginRight: 8 }]}
            >
              {isPublishing ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.saveHeaderText}>{t("common.publish")}</Text>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.saveHeaderBtn}>
            {(isCreatingCourse || isUpdatingDetails || isUpdatingVersion || isCreatingDraft) ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.saveHeaderText}>{(!activeCourseId) ? t("common.create") : t("common.save")}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <DraggableFlatList
            data={localLessons}
            onDragEnd={({ data }) => setLocalLessons(data)}
            keyExtractor={(item) => item.lessonId}
            renderItem={renderLessonItem}
            ListHeaderComponent={headerElement}
            contentContainerStyle={styles.listContent}
            onEndReached={() => {
              if (hasNextPage) fetchNextPage();
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ padding: 20 }} /> : null}
            ListEmptyComponent={
              !isFetchingNextPage ? (
                <View style={styles.emptyContainer}>
                  {activeCourseId ? (
                    <Text style={styles.emptyText}>{t("course.noLessonsYet")}</Text>
                  ) : (
                    <Text style={styles.emptyText}>Save course to add lessons</Text>
                  )}
                </View>
              ) : null
            }
            keyboardShouldPersistTaps="handled"
          />
        </GestureHandlerRootView>
      </KeyboardAvoidingView>

      {workingVersion && (
        <DiscountModal
          visible={showDiscountModal}
          onClose={() => setShowDiscountModal(false)}
          versionId={workingVersion.versionId}
          initialData={selectedDiscount}
          onSuccess={handleRefetchDiscounts}
        />
      )}

      <LanguageSelectionModal
        visible={showLangModal}
        onClose={() => setShowLangModal(false)}
        onSelect={(code: string) => { setInstructionLanguage(code); setShowLangModal(false); }}
        selectedCode={instructionLanguage}
      />

      <PublishReasonModal
        visible={publishModalVisible}
        onClose={() => setPublishModalVisible(false)}
        onConfirm={handlePublishConfirm}
      />
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: "#FFF", borderBottomWidth: 1, borderColor: "#E5E7EB" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  headerBtn: { padding: 4 },
  headerRight: { flexDirection: "row" },
  saveHeaderBtn: { backgroundColor: "#4F46E5", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  saveHeaderText: { color: "#FFF", fontWeight: "600", fontSize: 14 },

  contentContainer: { paddingBottom: 10 },
  listContent: { padding: 16, backgroundColor: "#F8FAFC" },

  thumbnailContainer: { height: 200, borderRadius: 12, overflow: "hidden", marginBottom: 20, backgroundColor: "#E5E7EB", position: "relative" },
  thumbnail: { width: "100%", height: "100%" },
  thumbnailOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  editThumbBtn: { position: "absolute", bottom: 12, right: 12, backgroundColor: "rgba(0,0,0,0.6)", flexDirection: "row", alignItems: "center", padding: 8, borderRadius: 8 },
  editThumbText: { color: "#FFF", fontWeight: "600", marginLeft: 6, fontSize: 12 },
  statusBadge: { position: "absolute", top: 12, left: 12, backgroundColor: "#F59E0B", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusText: { color: "#FFF", fontSize: 10, fontWeight: "700" },

  section: { backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#E5E7EB" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  label: { fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 10, fontSize: 15, color: "#1F2937" },
  textArea: { height: 80, textAlignVertical: "top" },
  row: { flexDirection: "row" },
  column: { flex: 1 },

  dateBtn: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#1F2937',
  },

  actionLink: { color: "#4F46E5", fontWeight: "600", fontSize: 14 },
  discountCard: { backgroundColor: "#EEF2FF", padding: 10, borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: "#C7D2FE", minWidth: 100 },
  discountCode: { fontWeight: "700", color: "#4338CA", fontSize: 14 },
  discountDetail: { fontSize: 12, color: "#6366F1", marginTop: 2 },
  discountUsage: { fontSize: 10, color: "#9CA3AF", marginTop: 4 },

  addLessonBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#4F46E5", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, gap: 4 },
  addLessonText: { color: "#FFF", fontSize: 12, fontWeight: "600" },

  lessonItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", padding: 12, borderRadius: 12, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  lessonThumb: { width: 60, height: 40, borderRadius: 6, backgroundColor: "#E5E7EB" },
  lessonContent: { flex: 1, marginLeft: 12 },
  lessonTitle: { fontSize: 14, fontWeight: "600", color: "#1F2937", marginBottom: 2 },
  lessonMeta: { fontSize: 12, color: "#6B7280" },

  emptyContainer: { padding: 20, alignItems: "center" },
  emptyText: { color: "#9CA3AF", fontStyle: "italic" },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', width: '100%', borderRadius: 16, padding: 20, maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  modalActions: { flexDirection: 'row', marginTop: 20, gap: 12 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' },
  confirmBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#4F46E5', alignItems: 'center' },
  cancelText: { fontWeight: '600', color: '#4B5563' },
  confirmText: { fontWeight: '600', color: '#FFF' },

  langSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12 },
  langSelectorText: { fontSize: 15, color: '#1F2937' },
  langModalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  langModalCard: { backgroundColor: '#FFF', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '50%' },
  langOptionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  langOptionText: { fontSize: 16, color: '#1F2937' },
  modalCloseBtn: { marginTop: 12, paddingVertical: 10, alignItems: 'center' },
  modalCloseText: { color: '#4F46E5', fontWeight: '600', fontSize: 16 },
});

export default EditCourseScreen;