package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.Course;
import com.connectJPA.LinguaVietnameseApp.entity.Lesson;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.utils.SvgGenerator;
import com.connectJPA.LinguaVietnameseApp.utils.NotificationI18nUtil; // Cần import
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ThumbnailGenerationService {

    private static final String FOLDER = "linguaviet/thumbnails";
    private static final long STABILITY_WINDOW_HOURS = 24;
    
    private final CloudinaryService cloudinaryService;
    private final CourseRepository courseRepository;
    private final LessonRepository lessonRepository;
    
    // NEW DEPENDENCIES
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public void generateAndUploadAllMissingThumbnails() {
        OffsetDateTime creationThreshold = OffsetDateTime.now().minusHours(STABILITY_WINDOW_HOURS);
        log.info("Starting missing thumbnail generation job for items older than: {}", creationThreshold);
        int totalUpdated = 0;
        int batch;

        // Process Courses in batches
        do {
            batch = processMissingCourseThumbnails(creationThreshold);
            totalUpdated += batch;
        } while (batch > 0);

        // Process Lessons in batches
        do {
            batch = processMissingLessonThumbnails(creationThreshold);
            totalUpdated += batch;
        } while (batch > 0);

        log.info("Missing thumbnail generation job finished. Total items updated: {}", totalUpdated);
    }
    
    private void sendThumbnailReadyNotification(UUID creatorId, String itemTitle, String itemType) {
        Optional<User> creatorOpt = userRepository.findByUserIdAndIsDeletedFalse(creatorId);
        if (creatorOpt.isEmpty()) {
            log.warn("Creator ID {} not found or deleted, skipping notification.", creatorId);
            return;
        }
        
        User creator = creatorOpt.get();
        String langCode = creator.getNativeLanguageCode() != null ? creator.getNativeLanguageCode() : "en"; // Fallback to 'en'
        
        // Notification keys: THUMBNAIL_COURSE_READY, THUMBNAIL_LESSON_READY
        String notificationKey = String.format("THUMBNAIL_%s_READY", itemType.toUpperCase());
        String[] message = NotificationI18nUtil.getLocalizedMessage(notificationKey, langCode);

        // Content: "Ảnh bìa của khóa học/bài học '{title}' đã được tạo thành công."
        String content = String.format(message[1], itemTitle);

        NotificationRequest notification = NotificationRequest.builder()
            .userId(creatorId)
            .title(message[0])
            .content(content)
            .type("THUMBNAIL_READY")
            .payload(String.format("{\"itemType\":\"%s\", \"title\":\"%s\"}", itemType, itemTitle))
            .build();
        
        notificationService.createPushNotification(notification);
        log.debug("Notification sent to creator {}: {}", creatorId, content);
    }

    @Transactional
    protected int processMissingCourseThumbnails(OffsetDateTime creationThreshold) {
        List<Course> courses = courseRepository.findTop50ByThumbnailUrlIsNullAndCreatedAtBefore(creationThreshold);
        if (courses.isEmpty()) return 0;

        for (Course course : courses) {
            String publicId = String.format("%s/course/%s", FOLDER, course.getCourseId());
            try {
                byte[] svgData = SvgGenerator.generateThumbnailSvg(course.getTitle(), course.getCourseId(), "Course");
                
                Map<?, ?> uploadResult = cloudinaryService.uploadBytes(
                    svgData, 
                    publicId, 
                    FOLDER, 
                    "image"
                );
                
                String thumbnailUrl = (String) uploadResult.get("secure_url");
                course.setThumbnailUrl(thumbnailUrl);

                // SEND NOTIFICATION HERE
                sendThumbnailReadyNotification(course.getCreatorId(), course.getTitle(), "Course"); 

            } catch (Exception e) {
                log.error("Failed to generate or upload course thumbnail for ID {}: {}", course.getCourseId(), e.getMessage());
                throw new AppException(ErrorCode.FILE_PROCESSING_ERROR);
            }
        }
        courseRepository.saveAll(courses);
        log.info("Successfully processed and updated {} missing Course thumbnails.", courses.size());
        return courses.size();
    }

    @Transactional
    protected int processMissingLessonThumbnails(OffsetDateTime creationThreshold) {
        List<Lesson> lessons = lessonRepository.findTop50ByThumbnailUrlIsNullAndCreatedAtBefore(creationThreshold);
        if (lessons.isEmpty()) return 0;

        for (Lesson lesson : lessons) {
            String publicId = String.format("%s/lesson/%s", FOLDER, lesson.getLessonId());
            try {
                byte[] svgData = SvgGenerator.generateThumbnailSvg(lesson.getTitle(), lesson.getLessonId(), "Lesson");
                
                Map<?, ?> uploadResult = cloudinaryService.uploadBytes(
                    svgData, 
                    publicId, 
                    FOLDER, 
                    "image"
                );
                
                String thumbnailUrl = (String) uploadResult.get("secure_url");
                lesson.setThumbnailUrl(thumbnailUrl);
                
                // SEND NOTIFICATION HERE
                sendThumbnailReadyNotification(lesson.getCreatorId(), lesson.getTitle(), "Lesson"); 
                
            } catch (Exception e) {
                log.error("Failed to generate or upload lesson thumbnail for ID {}: {}", lesson.getLessonId(), e.getMessage());
                throw new AppException(ErrorCode.FILE_PROCESSING_ERROR);
            }
        }
        lessonRepository.saveAll(lessons);
        log.info("Successfully processed and updated {} missing Lesson thumbnails.", lessons.size());
        return lessons.size();
    }
}