import { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    TextInput,
    Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useRoute, useNavigation } from "@react-navigation/native";
import Toast from "../../components/Toast";
import { useCourses } from "../../hooks/useCourses";
import type { Course } from "../../hooks/useCourses";
import { goBack } from "../../utils/navigationRef";
import { createScaledSheet } from "../../utils/scaledStyles";
import ScreenLayout from "../../components/layout/ScreenLayout";

const AdminCourseDetailScreen = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const route = useRoute();
    const { courseId } = route.params as { courseId: string };

    const [refreshing, setRefreshing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Course>>({});

    const { useCourse, useUpdateCourse, useDeleteCourse } = useCourses();

    const { data: course, isLoading, refetch } = useCourse(courseId);

    const { updateCourse, isUpdating } = useUpdateCourse();
    const { deleteCourse, isDeleting } = useDeleteCourse();

    useEffect(() => {
        if (course) {
            setFormData(course);
        }
    }, [course]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refetch();
        } catch (err) {
            Toast.show({ type: "error", text1: t("common.error"), text2: t("errors.unknown") });
        } finally {
            setRefreshing(false);
        }
    }, [refetch, t]);

    const handleChangeText = (field: keyof Course, value: string | number) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleToggleEdit = () => {
        if (isEditing) {
            setFormData(course || {});
        }
        setIsEditing((prev) => !prev);
    };

    const handleUpdate = async () => {
        if (isUpdating) return;
        try {
            await updateCourse({ courseId, courseData: formData });
            Toast.show({ type: "success", text1: t("common.success"), text2: t("admin.courseDetail.updateSuccess") });
            setIsEditing(false);
            refetch();
        } catch (err) {
            Toast.show({ type: "error", text1: t("common.error"), text2: (err as Error).message || t("errors.unknown") });
        }
    };

    const handleDelete = () => {
        Alert.alert(
            t("admin.courseDetail.delete.title"),
            t("admin.courseDetail.delete.message"),
            [
                { text: t("common.cancel"), style: "cancel" },
                {
                    text: t("common.delete"),
                    style: "destructive",
                    onPress: async () => {
                        if (isDeleting) return;
                        try {
                            await deleteCourse(courseId);
                            Toast.show({
                                type: "success",
                                text1: t("admin.courseDetail.delete.successTitle"),
                                text2: t("admin.courseDetail.delete.successMessage")
                            });
                            navigation.goBack();
                        } catch (err) {
                            Toast.show({ type: "error", text1: t("common.error"), text2: (err as Error).message || t("errors.unknown") });
                        }
                    },
                },
            ]
        );
    };

    const renderField = (label: string, field: keyof Course, multiline = false, keyboardType: "default" | "numeric" = "default") => {
        const value = formData[field] ?? "";
        return (
            <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>{label}</Text>
                {isEditing ? (
                    <TextInput
                        style={[styles.textInput, multiline && styles.multilineInput]}
                        value={value?.toString()}
                        onChangeText={(text) => handleChangeText(field, keyboardType === "numeric" ? Number(text) || 0 : text)}
                        multiline={multiline}
                        keyboardType={keyboardType}
                        placeholder={label}
                    />
                ) : (
                    <Text style={styles.fieldValue}>{value?.toString() || t("common.notAvailable")}</Text>
                )}
            </View>
        );
    };

    if (isLoading && !course) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </SafeAreaView>
        );
    }

    return (
        <ScreenLayout style={styles.container}>
            {/* Header */}
            <View style={styles.headerArea}>
                <TouchableOpacity style={styles.headerButton} onPress={goBack}>
                    <Icon name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t("admin.courseDetail.title")}</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerButton} onPress={isEditing ? handleUpdate : handleToggleEdit}>
                        {isUpdating ? <ActivityIndicator size="small" color="#4F46E5" /> : <Icon name={isEditing ? "save" : "edit"} size={22} color="#4F46E5" />}
                    </TouchableOpacity>
                    {isEditing && (
                        <TouchableOpacity style={styles.headerButton} onPress={handleToggleEdit}>
                            <Icon name="cancel" size={22} color="#EF4444" />
                        </TouchableOpacity>
                    )}
                    {!isEditing && (
                        <TouchableOpacity style={styles.headerButton} onPress={handleDelete}>
                            {isDeleting ? <ActivityIndicator size="small" color="#EF4444" /> : <Icon name="delete" size={22} color="#EF4444" />}
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Content */}
            <ScrollView
                contentContainerStyle={styles.contentContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            >
                {/* Thumbnail */}
                {isEditing ? (
                    renderField(t("admin.courseDetail.form.thumbnailUrl"), "thumbnailUrl")
                ) : (
                    <Image
                        source={{ uri: course?.thumbnailUrl || "https://via.placeholder.com/400x200" }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                    />
                )}

                {/* Form Fields */}
                {renderField(t("admin.courseDetail.form.title"), "title")}
                {renderField(t("admin.courseDetail.form.description"), "description", true)}
                {renderField(t("admin.courseDetail.form.difficultyLevel"), "difficultyLevel")}
                {renderField(t("admin.courseDetail.form.type"), "type")}
                {renderField(t("admin.courseDetail.form.price"), "price", false, "numeric")}

                {/* Read-only fields */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>{t("admin.courseDetail.form.courseId")}</Text>
                    <Text style={styles.fieldValue}>{course?.courseId}</Text>
                </View>
                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>{t("admin.courseDetail.form.creatorId")}</Text>
                    <Text style={styles.fieldValue}>{course?.creatorId}</Text>
                </View>
                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>{t("admin.courseDetail.form.createdAt")}</Text>
                    <Text style={styles.fieldValue}>{course?.createdAt ? new Date(course.createdAt).toLocaleString() : t("common.notAvailable")}</Text>
                </View>
            </ScrollView>
        </ScreenLayout>

    );
};

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },
    headerArea: {
        padding: 16,
        backgroundColor: "#fff",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    headerTitle: { fontSize: 18, fontWeight: "700" },
    headerButton: { padding: 8 },
    headerActions: { flexDirection: "row", alignItems: "center" },
    contentContainer: { padding: 16 },
    thumbnail: {
        width: "100%",
        height: 200,
        borderRadius: 12,
        marginBottom: 16,
        backgroundColor: "#E2E8F0",
    },
    fieldContainer: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#475569",
        marginBottom: 6,
    },
    fieldValue: {
        fontSize: 16,
        color: "#1E293B",
        paddingVertical: 10,
    },
    textInput: {
        backgroundColor: "#FFFFFF",
        borderColor: "#CBD5E1",
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: "#1E293B",
    },
    multilineInput: {
        minHeight: 100,
        textAlignVertical: "top",
    },
});

export default AdminCourseDetailScreen;