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
    private final CourseRepository courseRepository; // Inject thêm

    private static final String TIME_ZONE = "UTC";
    private static final UUID SYSTEM_USER_UUID = UUID.fromString("00000000-0000-0000-0000-000000000000");

    @Value("${app.system.token}")
    private String systemToken;

    @Scheduled(cron = "0 0 9,15,21 * * ?", zone = TIME_ZONE)
    @Transactional
    public void runCourseValidationJob() {
        log.info("=== Starting Scheduled Course Validation Job ===");
        
        validatePendingDrafts();

        performSystemReviews();
        
        log.info("=== Completed Scheduled Course Validation Job ===");
    }

    private void validatePendingDrafts() {
        List<CourseVersion> pendingDrafts = courseVersionRepository.findDraftsPendingValidation();
        log.info("Found {} drafts pending validation.", pendingDrafts.size());

        for (CourseVersion draft : pendingDrafts) {
            StringBuilder warningLog = new StringBuilder();
            
            boolean integrityPassed = checkVersionIntegrity(draft, warningLog);
            
            boolean contentPassed = checkContentQuality(draft, warningLog);

            draft.setIsIntegrityValid(integrityPassed);
            draft.setIsContentValid(contentPassed);
            draft.setValidationWarnings(warningLog.toString());
            
            updateOptimizationFlags(draft);

            courseVersionRepository.save(draft);

            if (!integrityPassed || !contentPassed) {
                notifyCreator(draft, "COURSE_VALIDATION_FAILED", draft.getVersionNumber().toString());
            }
        }
    }

    private boolean checkVersionIntegrity(CourseVersion draft, StringBuilder warnings) {
        if (draft.getVersionNumber() == 1) {
            return true;
        }

        // Fix: getCourseId() instead of getCourse().getCourseId()
        Optional<CourseVersion> previousPublicOpt = courseVersionRepository.findLatestPublicVersionByCourseId(draft.getCourseId());
        if (previousPublicOpt.isEmpty()) {
            return true;
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

        long addedCount = newLessonIds.size() - oldCVLs.size();
        if (oldCVLs.size() > 0 && ((double) addedCount / oldCVLs.size() > 0.5)) {
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

            boolean isContentTooShort = false;
            
            if (lesson.getDurationSeconds() == null || lesson.getDurationSeconds() < 60) {
                 boolean hasQuestions = lesson.getLessonQuestions() != null && !lesson.getLessonQuestions().isEmpty();
                 
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
        long lessonCount = cvlRepository.countByCourseVersion_VersionId(version.getVersionId());
    }

    private void performSystemReviews() {
        List<CourseVersion> unreviewedVersions = courseVersionRepository.findPublicVersionsPendingSystemReview();
        
        for (CourseVersion version : unreviewedVersions) {
            try {
                // Fix: Fetch Course manually
                Course course = courseRepository.findById(version.getCourseId()).orElse(null);
                if (course == null) continue;

                List<CourseVersionLesson> cvls = cvlRepository.findByCourseVersion_VersionIdOrderByOrderIndex(version.getVersionId());
                List<Lesson> lessons = cvls.stream().map(CourseVersionLesson::getLesson).collect(Collectors.toList());
                
                String courseTitle = course.getTitle();
                
                // Fix: description is now in Version, not Course
                String courseDesc = version.getDescription();

                CompletableFuture<CourseEvaluationResponse> future = grpcClientService.callEvaluateCourseVersionAsync(
                        systemToken, courseTitle, courseDesc, lessons
                );
                
                CourseEvaluationResponse aiResponse = future.join();

                CourseVersionReview review = new CourseVersionReview();
                // Fix: getCourseId()
                review.setCourseId(version.getCourseId());
                review.setUserId(SYSTEM_USER_UUID);
                review.setRating(BigDecimal.valueOf(aiResponse.getRating()));
                review.setComment(aiResponse.getReviewComment());
                review.setReviewedAt(OffsetDateTime.now());
                review.setCourseVersion(version);
                
                courseVersionReviewRepository.save(review);

                version.setIsSystemReviewed(true);
                version.setSystemRating(aiResponse.getRating());
                courseVersionRepository.save(version);

                notifyCreator(version, "COURSE_SYSTEM_REVIEW_DONE", String.valueOf(aiResponse.getRating()));

            } catch (Exception e) {
                log.error("Failed to perform system review for version {}", version.getVersionId(), e);
            }
        }
    }

    private void notifyCreator(CourseVersion version, String notificationKey, String arg) {
        try {
            // Fix: Fetch Course to get creatorId
            Course course = courseRepository.findById(version.getCourseId()).orElse(null);
            if (course == null) return;

            UUID creatorId = course.getCreatorId();
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