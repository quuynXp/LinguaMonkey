package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.TestSubmissionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.TestConfigResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.TestResultResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.TestSessionResponse;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface TestService {
    List<TestConfigResponse> getAvailableTests(String languageCode);

    @Transactional
    TestSessionResponse startTest(UUID testConfigId, UUID userId, String token);

    @Transactional
    TestResultResponse submitTest(UUID sessionId, UUID userId, TestSubmissionRequest submission);
}
