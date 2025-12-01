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
import ScreenLayout from '../../components/layout/ScreenLayout';
import { gotoTab } from '../../utils/navigationRef';

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
        if (!result.canceled) setThumbnailAsset(result.assets[0]);
    };

    const pickMedia = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['video/*', 'audio/*'],
                copyToCacheDirectory: true,
            });
            if (!result.canceled) setMediaFile(result.assets[0]);
        } catch (err) { console.warn(err); }
    };

    const handleCreate = async () => {
        if (!lessonName.trim()) {
            Alert.alert('Required', 'Please enter a Lesson Name.');
            return;
        }
        if (!user?.userId) {
            Alert.alert('Error', 'User invalid. Login again.');
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
                    name: 'thumbnail.jpg',
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
                ? `${description || ''}\n\n[Media]: ${uploadedMediaUrl}`
                : (description || '');

            // FIX: Ensure no nulls are sent for required backend enums/numbers
            const payload: LessonRequest = {
                lessonName: lessonName.trim(),
                creatorId: user.userId,
                description: finalDescription,
                thumbnailUrl: uploadedThumbnailUrl,

                // Defaults for Backend constraints
                languageCode: 'vi',
                title: lessonName.trim(),
                expReward: 10,
                orderIndex: 0,
                isFree: true,
                lessonType: 'VOCABULARY' as any, // Enum mapping default
                skillTypes: 'READING',
                lessonSeriesId: '',
                lessonCategoryId: '',
                lessonSubCategoryId: '',
                difficultyLevel: 'BEGINNER' as any, // Enum mapping default
                durationSeconds: 0,
                certificateCode: '',
                passScorePercent: 80,
                shuffleQuestions: false,
                allowedRetakeCount: 999
            };

            const newLesson = await createLessonMutation.mutateAsync(payload);

            Alert.alert('Success', 'Lesson created!', [
                {
                    text: 'Open Flashcards',
                    onPress: () => {
                        gotoTab("LearnStack",'VocabularyFlashcardsScreen', {
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
                <Text style={styles.headerTitle}>Create Lesson</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.hintText}>Only Lesson Name is required. Others are optional.</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Lesson Name <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Daily Conversation"
                        value={lessonName}
                        onChangeText={setLessonName}
                        editable={!isSubmitting}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Optional description..."
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        editable={!isSubmitting}
                    />
                </View>

                <View style={styles.mediaRow}>
                    <TouchableOpacity style={styles.mediaBtn} onPress={pickThumbnail}>
                        <Ionicons name="image-outline" size={24} color="#666" />
                        <Text style={styles.mediaText}>{thumbnailAsset ? "Image Selected" : "Add Thumbnail"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.mediaBtn} onPress={pickMedia}>
                        <Ionicons name="videocam-outline" size={24} color="#666" />
                        <Text style={styles.mediaText}>{mediaFile ? "Media Selected" : "Add Video/Audio"}</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.createButton, isSubmitting && styles.disabledButton]}
                    onPress={handleCreate}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.createButtonText}>Create & Continue</Text>}
                </TouchableOpacity>
            </View>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', marginTop: Platform.OS === 'android' ? 30 : 0 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
    backButton: { padding: 4 },
    scrollContent: { padding: 20 },
    hintText: { color: '#7F8C8D', marginBottom: 20, fontSize: 13, fontStyle: 'italic' },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
    required: { color: 'red' },
    input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 16 },
    textArea: { height: 100, textAlignVertical: 'top' },
    mediaRow: { flexDirection: 'row', justifyContent: 'space-between' },
    mediaBtn: { flex: 0.48, height: 100, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    mediaText: { marginTop: 8, color: '#666', fontSize: 12 },
    footer: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
    createButton: { backgroundColor: '#4ECDC4', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    disabledButton: { backgroundColor: '#A0E6E1' },
    createButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default CreateLessonScreen;