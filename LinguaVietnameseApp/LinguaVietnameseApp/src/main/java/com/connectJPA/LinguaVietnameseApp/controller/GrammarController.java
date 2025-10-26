package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.SubmitExerciseRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UpdateGrammarProgressRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.GrammarRuleResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.GrammarTopicResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.SubmitExerciseResponse;
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
    public AppApiResponse<List<GrammarTopicResponse>> getAllTopics(Locale locale) {
        try {
            List<GrammarTopicResponse> topics = grammarService.getAllTopics();
            return AppApiResponse.<List<GrammarTopicResponse>>builder()
                    .code(200)
                    .message(messageSource.getMessage("grammar.topics.list.success", null, locale))
                    .result(topics)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<List<GrammarTopicResponse>>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    @Operation(summary = "Get grammar topic by id (with rules & progress)")
    @GetMapping("/topics/{id}")
    public AppApiResponse<GrammarTopicResponse> getTopicById(@PathVariable UUID id, @RequestParam(required = false) UUID userId, Locale locale) {
        try {
            GrammarTopicResponse topic = grammarService.getTopicById(id, userId);
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

    @Operation(summary = "Get grammar rule by id (with exercises)")
    @GetMapping("/rules/{id}")
    public AppApiResponse<GrammarRuleResponse> getRuleById(@PathVariable UUID id, Locale locale) {
        try {
            GrammarRuleResponse rule = grammarService.getRuleById(id);
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
