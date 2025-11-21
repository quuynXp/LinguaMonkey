package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.dto.BilingualSubtitleDTO;
import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class VideoResponse {
    private UUID videoId;
    private String videoUrl;
    private String title;
    private String type;     // Map từ category
    private String level;    // Map từ enum hoặc string
    private String originalSubtitleUrl;
    private UUID lessonId;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private String description; // Lưu ý: Bảng videos có cột này không? Trong schema bạn gửi không thấy, nhưng FE cần. Nếu thiếu phải check lại entity.
    private String category;    // map từ 'type' trong schema
    private Integer likesCount; // Lấy từ bảng video_reactions (count)
    private Integer dislikesCount;
    private Boolean isLiked;
    private Boolean isDisliked;
    private Boolean isFavorited;
    private String duration;
    private Integer progress;

    private List<BilingualSubtitleDTO> subtitles;
}
