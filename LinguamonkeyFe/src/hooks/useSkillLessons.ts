import { useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import { useTokenStore } from "../stores/tokenStore";
import {
    AppApiResponse,
    ListeningResponse,
    PronunciationResponseBody,
    ReadingResponse,
    WritingResponseBody,
    SpellingRequestBody,
    TranslationRequestBody,
} from "../types/dto";

const SKILL_API_BASE = "/api/v1/skill-lessons";

export interface StreamingChunk {
    type: "metadata" | "chunk" | "suggestion" | "final" | "error";
    feedback: string;
    score?: number;
    word_analysis?: {
        word: string;
        spoken: string;
        word_score: number;
        is_correct: boolean;
    };
    metadata?: {
        accuracy_score: number;
        fluency_score: number;
        error_count: number;
    };
}

export interface WordFeedback {
    word: string;
    spoken: string;
    score: number;
    isCorrect: boolean;
    suggestion?: string;
}

export const useSkillLessons = () => {
    const queryClient = useQueryClient();
    const BASE_URL = instance.defaults.baseURL || "";

    // Helper to ensure FormData is sent correctly without being converted to JSON
    const formDataConfig = {
        headers: { "Content-Type": "multipart/form-data" },
        transformRequest: (data: any) => data, // Prevent Axios from JSON-stringifying FormData
    };

    const useProcessListening = () => {
        return useMutation({
            mutationFn: async ({
                audioUri,
                lessonId,
                languageCode,
            }: {
                audioUri: string;
                lessonId: string;
                languageCode: string;
            }) => {
                const formData = new FormData();
                formData.append("audio", {
                    uri: audioUri,
                    name: "recording.m4a",
                    type: "audio/m4a",
                } as any);
                formData.append("lessonId", lessonId);
                formData.append("languageCode", languageCode);

                const { data } = await instance.post<AppApiResponse<ListeningResponse>>(
                    `${SKILL_API_BASE}/listening/transcribe`,
                    formData,
                    formDataConfig
                );
                return data.result!;
            },
            onSuccess: (_, variables) => {
                queryClient.invalidateQueries({
                    queryKey: ["lessonProgress", variables.lessonId],
                });
            },
        });
    };

    const useStreamPronunciation = () => {
        return useMutation({
            mutationFn: async ({
                audioUri,
                lessonId,
                languageCode,
                referenceText,
                onChunk,
            }: {
                audioUri: string;
                lessonId: string;
                languageCode: string;
                referenceText: string;
                onChunk: (chunk: StreamingChunk) => void;
            }) => {
                const formData = new FormData();
                formData.append("audio", {
                    uri: audioUri,
                    name: "pronunciation.m4a",
                    type: "audio/m4a",
                } as any);
                formData.append("lessonId", lessonId);
                formData.append("languageCode", languageCode);
                formData.append("referenceText", referenceText);

                const { accessToken } = useTokenStore.getState();
                if (!accessToken) {
                    throw new Error("Authentication token is missing.");
                }

                const url = `${BASE_URL}${SKILL_API_BASE}/speaking/pronunciation-stream`;

                // Using fetch for streaming as Axios doesn't handle streams well in RN
                const response = await fetch(url, {
                    method: "POST",
                    body: formData,
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        // Do NOT set Content-Type here for fetch with FormData; 
                        // the browser/engine sets it automatically with the boundary.
                    },
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(
                        `Stream failed with status ${response.status}. Body: ${errorText.substring(0, 50)}`
                    );
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
                                const chunk: StreamingChunk = JSON.parse(line);
                                onChunk(chunk);
                            } catch (e) {
                                // Ignore parse errors for partial lines
                            }
                        }
                    }

                    buffer = lines[lines.length - 1];
                }

                if (buffer.trim()) {
                    try {
                        const chunk: StreamingChunk = JSON.parse(buffer);
                        onChunk(chunk);
                    } catch (e) {
                        // Ignore
                    }
                }

                return { success: true };
            },
            onSuccess: (_, variables) => {
                queryClient.invalidateQueries({
                    queryKey: ["lessonProgress", variables.lessonId],
                });
            },
        });
    };

    const useCheckPronunciation = () => {
        return useMutation({
            mutationFn: async ({
                audioUri,
                lessonId,
                languageCode,
            }: {
                audioUri: string;
                lessonId: string;
                languageCode: string;
            }) => {
                const formData = new FormData();
                formData.append("audio", {
                    uri: audioUri,
                    name: "pronunciation.m4a",
                    type: "audio/m4a",
                } as any);
                formData.append("lessonId", lessonId);
                formData.append("languageCode", languageCode);

                const { data } = await instance.post<AppApiResponse<PronunciationResponseBody>>(
                    `${SKILL_API_BASE}/speaking/pronunciation`,
                    formData,
                    formDataConfig
                );
                return data.result!;
            },
        });
    };

    const useCheckSpelling = () => {
        return useMutation({
            mutationFn: async ({
                req,
                lessonId,
            }: {
                req: SpellingRequestBody;
                lessonId: string;
            }) => {
                const { data } = await instance.post<AppApiResponse<string[]>>(
                    `${SKILL_API_BASE}/speaking/spelling`,
                    req,
                    { params: { lessonId } }
                );
                return data.result!;
            },
        });
    };

    const useGenerateReading = () => {
        return useMutation({
            mutationFn: async ({
                lessonId,
                languageCode,
            }: {
                lessonId: string;
                languageCode: string;
            }) => {
                const { data } = await instance.post<AppApiResponse<ReadingResponse>>(
                    `${SKILL_API_BASE}/reading`,
                    null,
                    { params: { lessonId, languageCode } }
                );
                return data.result!;
            },
        });
    };

    const useCheckWriting = () => {
        return useMutation({
            mutationFn: async ({
                text,
                imageUri,
                lessonId,
                languageCode,
                generateImage = false,
            }: {
                text: string;
                imageUri?: string;
                lessonId: string;
                languageCode: string;
                generateImage?: boolean;
            }) => {
                const formData = new FormData();
                formData.append("text", text);

                if (imageUri) {
                    formData.append("image", {
                        uri: imageUri,
                        name: "writing_context.jpg",
                        type: "image/jpeg",
                    } as any);
                }

                formData.append("lessonId", lessonId);
                formData.append("languageCode", languageCode);
                formData.append("generateImage", String(generateImage));

                // Fixed: Added formDataConfig to ensure correct Content-Type handling
                const { data } = await instance.post<AppApiResponse<WritingResponseBody>>(
                    `${SKILL_API_BASE}/writing`,
                    formData,
                    formDataConfig
                );
                return data.result!;
            },
        });
    };

    const useCheckTranslation = () => {
        return useMutation({
            mutationFn: async ({
                req,
                lessonId,
            }: {
                req: TranslationRequestBody;
                lessonId: string;
            }) => {
                const { data } = await instance.post<AppApiResponse<WritingResponseBody>>(
                    `${SKILL_API_BASE}/writing/translation`,
                    req,
                    { params: { lessonId } }
                );
                return data.result!;
            },
        });
    };

    return {
        useProcessListening,
        useStreamPronunciation,
        useCheckPronunciation,
        useCheckSpelling,
        useGenerateReading,
        useCheckWriting,
        useCheckTranslation,
    };
};