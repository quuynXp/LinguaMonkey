import { useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";

import type {
    ApiResponse,
    ListeningResponse,
    PronunciationResponse,
    ReadingResponse,
    SpellingRequest,
    TranslationRequest,
    WritingResponse,
} from "../types/api";

const SKILL_API_BASE = "/api/v1/skill-lessons";

export const useSkillLessons = () => {
    const queryClient = useQueryClient();

    // 1. LISTENING: Upload audio -> Transcribe & Generate Questions
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
                    name: "recording.m4a", // Hoặc .wav tùy format ghi âm
                    type: "audio/m4a",     // Đảm bảo mime type đúng
                } as any);
                formData.append("lessonId", lessonId);
                formData.append("languageCode", languageCode);

                const res = await instance.post<ApiResponse<ListeningResponse>>(
                    `${SKILL_API_BASE}/listening/transcribe`,
                    formData,
                    { headers: { "Content-Type": "multipart/form-data" } }
                );
                return res.data.result!;
            },
            onSuccess: (_, variables) => {
                // Invalidate để cập nhật tiến độ bài học
                queryClient.invalidateQueries({ queryKey: ["lessonProgress", variables.lessonId] });
            }
        });
    };

    // 2. SPEAKING: Pronunciation Check
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

                const res = await instance.post<ApiResponse<PronunciationResponse>>(
                    `${SKILL_API_BASE}/speaking/pronunciation`,
                    formData,
                    { headers: { "Content-Type": "multipart/form-data" } }
                );
                return res.data.result!;
            },
        });
    };

    // 3. SPEAKING: Spelling Check (dành cho bài tập đánh vần/viết lại từ nghe được)
    const useCheckSpelling = () => {
        return useMutation({
            mutationFn: async ({
                request,
                lessonId,
            }: {
                request: SpellingRequest;
                lessonId: string;
            }) => {
                const res = await instance.post<ApiResponse<string[]>>(
                    `${SKILL_API_BASE}/speaking/spelling?lessonId=${lessonId}`,
                    request
                );
                return res.data.result!;
            },
        });
    };

    // 4. READING: Generate Passage & Questions
    const useGenerateReading = () => {
        return useMutation({
            mutationFn: async ({
                lessonId,
                languageCode,
            }: {
                lessonId: string;
                languageCode: string;
            }) => {
                const res = await instance.post<ApiResponse<ReadingResponse>>(
                    `${SKILL_API_BASE}/reading?lessonId=${lessonId}&languageCode=${languageCode}`
                );
                return res.data.result!;
            },
        });
    };

    // 5. WRITING: Check Writing (Text + Optional Image)
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

                const res = await instance.post<ApiResponse<WritingResponse>>(
                    `${SKILL_API_BASE}/writing`,
                    formData,
                    { headers: { "Content-Type": "multipart/form-data" } }
                );
                return res.data.result!;
            },
        });
    };

    // 6. WRITING: Translation Check
    const useCheckTranslation = () => {
        return useMutation({
            mutationFn: async ({
                request,
                lessonId,
            }: {
                request: TranslationRequest;
                lessonId: string;
            }) => {
                const res = await instance.post<ApiResponse<WritingResponse>>(
                    `${SKILL_API_BASE}/writing/translation?lessonId=${lessonId}`,
                    request
                );
                return res.data.result!;
            },
        });
    };

    return {
        useProcessListening,
        useCheckPronunciation,
        useCheckSpelling,
        useGenerateReading,
        useCheckWriting,
        useCheckTranslation,
    };
};