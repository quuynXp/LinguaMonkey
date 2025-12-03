// services/cloudinary.ts (hoặc file service tương ứng)
import { Platform } from 'react-native';
import { API_BASE_URL } from "../api/apiConfig";
import { useTokenStore } from '../stores/tokenStore';

export async function uploadTemp(file: { uri: string; name: string; type: string }) {
  const { accessToken } = useTokenStore.getState();

  // 1. Chuẩn bị FormData
  const form = new FormData();

  // FIX QUAN TRỌNG: Đảm bảo URI có prefix đúng cho Android
  let fileUri = file.uri;
  if (Platform.OS === 'android') {
    // Một số thư viện trả về đường dẫn raw, cần thêm file://
    if (!fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
      fileUri = `file://${fileUri}`;
    }
  }

  // FIX QUAN TRỌNG: Object file phải đầy đủ 3 thuộc tính
  const fileToUpload = {
    uri: fileUri,
    name: file.name || `upload_${Date.now()}.mp4`, // Fallback name để tránh lỗi null
    type: file.type || 'video/mp4', // Fallback type bắt buộc
  };

  // @ts-ignore: React Native FormData chấp nhận object này
  form.append("file", fileToUpload);

  const url = `${API_BASE_URL}/api/v1/files/upload-temp`;

  console.log("🚀 [UPLOAD] Starting upload to:", url);

  try {
    // 2. Dùng fetch thay vì Axios để tránh lỗi Network Error do Interceptor
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        // LƯU Ý SỐNG CÒN: KHÔNG được set 'Content-Type': 'multipart/form-data'
        // Hãy để fetch tự động tạo Boundary
        'Accept': 'application/json',
      },
      body: form,
    });

    // 3. Xử lý response thủ công
    const responseText = await response.text();

    if (!response.ok) {
      console.log("🔥 [UPLOAD ERROR] Status:", response.status);
      console.log("🔥 [UPLOAD ERROR] Body:", responseText);
      throw new Error(`Upload failed: ${response.status} - ${responseText}`);
    }

    // Parse JSON thành công
    return JSON.parse(responseText);

  } catch (err: any) {
    console.error("🔥 [UPLOAD EXCEPTION]:", err.message);
    // Nếu vẫn là Network request failed, 99% là do Flipper hoặc server chưa bật
    throw err;
  }
}