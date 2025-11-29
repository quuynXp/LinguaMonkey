package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.TestSubmissionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.TestConfigResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.TestResultResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.TestSessionResponse;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface TestService {
    Page<TestConfigResponse> getAvailableTests(String languageCode, Pageable pageable);

    @Transactional
    TestSessionResponse startTest(UUID testConfigId, UUID userId, String token);

    @Transactional
    TestResultResponse submitTest(UUID sessionId, UUID userId, TestSubmissionRequest submission);

    List<TestResultResponse> getTestHistory(UUID userId);

    TestResultResponse getTestResult(UUID sessionId, UUID userId);
}
