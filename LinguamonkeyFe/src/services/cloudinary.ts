import { EXPO_PUBLIC_CLOUDINARY_PRESET, EXPO_PUBLIC_CLOUDINARY_API_UPLOAD } from '@env';
import instance from '../api/axiosInstance';
import { useUserStore } from '../stores/UserStore';



export async function uploadAvatarToTemp(file: { uri: string; name: string; type: string }) {
  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as any);
  form.append("upload_preset", EXPO_PUBLIC_CLOUDINARY_PRESET!);
  form.append("folder", "my-folder");

  try {
    const res = await fetch(EXPO_PUBLIC_CLOUDINARY_API_UPLOAD, {
      method: "POST",
      body: form,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (!res.ok) {
      const t = await res.text();
      console.log("Upload failed");
      throw new Error(`Upload failed: ${res.status} ${t}`);
    }

    const data = await res.json();
    console.log("Cloudinary upload success:", data);

    return {
      secureUrl: data.secure_url,
      publicId: data.public_id,
    };
  } catch (err) {
    console.error("Upload error", err);
    throw err;
  }
}


async function saveAvatarUrl(userId: string, avatarUrl: string) {
  try {
    const res = await instance.patch(`/users/${userId}/avatar`, null, {
      params: { avatarUrl }, // backend đang nhận @RequestParam
    });
    return res.data;
  } catch (err: any) {
    console.error('Save avatar URL fail:', err.response?.data || err.message);
    throw err;
  }
}
