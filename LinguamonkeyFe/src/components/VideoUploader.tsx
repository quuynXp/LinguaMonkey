import React, { useState } from 'react';
import {
    View,
    Text,
    Button,
    StyleSheet,
    ActivityIndicator,
    Alert
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import Video from 'react-native-video';
import { uploadTemp } from '../services/cloudinary';
import { SafeAreaView } from 'react-native-safe-area-context';

type DocumentPickerResult = DocumentPicker.DocumentPickerResult;

const VideoUploader = () => {
    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const pickDocument = async () => {
        setStreamUrl(null);
        setFileName(null);

        try {
            const result: DocumentPickerResult = await DocumentPicker.getDocumentAsync({
                type: 'video/*,audio/*',
                copyToCacheDirectory: true,
            });

            if (result.canceled) {
                return;
            }

            const file = result.assets[0];

            if (file) {
                setFileName(file.name);
                await handleUpload(file);
            }

        } catch (err) {
            Alert.alert('Lỗi', 'Không thể chọn file.');
            console.error(err);
        }
    };

    const handleUpload = async (file: DocumentPicker.DocumentPickerAsset) => {
        setLoading(true);

        console.log('Uploading file.uri =', file.uri);
        console.log('file mimeType =', file.mimeType, 'file name =', file.name);

        try {
            const filePayload = {
                uri: file.uri,
                type: file.mimeType || 'video/mp4',
                name: file.name || 'upload.mp4'
            };

            const fileId = await uploadTemp(filePayload);
            const streamingUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

            setStreamUrl(streamingUrl);
            Alert.alert('Thành công', `File ID: ${fileId}. Sẵn sàng phát.`);

        } catch (e) {
            Alert.alert('Lỗi Upload', 'Upload thất bại. Kiểm tra server.');
            console.error('Lỗi upload:', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Google Drive Video Streaming</Text>

            <View style={styles.buttonContainer}>
                <Button
                    title={streamUrl ? "Chọn File Khác" : "Chọn Video/Audio & Upload"}
                    onPress={pickDocument}
                    disabled={loading}
                />
            </View>

            {loading && (
                <View style={styles.statusBox}>
                    <ActivityIndicator size="large" color="#0000ff" />
                    <Text style={styles.statusText}>Đang tải lên: {fileName || '...'}</Text>
                </View>
            )}

            {streamUrl && !loading && (
                <View style={styles.videoWrapper}>
                    <Text style={styles.playbackTitle}>Đang Phát: {fileName}</Text>
                    <Video
                        source={{ uri: streamUrl }}
                        style={styles.videoPlayer}
                        controls={true}
                        resizeMode="contain"
                        onError={(e) => {
                            console.error('Lỗi phát Video:', e);
                            Alert.alert('Lỗi Phát', 'Không thể phát stream.');
                        }}
                        paused={false}
                    />
                    <Text style={styles.urlText} numberOfLines={1}>URL: {streamUrl}</Text>
                </View>
            )}

            {!streamUrl && !loading && fileName && (
                <Text style={styles.statusText}>Đã chọn: {fileName}. Đang xử lý...</Text>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 50,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 30,
    },
    buttonContainer: {
        width: '80%',
        marginBottom: 20,
    },
    statusBox: {
        alignItems: 'center',
        padding: 20,
    },
    statusText: {
        marginVertical: 10,
        fontSize: 16,
        textAlign: 'center',
    },
    videoWrapper: {
        width: '100%',
        paddingHorizontal: 20,
        marginTop: 30,
    },
    playbackTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
    },
    videoPlayer: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: 'black',
        borderRadius: 8,
    },
    urlText: {
        marginTop: 10,
        fontSize: 12,
        color: '#666',
    }
});

export default VideoUploader;