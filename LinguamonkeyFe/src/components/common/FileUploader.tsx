import React, { ReactNode, useState } from 'react';
import { TouchableOpacity, Alert, ViewStyle, StyleProp, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';
import { validateFileSignature } from '../../utils/FileUtils';
import { uploadTemp } from '../../services/cloudinary';

type MediaType = 'image' | 'video' | 'audio' | 'document' | 'all';

interface FileUploaderProps {
    onUploadStart?: () => void;
    onUploadEnd?: () => void;
    onUploadSuccess?: (result: any, type?: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT') => void;
    onFileSelected?: (file: any, type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT') => void;

    mediaType?: MediaType;
    style?: StyleProp<ViewStyle>;
    children: ReactNode;
    allowEditing?: boolean;
    maxSizeMB?: number;
}

const FileUploader: React.FC<FileUploaderProps> = ({
    onUploadStart,
    onUploadEnd,
    onUploadSuccess,
    onFileSelected,
    mediaType = 'all',
    style,
    children,
    allowEditing = false,
    maxSizeMB = 2048,
}) => {
    const { t } = useTranslation();
    const [isProcessing, setIsProcessing] = useState(false);

    const validateFile = async (fileSize: number | undefined, type: string, uri: string) => {
        if (fileSize && fileSize > maxSizeMB * 1024 * 1024) {
            Alert.alert(t('common.error'), t('errors.fileTooLarge', { size: maxSizeMB }));
            return false;
        }
        try {
            const isSafe = await validateFileSignature(uri, type as any);
            if (!isSafe) {
                Alert.alert(t('common.error'), "Định dạng file không hợp lệ.");
                return false;
            }
        } catch (e) {
        }
        return true;
    };

    const processFile = async (file: any, type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT') => {
        if (onFileSelected) {
            onFileSelected(file, type);
            return;
        }

        if (onUploadSuccess) {
            try {
                setIsProcessing(true);
                if (onUploadStart) onUploadStart();

                // Direct upload call from component
                const response = await uploadTemp(file);

                onUploadSuccess(response, type);
            } catch (error: any) {
                console.error('Upload failed:', error);
                Alert.alert(t('common.error'), error?.message || t('errors.uploadFailed'));
            } finally {
                setIsProcessing(false);
                if (onUploadEnd) onUploadEnd();
            }
        }
    };

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('common.permissionRequired'), t('permissions.cameraRoll'));
                return;
            }

            let allowedTypes = ImagePicker.MediaTypeOptions.All;
            if (mediaType === 'image') allowedTypes = ImagePicker.MediaTypeOptions.Images;
            if (mediaType === 'video') allowedTypes = ImagePicker.MediaTypeOptions.Videos;

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: allowedTypes,
                allowsEditing: allowEditing,
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const typeStr = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
                const finalMimeType = asset.mimeType || typeStr;

                const isValid = await validateFile(asset.fileSize, asset.type || 'image', asset.uri);
                if (!isValid) return;

                const fileObj = {
                    uri: asset.uri,
                    name: asset.fileName || `upload_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
                    type: finalMimeType,
                    mimeType: finalMimeType,
                    duration: asset.duration,
                    width: asset.width,
                    height: asset.height
                };

                await processFile(fileObj, asset.type === 'video' ? 'VIDEO' : 'IMAGE');
            }
        } catch (error) {
            console.error('Image picker error:', error);
            if (onUploadEnd) onUploadEnd();
        }
    };

    const pickDocument = async () => {
        try {
            let type = '*/*';
            if (mediaType === 'audio') type = 'audio/*';
            if (mediaType === 'video') type = 'video/*';

            const result = await DocumentPicker.getDocumentAsync({
                type,
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const safeMimeType = asset.mimeType || 'application/octet-stream';

                const isValid = await validateFile(asset.size, safeMimeType, asset.uri);
                if (!isValid) return;

                const fileObj = {
                    uri: asset.uri,
                    name: asset.name,
                    type: safeMimeType,
                    mimeType: safeMimeType,
                    size: asset.size
                };

                let msgType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' = 'DOCUMENT';
                if (safeMimeType.startsWith('audio')) msgType = 'AUDIO';
                else if (safeMimeType.startsWith('video')) msgType = 'VIDEO';
                else if (safeMimeType.startsWith('image')) msgType = 'IMAGE';

                await processFile(fileObj, msgType);
            }
        } catch (error) {
            console.error('Document picker error:', error);
            if (onUploadEnd) onUploadEnd();
        }
    };

    const handlePress = () => {
        if (isProcessing) return;
        if (mediaType === 'document' || mediaType === 'audio') {
            pickDocument();
        } else {
            pickImage();
        }
    };

    return (
        <TouchableOpacity onPress={handlePress} style={style} activeOpacity={0.7} disabled={isProcessing}>
            {children}
        </TouchableOpacity>
    );
};

export default FileUploader;