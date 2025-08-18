package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.UserGoalRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserGoalResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface UserGoalService {
    Page<UserGoalResponse> getAllUserGoals(UUID userId, String languageCode, Pageable pageable);
    UserGoalResponse getUserGoalById(UUID id);
    UserGoalResponse createUserGoal(UserGoalRequest request);
    UserGoalResponse updateUserGoal(UUID id, UserGoalRequest request);
    void deleteUserGoal(UUID id);
}