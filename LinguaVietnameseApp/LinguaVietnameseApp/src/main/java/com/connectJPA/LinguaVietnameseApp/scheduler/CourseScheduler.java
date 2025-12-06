package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.response.CourseEvaluationResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.ReviewQualityResponse;
import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.enums.CourseApprovalStatus;
import com.connectJPA.LinguaVietnameseApp.enums.CourseType;
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

    private final CourseRepository courseRepository;
    private final CourseVersionRepository courseVersionRepository;
    private final CourseVersionLessonRepository cvlRepository;
    private final CourseVersionReviewRepository reviewRepository;
    private final CourseVersionEnrollmentRepository enrollmentRepository;
    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final GrpcClientService grpcClientService;

    @Value("${app.system.token}")
    private String systemToken;

    private static final int MIN_LESSONS_REQUIRED = 10;
    private static final int QUALITY_WARNING_THRESHOLD_LOW = 5;
    private static final int QUALITY_WARNING_THRESHOLD_MED = 10;
    private static final int QUALITY_WARNING_THRESHOLD_HIGH = 15;
    private static final int DAYS_BEFORE_LOCK = 3;

    // =========================================================================
    // 1. ASYNC VALIDATION QUEUE (Priority: VIP > FIFO)
    // Runs frequently (every 1 min) to process uploaded courses fast
    // =========================================================================
    @Scheduled(fixedDelay = 60000) 
    @Transactional
    public void processCourseValidationQueue() {
        log.info(">>> Processing Course Validation Queue (Priority Mode)...");
        
        // Fetch drafts sorted by VIP Status DESC, then Time ASC
        List<CourseVersion> pendingDrafts = courseVersionRepository.findDraftsPendingValidationSortedByPriority();

        for (CourseVersion draft : pendingDrafts) {
            StringBuilder validationLog = new StringBuilder();
            boolean isPassed = true;

            // Rule 1: Strict Lesson Count Check (> 10 lessons)
            List<CourseVersionLesson> lessons = cvlRepository.findByCourseVersion_VersionIdOrderByOrderIndex(draft.getVersionId());
            if (lessons.size() < MIN_LESSONS_REQUIRED) {
                validationLog.append("Failed: Course must have at least ").append(MIN_LESSONS_REQUIRED).append(" lessons. Found: ").append(lessons.size()).append(". ");
                isPassed = false;
            }

            // Rule 2: Content Check (Fast check in Java)
            for (CourseVersionLesson cvl : lessons) {
                Lesson lesson = cvl.getLesson();
                boolean hasContent = (lesson.getLessonQuestions() != null && !lesson.getLessonQuestions().isEmpty()) 
                                   || !videoRepository.findByLessonIdAndIsDeletedFalse(lesson.getLessonId()).isEmpty()
                                   || (lesson.getDurationSeconds() != null && lesson.getDurationSeconds() > 30); // Simple audio/video size heuristic
                
                if (!hasContent) {
                    validationLog.append("Failed: Lesson '").append(lesson.getLessonName()).append("' is empty or too short. ");
                    isPassed = false;
                    break; // Fail fast
                }
            }

            draft.setIsContentValid(isPassed);
            draft.setIsIntegrityValid(isPassed); // Simplified integrity check for new drafts
            draft.setValidationWarnings(validationLog.toString());
            courseVersionRepository.save(draft);

            if (isPassed) {
                notifyCreator(draft.getCourseId(), "COURSE_VALIDATION_PASSED", draft.getVersionNumber().toString());
            } else {
                notifyCreator(draft.getCourseId(), "COURSE_VALIDATION_FAILED", validationLog.toString());
            }
        }
    }

    // =========================================================================
    // 2. QUALITY MONITORING & LOCKING (Daily)
    // Checks complaints, warns users, and locks if ignored for 3 days
    // =========================================================================
    @Scheduled(cron = "0 0 8 * * ?") // 8 AM Daily
    @Transactional
    public void monitorCourseQuality() {
        log.info(">>> Monitoring Course Quality...");
        
        // Get all APPROVED courses
        List<Course> activeCourses = courseRepository.findByApprovalStatusAndIsDeletedFalse(CourseApprovalStatus.APPROVED, null).getContent();

        for (Course course : activeCourses) {
            // Count negative reviews (< 3 stars) in the last 30 days
            long complaints = reviewRepository.countNegativeReviewsSince(course.getCourseId(), OffsetDateTime.now().minusDays(30));

            if (complaints >= QUALITY_WARNING_THRESHOLD_LOW) {
                handleQualityWarning(course, complaints);
            }
        }
    }

    private void handleQualityWarning(Course course, long complaints) {
        OffsetDateTime lastWarning = course.getLastQualityWarningAt();
        OffsetDateTime now = OffsetDateTime.now();

        // Level 1: Warning
        if (complaints >= QUALITY_WARNING_THRESHOLD_LOW && complaints < QUALITY_WARNING_THRESHOLD_HIGH) {
            notifyCreator(course.getCourseId(), "COURSE_QUALITY_WARNING", String.valueOf(complaints));
            course.setLastQualityWarningAt(now);
            courseRepository.save(course);
        }
        // Level 2: Strict Action (Locking)
        else if (complaints >= QUALITY_WARNING_THRESHOLD_HIGH) {
            if (lastWarning != null && lastWarning.isBefore(now.minusDays(DAYS_BEFORE_LOCK))) {
                // Creator ignored warnings for 3 days -> LOCK
                course.setApprovalStatus(CourseApprovalStatus.BLOCKED);
                courseRepository.save(course);
                notifyCreator(course.getCourseId(), "COURSE_LOCKED_QUALITY", String.valueOf(complaints));
                log.warn("Course {} locked due to ignored quality warnings.", course.getCourseId());
            } else {
                // Final warning before lock
                notifyCreator(course.getCourseId(), "COURSE_QUALITY_CRITICAL", String.valueOf(DAYS_BEFORE_LOCK));
                if (lastWarning == null) {
                    course.setLastQualityWarningAt(now);
                    courseRepository.save(course);
                }
            }
        }
    }

    // =========================================================================
    // 3. TOXIC REVIEW SCRUBBER (Real-time/Frequent)
    // Removes toxic comments and warns the commenter
    // =========================================================================
    @Scheduled(fixedDelay = 300000) // Every 5 minutes
    @Transactional
    public void scrubToxicReviews() {
        List<CourseVersionReview> pendingReviews = reviewRepository.findReviewsPendingToxicityCheck();

        for (CourseVersionReview review : pendingReviews) {
            try {
                // Async AI Check
                ReviewQualityResponse aiResponse = grpcClientService.callAnalyzeReviewQualityAsync(
                        systemToken, 
                        review.getUserId().toString(), 
                        review.getReviewId().toString(), 
                        review.getComment(), 
                        review.getRating().floatValue(), 
                        "COURSE_REVIEW"
                ).join();

                review.setIsSystemChecked(true);

                if (aiResponse.isToxic()) {
                    // Delete review content (Soft delete or clear content)
                    review.setDeleted(true);
                    review.setComment("[Removed for toxicity]");
                    reviewRepository.save(review);

                    // Warn the Reviewer
                    notifyUser(review.getUserId(), "REVIEW_REMOVED_TOXIC", 
                        String.format("Content: %s... Course: %s", 
                        review.getComment().substring(0, Math.min(review.getComment().length(), 20)),
                        review.getCourseVersion().getCourse().getTitle())
                    );
                } else {
                    reviewRepository.save(review);
                }

            } catch (Exception e) {
                log.error("Failed to check toxicity for review {}", review.getReviewId(), e);
            }
        }
    }

    // =========================================================================
    // 4. MONETIZATION SUGGESTION (Community Acceptance)
    // Suggests pricing for successful free courses
    // =========================================================================
    @Scheduled(cron = "0 0 10 * * ?") // 10 AM Daily
    @Transactional
    public void suggestMonetization() {
        // Find FREE courses
        List<Course> freeCourses = courseRepository.findCoursesByTypeAndIsDeletedFalse(CourseType.FREE, null).getContent();

        for (Course course : freeCourses) {
            long studentCount = enrollmentRepository.countStudentsByCourseId(course.getCourseId());
            Double rating = reviewRepository.getAverageRatingByCourseId(course.getCourseId());

            // Threshold: > 100 students AND > 4.5 Stars
            if (studentCount > 100 && rating != null && rating >= 4.5) {
                // Check if we haven't nagged them recently (logic can be added using LastQualityWarningAt or similar field)
                 notifyCreator(course.getCourseId(), "SUGGEST_MONETIZATION", 
                     String.format("Students: %d, Rating: %.1f", studentCount, rating));
            }
        }
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private void notifyCreator(UUID courseId, String type, String arg) {
        Course course = courseRepository.findById(courseId).orElse(null);
        if (course != null) {
            notifyUser(course.getCreatorId(), type, arg);
        }
    }

    private void notifyUser(UUID userId, String type, String arg) {
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            String langCode = user.getNativeLanguageCode() != null ? user.getNativeLanguageCode() : "en";
            String[] message = NotificationI18nUtil.getLocalizedMessage(type, langCode);
            
            String content = message[1];
            if (arg != null) content = String.format(message[1], arg);

            NotificationRequest req = NotificationRequest.builder()
                    .userId(userId)
                    .title(message[0])
                    .content(content)
                    .type(type)
                    .build();
            notificationService.createPushNotification(req);
        }
    }
}