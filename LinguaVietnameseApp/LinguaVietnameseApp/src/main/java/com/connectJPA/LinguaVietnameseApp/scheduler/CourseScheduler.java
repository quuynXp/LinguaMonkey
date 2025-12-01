package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.response.CourseEvaluationResponse;
import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.enums.NotificationType;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.utils.NotificationI18nUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class CourseScheduler {

    private final CourseVersionRepository courseVersionRepository;
    private final CourseVersionLessonRepository cvlRepository;
    private final CourseVersionReviewRepository courseVersionReviewRepository;
    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final GrpcClientService grpcClientService;

    private static final String TIME_ZONE = "UTC";
    // System user UUID for AI reviews
    private static final UUID SYSTEM_USER_UUID = UUID.fromString("00000000-0000-0000-0000-000000000000");

    @Value("${app.system.token}") // Token for internal gRPC calls
    private String systemToken;

    @Scheduled(cron = "0 0 9,15,21 * * ?", zone = TIME_ZONE)
    @Transactional
    public void runCourseValidationJob() {
        log.info("=== Starting Scheduled Course Validation Job ===");
        
        // 1. & 2. Validate Drafts (Integrity & Content)
        validatePendingDrafts();

        // 3. System AI Review for Public versions that haven't been reviewed
        performSystemReviews();
        
        log.info("=== Completed Scheduled Course Validation Job ===");
    }

    private void validatePendingDrafts() {
        List<CourseVersion> pendingDrafts = courseVersionRepository.findDraftsPendingValidation();
        log.info("Found {} drafts pending validation.", pendingDrafts.size());

        for (CourseVersion draft : pendingDrafts) {
            StringBuilder warningLog = new StringBuilder();
            
            // Check 1: Integrity (No deletion of old lessons)
            boolean integrityPassed = checkVersionIntegrity(draft, warningLog);
            
            // Check 2: Content Quality (Fake lesson detection)
            boolean contentPassed = checkContentQuality(draft, warningLog);

            // Update Flags
            draft.setIsIntegrityValid(integrityPassed);
            draft.setIsContentValid(contentPassed);
            draft.setValidationWarnings(warningLog.toString());
            
            // Optimization flags for dashboard
            updateOptimizationFlags(draft);

            courseVersionRepository.save(draft);

            // Notify if failed
            if (!integrityPassed || !contentPassed) {
                notifyCreator(draft, "COURSE_VALIDATION_FAILED", draft.getVersionNumber().toString());
            } else {
                // If passed, maybe notify ready for publication? 
                // For now, silent success, user sees it on dashboard.
            }
        }
    }

    private boolean checkVersionIntegrity(CourseVersion draft, StringBuilder warnings) {
        // If it's the first version, integrity is always true
        if (draft.getVersionNumber() == 1) {
            return true;
        }

        Optional<CourseVersion> previousPublicOpt = courseVersionRepository.findLatestPublicVersionByCourseId(draft.getCourse().getCourseId());
        if (previousPublicOpt.isEmpty()) {
            return true; // No previous public version to compare against
        }

        CourseVersion oldVersion = previousPublicOpt.get();
        List<CourseVersionLesson> oldCVLs = cvlRepository.findByCourseVersion_VersionIdOrderByOrderIndex(oldVersion.getVersionId());
        List<CourseVersionLesson> newCVLs = cvlRepository.findByCourseVersion_VersionIdOrderByOrderIndex(draft.getVersionId());

        Set<UUID> newLessonIds = newCVLs.stream()
                .map(cvl -> cvl.getLesson().getLessonId())
                .collect(Collectors.toSet());

        boolean missingOldLessons = false;
        List<String> missingNames = new ArrayList<>();

        for (CourseVersionLesson oldCvl : oldCVLs) {
            if (!newLessonIds.contains(oldCvl.getLesson().getLessonId())) {
                missingOldLessons = true;
                missingNames.add(oldCvl.getLesson().getLessonName());
            }
        }

        if (missingOldLessons) {
            warnings.append("Integrity Violation: Cannot delete previously published lessons: ")
                    .append(String.join(", ", missingNames)).append("; ");
            return false;
        }

        // Check for significant changes (User added > 50% content) - Just a log/flag, not a failure
        long addedCount = newLessonIds.size() - oldCVLs.size();
        if (oldCVLs.size() > 0 && ((double) addedCount / oldCVLs.size() > 0.5)) {
             // We don't fail validation, but we can flag it for manual review if needed.
             // For this logic, we just note it.
             log.info("Version {} has >50% new content compared to previous.", draft.getVersionId());
        }

        return true;
    }

    private boolean checkContentQuality(CourseVersion draft, StringBuilder warnings) {
        List<CourseVersionLesson> cvls = cvlRepository.findByCourseVersion_VersionIdOrderByOrderIndex(draft.getVersionId());
        boolean isValid = true;

        for (CourseVersionLesson cvl : cvls) {
            Lesson lesson = cvl.getLesson();
            String lessonName = lesson.getLessonName();

            // Rule: If duration < 60s, verify it has questions (Is it a quiz?) or media.
            // If it's a video lesson, check video duration.
            
            boolean isContentTooShort = false;
            
            // Check Duration Field
            if (lesson.getDurationSeconds() == null || lesson.getDurationSeconds() < 60) {
                 // Check if it has associated questions
                 boolean hasQuestions = lesson.getLessonQuestions() != null && !lesson.getLessonQuestions().isEmpty();
                 
                 // Check if it has a video file attached
                 boolean hasVideo = !videoRepository.findByLessonIdAndIsDeletedFalse(lesson.getLessonId()).isEmpty();

                 if (!hasQuestions && !hasVideo) {
                     isContentTooShort = true;
                 }
            }

            if (isContentTooShort) {
                warnings.append(String.format("Lesson '%s' is suspicious (Duration < 1m, no questions, no video). ", lessonName));
                isValid = false;
            }
        }
        return isValid;
    }

    private void updateOptimizationFlags(CourseVersion version) {
        // Flag 1: 10 Lessons minimum? (Example logic)
        long lessonCount = cvlRepository.countByCourseVersion_VersionId(version.getVersionId());
        // You can add a field 'hasMinimumLessons' to entity if needed, or just calculate on fly.
        
        // Flag 2: VIP? (Available on User entity, checked at runtime)
        
        // Flag 3: Significant difference? (Already checked in integrity)
    }

    private void performSystemReviews() {
        // Find public versions that don't have a system review yet
        List<CourseVersion> unreviewedVersions = courseVersionRepository.findPublicVersionsPendingSystemReview();
        
        for (CourseVersion version : unreviewedVersions) {
            try {
                // Prepare data for AI
                List<CourseVersionLesson> cvls = cvlRepository.findByCourseVersion_VersionIdOrderByOrderIndex(version.getVersionId());
                List<Lesson> lessons = cvls.stream().map(CourseVersionLesson::getLesson).collect(Collectors.toList());
                
                String courseTitle = version.getCourse().getTitle();
                String courseDesc = version.getCourse().getLatestPublicVersion().getDescription();

                // Call Python AI asynchronously
                CompletableFuture<CourseEvaluationResponse> future = grpcClientService.callEvaluateCourseVersionAsync(
                        systemToken, courseTitle, courseDesc, lessons
                );
                
                // Block here since we are in a scheduled job and need to save result transactionally
                // Alternatively, handle async, but blocking is safer for data consistency in jobs
                CourseEvaluationResponse aiResponse = future.join();

                // Create System Review
                CourseVersionReview review = new CourseVersionReview();
                review.setCourseId(version.getCourse().getCourseId());
                review.setUserId(SYSTEM_USER_UUID); // Virtual System User
                review.setRating(BigDecimal.valueOf(aiResponse.getRating()));
                review.setComment(aiResponse.getReviewComment());
                review.setReviewedAt(OffsetDateTime.now());
                review.setCourseVersion(version);
                
                courseVersionReviewRepository.save(review);

                // Update Version Flag
                version.setIsSystemReviewed(true);
                version.setSystemRating(aiResponse.getRating());
                courseVersionRepository.save(version);

                // Notify User
                notifyCreator(version, "COURSE_SYSTEM_REVIEW_DONE", String.valueOf(aiResponse.getRating()));

            } catch (Exception e) {
                log.error("Failed to perform system review for version {}", version.getVersionId(), e);
                // Continue to next version, don't crash whole job
            }
        }
    }

    private void notifyCreator(CourseVersion version, String notificationKey, String arg) {
        try {
            UUID creatorId = version.getCourse().getCreatorId();
            User creator = userRepository.findById(creatorId).orElse(null);
            
            if (creator != null) {
                String langCode = creator.getNativeLanguageCode() != null ? creator.getNativeLanguageCode() : "en";
                String[] message = NotificationI18nUtil.getLocalizedMessage(notificationKey, langCode);
                
                String content = message[1];
                if (arg != null) {
                    content = String.format(message[1], arg);
                }

                NotificationRequest request = NotificationRequest.builder()
                        .userId(creatorId)
                        .title(message[0])
                        .content(content)
                        .type(NotificationType.SYSTEM.name())
                        .build();
                        
                notificationService.createPushNotification(request);
            }
        } catch (Exception e) {
            log.error("Error sending notification for version {}", version.getVersionId(), e);
        }
    }
}