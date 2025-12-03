import React, { ReactNode } from 'react';
import { TouchableOpacity, Alert, ViewStyle, StyleProp } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { uploadTemp } from '../../services/cloudinary';
import { useTranslation } from 'react-i18next';

type MediaType = 'image' | 'video' | 'audio' | 'document' | 'all';

interface FileUploaderProps {
    onUploadStart?: () => void;
    onUploadEnd?: () => void;
    onUploadSuccess: (result: any) => void;
    onUploadError?: (error: any) => void;
    mediaType?: MediaType;
    style?: StyleProp<ViewStyle>;
    children: ReactNode;
    allowEditing?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
    onUploadStart,
    onUploadEnd,
    onUploadSuccess,
    onUploadError,
    mediaType = 'all',
    style,
    children,
    allowEditing = false,
}) => {
    const { t } = useTranslation();

    const handleUpload = async (file: { uri: string; name: string; type: string }) => {
        try {
            if (onUploadStart) onUploadStart();
            const response = await uploadTemp(file);
            onUploadSuccess(response);
        } catch (error) {
            console.error('Upload failed:', error);
            if (onUploadError) {
                onUploadError(error);
            } else {
                Alert.alert(t('common.error'), t('errors.uploadFailed'));
            }
        } finally {
            if (onUploadEnd) onUploadEnd();
        }
    };

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('common.permissionRequired'), t('permissions.cameraRoll'));
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: allowEditing,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const filePayload = {
                    uri: asset.uri,
                    name: asset.fileName || `image_${Date.now()}.jpg`,
                    type: asset.mimeType || 'image/jpeg',
                };
                await handleUpload(filePayload);
            }
        } catch (error) {
            console.error('Image picker error:', error);
            if (onUploadEnd) onUploadEnd();
        }
    };

    const pickDocument = async () => {
        try {
            let type = '*/*';
            switch (mediaType) {
                case 'video': type = 'video/*'; break;
                case 'audio': type = 'audio/*'; break;
                case 'document': type = 'application/*'; break;
                default: type = '*/*';
            }

            const result = await DocumentPicker.getDocumentAsync({
                type,
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const filePayload = {
                    uri: asset.uri,
                    name: asset.name,
                    type: asset.mimeType || 'application/octet-stream',
                };
                await handleUpload(filePayload);
            }
        } catch (error) {
            console.error('Document picker error:', error);
            if (onUploadEnd) onUploadEnd();
        }
    };

    const handlePress = () => {
        if (mediaType === 'image') {
            pickImage();
        } else {
            pickDocument();
        }
    };

    return (
        <TouchableOpacity onPress={handlePress} style={style} activeOpacity={0.7}>
            {children}
        </TouchableOpacity>
    );
};

export default FileUploader;