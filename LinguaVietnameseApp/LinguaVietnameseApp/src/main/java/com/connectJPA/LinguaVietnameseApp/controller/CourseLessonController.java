package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseLessonRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseLessonResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Lesson;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.LessonMapper;
import com.connectJPA.LinguaVietnameseApp.service.CourseLessonService;
import com.connectJPA.LinguaVietnameseApp.service.LessonService;
import com.connectJPA.LinguaVietnameseApp.service.StorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/course-lessons")
@RequiredArgsConstructor
@Slf4j
public class CourseLessonController {
    private final CourseLessonService courseLessonService;
    private final MessageSource messageSource;
    private final StorageService storageService;
    private final LessonService lessonService;
    private final LessonMapper lessonMapper;

    @Operation(summary = "Get all course lessons", description = "Retrieve a paginated list of course lessons with optional filtering by courseId or lessonId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved course lessons"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<CourseLessonResponse>> getAllCourseLessons(
            @Parameter(description = "Course ID filter") @RequestParam(required = false) UUID courseId,
            @Parameter(description = "Lesson ID filter") @RequestParam(required = false) UUID lessonId,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<CourseLessonResponse> courseLessons = courseLessonService.getAllCourseLessons(courseId, lessonId, pageable);
        return AppApiResponse.<Page<CourseLessonResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("courseLesson.list.success", null, locale))
                .result(courseLessons)
                .build();
    }

    @Operation(summary = "Get course lesson by IDs", description = "Retrieve a course lesson by courseId and lessonId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved course lesson"),
            @ApiResponse(responseCode = "404", description = "Course lesson not found")
    })
    @GetMapping("/{courseId}/{lessonId}")
    public AppApiResponse<CourseLessonResponse> getCourseLessonByIds(
            @Parameter(description = "Course ID") @PathVariable UUID courseId,
            @Parameter(description = "Lesson ID") @PathVariable UUID lessonId,
            Locale locale) {
        CourseLessonResponse courseLesson = courseLessonService.getCourseLessonByIds(courseId, lessonId);
        return AppApiResponse.<CourseLessonResponse>builder()
                .code(200)
                .message(messageSource.getMessage("courseLesson.get.success", null, locale))
                .result(courseLesson)
                .build();
    }

    @PostMapping("/upload")
    public AppApiResponse<LessonResponse> uploadLesson(
            @RequestParam UUID courseId,
            @RequestParam UUID versionId,
            @RequestParam Integer lessonIndex,
            @RequestPart(required = false) MultipartFile videoFile,
            @RequestPart(required = false) MultipartFile thumbnailFile,
            @RequestPart String lessonData, // JSON: {title, description, duration}
            Locale locale) {

        try {
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Object> lessonMap = mapper.readValue(lessonData, Map.class);

            // 1. Upload video thành temp
            String videoPath = null;
            if (videoFile != null && !videoFile.isEmpty()) {
                String tempVideoPath = storageService.uploadTemp(videoFile);
                videoPath = String.format("courses/%s/v%d/lesson-%d/video.mp4",
                        courseId, versionId, lessonIndex);
                videoPath = storageService.uploadStream(
                        videoFile.getInputStream(),
                        videoPath,
                        videoFile.getContentType()
                );
                }

            // 2. Upload thumbnail
                String thumbnailPath = null;
                if (thumbnailFile != null && !thumbnailFile.isEmpty()) {
                String tempThumbPath = storageService.uploadTemp(thumbnailFile);
                thumbnailPath = String.format("courses/%s/v%d/lesson-%d/thumb.jpg",
                        courseId, versionId, lessonIndex);
                thumbnailPath = storageService.uploadStream(
                        thumbnailFile.getInputStream(),
                        thumbnailPath,
                        thumbnailFile.getContentType()
                );
                }

            // 3. Lưu Lesson entity
                        Lesson lesson = Lesson.builder()
                        .title((String) lessonMap.get("title"))
                        .description((String) lessonMap.get("description"))
                        .durationSeconds(Integer.valueOf((String) lessonMap.get("duration")))
                        .description(videoPath)
                        .thumbnailUrl(thumbnailPath)
                        .isFree((Boolean) lessonMap.getOrDefault("isFree", false))
                        .build();

                        lesson = lessonService.saveLessonForVersion(lesson, versionId, lessonIndex);

                        return AppApiResponse.<LessonResponse>builder()
                        .code(201)
                        .message(messageSource.getMessage("lesson.upload.success", null, locale))
                        .result(lessonMapper.toResponse(lesson))
                        .build();

        } catch (Exception e) {
                log.error("Lesson upload failed: {}", e.getMessage());
                throw new AppException(ErrorCode.FILE_UPLOAD_FAILED);
        }
                }

    @Operation(summary = "Create a new course lesson", description = "Create a new course lesson with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Course lesson created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid course lesson data")
    })
    @PostMapping
    public AppApiResponse<CourseLessonResponse> createCourseLesson(
            @Valid @RequestBody CourseLessonRequest request,
            Locale locale) {
        CourseLessonResponse courseLesson = courseLessonService.createCourseLesson(request);
        return AppApiResponse.<CourseLessonResponse>builder()
                .code(201)
                .message(messageSource.getMessage("courseLesson.created.success", null, locale))
                .result(courseLesson)
                .build();
    }

    @Operation(summary = "Update a course lesson", description = "Update an existing course lesson by courseId and lessonId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Course lesson updated successfully"),
            @ApiResponse(responseCode = "404", description = "Course lesson not found"),
            @ApiResponse(responseCode = "400", description = "Invalid course lesson data")
    })
    @PutMapping("/{courseId}/{lessonId}")
    public AppApiResponse<CourseLessonResponse> updateCourseLesson(
            @Parameter(description = "Course ID") @PathVariable UUID courseId,
            @Parameter(description = "Lesson ID") @PathVariable UUID lessonId,
            @Valid @RequestBody CourseLessonRequest request,
            Locale locale) {
        CourseLessonResponse courseLesson = courseLessonService.updateCourseLesson(courseId, lessonId, request);
        return AppApiResponse.<CourseLessonResponse>builder()
                .code(200)
                .message(messageSource.getMessage("courseLesson.updated.success", null, locale))
                .result(courseLesson)
                .build();
    }

    @Operation(summary = "Delete a course lesson", description = "Soft delete a course lesson by courseId and lessonId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Course lesson deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Course lesson not found")
    })
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or #id.toString() == authentication.name")
    @DeleteMapping("/{courseId}/{lessonId}")
    public AppApiResponse<Void> deleteCourseLesson(
            @Parameter(description = "Course ID") @PathVariable UUID courseId,
            @Parameter(description = "Lesson ID") @PathVariable UUID lessonId,
            Locale locale) {
        courseLessonService.deleteCourseLesson(courseId, lessonId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("courseLesson.deleted.success", null, locale))
                .build();
    }
}