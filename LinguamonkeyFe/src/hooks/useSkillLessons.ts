import { useMutation } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import { useTokenStore } from "../stores/tokenStore";
import {
    AppApiResponse,
    ListeningResponse,
    WritingResponseBody,
    StreamingChunk,
} from "../types/dto";

const SKILL_API_BASE = "/api/v1/skill-lessons";

export const useSkillLessons = () => {
    const { accessToken } = useTokenStore.getState();

    const formDataConfig = {
        headers: { "Content-Type": "multipart/form-data" },
        transformRequest: (data: any) => data,
    };

    const useStreamPronunciation = () => {
        return useMutation({
            mutationFn: async ({
                audioUri,
                lessonQuestionId,
                languageCode,
                onChunk,
            }: {
                audioUri: string;
                lessonQuestionId: string;
                languageCode: string;
                onChunk: (chunk: StreamingChunk) => void;
            }) => {
                const formData = new FormData();
                formData.append("audio", {
                    uri: audioUri,
                    name: "recording.m4a",
                    type: "audio/m4a",
                } as any);
                formData.append("lessonQuestionId", lessonQuestionId);
                formData.append("languageCode", languageCode);

                // Hits the new Streaming Endpoint we created
                const response = await fetch(`${instance.defaults.baseURL}${SKILL_API_BASE}/speaking/stream`, {
                    method: "POST",
                    body: formData,
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        // Do NOT set Content-Type here, let fetch handle boundary for FormData
                    },
                });

                if (!response.ok) {
                    throw new Error(`Stream failed: ${response.status}`);
                }

                const reader = response.body?.getReader();
                if (!reader) throw new Error("No response body");

                const decoder = new TextDecoder();
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    for (let i = 0; i < lines.length - 1; i++) {
                        const line = lines[i].trim();
                        if (line) {
                            try {
                                onChunk(JSON.parse(line));
                            } catch (e) { console.error("Parse error", e); }
                        }
                    }
                    buffer = lines[lines.length - 1];
                }
                if (buffer.trim()) {
                    try {
                        onChunk(JSON.parse(buffer));
                    } catch (e) { }
                }
                return { success: true };
            },
        });
    };

    const useCheckWriting = () => {
        return useMutation({
            mutationFn: async ({
                text,
                imageUri,
                lessonQuestionId,
                languageCode,
                duration
            }: {
                text: string;
                imageUri?: string;
                lessonQuestionId: string;
                languageCode: string;
                duration: number;
            }) => {
                const formData = new FormData();
                formData.append("text", text);
                if (imageUri) {
                    formData.append("image", {
                        uri: imageUri,
                        name: "writing.jpg",
                        type: "image/jpeg",
                    } as any);
                }
                formData.append("lessonQuestionId", lessonQuestionId);
                formData.append("languageCode", languageCode);
                formData.append("duration", String(duration));

                const { data } = await instance.post<AppApiResponse<WritingResponseBody>>(
                    `${SKILL_API_BASE}/writing/submit`,
                    formData,
                    formDataConfig
                );
                return data.result!;
            },
        });
    };

    const useSubmitQuiz = () => {
        return useMutation({
            mutationFn: async ({
                lessonQuestionId,
                selectedOption,
                duration
            }: {
                lessonQuestionId: string;
                selectedOption: string | object;
                duration: number
            }) => {
                const formData = new FormData();
                formData.append("lessonQuestionId", lessonQuestionId);

                const finalOption = typeof selectedOption === 'string'
                    ? selectedOption
                    : JSON.stringify(selectedOption);

                formData.append("selectedOption", finalOption);
                formData.append("duration", String(duration));

                const { data } = await instance.post<AppApiResponse<string>>(
                    `${SKILL_API_BASE}/quiz/submit`,
                    formData,
                    formDataConfig
                );
                return data.result!;
            }
        });
    };

    const useProcessListening = () => {
        return useMutation({
            mutationFn: async ({ audioUri, lessonId, languageCode }: { audioUri: string; lessonId: string; languageCode: string }) => {
                const formData = new FormData();
                formData.append("audio", { uri: audioUri, name: "audio.m4a", type: "audio/m4a" } as any);
                formData.append("lessonId", lessonId);
                formData.append("languageCode", languageCode);

                const { data } = await instance.post<AppApiResponse<ListeningResponse>>(
                    `${SKILL_API_BASE}/listening/transcribe`,
                    formData,
                    formDataConfig
                );
                return data.result!;
            },
        });
    };

    return {
        useStreamPronunciation,
        useCheckWriting,
        useSubmitQuiz,
        useProcessListening,
    };
};