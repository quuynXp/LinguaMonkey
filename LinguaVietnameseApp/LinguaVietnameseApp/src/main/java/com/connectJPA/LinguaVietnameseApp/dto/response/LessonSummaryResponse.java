package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonSummaryResponse {
    private UUID lessonId;
    private String title;
    private int orderIndex; // Thứ tự trong khóa học
    private boolean isFree; // Lấy từ (Lesson.isFree)
}