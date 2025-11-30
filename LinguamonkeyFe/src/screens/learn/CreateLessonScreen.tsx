import React, { useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image,
    Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLessons } from '../../hooks/useLessons';
import { useUserStore } from '../../stores/UserStore';
import { uploadTemp } from '../../services/cloudinary';
import { LessonRequest } from '../../types/dto';
// Giả định import này tồn tại trong dự án của bạn
import { DifficultyLevel, LessonType } from '../../types/enums';
import { gotoTab } from '../../utils/navigationRef';
import ScreenLayout from '../../components/layout/ScreenLayout';

const CreateLessonScreen = () => {
    const navigation = useNavigation();
    const user = useUserStore(state => state.user);
    const { useCreateLesson } = useLessons();
    const createLessonMutation = useCreateLesson();

    const [lessonName, setLessonName] = useState('');
    const [description, setDescription] = useState('');

    const [thumbnailAsset, setThumbnailAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [mediaFile, setMediaFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const pickThumbnail = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled) {
            setThumbnailAsset(result.assets[0]);
        }
    };

    const pickMedia = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['video/*', 'audio/*'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled) {
                setMediaFile(result.assets[0]);
            }
        } catch (err) {
            console.warn(err);
        }
    };

    const handleCreate = async () => {
        if (!lessonName.trim()) {
            Alert.alert('Missing Information', 'Lesson Name is required.');
            return;
        }

        if (!user?.userId) {
            Alert.alert('Error', 'User information missing. Please login again.');
            return;
        }

        setIsSubmitting(true);

        try {
            let uploadedThumbnailUrl = '';
            let uploadedMediaUrl = '';

            if (thumbnailAsset) {
                const thumbPayload = {
                    uri: thumbnailAsset.uri,
                    type: 'image/jpeg',
                    name: thumbnailAsset.fileName || 'thumbnail.jpg',
                };
                const thumbId = await uploadTemp(thumbPayload as any);
                uploadedThumbnailUrl = `https://drive.google.com/uc?export=download&id=${thumbId}`;
            }

            if (mediaFile) {
                const mediaPayload = {
                    uri: mediaFile.uri,
                    type: mediaFile.mimeType || 'video/mp4',
                    name: mediaFile.name || 'media.mp4',
                };
                const mediaId = await uploadTemp(mediaPayload as any);
                uploadedMediaUrl = `https://drive.google.com/uc?export=download&id=${mediaId}`;
            }

            const finalDescription = uploadedMediaUrl
                ? `${description}\n\n[Media Attachment]: ${uploadedMediaUrl}`
                : description;

            const payload: LessonRequest = {
                lessonName: lessonName,
                creatorId: user.userId,
                description: finalDescription,
                thumbnailUrl: uploadedThumbnailUrl,

                languageCode: 'vi',
                title: lessonName,
                expReward: 10,
                orderIndex: 0,
                isFree: true,
                lessonType: 'VOCABULARY' as any,
                skillTypes: 'READING',
                lessonSeriesId: '',
                lessonCategoryId: '',
                lessonSubCategoryId: '',
                difficultyLevel: 'BEGINNER' as any,
                durationSeconds: 0,
                certificateCode: '',
                passScorePercent: 80,
                shuffleQuestions: false,
                allowedRetakeCount: 999
            };

            const newLesson = await createLessonMutation.mutateAsync(payload);

            Alert.alert('Success', 'Lesson created successfully!', [
                {
                    text: 'Create Flashcards Now',
                    onPress: () => {
                        gotoTab("Learn",'VocabularyFlashcardsScreen', {
                            lessonId: newLesson.lessonId,
                            lessonName: newLesson.lessonName
                        });
                    }
                }
            ]);

        } catch (error) {
            console.error('Create Lesson Error:', error);
            Alert.alert('Error', 'Failed to create lesson. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScreenLayout style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create New Lesson</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Lesson Name <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ex: Basic Conversation 101"
                        value={lessonName}
                        onChangeText={setLessonName}
                        editable={!isSubmitting}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Description (Optional)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="What is this lesson about?"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        editable={!isSubmitting}
                        textAlignVertical="top"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Thumbnail Image (Optional)</Text>
                    <TouchableOpacity
                        style={styles.uploadBox}
                        onPress={pickThumbnail}
                        disabled={isSubmitting}
                    >
                        {thumbnailAsset ? (
                            <Image source={{ uri: thumbnailAsset.uri }} style={styles.previewImage} />
                        ) : (
                            <View style={styles.uploadPlaceholder}>
                                <Ionicons name="image-outline" size={32} color="#888" />
                                <Text style={styles.uploadText}>Tap to select image</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Intro Video/Audio (Optional)</Text>
                    <TouchableOpacity
                        style={styles.uploadBox}
                        onPress={pickMedia}
                        disabled={isSubmitting}
                    >
                        {mediaFile ? (
                            <View style={styles.filePreview}>
                                <Ionicons name="videocam" size={32} color="#4ECDC4" />
                                <Text style={styles.fileName} numberOfLines={1}>
                                    {mediaFile.name}
                                </Text>
                                <Text style={styles.fileSize}>
                                    {mediaFile.size ? (mediaFile.size / 1024 / 1024).toFixed(2) + ' MB' : ''}
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.uploadPlaceholder}>
                                <Ionicons name="cloud-upload-outline" size={32} color="#888" />
                                <Text style={styles.uploadText}>Tap to upload Video or Audio</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.createButton, isSubmitting && styles.disabledButton]}
                    onPress={handleCreate}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.createButtonText}>Create Lesson</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        marginTop: Platform.OS === 'android' ? 30 : 0,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    scrollContent: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    required: {
        color: 'red',
    },
    input: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#333',
    },
    textArea: {
        height: 100,
    },
    uploadBox: {
        height: 150,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
        borderRadius: 8,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadPlaceholder: {
        alignItems: 'center',
    },
    uploadText: {
        marginTop: 8,
        color: '#888',
        fontSize: 14,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    filePreview: {
        alignItems: 'center',
        padding: 20,
    },
    fileName: {
        marginTop: 8,
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        textAlign: 'center',
    },
    fileSize: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    footer: {
        padding: 20,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    createButton: {
        backgroundColor: '#4ECDC4',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: "#4ECDC4",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledButton: {
        backgroundColor: '#A0E6E1',
    },
    createButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default CreateLessonScreen;