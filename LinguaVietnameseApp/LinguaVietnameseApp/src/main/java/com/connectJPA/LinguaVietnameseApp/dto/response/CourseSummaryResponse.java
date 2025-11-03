package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CourseSummaryResponse {
    private UUID courseId;
    private String title;
    private UUID ownerId;
    private String ownerName;
    private double averageRating;
    private long reviewCount;
    private int star; // nếu cần hiển thị star integer

    public CourseSummaryResponse(UUID courseId, String title, String thumbnailUrl) {
    }
}
