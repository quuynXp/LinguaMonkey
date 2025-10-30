package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherApplyRequest {

    @NotNull(message = "userId không được null")
    private UUID userId;

    @NotBlank(message = "idDocumentUrl bắt buộc")
    @Size(max = 2048)
    private String idDocumentUrl; // url do frontend upload

    @NotEmpty(message = "Cần ít nhất 1 chứng chỉ / tài liệu")
    private List<@Size(max = 2048) String> certificateUrls;

    @NotBlank(message = "Họ tên bắt buộc")
    @Size(min = 2, max = 200)
    private String fullName;

    @NotNull(message = "Ngày sinh bắt buộc")
    private LocalDate dateOfBirth;

    @NotBlank(message = "Số điện thoại bắt buộc")
    @Pattern(regexp = "^[0-9+\\- ]{7,20}$", message = "Số điện thoại không hợp lệ")
    private String phoneNumber;

    @NotBlank(message = "Tiểu sử ngắn bắt buộc")
    @Size(min = 50, max = 1000)
    private String shortBio;

    @NotEmpty(message = "Phải chọn ít nhất 1 ngôn ngữ giảng dạy")
    private List<@NotBlank String> teachingLanguages;

    @NotEmpty(message = "Phải chọn ít nhất 1 chủ đề")
    private List<@NotBlank String> subjects;

    // Optional
    private List<@Size(max = 2048) String> sampleLessonUrls;
    private Integer yearsOfExperience;
    private BigDecimal suggestedPricePerCourse;
    private String linkedinUrl;
    private String portfolioUrl;
    private String additionalNotes;

    // metadata (do client hoặc server fill)
    private String submissionSource;
}
