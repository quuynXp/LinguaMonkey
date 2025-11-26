import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { uploadTemp } from '../services/cloudinary';
import { Alert } from 'react-native';

export const pickAndUploadMedia = async (
    onUploadStart: () => void,
    onUploadSuccess: (url: string, type: 'IMAGE' | 'VIDEO') => void,
    onUploadError: (error: any) => void
) => {
    try {
        // 1. Request Permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Need access to gallery to send images.');
            return;
        }

        // 2. Pick Image
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, // Currently focusing on images as requested mostly
            allowsEditing: true,
            quality: 1, // Start high, compress later
        });

        if (result.canceled) return;

        const asset = result.assets[0];
        onUploadStart();

        // 3. Compress Image
        const manipResult = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 1080 } }], // Resize to max width 1080px
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG } // Compress to 60% quality
        );

        // 4. Upload to Cloudinary via Backend
        const publicIdOrPath = await uploadTemp({
            uri: manipResult.uri,
            name: asset.fileName || 'upload.jpg',
            type: 'image/jpeg',
        });

        // NOTE: Backend returns a String (path/publicId). 
        // If backend returns full URL, great. If not, construct it or use as is if backend handles ID.
        // Assuming here the backend returns the identifier we need to send in the message.

        onUploadSuccess(publicIdOrPath, 'IMAGE');

    } catch (error) {
        console.error("Media Upload Error:", error);
        onUploadError(error);
    }
};