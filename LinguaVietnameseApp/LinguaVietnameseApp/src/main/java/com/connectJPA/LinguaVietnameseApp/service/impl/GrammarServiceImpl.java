package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.SubmitExerciseRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UpdateGrammarProgressRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.entity.id.GrammarProgressId;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.repository.*;
import com.connectJPA.LinguaVietnameseApp.service.GrammarService;
import com.connectJPA.LinguaVietnameseApp.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GrammarServiceImpl implements GrammarService {
    private final GrammarTopicRepository topicRepo;
    private final GrammarRuleRepository ruleRepo;
    private final GrammarExerciseRepository exerciseRepo;
    private final GrammarProgressRepository progressRepo;
    private final UserService userService;
    private final UserLearningActivityRepository userLearningActivityRepository;

    @Override
    public List<GrammarTopicResponse> getAllTopics() {
        List<GrammarTopic> topics = topicRepo.findByIsDeletedFalseOrderByCreatedAtAsc();
        return topics.stream().map(t -> {
            GrammarTopicResponse r = new GrammarTopicResponse();
            r.setTopicId(t.getTopicId());
            r.setTopicName(t.getTopicName());
            r.setDescription(t.getDescription());
            r.setLanguageCode(t.getLanguageCode());
            r.setCreatedAt(t.getCreatedAt());
            r.setUpdatedAt(t.getUpdatedAt());
            // don't include rules by default (client will fetch topic by id)
            return r;
        }).collect(Collectors.toList());
    }

    @Override
    public GrammarTopicResponse getTopicById(UUID topicId, UUID userId) {
        GrammarTopic t = topicRepo.findById(topicId).filter(p -> !p.isDeleted())
                .orElseThrow(() -> new AppException(ErrorCode.GRAMMAR_TOPIC_NOT_FOUND));
        List<GrammarRule> rules = ruleRepo.findByTopicIdAndIsDeletedFalseOrderByCreatedAtAsc(topicId);
        GrammarTopicResponse resp = new GrammarTopicResponse();
        resp.setTopicId(t.getTopicId());
        resp.setTopicName(t.getTopicName());
        resp.setDescription(t.getDescription());
        resp.setLanguageCode(t.getLanguageCode());
        resp.setCreatedAt(t.getCreatedAt());
        resp.setUpdatedAt(t.getUpdatedAt());

        List<GrammarRuleResponse> ruleResponses = rules.stream().map(rule -> {
            GrammarRuleResponse gr = new GrammarRuleResponse();
            gr.setRuleId(rule.getRuleId());
            gr.setTopicId(rule.getTopicId());
            gr.setTitle(rule.getTitle());
            gr.setExplanation(rule.getExplanation());
            gr.setExamples(rule.getExamples());
            gr.setCreatedAt(rule.getCreatedAt());
            gr.setUpdatedAt(rule.getUpdatedAt());
            // fetch progress if userId provided
            if (userId != null) {
                GrammarProgressId pid = new GrammarProgressId(topicId, userId, rule.getRuleId());
                Optional<GrammarProgress> gp = progressRepo.findById(pid);
                gp.ifPresent(p -> {
                    gr.setUserScore(p.getScore());
                    gr.setCompletedAt(p.getCompletedAt());
                });
            }
            // don't include exercises full list here (client can fetch rule)
            return gr;
        }).collect(Collectors.toList());
        resp.setRules(ruleResponses);
        return resp;
    }

    @Override
    public GrammarRuleResponse getRuleById(UUID ruleId) {
        GrammarRule rule = ruleRepo.findById(ruleId).filter(r -> !r.isDeleted())
                .orElseThrow(() -> new AppException(ErrorCode.GRAMMAR_RULE_NOT_FOUND));
        List<GrammarExercise> exercises = exerciseRepo.findByRuleIdAndIsDeletedFalseOrderByCreatedAtAsc(ruleId);
        GrammarRuleResponse resp = new GrammarRuleResponse();
        resp.setRuleId(rule.getRuleId());
        resp.setTopicId(rule.getTopicId());
        resp.setTitle(rule.getTitle());
        resp.setExplanation(rule.getExplanation());
        resp.setExamples(rule.getExamples());
        resp.setCreatedAt(rule.getCreatedAt());
        resp.setUpdatedAt(rule.getUpdatedAt());
        List<GrammarExerciseResponse> exs = exercises.stream().map(e -> {
            GrammarExerciseResponse er = new GrammarExerciseResponse();
            er.setExerciseId(e.getExerciseId());
            er.setRuleId(e.getRuleId());
            er.setType(e.getType());
            er.setQuestion(e.getQuestion());
            er.setOptions(e.getOptions());
            er.setCorrect(e.getCorrect());
            er.setExplanation(e.getExplanation());
            er.setCreatedAt(e.getCreatedAt());
            er.setUpdatedAt(e.getUpdatedAt());
            return er;
        }).collect(Collectors.toList());
        resp.setExercises(exs);
        return resp;
    }

    @Override
    @Transactional
    public SubmitExerciseResponse submitExercise(SubmitExerciseRequest request) {
        // validate rule exists
        UUID ruleId = request.getRuleId();
        UUID userId = request.getUserId();
        if (userId == null) throw new AppException(ErrorCode.INVALID_INPUT);
        userService.getUserIfExists(userId);

        GrammarRule rule = ruleRepo.findById(ruleId).filter(r -> !r.isDeleted())
                .orElseThrow(() -> new AppException(ErrorCode.GRAMMAR_RULE_NOT_FOUND));
        List<GrammarExercise> exercises = exerciseRepo.findByRuleIdAndIsDeletedFalseOrderByCreatedAtAsc(ruleId);
        if (exercises.isEmpty()) throw new AppException(ErrorCode.GRAMMAR_EXERCISES_NOT_FOUND);

        int total = exercises.size();
        int correct = 0;
        Map<UUID, Boolean> detail = new LinkedHashMap<>();
        for (GrammarExercise ex : exercises) {
            String submitted = request.getAnswers().getOrDefault(ex.getExerciseId().toString(), "").trim();
            boolean ok = evaluateAnswer(ex, submitted);
            if (ok) correct++;
            detail.put(ex.getExerciseId(), ok);
        }
        int score = Math.round((correct * 100f) / total);

        // persist/update progress (best score)
        GrammarProgressId pid = new GrammarProgressId(rule.getTopicId(), userId, ruleId);
        GrammarProgress progress = progressRepo.findById(pid).orElseGet(() -> {
            GrammarProgress p = new GrammarProgress();
            p.setId(pid);
            p.setCreatedAt(OffsetDateTime.now());
            return p;
        });
        progress.setScore(Math.max(progress.getScore() == null ? 0 : progress.getScore(), score));
        progress.setCompletedAt(OffsetDateTime.now());
        progressRepo.save(progress);

        // optionally record user activity
        userLearningActivityRepository.save(
                com.connectJPA.LinguaVietnameseApp.entity.UserLearningActivity.builder()
                        .userId(userId)
                        .activityType(com.connectJPA.LinguaVietnameseApp.enums.ActivityType.GRAMMAR_EXERCISE)
                        .createdAt(OffsetDateTime.now())
                        .build()
        );

        SubmitExerciseResponse resp = new SubmitExerciseResponse();
        resp.setScore(score);
        resp.setTotal(total);
        resp.setCorrect(correct);
        resp.setDetails(detail);
        return resp;
    }

    @Override
    @Transactional
    public void updateProgress(UpdateGrammarProgressRequest request) {
        UUID userId = request.getUserId();
        userService.getUserIfExists(userId);
        GrammarProgressId pid = new GrammarProgressId(request.getTopicId(), userId, request.getRuleId());
        GrammarProgress progress = progressRepo.findById(pid).orElseGet(() -> {
            GrammarProgress p = new GrammarProgress();
            p.setId(pid);
            p.setCreatedAt(OffsetDateTime.now());
            return p;
        });
        progress.setScore(request.getScore());
        progress.setCompletedAt(OffsetDateTime.now());
        progressRepo.save(progress);
    }

    private boolean evaluateAnswer(GrammarExercise ex, String submitted) {
        if (submitted == null) submitted = "";
        String correct = ex.getCorrect() == null ? "" : ex.getCorrect().trim();
        switch (ex.getType()) {
            case "multiple-choice":
                return submitted.equalsIgnoreCase(correct);
            case "fill-blank":
            case "transformation":
            default:
                return submitted.trim().equalsIgnoreCase(correct);
        }
    }
}
