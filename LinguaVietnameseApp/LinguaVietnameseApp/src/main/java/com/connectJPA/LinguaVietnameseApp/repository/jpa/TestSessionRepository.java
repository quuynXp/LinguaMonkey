package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.dto.response.TestConfigResponse;
import com.connectJPA.LinguaVietnameseApp.entity.TestSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TestSessionRepository extends JpaRepository<TestSession, UUID> {

    // Tìm session theo ID và user (để bảo mật)
    Optional<TestSession> findByTestSessionIdAndUserId(UUID testSessionId, UUID userId);

    // List<TestConfigResponse> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

    List<TestSession> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
}