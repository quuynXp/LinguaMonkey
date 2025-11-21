import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { useCourses } from '../../hooks/useCourses';
import { useNavigation, useRoute } from '@react-navigation/native';

const CourseManagerScreen = () => {
    const route = useRoute<any>();
    const { courseId } = route.params; // ID khóa học truyền từ Dashboard
    const navigation = useNavigation<any>();

    const { useCourse, useCreateNewDraftVersion, usePublishCourseVersion } = useCourses();

    // Lấy chi tiết khóa học (bao gồm latestPublicVersion)
    const { data: course, isLoading, refetch } = useCourse(courseId);

    const { createNewDraftVersion, isCreatingDraft } = useCreateNewDraftVersion();
    const { publishCourseVersion, isPublishing } = usePublishCourseVersion();

    const handleCreateDraft = () => {
        createNewDraftVersion(courseId, {
            onSuccess: () => {
                Alert.alert('Thành công', 'Đã tạo phiên bản nháp mới. Bạn có thể bắt đầu chỉnh sửa.');
                refetch();
            },
            onError: (err) => Alert.alert('Lỗi', err.message)
        });
    };

    const handlePublish = (versionId: string) => {
        Alert.prompt(
            "Xuất bản khóa học",
            "Vui lòng nhập lý do thay đổi (ví dụ: Cập nhật bài 1)",
            (reason) => {
                if (reason) {
                    publishCourseVersion({
                        versionId,
                        publishData: { reasonForChange: reason }
                    }, {
                        onSuccess: () => {
                            Alert.alert('Đã gửi', 'Phiên bản đang chờ duyệt hoặc đã được xuất bản.');
                            refetch();
                        },
                        onError: (err) => Alert.alert('Lỗi', err.message)
                    });
                }
            }
        );
    };

    if (isLoading || !course) return <Text>Loading...</Text>;

    // Logic xác định trạng thái version hiện tại
    const currentVersion = course.latestPublicVersion; // Đây là public. Cần logic lấy Draft nếu có. 
    // Lưu ý: API getCourseById trả về latestPublicVersion. 
    // Nếu muốn lấy Draft, bạn cần API riêng hoặc check trong list versions (nếu BE trả về).
    // Ở đây giả sử CreatorDashboard đã trả về danh sách version hoặc ta dùng API getTeacherCourses để lọc.

    return (
        <ScrollView style={styles.container}>
            <Image source={{ uri: course.thumbnailUrl || 'https://via.placeholder.com/300' }} style={styles.cover} />

            <View style={styles.header}>
                <Text style={styles.title}>{course.title}</Text>
                <Text style={[styles.status, { color: course.approvalStatus === 'APPROVED' ? 'green' : 'orange' }]}>
                    {course.approvalStatus}
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionHeader}>Phiên bản hiện tại (Public)</Text>
                {currentVersion ? (
                    <View style={styles.versionCard}>
                        <Text style={styles.versionText}>Version {currentVersion.versionNumber}</Text>
                        <Text>Xuất bản: {new Date(currentVersion.publishedAt!).toLocaleDateString()}</Text>
                    </View>
                ) : (
                    <Text>Chưa có phiên bản công khai.</Text>
                )}
            </View>

            <View style={styles.actions}>
                <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('EditCourseDetails', { courseId })}>
                    <Text style={styles.btnText}>Chỉnh sửa thông tin chung</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleCreateDraft} disabled={isCreatingDraft}>
                    <Text style={styles.btnText}>Tạo bản nháp mới (v{(currentVersion?.versionNumber || 0) + 1})</Text>
                </TouchableOpacity>

                {/* Nút quản lý bài học (Curriculum) */}
                <TouchableOpacity
                    style={styles.btn}
                    onPress={() => navigation.navigate('CurriculumManager', { courseId, versionId: currentVersion?.versionId })} // Cần logic lấy draft ID chính xác
                >
                    <Text style={styles.btnText}>Quản lý bài học</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    cover: { width: '100%', height: 200 },
    header: { padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold' },
    status: { marginTop: 5, fontWeight: '600' },
    section: { padding: 20, borderTopWidth: 1, borderColor: '#eee' },
    sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    versionCard: { padding: 15, backgroundColor: '#f9f9f9', borderRadius: 8 },
    versionText: { fontWeight: 'bold', fontSize: 16 },
    actions: { padding: 20 },
    btn: { padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', marginBottom: 10 },
    btnPrimary: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
    btnText: { fontWeight: '600' }
});

export default CourseManagerScreen;