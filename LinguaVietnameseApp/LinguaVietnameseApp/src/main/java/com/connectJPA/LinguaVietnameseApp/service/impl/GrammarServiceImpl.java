package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.SubmitExerciseRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UpdateGrammarProgressRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.entity.id.GrammarProgressId;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
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
    private final GrammarLessonRepository lessonRepo;
    private final GrammarRuleRepository ruleRepo;
    private final GrammarExerciseRepository exerciseRepo;
    private final GrammarProgressRepository progressRepo;
    private final UserService userService;
    private final UserLearningActivityRepository userLearningActivityRepository;

    @Override
    public List<GrammarTopicResponse> getAllTopics() {
        return topicRepo.findAll().stream()
                .filter(Objects::nonNull)
                .filter(t -> !t.isDeleted())
                .sorted(Comparator.comparing(GrammarTopic::getCreatedAt))
                .map(this::mapToTopicResponse)
                .collect(Collectors.toList());
    }

    @Override
    public GrammarTopicResponse getTopicById(UUID topicId) {
        GrammarTopic topic = topicRepo.findById(topicId)
                .filter(t -> !t.isDeleted())
                .orElseThrow(() -> new AppException(ErrorCode.GRAMMAR_TOPIC_NOT_FOUND));
        return mapToTopicResponse(topic);
    }

    @Override
    public GrammarLessonResponse getLessonById(UUID lessonId) {
        GrammarLesson lesson = lessonRepo.findById(lessonId)
                .filter(l -> !l.isDeleted())
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
        return mapToLessonResponse(lesson);
    }

    @Override
    public GrammarRuleResponse getRuleById(UUID ruleId) {
        GrammarRule rule = ruleRepo.findById(ruleId)
                .filter(r -> !r.isDeleted())
                .orElseThrow(() -> new AppException(ErrorCode.GRAMMAR_RULE_NOT_FOUND));
        return mapToRuleResponse(rule);
    }

    @Override
    public GrammarTopicResponse getTopicById(UUID topicId, UUID userId) {
        GrammarTopic topic = topicRepo.findById(topicId)
                .filter(t -> !t.isDeleted())
                .orElseThrow(() -> new AppException(ErrorCode.GRAMMAR_TOPIC_NOT_FOUND));

        List<GrammarLesson> lessons = lessonRepo.findByTopicIdAndIsDeletedFalseOrderByCreatedAtAsc(topicId);

        List<GrammarRuleResponse> allRuleResponses = new ArrayList<>();

        for (GrammarLesson lesson : lessons) {
            if (lesson.getGrammarRules() != null) {
                List<GrammarRuleResponse> ruleResponses = lesson.getGrammarRules().stream()
                        .filter(r -> !r.isDeleted())
                        .map(rule -> {
                            GrammarRuleResponse resp = mapToRuleResponse(rule);
                            if (userId != null) {
                                GrammarProgressId pid = new GrammarProgressId(topicId, userId, rule.getRuleId());
                                Optional<GrammarProgress> gp = progressRepo.findById(pid);
                                gp.ifPresent(p -> {
                                    resp.setUserScore(p.getScore());
                                    resp.setCompletedAt(p.getCompletedAt());
                                });
                            }
                            return resp;
                        })
                        .collect(Collectors.toList());
                allRuleResponses.addAll(ruleResponses);
            }
        }

        GrammarTopicResponse resp = new GrammarTopicResponse();
        resp.setTopicId(topic.getTopicId());
        resp.setTopicName(topic.getTopicName());
        resp.setDescription(topic.getDescription());
        resp.setLanguageCode(topic.getLanguageCode());
        resp.setCreatedAt(topic.getCreatedAt());
        resp.setUpdatedAt(topic.getUpdatedAt());
        resp.setRules(allRuleResponses);

        return resp;
    }

    private GrammarTopicResponse mapToTopicResponse(GrammarTopic topic) {
        return GrammarTopicResponse.builder()
                .topicId(topic.getTopicId())
                .topicName(topic.getTopicName())
                .description(topic.getDescription())
                .languageCode(topic.getLanguageCode())
                .createdAt(topic.getCreatedAt())
                .updatedAt(topic.getUpdatedAt())
                .build();
    }

    private GrammarLessonResponse mapToLessonResponse(GrammarLesson lesson) {
        List<GrammarRuleResponse> rules = new ArrayList<>();
        if (lesson.getGrammarRules() != null) {
            rules = lesson.getGrammarRules().stream()
                    .filter(r -> !r.isDeleted())
                    .map(this::mapToRuleResponse)
                    .collect(Collectors.toList());
        }

        return GrammarLessonResponse.builder()
                .lessonId(lesson.getLessonId())
                .topicId(lesson.getTopicId())
                .title(lesson.getTitle())
                .content(lesson.getContent())
                .level(lesson.getLevel())
                .grammarRules(rules)
                .createdAt(lesson.getCreatedAt() != null ? lesson.getCreatedAt().toString() : null)
                .updatedAt(lesson.getUpdatedAt() != null ? lesson.getUpdatedAt().toString() : null)
                .build();
    }

    private GrammarRuleResponse mapToRuleResponse(GrammarRule rule) {
        UUID lessonId = rule.getGrammarLesson() != null ? rule.getGrammarLesson().getLessonId() : null;
        UUID topicId = rule.getGrammarLesson() != null ? rule.getGrammarLesson().getTopicId() : null;

        return GrammarRuleResponse.builder()
                .ruleId(rule.getRuleId())
                .lessonId(lessonId)
                .topicId(topicId)
                .title(rule.getTitle())
                .ruleContent(rule.getRuleContent())
                .usageNotes(rule.getUsageNotes())
                .examples(rule.getExamples())
                .createdAt(rule.getCreatedAt())
                .updatedAt(rule.getUpdatedAt())
                .build();
    }

    @Override
    @Transactional
    public List<MindMapNode> getMindMap() {
        List<GrammarTopic> topics = topicRepo.findByIsDeletedFalseOrderByCreatedAtAsc();
        List<MindMapNode> nodes = new ArrayList<>();

        MindMapNode root = new MindMapNode();
        root.setId("root");
        root.setTitle("Vietnamese Grammar");
        root.setDescription("Complete Vietnamese Grammar System");
        root.setChildren(topics.stream().map(t -> t.getTopicId().toString()).collect(Collectors.toList()));
        root.setExamples(new ArrayList<>());
        root.setRules(new ArrayList<>());
        root.setType("root");
        nodes.add(root);

        for (GrammarTopic topic : topics) {
            List<GrammarLesson> lessons = lessonRepo.findByTopicIdAndIsDeletedFalseOrderByCreatedAtAsc(topic.getTopicId());

            MindMapNode topicNode = new MindMapNode();
            topicNode.setId(topic.getTopicId().toString());
            topicNode.setTitle(topic.getTopicName());
            topicNode.setDescription(topic.getDescription());

            List<String> ruleChildrenIds = new ArrayList<>();

            for (GrammarLesson lesson : lessons) {
                if (lesson.getGrammarRules() == null) continue;

                for (GrammarRule rule : lesson.getGrammarRules()) {
                    if (rule.isDeleted()) continue;

                    ruleChildrenIds.add(rule.getRuleId().toString());

                    MindMapNode ruleNode = new MindMapNode();
                    ruleNode.setId(rule.getRuleId().toString());
                    ruleNode.setTitle(rule.getTitle());
                    ruleNode.setDescription(rule.getRuleContent());
                    ruleNode.setChildren(new ArrayList<>());
                    ruleNode.setExamples(rule.getExamples());
                    ruleNode.setRules(new ArrayList<>());
                    ruleNode.setType("rule");
                    nodes.add(ruleNode);
                }
            }

            topicNode.setChildren(ruleChildrenIds);
            topicNode.setExamples(new ArrayList<>());
            topicNode.setRules(new ArrayList<>());
            topicNode.setType("topic");
            nodes.add(topicNode);
        }

        assignPositions(nodes, "root", 800, 600);
        return nodes;
    }

    private void assignPositions(List<MindMapNode> nodes, String rootId, int width, int height) {
        Map<String, MindMapNode> nodeMap = nodes.stream().collect(Collectors.toMap(MindMapNode::getId, n -> n));
        Queue<PositionQueueItem> queue = new LinkedList<>();
        queue.add(new PositionQueueItem(rootId, 0, 0, 0));

        String[] colors = {"#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"};
        int index = 0;

        while (!queue.isEmpty()) {
            PositionQueueItem item = queue.poll();
            MindMapNode node = nodeMap.get(item.id);
            if (node == null) continue;

            double radius = 150 * item.level;
            double angle = item.angleStart;
            double x = width / 2.0 + radius * Math.cos(angle);
            double y = height / 3.0 + radius * Math.sin(angle);

            node.setX(x);
            node.setY(y);
            node.setColor(colors[item.level % colors.length]);
            node.setLevel(item.level);

            List<String> children = node.getChildren();
            if (children != null && !children.isEmpty()) {
                double childAngleStep = Math.PI / children.size();
                for (int i = 0; i < children.size(); i++) {
                    double childAngle = item.angleStart + i * childAngleStep - (Math.PI / 2);
                    queue.add(new PositionQueueItem(children.get(i), item.level + 1, childAngle, index++));
                }
            }
        }
    }

    private static class PositionQueueItem {
        String id;
        int level;
        double angleStart;
        int parentIndex;

        PositionQueueItem(String id, int level, double angleStart, int parentIndex) {
            this.id = id;
            this.level = level;
            this.angleStart = angleStart;
            this.parentIndex = parentIndex;
        }
    }

    @Override
    @Transactional
    public SubmitExerciseResponse submitExercise(SubmitExerciseRequest request) {
        UUID ruleId = request.getRuleId();
        UUID userId = request.getUserId();
        if (userId == null) throw new AppException(ErrorCode.INVALID_INPUT);
        userService.getUserIfExists(userId);

        GrammarRule rule = ruleRepo.findById(ruleId).filter(r -> !r.isDeleted())
                .orElseThrow(() -> new AppException(ErrorCode.GRAMMAR_RULE_NOT_FOUND));

        UUID topicId = rule.getGrammarLesson().getTopicId();

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

        GrammarProgressId pid = new GrammarProgressId(topicId, userId, ruleId);
        GrammarProgress progress = progressRepo.findById(pid).orElseGet(() -> {
            GrammarProgress p = new GrammarProgress();
            p.setId(pid);
            p.setCreatedAt(OffsetDateTime.now());
            return p;
        });
        progress.setScore(Math.max(progress.getScore() == null ? 0 : progress.getScore(), score));
        progress.setCompletedAt(OffsetDateTime.now());
        progressRepo.save(progress);

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