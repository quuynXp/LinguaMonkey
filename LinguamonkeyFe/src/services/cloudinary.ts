import { Platform } from 'react-native';
import { Image as CompressorImage, Video as CompressorVideo } from 'react-native-compressor';
import { API_BASE_URL } from "../api/apiConfig";
import { useTokenStore } from '../stores/tokenStore';

export interface FileUploadResponse {
  fileId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  size: number;
}

const compressMedia = async (uri: string, type: string): Promise<string> => {
  try {
    if (type.includes('image')) {
      return await CompressorImage.compress(uri, {
        compressionMethod: 'auto',
        maxWidth: 1920,
        quality: 0.8,
      });
    }
    if (type.includes('video')) {
      console.log("⏳ Compressing video...");
      const result = await CompressorVideo.compress(uri, {
        compressionMethod: 'auto',
        maxSize: 1280,
      });
      console.log("✅ Video compressed:", result);
      return result;
    }
    return uri;
  } catch (error) {
    console.warn("Compression failed, using original file:", error);
    return uri;
  }
};

export async function uploadTemp(file: { uri: string; name: string; type: string }): Promise<FileUploadResponse> {
  const { accessToken } = useTokenStore.getState();

  const optimizedUri = await compressMedia(file.uri, file.type);

  let finalUri = optimizedUri;
  if (Platform.OS === 'android' && !finalUri.startsWith('file://') && !finalUri.startsWith('content://')) {
    finalUri = `file://${finalUri}`;
  }

  const formData = new FormData();
  formData.append('file', {
    uri: finalUri,
    name: file.name || `upload_${Date.now()}`,
    type: file.type || 'application/octet-stream',
  } as any);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/files/upload-temp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        // 'Content-Type': 'multipart/form-data', // Fetch tự động thêm boundary, không cần set thủ công
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const data: FileUploadResponse = await response.json();
    return data;

  } catch (err: any) {
    console.error("🔥 [UPLOAD ERROR]:", err.message);
    throw err;
  }
}