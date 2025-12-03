import { Platform } from 'react-native';
import { API_BASE_URL } from "../api/apiConfig";
import { useTokenStore } from '../stores/tokenStore';

export interface FileUploadResponse {
  fileId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  size: number;
}

export async function uploadTemp(file: { uri: string; name: string; type: string }): Promise<FileUploadResponse> {
  const { accessToken } = useTokenStore.getState();

  const form = new FormData();

  let fileUri = file.uri;
  if (Platform.OS === 'android') {
    if (!fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
      fileUri = `file://${fileUri}`;
    }
  }

  const fileToUpload = {
    uri: fileUri,
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