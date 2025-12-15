import { Platform } from 'react-native';
import { Image as CompressorImage, Video as CompressorVideo } from 'react-native-compressor';
import { API_BASE_URL } from "../api/apiConfig";
import { useTokenStore } from '../stores/tokenStore';

export interface FileUploadResponse {
  fileId: string;
  fileUrl: string; // Đây sẽ là link lh3.googleusercontent... siêu nhanh
  fileName: string;
  fileType: string;
  size: number;
}

// Helper to compress based on type
const compressMedia = async (uri: string, type: string): Promise<string> => {
  try {
    if (type.startsWith('image/')) {
      // Compress Image: Max width 1920, quality 0.8
      return await CompressorImage.compress(uri, {
        compressionMethod: 'auto',
        maxWidth: 1920,
        quality: 0.8,
      });
    } if (type.startsWith('video/')) {
      console.log("⏳ Starting video compression...");
      const result = await CompressorVideo.compress(uri, {
        compressionMethod: 'manual',
        maxSize: 1280, // 720p
        bitrate: 1000 * 1000,
      }, (progress) => {
        console.log(`Compression: ${(progress * 100).toFixed(0)}%`);
      });
      console.log("✅ Compression done:", result);
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
  const form = new FormData();

  let fileUri = file.uri;

  if (Platform.OS === 'android') {
    if (!fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
      fileUri = `file://${fileUri}`;
    }
  }

  console.log("🚀 [UPLOAD] Optimizing file...");
  const optimizedUri = await compressMedia(fileUri, file.type);

  let finalUri = optimizedUri;
  if (Platform.OS === 'android' && !finalUri.startsWith('file://') && !finalUri.startsWith('content://')) {
    finalUri = `file://${finalUri}`;
  }

  const fileToUpload = {
    uri: finalUri,
    name: file.name || `upload_${Date.now()}`,
    type: file.type || 'application/octet-stream',
  };

  // @ts-ignore
  form.append("file", fileToUpload);

  const url = `${API_BASE_URL}/api/v1/files/upload-temp`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
      body: form,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const data: FileUploadResponse = await response.json();
    console.log("✅ [UPLOAD SUCCESS] URL:", data.fileUrl);
    return data;

  } catch (err: any) {
    console.error("🔥 [UPLOAD EXCEPTION]:", err.message);
    throw err;
  }
}