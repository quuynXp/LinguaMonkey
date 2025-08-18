import { EXPO_PUBLIC_CLOUDINARY_PRESET, EXPO_PUBLIC_CLOUDINARY_API_UPLOAD } from '@env';

/**
 * Upload ảnh tạm vào Cloudinary (folder: temp/)
 * file: { uri, name, type } theo chuẩn React Native
 */
export async function uploadAvatarToTemp(file: { uri: string; name: string; type: string }) {
  const form = new FormData();
  form.append('file', {
    // @ts-ignore React Native FormData
    uri: file.uri,
    name: file.name,
    type: file.type,
  });
  form.append('upload_preset', EXPO_PUBLIC_CLOUDINARY_PRESET!);
  form.append('folder', 'temp');

  const res = await fetch(EXPO_PUBLIC_CLOUDINARY_API_UPLOAD, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Upload Cloudinary fail: ${res.status} ${t}`);
  }

  const data = await res.json();

  return {
    secureUrl: data.secure_url as string,
    publicId: data.public_id as string, // ví dụ: "temp/abc123"
    originalFilename: data.original_filename as string,
  };
}
