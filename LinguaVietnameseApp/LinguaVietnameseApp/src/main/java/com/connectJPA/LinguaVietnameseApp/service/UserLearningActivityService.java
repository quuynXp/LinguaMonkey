package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.UserLearningActivityRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserLearningActivityResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface UserLearningActivityService {
    Page<UserLearningActivityResponse> getAllUserLearningActivities(UUID userId, Pageable pageable);
    UserLearningActivityResponse getUserLearningActivityById(UUID id);
    UserLearningActivityResponse createUserLearningActivity(UserLearningActivityRequest request);
    UserLearningActivityResponse updateUserLearningActivity(UUID id, UserLearningActivityRequest request);
    void deleteUserLearningActivity(UUID id);
}