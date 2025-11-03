import instance from '../api/axiosInstance';
import { useUserStore } from '../stores/UserStore';
// import {EXPO_PUBLIC_CLOUDINARY_API_UPLOAD, EXPO_PUBLIC_CLOUDINARY_PRESET } from "react-native-dotenv"
import {MediaType, UserMedia  } from "../types/api"

// const CLOUDINARY_API_UPLOAD = EXPO_PUBLIC_CLOUDINARY_API_UPLOAD || process.env.EXPO_PUBLIC_CLOUDINARY_API_UPLOAD;
// const CLOUDINARY_PRESET = EXPO_PUBLIC_CLOUDINARY_PRESET || process.env.EXPO_PUBLIC_CLOUDINARY_PRESET;

// export async function uploadAvatarToTemp(file: { uri: string; name: string; type: string }) {
//   const form = new FormData();
//   form.append("file", {
//     uri: file.uri,
//     type: file.type,
//     name: file.name,
//   } as any);
//   form.append("upload_preset", CLOUDINARY_PRESET!);
//   form.append("folder", "my-folder");

//   try {
//     const res = await fetch(CLOUDINARY_API_UPLOAD, {
//       method: "POST",
//       body: form,
//       headers: {
//         "Content-Type": "multipart/form-data",
//       },
//     });

//     if (!res.ok) {
//       const t = await res.text();
//       console.log("Upload failed");
//       throw new Error(`Upload failed: ${res.status} ${t}`);
//     }

//     const data = await res.json();
//     console.log("Cloudinary upload success:", data);

//     return {
//       secureUrl: data.secure_url,
//       publicId: data.public_id,
//     };
//   } catch (err) {
//     console.error("Upload error", err);
//     throw err;
//   }
// }


// async function saveAvatarUrl(userId: string, avatarUrl: string) {
//   try {
//     const res = await instance.patch(`/users/${userId}/avatar`, null, {
//       params: { avatarUrl }, // backend đang nhận @RequestParam
//     });
//     return res.data;
//   } catch (err: any) {
//     console.error('Save avatar URL fail:', err.response?.data || err.message);
//     throw err;
//   }
// }

/**
 * Bước 1: Upload file lên server (thư mục temp).
 * Trả về string là tempPath (VD: "temp/123_avatar.jpg")
 */
export async function uploadTemp(file: { uri: string; name: string; type: string }) {
  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as any);
  
  // Endpoint này TRẢ VỀ STRING (tempPath)
  const res = await instance.post("/files/upload-temp", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as string;
}

/**
 * (Tùy chọn) Gọi khi user Hủy (Cancel)
 * Xóa file khỏi thư mục temp
 */
export async function deleteTempFile(path: string) {
  const res = await instance.delete("/files/temp", {
    params: { path },
  });
  return res.data;
}

export async function getUserMedia(userId: string, mediaType?: MediaType) { // **SỬA: userId: string**
  const res = await instance.get("/files/user/" + userId, {
    params: mediaType ? { type: mediaType } : {},
  });
  return res.data as UserMedia[];
}