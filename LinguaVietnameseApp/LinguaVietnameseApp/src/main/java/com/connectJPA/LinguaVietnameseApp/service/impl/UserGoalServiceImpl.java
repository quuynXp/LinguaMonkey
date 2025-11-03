package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.UserGoalRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserGoalResponse;
import com.connectJPA.LinguaVietnameseApp.entity.UserGoal;
import com.connectJPA.LinguaVietnameseApp.mapper.UserGoalMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserGoalRepository;
import com.connectJPA.LinguaVietnameseApp.service.UserGoalService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserGoalServiceImpl implements UserGoalService {
    private final UserGoalRepository userGoalRepository;
    private final UserGoalMapper userGoalMapper;

    @Override
    public Page<UserGoalResponse> getAllUserGoals(UUID userId, String languageCode, Pageable pageable) {
        Page<UserGoal> goals = userGoalRepository.findByUserIdAndLanguageCodeAndIsDeletedFalse(userId, languageCode, pageable);
        return goals.map(userGoalMapper::toResponse);
    }

    @Override
    public UserGoalResponse getUserGoalById(UUID id) {
        UserGoal goal = userGoalRepository.findByGoalIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("User goal not found"));
        return userGoalMapper.toResponse(goal);
    }

    @Override
    @Transactional
    public UserGoalResponse createUserGoal(UserGoalRequest request) {
        UserGoal goal = userGoalMapper.toEntity(request);
        goal = userGoalRepository.save(goal);
        return userGoalMapper.toResponse(goal);
    }

    @Override
    @Transactional
    public UserGoalResponse updateUserGoal(UUID id, UserGoalRequest request) {
        UserGoal goal = userGoalRepository.findByGoalIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("User goal not found"));
        userGoalMapper.updateEntityFromRequest(request, goal);
        goal = userGoalRepository.save(goal);
        return userGoalMapper.toResponse(goal);
    }

    @Override
    @Transactional
    public void deleteUserGoal(UUID id) {
        UserGoal goal = userGoalRepository.findByGoalIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("User goal not found"));
        userGoalRepository.softDeleteById(id);
    }
}