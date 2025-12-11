import { Platform } from 'react-native';
import { Image as CompressorImage, Video as CompressorVideo, Audio as CompressorAudio } from 'react-native-compressor';
import { API_BASE_URL } from "../api/apiConfig";
import { useTokenStore } from '../stores/tokenStore';

export interface FileUploadResponse {
  fileId: string;
  fileUrl: string;
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
      // Với bài giảng online: 720p và Bitrate thấp là đủ nét và nhẹ.
      const result = await CompressorVideo.compress(uri, {
        compressionMethod: 'manual',
        maxWidth: 1280, // 720p
        quality: 0.7,   // Giảm quality chút
        bitrate: 1000 * 1000, // Giới hạn 1Mbps (Video 1 tiếng ~ 450MB) -> Upload rất nhanh
      }, (progress) => {
        console.log(`Compression: ${(progress * 100).toFixed(0)}%`);
      });
      console.log("✅ Compression done:", result);
      return result;
    }
    // Audio compression is tricky due to formats, usually skip or use specific lib
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

  // Fix URI for Android
  if (Platform.OS === 'android') {
    if (!fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
      fileUri = `file://${fileUri}`;
    }
  }

  // 1. Optimize before upload
  console.log("🚀 [UPLOAD] Optimizing file...");
  const optimizedUri = await compressMedia(fileUri, file.type);

  // Handle case where compressor removes file:// prefix on Android
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
  console.log("🚀 [UPLOAD] Starting upload to:", url);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        // 'Content-Type': 'multipart/form-data', // Don't set this manually with fetch + FormData
      },
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("🔥 [UPLOAD ERROR] Status:", response.status);
      console.log("🔥 [UPLOAD ERROR] Body:", errorText);
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const data: FileUploadResponse = await response.json();
    console.log("✅ [UPLOAD SUCCESS] ID:", data.fileId);
    return data;

  } catch (err: any) {
    console.error("🔥 [UPLOAD EXCEPTION]:", err.message);
    throw err;
  }
}