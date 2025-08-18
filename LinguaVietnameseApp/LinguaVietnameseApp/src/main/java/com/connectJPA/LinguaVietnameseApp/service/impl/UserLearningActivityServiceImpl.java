package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.UserLearningActivityRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserLearningActivityResponse;
import com.connectJPA.LinguaVietnameseApp.entity.UserLearningActivity;
import com.connectJPA.LinguaVietnameseApp.mapper.UserLearningActivityMapper;
import com.connectJPA.LinguaVietnameseApp.repository.UserLearningActivityRepository;
import com.connectJPA.LinguaVietnameseApp.service.UserLearningActivityService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserLearningActivityServiceImpl implements UserLearningActivityService {
    private final UserLearningActivityRepository userLearningActivityRepository;
    private final UserLearningActivityMapper userLearningActivityMapper;

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

    @Override
    @Transactional
    public UserLearningActivityResponse createUserLearningActivity(UserLearningActivityRequest request) {
        UserLearningActivity activity = userLearningActivityMapper.toEntity(request);
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
}