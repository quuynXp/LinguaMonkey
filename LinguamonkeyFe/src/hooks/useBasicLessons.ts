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

    const useBasicLessonDetail = (id: string) => {
        return useQuery({
            queryKey: basicLessonKeys.detail(id),
            queryFn: async () => {
                const { data } = await instance.get<AppApiResponse<BasicLessonResponse>>(`/api/v1/basic-lessons/${id}`);
                return data.result;
            },
            enabled: !!id,
        });
    };

    const useEnrichBasicLesson = () => {
        return useMutation({
            mutationFn: async (id: string) => {
                const { data } = await instance.post<AppApiResponse<BasicLessonResponse>>(`/api/v1/basic-lessons/${id}/enrich`);
                return data.result!;
            },
            onSuccess: (updatedData) => {
                queryClient.setQueryData(basicLessonKeys.detail(updatedData.id), updatedData);
                // Optionally update the list item
                queryClient.invalidateQueries({ queryKey: basicLessonKeys.all });
            }
        });
    };

    return {
        useBasicLessonsList,
        useBasicLessonDetail,
        useEnrichBasicLesson,
    };
};