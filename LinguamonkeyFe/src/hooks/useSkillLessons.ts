import { useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import {
    AppApiResponse,
    ListeningResponse, // <--- ĐÃ SỬA: Dùng đúng tên DTO trong Controller
    PronunciationResponseBody,
    ReadingResponse,
    WritingResponseBody,
    SpellingRequestBody,
    TranslationRequestBody,
} from "../types/dto";

const SKILL_API_BASE = "/api/v1/skill-lessons";

export const useSkillLessons = () => {
    const queryClient = useQueryClient();

    // ==========================================
    // === 1. LISTENING ===
    // ==========================================

    // POST /listening/transcribe (Multipart/Form-Data)
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

                // FIX: Sử dụng ListeningResponse
                const { data } = await instance.post<AppApiResponse<ListeningResponse>>(
                    `${SKILL_API_BASE}/listening/transcribe`,
                    formData,
                    { headers: { "Content-Type": "multipart/form-data" } }
                );
                return data.result!;
            },
            onSuccess: (_, variables) => {
                // Invalidate để cập nhật tiến độ bài học
                queryClient.invalidateQueries({ queryKey: ["lessonProgress", variables.lessonId] });
            },
        });
    };

    // ==========================================
    // === 2. SPEAKING ===
    // ==========================================

    // POST /speaking/pronunciation (Multipart/Form-Data)
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
                    { headers: { "Content-Type": "multipart/form-data" } }
                );
                return data.result!;
            },
        });
    };

    // POST /speaking/spelling (JSON Body)
    const useCheckSpelling = () => {
        return useMutation({
            mutationFn: async ({
                req,
                lessonId, // Controller expects this as @RequestParam
            }: {
                req: SpellingRequestBody;
                lessonId: string;
            }) => {
                const { data } = await instance.post<AppApiResponse<string[]>>(
                    `${SKILL_API_BASE}/speaking/spelling`,
                    req,
                    { params: { lessonId } } // Passing lessonId as query param
                );
                return data.result!;
            },
        });
    };

    // ==========================================
    // === 3. READING ===
    // ==========================================

    // POST /reading (Query Params for Lesson & Language)
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
                    null, // No body required for this POST endpoint
                    { params: { lessonId, languageCode } }
                );
                return data.result!;
            },
        });
    };

    // ==========================================
    // === 4. WRITING ===
    // ==========================================

    // POST /writing (Multipart/Form-Data)
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
                    // Controller expects file part named 'image'
                    formData.append("image", {
                        uri: imageUri,
                        name: "writing_context.jpg",
                        type: "image/jpeg",
                    } as any);
                }

                formData.append("lessonId", lessonId);
                formData.append("languageCode", languageCode);
                formData.append("generateImage", String(generateImage));

                const { data } = await instance.post<AppApiResponse<WritingResponseBody>>(
                    `${SKILL_API_BASE}/writing`,
                    formData,
                    { headers: { "Content-Type": "multipart/form-data" } }
                );
                return data.result!;
            },
        });
    };

    // POST /writing/translation (JSON Body)
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
        useCheckPronunciation,
        useCheckSpelling,
        useGenerateReading,
        useCheckWriting,
        useCheckTranslation,
    };
};