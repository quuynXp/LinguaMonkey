import instance from '../api/axiosClient';
import { useUserStore } from '../stores/UserStore';
import { MediaType, UserMedia } from "../types/api"

/**
 * Bước 1: Upload file lên Server qua API /files/upload-temp.
 * Server (Backend) sẽ đảm nhiệm việc đẩy file lên Cloudinary và trả về Public ID.
 */
export async function uploadTemp(file: { uri: string; name: string; type: string }) {
  const form = new FormData();

  // Lưu ý: React Native yêu cầu đúng 3 trường: uri, type, name
  form.append("file", {
    uri: file.uri,
    type: file.type, // Ví dụ: 'image/jpeg'
    name: file.name, // Ví dụ: 'photo.jpg'
  } as any);

  try {
    // SỬA Ở ĐÂY:
    // 1. Không set thủ công "Content-Type": "multipart/form-data"
    // 2. Nếu axios instance của bạn có default header là application/json, hãy set nó thành "multipart/form-data" để axios tự động thêm boundary (tùy phiên bản axios), 
    //    nhưng cách an toàn nhất là để header Content-Type này cho hệ thống tự quyết định.

    const res = await instance.post("/api/v1/files/upload-temp", form, {
      headers: {
        // QUAN TRỌNG: Hack để Axios không dùng default header (application/json) 
        // và để trình duyệt tự điền boundary.
        "Content-Type": undefined,
        // Nếu cách trên vẫn lỗi, hãy thử dòng dưới đây thay thế:
        // "Content-Type": undefined 
      },
      // Thêm transformRequest để đảm bảo FormData không bị biến đổi (cần thiết trên một số bản Axios cũ + RN)
      transformRequest: (data, headers) => {
        return data; // Đừng làm gì cả, trả về nguyên FormData
      },
    });

    return res.data as string;
  } catch (err) {
    console.error("Upload via Backend failed", err);
    throw err;
  }
}

/**
 * Gọi khi user Hủy (Cancel) hoặc sau khi Commit xong.
 */
export async function deleteTempFile(publicId: string) {
  const res = await instance.delete("/api/v1/files/temp", {
    params: { path: publicId },
  });
  return res.data;
}

export async function getUserMedia(userId: string, mediaType?: MediaType) {
  const res = await instance.get("/api/v1/files/user/" + userId, {
    params: mediaType ? { type: mediaType } : {},
  });
  return res.data as UserMedia[];
}