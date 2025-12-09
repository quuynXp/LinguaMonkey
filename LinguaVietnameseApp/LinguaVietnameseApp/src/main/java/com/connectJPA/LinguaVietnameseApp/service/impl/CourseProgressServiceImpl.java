// package com.connectJPA.LinguaVietnameseApp.service.impl;

// import com.connectJPA.LinguaVietnameseApp.entity.CourseVersion;
// import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionEnrollment;
// import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionLesson;
// import com.connectJPA.LinguaVietnameseApp.entity.LessonProgress;
// import com.connectJPA.LinguaVietnameseApp.enums.CourseVersionEnrollmentStatus;
// import com.connectJPA.LinguaVietnameseApp.exception.AppException;
// import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
// import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionEnrollmentRepository;
// import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionLessonRepository;
// import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonProgressRepository;
// import lombok.RequiredArgsConstructor;
// import org.springframework.stereotype.Service;
// import org.springframework.transaction.annotation.Transactional;

// import java.time.OffsetDateTime;
// import java.util.List;
// import java.util.Set;
// import java.util.UUID;
// import java.util.stream.Collectors;

// @Service
// @RequiredArgsConstructor
// public class CourseProgressServiceImpl {

//     private final CourseVersionEnrollmentRepository enrollmentRepository;
//     private final CourseVersionLessonRepository versionLessonRepository;
//     private final LessonProgressRepository lessonProgressRepository;

//     /**
//      * Call this method after a user successfully submits a test/lesson.
//      * It recalculates the overall course progress based on valid completed lessons.
//      */
//     @Transactional
//     public void recalculateAndSaveProgress(UUID userId, UUID lessonId) {
//         // 1. Find which Course Versions contain this lesson
//         // A lesson might belong to multiple versions (e.g., v1, v2), we need to update enrollments for all relevant active versions.
//         List<CourseVersionLesson> versionLessons = versionLessonRepository.findByLesson_LessonId(lessonId);

//         if (versionLessons.isEmpty()) return;

//         for (CourseVersionLesson vl : versionLessons) {
//             CourseVersion version = vl.getCourseVersion();
//             UUID versionId = version.getVersionId();

//             // 2. Find the user's enrollment for this specific version
//             CourseVersionEnrollment enrollment = enrollmentRepository
//                     .findByCourseVersion_VersionIdAndUserId(versionId, userId)
//                     .orElse(null);

//             // If no enrollment (e.g., free preview without enrollment), we might skip or auto-enroll. 
//             // Assuming logic here handles existing enrollments.
//             if (enrollment != null) {
//                 updateSingleEnrollmentProgress(enrollment, versionId, userId);
//             }
//         }
//     }

//     private void updateSingleEnrollmentProgress(CourseVersionEnrollment enrollment, UUID versionId, UUID userId) {
//         // 3. Get all lessons in this version
//         List<CourseVersionLesson> allLessonsInVersion = versionLessonRepository
//                 .findByCourseVersion_VersionIdOrderByOrderIndex(versionId);
        
//         if (allLessonsInVersion.isEmpty()) return;

//         Set<UUID> versionLessonIds = allLessonsInVersion.stream()
//                 .map(cvl -> cvl.getLesson().getLessonId())
//                 .collect(Collectors.toSet());

//         // 4. Get all progress records for this user matching lessons in this version
//         // We only count lessons with a passing score (e.g. >= 0, or logic based on your requirements)
//         // Assuming existence of a record means "attempted". 
//         // Better logic: Check if score >= passingGrade if your app implies passing. 
//         // Here we assume ANY progress record > 0% or completion flag counts as "done" or strictly calculate average.
        
//         // Strategy: Count explicitly completed lessons (e.g. score >= 50 or isCompleted flag)
//         List<LessonProgress> userProgresses = lessonProgressRepository.findByUserId(userId);
        
//         long completedCount = userProgresses.stream()
//                 .filter(lp -> versionLessonIds.contains(lp.getLessonId()))
//                 .filter(lp -> lp.getScore() != null && lp.getScore() >= 50.0) // Threshold for "Completion"
//                 .count();

//         long totalLessons = versionLessonIds.size();

//         // 5. Calculate Percentage
//         double progressPercent = 0.0;
//         if (totalLessons > 0) {
//             progressPercent = ((double) completedCount / totalLessons) * 100.0;
//         }

//         // Clamp to 100
//         if (progressPercent > 100.0) progressPercent = 100.0;

//         // 6. Update Entity
//         enrollment.setProgress(progressPercent);
        
//         if (progressPercent >= 100.0 && enrollment.getCompletedAt() == null) {
//             enrollment.setCompletedAt(OffsetDateTime.now());
//             enrollment.setStatus(CourseVersionEnrollmentStatus.COMPLETED);
//         }

//         enrollmentRepository.save(enrollment);
//     }
// }