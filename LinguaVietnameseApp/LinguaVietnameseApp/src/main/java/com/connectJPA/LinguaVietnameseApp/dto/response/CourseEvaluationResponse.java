package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseEvaluationResponse {
    /**
     * Điểm đánh giá chất lượng khóa học từ mô hình AI (1.0 - 5.0).
     */
    private float rating;

    /**
     * Nội dung bình luận/đánh giá do hệ thống AI tạo ra.
     */
    private String reviewComment;
}