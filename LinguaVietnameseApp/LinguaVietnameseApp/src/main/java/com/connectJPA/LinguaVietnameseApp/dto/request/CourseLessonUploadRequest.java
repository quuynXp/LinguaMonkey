package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.google.firebase.database.annotations.NotNull;
import lombok.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CourseLessonUploadRequest {
    @NotNull
    private UUID courseId;

    @NotNull
    private UUID versionId;

    @NotNull
    private Integer lessonIndex;

    private MultipartFile videoFile;

    private MultipartFile thumbnailFile;

    private List<String> resourceUrls;
}
