import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import { AppApiResponse, BasicLessonResponse, PageResponse } from "../types/dto";

const basicLessonKeys = {
    all: ["basicLessons"] as const,
    list: (languageCode: string, lessonType: string) => [...basicLessonKeys.all, "list", languageCode, lessonType] as const,
    detail: (id: string) => [...basicLessonKeys.all, "detail", id] as const,
};

export const useBasicLessons = () => {
    const queryClient = useQueryClient();

    const useBasicLessonsList = (languageCode: string, lessonType: string, page = 0, size = 100) => {
        return useQuery({
            queryKey: basicLessonKeys.list(languageCode, lessonType),
            queryFn: async () => {
                const { data } = await instance.get<AppApiResponse<PageResponse<BasicLessonResponse>>>(
                    `/api/v1/basic-lessons?languageCode=${languageCode}&lessonType=${lessonType}&page=${page}&size=${size}`
                );
                return data.result;
            },
            staleTime: 60 * 60 * 1000,
        });
    };

    const useEnrichBasicLesson = () => {
        return useMutation({
            mutationFn: async (id: string) => {
                const { data } = await instance.post<AppApiResponse<BasicLessonResponse>>(`/api/v1/basic-lessons/${id}/enrich`);
                return data.result!;
            },
            onSuccess: (updatedData) => {
                // Update cache
                queryClient.setQueryData(basicLessonKeys.detail(updatedData.id), updatedData);
                queryClient.invalidateQueries({ queryKey: basicLessonKeys.all });
            }
        });
    };

    // New Mutation for Pronunciation Check
    const useCheckPronunciation = () => {
        return useMutation({
            mutationFn: async ({ audioBase64, referenceText, language }: { audioBase64: string, referenceText: string, language: string }) => {
                // We assume there is an endpoint for this either in BasicLessonController or LearningController
                // Since user provided BasicLessonController, we will add a practice endpoint there.
                const { data } = await instance.post<AppApiResponse<{ feedback: string; score: number }>>(`/api/v1/basic-lessons/practice`, {
                    audioData: audioBase64,
                    referenceText,
                    language
                });
                return data.result!;
            }
        });
    };

    return {
        useBasicLessonsList,
        useEnrichBasicLesson,
        useCheckPronunciation,
    };
};