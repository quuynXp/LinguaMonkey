import { mediaClient } from "../api/axiosClient";

export async function uploadTemp(file: { uri: string; name: string; type: string }) {
  const form = new FormData();

  form.append("file", {
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as any);

  try {
    const res = await mediaClient.post("/api/v1/files/upload-temp", form);
    return res.data;
  } catch (err) {
    console.error("Upload via Backend failed", err);
    throw err;
  }
}

export async function deleteTempFile(publicId: string) {
  const res = await mediaClient.delete("/api/v1/files/temp", {
    params: { path: publicId },
  });
  return res.data;
}

export async function getUserMedia(userId: string, mediaType?: 'image' | 'video' | 'audio') {
  const res = await mediaClient.get("/api/v1/files/user/" + userId, {
    params: mediaType ? { type: mediaType } : {},
  });
  return res.data;
}