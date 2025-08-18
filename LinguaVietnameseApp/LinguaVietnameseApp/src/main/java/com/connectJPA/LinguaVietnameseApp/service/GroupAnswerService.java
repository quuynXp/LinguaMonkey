package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.GroupAnswerRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.GroupAnswerResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface GroupAnswerService {
    Page<GroupAnswerResponse> getAllGroupAnswers(String groupSessionId, String userId, Pageable pageable);
    GroupAnswerResponse getGroupAnswerByIds(UUID groupSessionId, UUID userId);
    GroupAnswerResponse createGroupAnswer(GroupAnswerRequest request);
    GroupAnswerResponse updateGroupAnswer(UUID groupSessionId, UUID userId, GroupAnswerRequest request);
    void deleteGroupAnswer(UUID groupSessionId, UUID userId);
}