import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useCourses } from '../../hooks/useCourses';
import { useUserStore } from '../../stores/UserStore';

const CreatorDashboard = ({ navigation }) => {
    const creatorId = useUserStore.getState().user.userId;

    const { data: courses, refetch } = useCourses().useTeacherCourses(creatorId);

    // Hook các hành động versioning
    const { createNewDraftVersion, isCreatingDraft } = useCourses().useCreateNewDraftVersion();
    const { publishCourseVersion } = useCourses().usePublishCourseVersion();

    const handleCreateDraft = async (courseId: string) => {
        try {
            await createNewDraftVersion(courseId);
            Alert.alert("Thành công", "Đã tạo phiên bản nháp mới (v+1). Hãy vào chỉnh sửa!");
            refetch(); // Reload list
        } catch (error: any) {
            // Backend sẽ throw error nếu đã có bản Draft rồi (theo logic CourseServiceImpl)
            Alert.alert("Lỗi", error?.response?.data?.message || "Không thể tạo bản nháp");
        }
    };

    const handlePublish = async (versionId: string) => {
        try {
            // Yêu cầu nhập lý do thay đổi (Reason for change)
            Alert.prompt("Lý do cập nhật", "Nhập thay đổi trong phiên bản này:", async (reason) => {
                if (reason) {
                    await publishCourseVersion({ versionId, publishData: { reasonForChange: reason } });
                    Alert.alert("Đã gửi duyệt", "Phiên bản đang chờ Admin duyệt.");
                    refetch();
                }
            });
        } catch (error) {
            Alert.alert("Lỗi", "Không thể publish version này.");
        }
    };

    return (
        <View style={{ flex: 1, padding: 16 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Quản lý khóa học</Text>
            <FlatList
                data={courses?.data}
                keyExtractor={(item) => item.courseId}
                renderItem={({ item }) => {
                    const publicVer = item.latestPublicVersion;
                    // Logic hiển thị version draft (cần BE trả về thêm field draftVersion trong Course hoặc phải call API getDetail)
                    // Giả sử item trả về có status
                    return (
                        <View style={{ padding: 16, backgroundColor: 'white', marginBottom: 10, borderRadius: 8 }}>
                            <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{item.title}</Text>
                            <Text>Public Version: {publicVer ? `v${publicVer.versionNumber}` : 'Chưa public'}</Text>
                            <Text>Trạng thái: {item.approvalStatus}</Text>

                            <View style={{ flexDirection: 'row', marginTop: 10 }}>
                                <TouchableOpacity
                                    onPress={() => handleCreateDraft(item.courseId)}
                                    style={{ marginRight: 10, backgroundColor: '#e0e0e0', padding: 8, borderRadius: 4 }}>
                                    <Text>Tạo bản Draft mới</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => navigation.navigate('EditCourse', { courseId: item.courseId })}
                                    style={{ backgroundColor: '#4A90E2', padding: 8, borderRadius: 4 }}>
                                    <Text style={{ color: 'white' }}>Chỉnh sửa nội dung</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )
                }}
            />
        </View>
    );
};
export default CreatorDashboard;