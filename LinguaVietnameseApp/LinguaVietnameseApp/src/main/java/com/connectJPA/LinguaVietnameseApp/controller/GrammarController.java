package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.SubmitExerciseRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UpdateGrammarProgressRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.service.GrammarService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/grammar")
@RequiredArgsConstructor
public class GrammarController {
    private final GrammarService grammarService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all grammar topics")
    @GetMapping("/topics")
    public AppApiResponse<List<GrammarTopicResponse>> getAllTopics() {
        return AppApiResponse.<List<GrammarTopicResponse>>builder()
                .code(200)
                .result(grammarService.getAllTopics())
                .build();
    }

    @Operation(summary = "Get basic grammar topic details (no progress)")
    @GetMapping("/topics/{topicId}")
    public AppApiResponse<GrammarTopicResponse> getTopicGeneral(@PathVariable UUID topicId) {
        return AppApiResponse.<GrammarTopicResponse>builder()
                .code(200)
                .result(grammarService.getTopicById(topicId))
                .build();
    }

    @Operation(summary = "Get grammar lesson by id")
    @GetMapping("/lessons/{lessonId}")
    public AppApiResponse<GrammarLessonResponse> getLesson(@PathVariable UUID lessonId) {
        return AppApiResponse.<GrammarLessonResponse>builder()
                .code(200)
                .result(grammarService.getLessonById(lessonId))
                .build();
    }

    @Operation(summary = "Get basic grammar rule by id (no exercises)")
    @GetMapping("/rules/{ruleId}")
    public AppApiResponse<GrammarRuleResponse> getRuleGeneral(@PathVariable UUID ruleId) {
        return AppApiResponse.<GrammarRuleResponse>builder()
                .code(200)
                .result(grammarService.getRuleById(ruleId))
                .build();
    }

    @Operation(summary = "Get grammar mindmap (hierarchical structure)")
    @GetMapping("/mindmap")
    public AppApiResponse<List<MindMapNode>> getMindMap(Locale locale) {
        try {
            List<MindMapNode> mindmap = grammarService.getMindMap();
            return AppApiResponse.<List<MindMapNode>>builder()
                    .code(200)
                    .message(messageSource.getMessage("grammar.mindmap.get.success", null, locale))
                    .result(mindmap)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<List<MindMapNode>>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    @Operation(summary = "Get grammar topic details by id (includes user rules & progress)")
    @GetMapping("/topics/{topicId}/details")
    public AppApiResponse<GrammarTopicResponse> getTopicDetailsForUser(@PathVariable UUID topicId, @RequestParam(required = false) UUID userId, Locale locale) {
        try {
            GrammarTopicResponse topic = grammarService.getTopicById(topicId, userId);
            return AppApiResponse.<GrammarTopicResponse>builder()
                    .code(200)
                    .message(messageSource.getMessage("grammar.topic.get.success", null, locale))
                    .result(topic)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<GrammarTopicResponse>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    @Operation(summary = "Get detailed grammar rule by id (includes exercises)")
    @GetMapping("/rules/{ruleId}/details")
    public AppApiResponse<GrammarRuleResponse> getRuleDetailsWithExercises(@PathVariable UUID ruleId, Locale locale) {
        try {
            GrammarRuleResponse rule = grammarService.getRuleDetailsWithExercises(ruleId);
            return AppApiResponse.<GrammarRuleResponse>builder()
                    .code(200)
                    .message(messageSource.getMessage("grammar.rule.get.success", null, locale))
                    .result(rule)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<GrammarRuleResponse>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    @Operation(summary = "Submit grammar exercise answers")
    @PostMapping("/exercises/submit")
    public AppApiResponse<SubmitExerciseResponse> submitExercise(@RequestBody SubmitExerciseRequest request, Locale locale) {
        try {
            SubmitExerciseResponse resp = grammarService.submitExercise(request);
            return AppApiResponse.<SubmitExerciseResponse>builder()
                    .code(200)
                    .message(messageSource.getMessage("grammar.exercise.submit.success", null, locale))
                    .result(resp)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<SubmitExerciseResponse>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    @Operation(summary = "Update grammar progress for a user")
    @PostMapping("/progress")
    public AppApiResponse<Void> updateProgress(@RequestBody UpdateGrammarProgressRequest request, Locale locale) {
        try {
            grammarService.updateProgress(request);
            return AppApiResponse.<Void>builder()
                    .code(200)
                    .message(messageSource.getMessage("grammar.progress.update.success", null, locale))
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<Void>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }
}