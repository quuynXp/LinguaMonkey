import { publicClient } from "../api/axiosClient";
import { MediaType, UserMedia } from "../types/api";

export async function uploadTemp(file: { uri: string; name: string; type: string }) {
  const form = new FormData();

  form.append("file", {
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as any);

  try {
    const res = await publicClient.post("/api/v1/files/upload-temp", form, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return res.data as string;
  } catch (err) {
    console.error("Upload via Backend failed", err);
    throw err;
  }
}

export async function deleteTempFile(publicId: string) {
  const res = await publicClient.delete("/api/v1/files/temp", {
    params: { path: publicId },
  });
  return res.data;
}

export async function getUserMedia(userId: string, mediaType?: MediaType) {
  const res = await publicClient.get("/api/v1/files/user/" + userId, {
    params: mediaType ? { type: mediaType } : {},
  });
  return res.data as UserMedia[];
}