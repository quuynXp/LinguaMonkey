package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.SubmitExerciseRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UpdateGrammarProgressRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.GrammarRuleResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.GrammarTopicResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.MindMapNode;
import com.connectJPA.LinguaVietnameseApp.dto.response.SubmitExerciseResponse;

import java.util.List;
import java.util.UUID;

public interface GrammarService {
    List<GrammarTopicResponse> getAllTopics();

    List<MindMapNode> getMindMap();

    GrammarTopicResponse getTopicById(UUID topicId, UUID userId);
    GrammarRuleResponse getRuleById(UUID ruleId);
    SubmitExerciseResponse submitExercise(SubmitExerciseRequest request);
    void updateProgress(UpdateGrammarProgressRequest request);
}
