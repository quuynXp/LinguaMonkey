package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.GroupSessionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.GroupSessionResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface GroupSessionService {
    Page<GroupSessionResponse> getAllGroupSessions(String lessonId, String roomId, Pageable pageable);
    GroupSessionResponse getGroupSessionById(UUID id);
    GroupSessionResponse createGroupSession(GroupSessionRequest request);
    GroupSessionResponse updateGroupSession(UUID id, GroupSessionRequest request);
    void deleteGroupSession(UUID id);
}