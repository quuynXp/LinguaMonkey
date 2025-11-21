import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import instance from '../../api/axiosInstance';

const AdminCreateVideoScreen = ({ navigation }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [level, setLevel] = useState('beginner');
    const [sourceLang, setSourceLang] = useState('en');
    const [targetLang, setTargetLang] = useState('vi');

    // File State
    const [videoFile, setVideoFile] = useState<DocumentPickerResponse | null>(null);
    const [subtitleFile, setSubtitleFile] = useState<DocumentPickerResponse | null>(null);

    const handlePickVideo = async () => {
        try {
            const res = await DocumentPicker.pickSingle({
                type: [DocumentPicker.types.video],
            });
            setVideoFile(res);
        } catch (err) {
            if (!DocumentPicker.isCancel(err)) console.error(err);
        }
    };

    const handlePickSubtitle = async () => {
        try {
            const res = await DocumentPicker.pickSingle({
                type: [DocumentPicker.types.allFiles], // .srt thường ko có mime chuẩn
            });
            // Check extension thủ công nếu cần
            if (res.name?.endsWith('.srt') || res.name?.endsWith('.vtt')) {
                setSubtitleFile(res);
            } else {
                Alert.alert("Invalid Format", "Please select a .srt file");
            }
        } catch (err) {
            if (!DocumentPicker.isCancel(err)) console.error(err);
        }
    };

    const handleSubmit = async () => {
        if (!title || !videoFile || !subtitleFile) {
            Alert.alert("Missing Info", "Please fill all fields and select files.");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('level', level);
            formData.append('sourceLang', sourceLang);
            formData.append('targetLang', targetLang);

            // Append Video
            formData.append('videoFile', {
                uri: videoFile.uri,
                type: videoFile.type || 'video/mp4',
                name: videoFile.name,
            });

            // Append Subtitle
            formData.append('subtitleFile', {
                uri: subtitleFile.uri,
                type: subtitleFile.type || 'application/x-subrip', // text/plain cũng ok
                name: subtitleFile.name,
            });

            // Gọi API "All-in-one" đã tạo ở Java
            const response = await instance.post('/api/v1/videos/admin/create-full', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 60000, // Tăng timeout vì upload + dịch tốn thời gian
            });

            if (response.data.code === 200) {
                Alert.alert("Success", "Video created & Subtitles generated!");
                navigation.goBack();
            } else {
                Alert.alert("Error", response.data.message);
            }
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", error.message || "Upload failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>Upload New Video Lesson</Text>

            {/* Title Input */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Video Title</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ex: Basic Greeting"
                    value={title}
                    onChangeText={setTitle}
                />
            </View>

            {/* Level Picker */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Level</Text>
                <View style={styles.pickerContainer}>
                    <Picker selectedValue={level} onValueChange={setLevel}>
                        <Picker.Item label="Beginner" value="beginner" />
                        <Picker.Item label="Intermediate" value="intermediate" />
                        <Picker.Item label="Advanced" value="advanced" />
                    </Picker>
                </View>
            </View>

            {/* Languages */}
            <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Original Lang</Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={sourceLang} onValueChange={setSourceLang}>
                            <Picker.Item label="English" value="en" />
                            <Picker.Item label="Chinese" value="zh" />
                        </Picker>
                    </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Target Lang (Auto Translate)</Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={targetLang} onValueChange={setTargetLang}>
                            <Picker.Item label="Vietnamese" value="vi" />
                            <Picker.Item label="Korean" value="ko" />
                        </Picker>
                    </View>
                </View>
            </View>

            {/* File Pickers */}
            <View style={styles.fileSection}>
                <Text style={styles.label}>Video File</Text>
                <TouchableOpacity style={styles.fileButton} onPress={handlePickVideo}>
                    <Icon name="video-library" size={24} color="#2196F3" />
                    <Text style={styles.fileText}>
                        {videoFile ? videoFile.name : "Select Video (MP4)"}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.fileSection}>
                <Text style={styles.label}>Source Subtitle File (.srt)</Text>
                <TouchableOpacity style={styles.fileButton} onPress={handlePickSubtitle}>
                    <Icon name="subtitles" size={24} color="#FF9800" />
                    <Text style={styles.fileText}>
                        {subtitleFile ? subtitleFile.name : "Select Source Subtitle"}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
                style={[styles.submitButton, loading && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.submitButtonText}>Create & Generate Subtitles</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#fff' },
    header: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, color: '#333' },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
    pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    fileSection: { marginBottom: 20 },
    fileButton: {
        flexDirection: 'row', alignItems: 'center', padding: 16,
        backgroundColor: '#f5f9ff', borderRadius: 8, borderWidth: 1,
        borderColor: '#2196F3', borderStyle: 'dashed'
    },
    fileText: { marginLeft: 12, fontSize: 16, color: '#333', flex: 1 },
    submitButton: { backgroundColor: '#2196F3', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 12 },
    disabledButton: { backgroundColor: '#ccc' },
    submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default AdminCreateVideoScreen;