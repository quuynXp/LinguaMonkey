package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.UserLearningActivityRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.StudyHistoryResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserLearningActivityResponse;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import com.connectJPA.LinguaVietnameseApp.event.DailyChallengeCompletedEvent;
import com.connectJPA.LinguaVietnameseApp.event.LessonCompletedEvent;
import com.connectJPA.LinguaVietnameseApp.mapper.UserLearningActivityMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.DailyChallengeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserLearningActivityRepository;
import com.connectJPA.LinguaVietnameseApp.service.UserLearningActivityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserLearningActivityServiceImpl implements UserLearningActivityService {
    private final UserLearningActivityRepository userLearningActivityRepository;
    private final UserLearningActivityMapper userLearningActivityMapper;
    private final LessonRepository lessonRepository;
    private final DailyChallengeRepository dailyChallengeRepository;

    @Override
    public Page<UserLearningActivityResponse> getAllUserLearningActivities(UUID userId, Pageable pageable) {
        Page<UserLearningActivity> activities = userLearningActivityRepository.findByUserIdAndIsDeletedFalse(userId, pageable);
        return activities.map(userLearningActivityMapper::toResponse);
    }

    @Override
    public UserLearningActivityResponse getUserLearningActivityById(UUID id) {
        UserLearningActivity activity = userLearningActivityRepository.findByActivityIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("User learning activity not found"));
        return userLearningActivityMapper.toResponse(activity);
    }

    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleLessonCompleted(LessonCompletedEvent event) {
        log.info("Bắt sự kiện LessonCompletedEvent cho user: {}", event.getLessonProgress().getId().getUserId());
        try {
            LessonProgress progress = event.getLessonProgress();

            // Lấy thêm thông tin (EXP, title, skills) từ Lesson
            Lesson lesson = lessonRepository.findById(progress.getId().getLessonId()).orElse(null);
            if (lesson == null) return;

            // Gọi hàm log nội bộ của bạn
            // (Bạn cần sửa hàm logUserActivity để nhận thêm các tham số này)
            logUserActivity(
                    progress.getId().getUserId(),
                    ActivityType.LESSON_COMPLETED,
                    lesson.getLessonId(),
                    null, // Duration
                    lesson.getExpReward(),
                    lesson.getTitle(),
                    lesson.getSkillTypes()
            );

        } catch (Exception e) {
            // Rất quan trọng: Bắt lỗi để không làm ảnh hưởng đến luồng chính
            log.error("Lỗi khi ghi log LessonCompletedEvent: ", e);
        }
    }

    // === LISTENER CHO THỬ THÁCH HÀNG NGÀY (trả lời câu hỏi "nhiều entity") ===
    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleDailyChallengeCompleted(DailyChallengeCompletedEvent event) {

    }

    private void logUserActivity(UUID userId, ActivityType activityType, UUID id, Object o, int expReward, String title) {
    }

    @Override
    @Transactional
    public UserLearningActivityResponse createUserLearningActivity(UserLearningActivityRequest request) {
        Lesson lesson = lessonRepository.findById(request.getRelatedEntityId())
                .orElseThrow(() -> new RuntimeException("Lesson not found"));

        return logUserActivity(
                request.getUserId(),
                request.getActivityType(),
                request.getRelatedEntityId(),
                request.getDurationInSeconds(),
                lesson.getExpReward(),
                request.getDetails(),
                lesson.getSkillTypes()
        );
    }


    @Override
    @Transactional
    public UserLearningActivityResponse logUserActivity(UUID userId, ActivityType activityType, UUID relatedEntityId, Integer durationInSeconds, int expReward, String details, SkillType skillTypes) {
        if (userId == null || activityType == null) {
            throw new IllegalArgumentException("UserId and ActivityType are required for logging activity");
        }

        UserLearningActivity activity = new UserLearningActivity();

        // (Giả định entity của bạn có các trường này)
        activity.setActivityId(UUID.randomUUID());
        activity.setUserId(userId);
        activity.setActivityType(activityType);
        activity.setRelatedEntityId(relatedEntityId); // ID của lesson, course, badge...
        activity.setDurationInSeconds(durationInSeconds); // Sẽ là NULL cho các event START
        activity.setDetails(details); // Vd: "Score: 90" hoặc "Transaction Amount: 10.00"
        activity.setCreatedAt(OffsetDateTime.now());

        activity = userLearningActivityRepository.save(activity);
        return userLearningActivityMapper.toResponse(activity);
    }

    @Override
    @Transactional
    public UserLearningActivityResponse updateUserLearningActivity(UUID id, UserLearningActivityRequest request) {
        UserLearningActivity activity = userLearningActivityRepository.findByActivityIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("User learning activity not found"));
        userLearningActivityMapper.updateEntityFromRequest(request, activity);
        activity = userLearningActivityRepository.save(activity);
        return userLearningActivityMapper.toResponse(activity);
    }

    @Override
    @Transactional
    public void deleteUserLearningActivity(UUID id) {
        UserLearningActivity activity = userLearningActivityRepository.findByActivityIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("User learning activity not found"));
        userLearningActivityRepository.softDeleteById(id);
    }

    @Override
    public StudyHistoryResponse getAggregatedStudyHistory(UUID userId, String period) {
        return null;
    }
}