package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.TestSessionQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface TestSessionQuestionRepository extends JpaRepository<TestSessionQuestion, UUID> {

    // Lấy tất cả câu hỏi của 1 session, sắp xếp theo thứ tự
    List<TestSessionQuestion> findAllByTestSessionIdOrderByOrderIndex(UUID testSessionId);
}