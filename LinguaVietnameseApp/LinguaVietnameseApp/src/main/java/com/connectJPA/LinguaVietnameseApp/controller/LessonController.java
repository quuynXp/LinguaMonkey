package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonHierarchicalResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonProgressWrongItemResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.QuizResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoomResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Lesson;
import com.connectJPA.LinguaVietnameseApp.entity.Video;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.LessonMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.RoomMemberRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.VideoRepository;
import com.connectJPA.LinguaVietnameseApp.service.LessonProgressWrongItemService;
import com.connectJPA.LinguaVietnameseApp.service.LessonService;
import com.connectJPA.LinguaVietnameseApp.service.RoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/lessons")
@Tag(name = "Lesson Management", description = "APIs for managing lessons categorized by lesson categories and subcategories")
@RequiredArgsConstructor
public class LessonController {
    private final LessonService lessonService;
    private final MessageSource messageSource;
    private final RoomService roomService;
    private final RoomMemberRepository roomMemberRepository;
    private final LessonMapper lessonMapper;
    private final LessonRepository lessonRepository;
    private final VideoRepository videoRepository;
    private final LessonProgressWrongItemService wrongItemService;

    @Operation(summary = "Get all lessons", description = "Retrieve a paginated list of lessons with optional filtering by name, language, EXP reward, category, subcategory, course, or series")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lessons"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters"),
            @ApiResponse(responseCode = "404", description = "Category or subcategory not found")
    })
    @GetMapping
    public AppApiResponse<Page<LessonResponse>> getAllLessons(
            @Parameter(description = "Lesson name filter") @RequestParam(required = false) String lessonName,
            @Parameter(description = "Language code filter") @RequestParam(required = false) String languageCode,
            @Parameter(description = "Minimum EXP reward filter") @RequestParam(required = false) Integer minExpReward,
            @Parameter(description = "Category ID filter (e.g., certificate-related)") @RequestParam(required = false) UUID categoryId,
            @Parameter(description = "Subcategory ID filter (e.g., specific topic)") @RequestParam(required = false) UUID subCategoryId,
            @Parameter(description = "Course ID filter") @RequestParam(required = false) UUID courseId,
            @Parameter(description = "Series ID filter") @RequestParam(required = false) UUID seriesId,
            @Parameter(description = "SkillType filter") @RequestParam(required = false) SkillType skillType,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        try {
            Page<LessonResponse> lessons = lessonService.getAllLessons(lessonName, languageCode, minExpReward, categoryId, subCategoryId, courseId, seriesId, skillType, pageable);
            return AppApiResponse.<Page<LessonResponse>>builder()
                    .code(200)
                    .message(messageSource.getMessage("lesson.list.success", null, locale))
                    .result(lessons)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<Page<LessonResponse>>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    // --- NEW ENDPOINT: GET TREE STRUCTURE ---
    @Operation(summary = "Get lesson tree structure by skill", description = "Returns hierarchical data: Category -> SubCategory -> Lessons")
    @GetMapping("/tree")
    public AppApiResponse<List<LessonHierarchicalResponse>> getLessonsTreeBySkill(
            @RequestParam SkillType skillType,
            @RequestParam(defaultValue = "en") String languageCode,
            Locale locale) {
        try {
            List<LessonHierarchicalResponse> tree = lessonService.getLessonsTreeBySkill(skillType, languageCode);
            return AppApiResponse.<List<LessonHierarchicalResponse>>builder()
                    .code(200)
                    .message("Success")
                    .result(tree)
                    .build();
        } catch (Exception e) {
            return AppApiResponse.<List<LessonHierarchicalResponse>>builder()
                    .code(500)
                    .message(e.getMessage())
                    .build();
        }
    }

    @GetMapping("/{lessonId}/wrong-items")
    public AppApiResponse<Page<LessonProgressWrongItemResponse>> getWrongItems(
            @PathVariable UUID lessonId,
            @RequestParam UUID userId,
            Pageable pageable) {
        try {
             Page<LessonProgressWrongItemResponse> items = wrongItemService.getAllLessonProgressWrongItems(lessonId, userId, null, pageable);
             return AppApiResponse.<Page<LessonProgressWrongItemResponse>>builder()
                    .code(200).message("OK").result(items).build();
        } catch (Exception e) {
             return AppApiResponse.<Page<LessonProgressWrongItemResponse>>builder()
                    .code(500).message(e.getMessage()).build();
        }
    }

    @PostMapping("/{lessonId}/start-test")
    public AppApiResponse<?> startTest(
            @PathVariable UUID lessonId,
            @RequestParam(required = false) UUID userId,
            Locale locale) {
        try {
            Map<String, Object> payload = lessonService.startTest(lessonId, userId);
            return AppApiResponse.builder().code(200).message("Started").result(payload).build();
        } catch (AppException e) {
            return AppApiResponse.<Object>builder().code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale)).build();
        }
    }

    @PostMapping("/{lessonId}/submit-test")
    public AppApiResponse<?> submitTest(
            @PathVariable UUID lessonId,
            @RequestParam(required = false) UUID userId,
            @RequestBody Map<String, Object> body, // { answers: {questionId: answer} }
            Locale locale) {
        try {
            Map<String, Object> result = lessonService.submitTest(lessonId, userId, body);
            return AppApiResponse.builder().code(200).message("Submitted").result(result).build();
        } catch (AppException e) {
            return AppApiResponse.<Object>builder().code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale)).build();
        }
    }


    @Operation(summary = "Get lesson by ID", description = "Retrieve a lesson by its ID, including associated videos and questions")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lesson"),
            @ApiResponse(responseCode = "404", description = "Lesson not found")
    })
    @GetMapping("/{id}")
    public AppApiResponse<LessonResponse> getLessonById(
            @Parameter(description = "Lesson ID") @PathVariable UUID id,
            Locale locale) {
        try {
            LessonResponse lesson = lessonService.getLessonById(id);
            return AppApiResponse.<LessonResponse>builder()
                    .code(200)
                    .message(messageSource.getMessage("lesson.get.success", null, locale))
                    .result(lesson)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<LessonResponse>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    @Operation(summary = "Create a new lesson", description = "Create a new lesson with details, categorized by category and subcategory")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Lesson created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid lesson data"),
            @ApiResponse(responseCode = "404", description = "Category or subcategory not found")
    })
    @PostMapping
    public AppApiResponse<LessonResponse> createLesson(
            @Valid @RequestBody LessonRequest request,
            Locale locale) {
        try {
            LessonResponse lesson = lessonService.createLesson(request);
            return AppApiResponse.<LessonResponse>builder()
                    .code(201)
                    .message(messageSource.getMessage("lesson.created.success", null, locale))
                    .result(lesson)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<LessonResponse>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    @GetMapping("/creator/{creatorId}")
    public AppApiResponse<Page<LessonResponse>> getByCreator(@PathVariable UUID creatorId, Pageable pageable) {
        Page<Lesson> page = lessonService.getLessonsByCreator(creatorId, pageable);
        Page<LessonResponse> responsePage = page.map(this::toLessonResponse);

        return AppApiResponse.<Page<LessonResponse>>builder()
                .code(200)
                .message("OK")
                .result(responsePage)
                .build();
    }

    private LessonResponse toLessonResponse(Lesson lesson) {
        try {
            SkillType skillType = lessonRepository.findSkillTypeByLessonIdAndIsDeletedFalse(lesson.getLessonId());
            List<String> videoUrls = videoRepository.findByLessonIdAndIsDeletedFalse(lesson.getLessonId())
                    .stream()
                    .map(Video::getVideoUrl)
                    .collect(Collectors.toList());

            LessonResponse response = lessonMapper.toResponse(lesson);
            response.setSkillTypes(skillType != null ? skillType : SkillType.READING);
            response.setVideoUrls(videoUrls);
            return response;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Operation(summary = "Update a lesson", description = "Update an existing lesson by its ID, including category and subcategory")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lesson updated successfully"),
            @ApiResponse(responseCode = "404", description = "Lesson or category/subcategory not found"),
            @ApiResponse(responseCode = "400", description = "Invalid lesson data")
    })
    @PutMapping("/{id}")
    public AppApiResponse<LessonResponse> updateLesson(
            @Parameter(description = "Lesson ID") @PathVariable UUID id,
            @Valid @RequestBody LessonRequest request,
            Locale locale) {
        try {
            LessonResponse lesson = lessonService.updateLesson(id, request);
            return AppApiResponse.<LessonResponse>builder()
                    .code(200)
                    .message(messageSource.getMessage("lesson.updated.success", null, locale))
                    .result(lesson)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<LessonResponse>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    @Operation(summary = "Delete a lesson", description = "Soft delete a lesson by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lesson deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Lesson not found")
    })
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteLesson(
            @Parameter(description = "Lesson ID") @PathVariable UUID id,
            Locale locale) {
        try {
            lessonService.deleteLesson(id);
            return AppApiResponse.<Void>builder()
                    .code(200)
                    .message(messageSource.getMessage("lesson.deleted.success", null, locale))
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<Void>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    @Operation(summary = "Complete a lesson", description = "Mark a lesson as completed, award EXP to the user, and track progress")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lesson completed successfully"),
            @ApiResponse(responseCode = "404", description = "Lesson or user not found")
    })
    @PostMapping("/{lessonId}/complete")
    public AppApiResponse<Void> completeLesson(
            @Parameter(description = "Lesson ID") @PathVariable UUID lessonId,
            @Parameter(description = "User ID") @RequestParam UUID userId,
            @Parameter(description = "Score achieved") @RequestParam(required = false) Integer score,
            Locale locale) {
        try {
            lessonService.completeLesson(lessonId, userId, score);
            return AppApiResponse.<Void>builder()
                    .code(200)
                    .message(messageSource.getMessage("lesson.completed.success", null, locale))
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<Void>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    @Operation(summary = "Get lessons by skill type", description = "Retrieve lessons filtered by specific skill type (e.g., LISTENING, SPEAKING)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lessons"),
            @ApiResponse(responseCode = "400", description = "Invalid skill type or pagination")
    })
    @GetMapping("/by-skill")
    public AppApiResponse<Page<LessonResponse>> getLessonsBySkillType(
            @Parameter(description = "Skill type filter") @RequestParam SkillType skillType,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        try {
            Page<LessonResponse> lessons = lessonService.getLessonsBySkillType(skillType, pageable);
            return AppApiResponse.<Page<LessonResponse>>builder()
                    .code(200)
                    .message(messageSource.getMessage("lesson.list.skill.success", null, locale))
                    .result(lessons)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<Page<LessonResponse>>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    @Operation(summary = "Get lessons by certificate or topic", description = "Retrieve lessons associated with a certificate or specific topic via category or subcategory")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lessons"),
            @ApiResponse(responseCode = "400", description = "Invalid pagination"),
            @ApiResponse(responseCode = "404", description = "Category or subcategory not found")
    })
    @GetMapping("/by-certificate-or-topic")
    public AppApiResponse<Page<LessonResponse>> getLessonsByCertificateOrTopic(
            @Parameter(description = "Category ID (e.g., certificate-related)") @RequestParam(required = false) UUID categoryId,
            @Parameter(description = "Subcategory ID (e.g., specific topic)") @RequestParam(required = false) UUID subCategoryId,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        try {
            Page<LessonResponse> lessons = lessonService.getLessonsByCertificateOrTopic(categoryId, subCategoryId, pageable);
            return AppApiResponse.<Page<LessonResponse>>builder()
                    .code(200)
                    .message(messageSource.getMessage("lesson.list.certificate.success", null, locale))
                    .result(lessons)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<Page<LessonResponse>>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }
    @Operation(summary = "Generate a personalized solo quiz", description = "Generates 15 AI questions based on user profile")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully generated quiz"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @GetMapping("/quiz/generate-solo")
    public AppApiResponse<QuizResponse> generateSoloQuiz(
            @Parameter(description = "User ID") @RequestParam UUID userId,
            @RequestHeader("Authorization") String authorizationHeader, // ✅ Lấy token
            Locale locale) {
        try {
            String token = authorizationHeader.replace("Bearer ", ""); // Tách token
            QuizResponse quiz = lessonService.generateSoloQuiz(token, userId); // ✅ Truyền token
            return AppApiResponse.<QuizResponse>builder()
                    .code(200)
                    .message(messageSource.getMessage("quiz.generated.solo.success", null, locale))
                    .result(quiz)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<QuizResponse>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    @Operation(summary = "Generate a team quiz", description = "Generates 30 general knowledge language questions for a team")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully generated quiz")
    })
    @GetMapping("/quiz/generate-team")
    public AppApiResponse<QuizResponse> generateTeamQuiz(
            @Parameter(description = "Room ID") @RequestParam UUID roomId,
            @Parameter(description = "User ID (for validation)") @RequestParam UUID userId,
            @RequestHeader("Authorization") String authorizationHeader,
            @Parameter(description = "Optional topic") @RequestParam(required = false) String topic,
            Locale locale) {
        try {
            if (!roomMemberRepository.existsById_RoomIdAndId_UserIdAndIsDeletedFalse(roomId, userId)) {
                throw new AppException(ErrorCode.NOT_ROOM_MEMBER);
            }

            String token = authorizationHeader.replace("Bearer ", ""); // Tách token
            QuizResponse quiz = lessonService.generateTeamQuiz(token, topic);
            return AppApiResponse.<QuizResponse>builder()
                    .code(200)
                    .message(messageSource.getMessage("quiz.generated.team.success", null, locale))
                    .result(quiz)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<QuizResponse>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    @Operation(summary = "Find or create a quiz room", description = "Finds an available team quiz room or creates a new one")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Found or created room successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    @PostMapping("/quiz/find-or-create-room")
    public AppApiResponse<RoomResponse> findOrCreateQuizRoom(
            @Parameter(description = "User ID joining") @RequestParam UUID userId,
            Locale locale) {
        try {
            RoomResponse room = roomService.findOrCreateQuizRoom(userId); // Cần tạo hàm này

            return AppApiResponse.<RoomResponse>builder()
                    .code(200)
                    .message(messageSource.getMessage("quiz.room.joined.success", null, locale))
                    .result(room)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<RoomResponse>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }
}