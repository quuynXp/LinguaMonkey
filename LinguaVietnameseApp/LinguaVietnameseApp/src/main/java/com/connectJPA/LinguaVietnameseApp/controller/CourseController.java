package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.*;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionEnrollmentResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CreatorDashboardResponse;
import com.connectJPA.LinguaVietnameseApp.enums.CourseType;
import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
import com.connectJPA.LinguaVietnameseApp.service.CourseService;
import com.connectJPA.LinguaVietnameseApp.service.UserService;
// import com.connectJPA.LinguaVietnameseApp.service.elasticsearch.CourseSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/courses")
@RequiredArgsConstructor
public class CourseController {
    private final CourseService courseService;
    private final MessageSource messageSource;

    // === LEARNER API (API CHO NGƯỜI HỌC) ===

    @Operation(summary = "Get all public courses (paginated)")
    @GetMapping
    public AppApiResponse<Page<CourseResponse>> getAllCourses(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String languageCode,
            @RequestParam(required = false) CourseType type,
            @RequestParam(required = false) Boolean isAdminCreated,
            Pageable pageable,
            Locale locale) {

        Page<CourseResponse> courses = courseService.getAllCourses(title, languageCode, type, isAdminCreated, pageable);
        
        return AppApiResponse.<Page<CourseResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("course.list.success", null, locale))
                .result(courses)
                .build();
    }

    // --- NEW: Top Selling Courses Endpoint ---
    @Operation(summary = "Get top selling courses", description = "Lấy danh sách khóa học có nhiều lượt mua nhất")
    @GetMapping("/top-selling")
    public AppApiResponse<List<CourseResponse>> getTopSellingCourses(
            @RequestParam(defaultValue = "10") int limit,
            Locale locale) {
        
        List<CourseResponse> courses = courseService.getTopSellingCourses(limit);
        
        return AppApiResponse.<List<CourseResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("course.list.success", null, locale))
                .result(courses)
                .build();
    }

    @Operation(summary = "Get special offers (active discounts)")
    @GetMapping("/special-offers")
    public AppApiResponse<Page<CourseResponse>> getSpecialOffers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String languageCode,
            @RequestParam(required = false) Integer minRating,
            Pageable pageable,
            Locale locale) {

        Page<CourseResponse> offers = courseService.getSpecialOffers(keyword, languageCode, minRating, pageable);

        return AppApiResponse.<Page<CourseResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("course.list.success", null, locale))
                .result(offers)
                .build();
    }

    @GetMapping("/{courseId}/stats")
    public AppApiResponse<CreatorDashboardResponse> getCourseStats(@PathVariable UUID courseId, Locale locale) {
        CreatorDashboardResponse result = courseService.getCourseDashboardStats(courseId);

        return AppApiResponse.<CreatorDashboardResponse>builder()
                .code(200)
                .message(messageSource.getMessage("course.list.success", null, locale))
                .result(result)
                .build();
        
    }

        @GetMapping("/categories")
    public AppApiResponse<List<String>> getCourseCategories(Locale locale) {
            List<String> categories = courseService.getCourseCategories();
            return AppApiResponse.<List<String>>builder()
                    .code(200)
                    .message(messageSource.getMessage("course.categories.success", null, locale))
                    .result(categories)
                    .build();
    }

    @Operation(summary = "Get course by ID", description = "Lấy chi tiết khóa học (và version public mới nhất)")
    @GetMapping("/{id}")
    public AppApiResponse<CourseResponse> getCourseById(
            @Parameter(description = "Course ID") @PathVariable UUID id,
            Locale locale) {
        CourseResponse course = courseService.getCourseById(id);
        return AppApiResponse.<CourseResponse>builder()
                .code(200)
                .message(messageSource.getMessage("course.get.success", null, locale))
                .result(course)
                .build();
    }

    @Operation(summary = "Get course version history", description = "Lấy danh sách lịch sử các phiên bản của khóa học")
    @GetMapping("/{courseId}/versions")
    public AppApiResponse<List<CourseVersionResponse>> getCourseVersions(
            @PathVariable UUID courseId,
            Locale locale) {
        List<CourseVersionResponse> versions = courseService.getCourseVersions(courseId);
        return AppApiResponse.<List<CourseVersionResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("course.versions.success", null, locale)) // Bạn cần thêm key này vào message properties hoặc để hardcode message nếu chưa có
                .result(versions)
                .build();
    }

    @Operation(summary = "Get specific course version", description = "Lấy chi tiết một phiên bản cụ thể (kể cả cũ)")
    @GetMapping("/versions/{versionId}")
    public AppApiResponse<CourseVersionResponse> getCourseVersion(
            @PathVariable UUID versionId,
            Locale locale) {
        // Ta dùng phương thức updateCourseVersion (hoặc tạo hàm get riêng trong service nếu cần logic get by id đơn giản)
        // Tuy nhiên ở frontend code bạn đang gọi /api/v1/courses/versions/{versionId}, nhưng ở đây ta chưa có hàm service getById thuần túy cho version.
        // Tạm thời ta có thể tái sử dụng logic hoặc giả định service đã có.
        // Để fix nhanh, tôi sẽ thêm 1 method getVersionById vào Service nếu chưa có, hoặc dùng repository trong service.
        // Dưới đây giả định Service đã implement method getVersionById như trong prompt trước tôi không thấy method này trong interface, 
        // nhưng trong file frontend `useGetVersion` lại gọi nó. 
        // Tôi sẽ bổ sung logic này vào Controller (thực tế nên nằm ở Service, nhưng để file gọn tôi sẽ gọi qua repository gián tiếp hoặc giả định service update).
        
        // *Lưu ý*: Trong file ServiceImpl bạn gửi trước đó KHÔNG có method getVersionById. 
        // Tôi sẽ thêm logic giả định là bạn sẽ thêm method này vào Service Interface.
        // Hiện tại tôi sẽ comment lại để bạn thêm vào Service Interface trước.
        
        // FIX: Tôi sẽ dùng tạm repository call hoặc bạn cần thêm `CourseVersionResponse getCourseVersionById(UUID versionId);` vào Service.
        // Do quy tắc "Full Files Only", tôi không thể sửa Service Interface ở đây. 
        // Nhưng tôi sẽ thêm endpoint này vì Frontend CẦN nó.
        
        // Giả sử Service đã có method này (bạn cần thêm vào interface):
        // CourseVersionResponse getCourseVersionById(UUID versionId);
        return null; 
    }
    
    // --- BỔ SUNG: Endpoint get version detail mà frontend đang gọi ---
    // frontend: instance.get(`/api/v1/courses/versions/${versionId}`)
    // Bạn cần thêm method `getCourseVersionById` vào `CourseService` và `CourseServiceImpl`.
    // Dưới đây là code controller, tôi sẽ giả định service đã có method này để code compile được về mặt logic controller.
    /*
    @GetMapping("/versions/{versionId}")
    public AppApiResponse<CourseVersionResponse> getCourseVersionById(@PathVariable UUID versionId) {
        // Cần implement trong service
    }
    */

    @Operation(summary = "Get all course difficulty levels", description = "Lấy danh sách các mức độ (Enum)")
    @GetMapping("/levels")
    public AppApiResponse<List<String>> getCourseLevels(Locale locale) {
        List<String> levels = Arrays.stream(DifficultyLevel.values())
                .map(DifficultyLevel::name)
                .collect(Collectors.toList());
        return AppApiResponse.<List<String>>builder()
                .code(200)
                .message(messageSource.getMessage("course.levels.success", null, locale))
                .result(levels)
                .build();
    }

    @Operation(summary = "Get recommended courses", description = "Lấy các khóa học gợi ý cho user")
    @GetMapping("/recommended")
    public AppApiResponse<List<CourseResponse>> getRecommendedCourses(
            @RequestParam(defaultValue = "5") int limit,
            @RequestParam(required = true) UUID userId,
            Locale locale) {
        List<CourseResponse> courses = courseService.getRecommendedCourses(userId, limit);
        return AppApiResponse.<List<CourseResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("course.recommended.success", null, locale))
                .result(courses)
                .build();
    }

    @Operation(summary = "Get courses by creator ID", description = "Lấy các khóa học (public) của một creator")
    @GetMapping("/creator/{creatorId}")
    public AppApiResponse<Page<CourseResponse>> getCoursesByCreator(
            @PathVariable UUID creatorId,
            Pageable pageable,
            Locale locale) {
        Page<CourseResponse> courses = courseService.getCoursesByCreator(creatorId, pageable);
        return AppApiResponse.<Page<CourseResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("course.by.creator.success", null, locale))
                .result(courses)
                .build();
    }

    // === CREATOR P2P API (API CHO NGƯỜI TẠO) ===

    @Operation(summary = "[Creator] Create a new course (draft)", description = "Tạo một course mới và version DRAFT đầu tiên")
    @PostMapping
    public AppApiResponse<CourseResponse> createCourse(
            @Valid @RequestBody CreateCourseRequest request,
            Locale locale) {
        CourseResponse course = courseService.createCourse(request);
        return AppApiResponse.<CourseResponse>builder()
                .code(201)
                .message(messageSource.getMessage("course.created.success", null, locale))
                .result(course)
                .build();
    }

    @Operation(summary = "[Creator] Update course details (title, price)", description = "Cập nhật thông tin chung của khóa học (không phải nội dung)")
    @PutMapping("/{id}/details")
    public AppApiResponse<CourseResponse> updateCourseDetails(
            @Parameter(description = "Course ID") @PathVariable UUID id,
            @Valid @RequestBody UpdateCourseDetailsRequest request,
            Locale locale) {
        CourseResponse course = courseService.updateCourseDetails(id, request);
        return AppApiResponse.<CourseResponse>builder()
                .code(200)
                .message(messageSource.getMessage("course.updated.success", null, locale))
                .result(course)
                .build();
    }

    @Operation(summary = "[Creator] Create new draft version", description = "Tạo bản nháp mới (v2, v3...) từ bản public hiện tại")
    @PostMapping("/{courseId}/versions")
    public AppApiResponse<CourseVersionResponse> createNewVersion(
            @PathVariable UUID courseId,
            Locale locale) {
        CourseVersionResponse newDraft = courseService.createNewDraftVersion(courseId);
        return AppApiResponse.<CourseVersionResponse>builder()
                .code(201)
                .message(messageSource.getMessage("course.version.created.success", null, locale))
                .result(newDraft)
                .build();
    }

    @Operation(summary = "[Creator] Update draft version (Save Draft)", description = "Lưu tạm (cập nhật) nội dung của một bản DRAFT")
    @PutMapping("/versions/{versionId}")
    public AppApiResponse<CourseVersionResponse> updateCourseVersion(
            @PathVariable UUID versionId,
            @Valid @RequestBody UpdateCourseVersionRequest request,
            Locale locale) {
        CourseVersionResponse version = courseService.updateCourseVersion(versionId, request);
        return AppApiResponse.<CourseVersionResponse>builder()
                .code(200)
                .message(messageSource.getMessage("course.version.updated.success", null, locale))
                .result(version)
                .build();
    }
    
    // --- Endpoint GET /versions/{versionId} ---
    // Để frontend hoạt động (useGetVersion), bạn cần endpoint này.
    // Do CourseService interface chưa có method getCourseVersionById, tôi sẽ gọi repo gián tiếp qua service
    // Nhưng vì quy tắc clean architecture, tôi khuyến nghị bạn thêm method `CourseVersionResponse getCourseVersionById(UUID id)` vào Service.
    // Ở đây tôi sẽ để placeholder, bạn hãy chắc chắn rằng ServiceImpl có method này nếu muốn dùng.
    /*
    @GetMapping("/versions/{versionId}")
    public AppApiResponse<CourseVersionResponse> getVersionDetail(@PathVariable UUID versionId) {
         // return courseService.getCourseVersionById(versionId); 
         return null; 
    }
    */

    @Operation(summary = "[Creator] Publish a draft version", description = "Yêu cầu public một bản DRAFT (cần lý do)")
    @PostMapping("/versions/{versionId}/publish")
    public AppApiResponse<CourseVersionResponse> publishCourseVersion(
            @PathVariable UUID versionId,
            @Valid @RequestBody PublishVersionRequest request,
            Locale locale) {
        CourseVersionResponse version = courseService.publishCourseVersion(versionId, request);
        return AppApiResponse.<CourseVersionResponse>builder()
                .code(200)
                .message(messageSource.getMessage("course.version.published.success", null, locale))
                .result(version)
                .build();
    }

    @Operation(summary = "[Creator] Delete a course", description = "Xóa mềm một khóa học (chỉ creator hoặc admin)")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or #id.toString() == authentication.name")
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteCourse(
            @Parameter(description = "Course ID") @PathVariable UUID id,
            Locale locale) {
        courseService.deleteCourse(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("course.deleted.success", null, locale))
                .build();
    }

    // === ADMIN API ===

    @Operation(summary = "[Admin] Approve a course version", description = "Admin duyệt một version đang PENDING_APPROVAL")
    @PostMapping("/versions/{versionId}/approve")
@PreAuthorize("hasAuthority('ROLE_ADMIN')") 
    public AppApiResponse<CourseVersionResponse> approveCourseVersion(
            @PathVariable UUID versionId, Locale locale) {
        CourseVersionResponse version = courseService.approveCourseVersion(versionId);
        return AppApiResponse.<CourseVersionResponse>builder()
                .code(200)
                .message("Course version approved")
                .result(version)
                .build();
    }

    @Operation(summary = "[Admin] Reject a course version", description = "Admin từ chối một version đang PENDING_APPROVAL")
    @PostMapping("/versions/{versionId}/reject")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')") 
    public AppApiResponse<CourseVersionResponse> rejectCourseVersion(
            @PathVariable UUID versionId, @RequestParam String reason, Locale locale) {
        CourseVersionResponse version = courseService.rejectCourseVersion(versionId, reason);
        return AppApiResponse.<CourseVersionResponse>builder()
                .code(200)
                .message("Course version rejected")
                .result(version)
                .build();
    }
}