import React, { ReactNode, useState } from 'react';
import { TouchableOpacity, Alert, ViewStyle, StyleProp } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { uploadTemp } from '../../services/cloudinary';
import { useTranslation } from 'react-i18next';
// Đảm bảo đường dẫn import đúng với project của bạn
import { validateFileSignature } from '../../utils/FileUtils';

type MediaType = 'image' | 'video' | 'audio' | 'document' | 'all';

interface FileUploaderProps {
    onUploadStart?: () => void;
    onUploadEnd?: () => void;
    onUploadSuccess: (result: any, type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT') => void;
    onUploadError?: (error: any) => void;
    mediaType?: MediaType;
    style?: StyleProp<ViewStyle>;
    children: ReactNode;
    allowEditing?: boolean;
    maxSizeMB?: number;
    maxDuration?: number;
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
    maxSizeMB = 2048,
    maxDuration = 7200,
}) => {
    const { t } = useTranslation();
    const [isProcessing, setIsProcessing] = useState(false);

    // Hàm validate đã được update thêm tham số uri
    const validateFile = async (fileSize: number | undefined, duration: number | undefined, type: string, uri: string) => {
        if (fileSize && fileSize > maxSizeMB * 1024 * 1024) {
            Alert.alert(t('common.error'), t('errors.fileTooLarge', { size: maxSizeMB }));
            return false;
        }

        // FIX ERROR: Ép kiểu 'as any' để tránh lỗi TS nếu FileUtils yêu cầu strict literal
        const isSafe = await validateFileSignature(uri, type as any);
        if (!isSafe) {
            Alert.alert(t('common.error'), "Định dạng file không hợp lệ hoặc có dấu hiệu giả mạo.");
            return false;
        }
        return true;
    };

    const handleUpload = async (file: { uri: string; name: string; type: string }) => {
        try {
            setIsProcessing(true);
            if (onUploadStart) onUploadStart();
            const response = await uploadTemp(file);

            let msgType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' = 'DOCUMENT';
            if (file.type.startsWith('image')) msgType = 'IMAGE';
            else if (file.type.startsWith('video')) msgType = 'VIDEO';
            else if (file.type.startsWith('audio')) msgType = 'AUDIO';

            onUploadSuccess(response, msgType);
        } catch (error) {
            console.error('Upload failed:', error);
            if (onUploadError) {
                onUploadError(error);
            } else {
                Alert.alert(t('common.error'), t('errors.uploadFailed'));
            }
        } finally {
            setIsProcessing(false);
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

            let mediaTypes: any;
            if (mediaType === 'video') {
                mediaTypes = ['videos'];
            } else if (mediaType === 'image') {
                mediaTypes = ['images'];
            } else {
                mediaTypes = ['images', 'videos'];
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: mediaTypes,
                allowsEditing: allowEditing,
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];

                // FIX ERROR: Thêm await và truyền đủ 4 tham số (bao gồm uri)
                const isValid = await validateFile(
                    asset.fileSize,
                    asset.duration,
                    asset.type || 'image',
                    asset.uri // <-- Đã thêm
                );

                if (!isValid) return;

                const filePayload = {
                    uri: asset.uri,
                    name: asset.fileName || `upload_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
                    type: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
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

                // FIX ERROR: Thêm await và truyền đủ 4 tham số (bao gồm uri)
                const isValid = await validateFile(
                    asset.size,
                    undefined,
                    asset.mimeType || 'application',
                    asset.uri // <-- Đã thêm
                );

                if (!isValid) return;

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
        if (isProcessing) return;
        if (mediaType === 'image' || mediaType === 'video' || mediaType === 'all') {
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