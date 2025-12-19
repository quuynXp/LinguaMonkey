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
  if (!uri) return "";

  const safeType = String(type || "").toLowerCase();

  try {
    if (safeType.includes('image')) {
      const result = await CompressorImage.compress(uri, {
        compressionMethod: 'auto',
        maxWidth: 1920,
        quality: 0.8,
      });
      return result || uri;
    }

    if (safeType.includes('video')) {
      console.log("⏳ Compressing video...");
      const result = await CompressorVideo.compress(uri, {
        compressionMethod: 'auto',
        maxSize: 1280,
      });
      console.log("✅ Video compressed:", result);
      return result || uri;
    }

    return uri;
  } catch (error) {
    console.warn("Compression failed, using original file:", error);
    return uri;
  }
};

export async function uploadTemp(file: { uri: string; name: string; type: string }): Promise<FileUploadResponse> {
  const { accessToken } = useTokenStore.getState();

  if (!file || !file.uri) {
    throw new Error("File URI is missing");
  }

  const optimizedUri = await compressMedia(file.uri, file.type);

  let finalUri = optimizedUri || file.uri;

  if (finalUri && Platform.OS === 'android' && !finalUri.startsWith('file://') && !finalUri.startsWith('content://')) {
    finalUri = `file://${finalUri}`;
  }

  // 4. Tạo FormData chuẩn
  const formData = new FormData();
  formData.append('file', {
    uri: finalUri,
    name: file.name || `upload_${Date.now()}.${file.type?.includes('video') ? 'mp4' : 'jpg'}`,
    type: file.type || 'application/octet-stream', // Fallback MIME type
  } as any);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/files/upload-temp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
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