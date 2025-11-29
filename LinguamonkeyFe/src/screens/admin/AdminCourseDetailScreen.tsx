import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    Image,
    Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useCourses } from "../../hooks/useCourses";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";

const AdminCourseDetailScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { courseId } = route.params as { courseId: string | null };
    const { useCourse, useCreateCourse, useUpdateCourseDetails, useDeleteCourse } = useCourses();

    const isNew = !courseId;
    const { data: course, isLoading } = useCourse(courseId);

    const [title, setTitle] = useState("");
    const [price, setPrice] = useState("0");
    const [desc, setDesc] = useState("");

    const { mutate: createCourse, isPending: creating } = useCreateCourse();
    const { mutate: updateCourse, isPending: updating } = useUpdateCourseDetails();
    const { mutate: deleteCourse, isPending: deleting } = useDeleteCourse();

    useEffect(() => {
        if (course) {
            setTitle(course.title);
            setPrice(String(course.price));
            setDesc(course.latestPublicVersion?.description || "");
        }
    }, [course]);

    const handleSave = () => {
        const payload = {
            title,
            price: Number(price),
            description: desc,
            // Defaults for simplified UI
            languageCode: "en",
            difficultyLevel: "BEGINNER" as any
        };

        if (isNew) {
            createCourse(payload, {
                onSuccess: () => navigation.goBack()
            });
        } else if (courseId) {
            updateCourse({ id: courseId, req: payload }, {
                onSuccess: () => Alert.alert("Success", "Course updated")
            });
        }
    };

    const handleDelete = () => {
        if (courseId) {
            deleteCourse(courseId, { onSuccess: () => navigation.goBack() });
        }
    };

    if (isLoading && !isNew) return <ActivityIndicator style={{ marginTop: 50 }} />;

    return (
        <ScreenLayout>
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Icon name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.title}>{isNew ? "New Course" : "Edit Course"}</Text>
                    <TouchableOpacity onPress={handleSave} disabled={creating || updating}>
                        {creating || updating ? <ActivityIndicator /> : <Icon name="save" size={24} color="#4F46E5" />}
                    </TouchableOpacity>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Course Title</Text>
                    <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Enter title" />

                    <Text style={styles.label}>Price ($)</Text>
                    <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" />

                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.area]}
                        value={desc}
                        onChangeText={setDesc}
                        multiline
                        textAlignVertical="top"
                    />
                </View>

                {!isNew && (
                    <TouchableOpacity style={styles.delBtn} onPress={handleDelete} disabled={deleting}>
                        <Text style={styles.delText}>Delete Course</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: "#fff" },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    title: { fontSize: 18, fontWeight: '700' },
    form: { padding: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#64748B', marginTop: 16, marginBottom: 8 },
    input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, fontSize: 16 },
    area: { height: 120 },
    delBtn: { margin: 20, backgroundColor: '#FEF2F2', padding: 16, borderRadius: 12, alignItems: 'center' },
    delText: { color: '#EF4444', fontWeight: '700' }
});

export default AdminCourseDetailScreen;