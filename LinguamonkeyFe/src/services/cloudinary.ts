// import instance from '../api/axiosClient';
// import { useUserStore } from '../stores/UserStore';
// import { MediaType, UserMedia } from "../types/api"

// const CLOUDINARY_API_UPLOAD = process.env.EXPO_PUBLIC_CLOUDINARY_API_UPLOAD;
// const CLOUDINARY_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_PRESET;

// /**
//  * Upload file trực tiếp lên Cloudinary.
//  * Trả về secureUrl và publicId.
//  */
// export async function uploadTemp(file: { uri: string; name: string; type: string }) {
//   if (!CLOUDINARY_API_UPLOAD || !CLOUDINARY_PRESET) {
//     throw new Error("Missing Cloudinary API configuration.");
//   }

//   const form = new FormData();
//   form.append("file", {
//     uri: file.uri,
//     type: file.type,
//     name: file.name,
//   } as any);
//   form.append("upload_preset", CLOUDINARY_PRESET);
//   form.append("folder", "linguaviet/temp"); // Sử dụng folder temp đã định nghĩa ở backend

//   try {
//     const res = await fetch(CLOUDINARY_API_UPLOAD, {
//       method: "POST",
//       body: form,
//       headers: {
//         // Cloudinary tự nhận diện, nhưng nên giữ Content-Type
//         "Content-Type": "multipart/form-data",
//       },
//     });

//     if (!res.ok) {
//       const t = await res.text();
//       console.error("Cloudinary upload failed", t);
//       throw new Error(`Upload failed: ${res.status} ${t}`);
//     }

//     const data = await res.json();

//     // Trả về Public ID để backend COMMIT
//     return data.public_id as string;
//   } catch (err) {
//     console.error("Upload error", err);
//     throw err;
//   }
// }

// /**
//  * Gọi khi user Hủy (Cancel) hoặc sau khi Commit xong.
//  * Xóa file khỏi thư mục temp (Cloudinary).
//  * Backend sẽ nhận Public ID thay vì path.
//  */
// export async function deleteTempFile(publicId: string) {
//   // Gọi endpoint backend để xóa file theo Public ID
//   const res = await instance.delete("/files/temp", {
//     params: { publicId }, // Backend phải được sửa để nhận 'publicId'
//   });
//   return res.data;
// }

// export async function getUserMedia(userId: string, mediaType?: MediaType) {
//   const res = await instance.get("/files/user/" + userId, {
//     params: mediaType ? { type: mediaType } : {},
//   });
//   // Frontend nhận về UserMedia, trong đó fileUrl đã là URL công cộng của Cloudinary
//   return res.data as UserMedia[];
// }

import instance from '../api/axiosClient';
import { useUserStore } from '../stores/UserStore';
import { MediaType, UserMedia } from "../types/api"

/**
 * Bước 1: Upload file lên Server qua API /files/upload-temp.
 * Server (Backend) sẽ đảm nhiệm việc đẩy file lên Cloudinary và trả về Public ID.
 */
export async function uploadTemp(file: { uri: string; name: string; type: string }) {
  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as any);

  try {
    const res = await instance.post("/files/upload-temp", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data as string;
  } catch (err) {
    console.error("Upload via Backend failed", err);
    throw err;
  }
}

/**
 * Gọi khi user Hủy (Cancel) hoặc sau khi Commit xong.
 * Xóa file trên Cloudinary bằng Public ID.
 * Backend FileController hiện tại đang nhận tham số là 'path'.
 */
export async function deleteTempFile(publicId: string) {
  const res = await instance.delete("/files/temp", {
    params: { path: publicId },
  });
  return res.data;
}

export async function getUserMedia(userId: string, mediaType?: MediaType) {
  const res = await instance.get("/files/user/" + userId, {
    params: mediaType ? { type: mediaType } : {},
  });
  return res.data as UserMedia[];
}