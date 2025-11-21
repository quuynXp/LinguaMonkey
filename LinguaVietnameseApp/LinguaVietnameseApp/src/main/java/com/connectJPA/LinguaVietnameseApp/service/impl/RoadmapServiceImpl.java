package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateRoadmapRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.GenerateRoadmapRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
        import com.connectJPA.LinguaVietnameseApp.entity.*;
        import com.connectJPA.LinguaVietnameseApp.entity.id.UserRoadmapId;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
        import com.connectJPA.LinguaVietnameseApp.service.RoadmapService;
import lombok.RequiredArgsConstructor;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
        import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoadmapServiceImpl implements RoadmapService {

    private final RoadmapRepository roadmapRepository;
    private final RoadmapItemRepository roadmapItemRepository;
    private final RoadmapMilestoneRepository roadmapMilestoneRepository;
    private final RoadmapGuidanceRepository roadmapGuidanceRepository;
    private final RoadmapResourceRepository roadmapResourceRepository;
    private final UserRoadmapRepository userRoadmapRepository;
    private final UserRepository userRepository;
    private final UserGoalRepository userGoalRepository;
    private final UserInterestRepository userInterestRepository;
    private final GrpcClientService grpcClientService;
    private final InterestRepository interestRepository;
    private final RoadmapSuggestionRepository roadmapSuggestionRepository;
    private final RoadmapRatingRepository roadmapRatingRepository;

    // ==================== USER ROADMAPS ====================

    @Override
    public List<RoadmapUserResponse> getUserRoadmaps(UUID userId, String language) {
        List<UserRoadmap> urs = userRoadmapRepository.findByUserRoadmapIdUserIdAndLanguage(userId, language);
        return urs.stream().map(this::mapToUserResponse).collect(Collectors.toList());
    }

    @Override
    public RoadmapUserResponse getRoadmapWithUserProgress(UUID roadmapId, UUID userId) {
        UserRoadmap ur = userRoadmapRepository
                .findByUserRoadmapIdRoadmapIdAndUserRoadmapIdUserId(roadmapId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_NOT_FOUND));
        return mapToUserResponse(ur);
    }

    @Transactional
    @Override
    public void assignRoadmapToUser(UUID userId, UUID roadmapId) {
        if (userId == null) throw new AppException(ErrorCode.USER_NOT_FOUND);

        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_NOT_FOUND));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        UserRoadmapId urId = new UserRoadmapId(userId, roadmapId);
        UserRoadmap ur = userRoadmapRepository.findById(urId).orElse(null);

        if (ur == null) {
            ur = new UserRoadmap();
            ur.setUserRoadmapId(urId);
            ur.setCurrentLevel(0);
            ur.setTargetLevel(10);
            ur.setTargetProficiency(null);

            List<RoadmapItem> items = roadmapItemRepository.findByRoadmapIdOrderByOrderIndexAsc(roadmapId);
            int totalItems = items.size();
            int studyTimePerDay = 60;

            int estimatedDays = studyTimePerDay > 0 && totalItems > 0
                    ? (totalItems * 60 / studyTimePerDay)
                    : totalItems;

            ur.setEstimatedCompletionTime(estimatedDays);
            ur.setCompletedItems(0);
            ur.setStatus("active");
            ur.setIsPublic(false);
            ur.setLanguage(roadmap.getLanguageCode());
            ur.setCreatedAt(OffsetDateTime.now());
        } else {
            ur.setStatus("active");
        }

        userRoadmapRepository.save(ur);
        log.info("Assigned roadmap {} to user {}", roadmapId, userId);
    }

    // ==================== PUBLIC ROADMAPS ====================

    @Override
    public List<RoadmapResponse> getPublicRoadmaps(String language) {
        return userRoadmapRepository.findByIsPublicTrueAndLanguage(language).stream()
                .map(ur -> mapToResponse(ur.getRoadmap()))
                .collect(Collectors.toList());
    }

    @Override
    public Page<RoadmapPublicResponse> getPublicRoadmapsWithStats(String language, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size);

        Page<UserRoadmap> publicRoadmaps = userRoadmapRepository
                .findByIsPublicTrueAndLanguageOrderByCreatedAtDesc(language, pageRequest);

        return publicRoadmaps.map(ur -> {
            Roadmap roadmap = ur.getRoadmap();

            long suggestionCount = roadmapSuggestionRepository
                    .countByRoadmapRoadmapIdAndAppliedFalse(roadmap.getRoadmapId());

            double avgRating = calculateRoadmapRating(roadmap.getRoadmapId());

            return RoadmapPublicResponse.builder()
                    .roadmapId(roadmap.getRoadmapId())
                    .title(roadmap.getTitle())
                    .description(roadmap.getDescription())
                    .language(roadmap.getLanguageCode())
                    .creator(ur.getUser().getFullname())
                    .creatorId(ur.getUser().getUserId())
                    .creatorAvatar(ur.getUser().getAvatarUrl())
                    .totalItems(roadmap.getTotalItems())
                    .suggestionCount((int) suggestionCount)
                    .averageRating(avgRating)
                    .difficulty(roadmap.getType())
                    .type(roadmap.getType())
                    .createdAt(ur.getCreatedAt())
                    .viewCount(0) // Add view tracking later
                    .favoriteCount(0) // Add favorite tracking later
                    .build();
        });
    }

    @Transactional
    @Override
    public void setPublic(UUID userId, UUID roadmapId, boolean isPublic) {
        UserRoadmap ur = userRoadmapRepository.findById(new UserRoadmapId(userId, roadmapId))
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_NOT_FOUND));

        if (!ur.getUserRoadmapId().getUserId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        ur.setIsPublic(isPublic);
        userRoadmapRepository.save(ur);
        log.info("Set roadmap {} visibility to {}", roadmapId, isPublic);
    }

    // ==================== ROADMAP SUGGESTIONS ====================

    @Override
    public List<RoadmapSuggestion> getSuggestions(UUID roadmapId) {
        return roadmapSuggestionRepository.findByRoadmapRoadmapId(roadmapId);
    }

    @Override
    public List<RoadmapSuggestionResponse> getSuggestionsWithDetails(UUID roadmapId) {
        List<RoadmapSuggestion> suggestions = roadmapSuggestionRepository
                .findByRoadmapRoadmapIdOrderByCreatedAtDesc(roadmapId);

        return suggestions.stream()
                .map(suggestion -> RoadmapSuggestionResponse.builder()
                        .suggestionId(suggestion.getSuggestionId())
                        .userId(suggestion.getUser().getUserId())
                        .userName(suggestion.getUser().getFullname())
                        .userAvatar(suggestion.getUser().getAvatarUrl())
                        .itemId(suggestion.getItemId())
                        .suggestedOrderIndex(suggestion.getSuggestedOrderIndex())
                        .reason(suggestion.getReason())
                        .appliedCount(0)
                        .likeCount(0)
                        .applied(suggestion.getApplied())
                        .createdAt(suggestion.getCreatedAt())
                        .appliedAt(suggestion.getAppliedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    @Override
    public RoadmapSuggestion addSuggestion(UUID userId, UUID roadmapId, UUID itemId,
                                           Integer suggestedOrderIndex, String reason) {
        UserRoadmap ur = userRoadmapRepository.findById(new UserRoadmapId(userId, roadmapId))
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_NOT_FOUND));

        if (!ur.getIsPublic()) {
            throw new AppException(ErrorCode.ROADMAP_NOT_PUBLIC);
        }

        RoadmapItem item = roadmapItemRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_ITEM_NOT_FOUND));

        // Check for duplicate
        if (roadmapSuggestionRepository.existsByUserAndRoadmapAndItem(userId, roadmapId, itemId)) {
            throw new AppException(ErrorCode.DUPLICATE_SUGGESTION);
        }

        RoadmapSuggestion suggestion = RoadmapSuggestion.builder()
                .suggestionId(UUID.randomUUID())
                .user(userRepository.findById(userId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND)))
                .roadmap(roadmapRepository.findById(roadmapId)
                        .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_NOT_FOUND)))
                .itemId(itemId)
                .suggestedOrderIndex(suggestedOrderIndex)
                .reason(reason)
                .applied(false)
                .build();

        log.info("Added suggestion from user {} for roadmap {}", userId, roadmapId);
        return roadmapSuggestionRepository.save(suggestion);
    }

    @Transactional
    @Override
    public void applySuggestion(UUID userId, UUID suggestionId) {
        RoadmapSuggestion suggestion = roadmapSuggestionRepository.findById(suggestionId)
                .orElseThrow(() -> new AppException(ErrorCode.SUGGESTION_NOT_FOUND));

        UserRoadmap ur = userRoadmapRepository
                .findById(new UserRoadmapId(userId, suggestion.getRoadmap().getRoadmapId()))
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_NOT_FOUND));

        if (!ur.getUserRoadmapId().getUserId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        if (suggestion.getItemId() != null && suggestion.getSuggestedOrderIndex() != null) {
            RoadmapItem item = roadmapItemRepository.findById(suggestion.getItemId())
                    .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_ITEM_NOT_FOUND));

            item.setOrderIndex(suggestion.getSuggestedOrderIndex());
            roadmapItemRepository.save(item);

            reorderRoadmapItems(suggestion.getRoadmap().getRoadmapId());
        }

        suggestion.setApplied(true);
        suggestion.setAppliedAt(OffsetDateTime.now());
        roadmapSuggestionRepository.save(suggestion);
        log.info("Applied suggestion {} for roadmap {}", suggestionId, suggestion.getRoadmap().getRoadmapId());
    }

    // ==================== ROADMAP CRUD ====================

    @Override
    public List<RoadmapResponse> getAllRoadmaps(String language) {
        return roadmapRepository.findByLanguageCodeAndIsDeletedFalse(language).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public RoadmapResponse getRoadmapWithDetails(UUID roadmapId) {
        Roadmap r = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_NOT_FOUND));

        List<RoadmapItemResponse> items = roadmapItemRepository
                .findByRoadmapIdOrderByOrderIndexAsc(roadmapId).stream()
                .map(i -> RoadmapItemResponse.builder()
                        .id(i.getItemId())
                        .name(i.getTitle())
                        .description(i.getDescription())
                        .type(i.getType())
                        .level(i.getLevel())
                        .estimatedTime(i.getEstimatedTime())
                        .expReward(i.getExpReward())
                        .difficulty(i.getDifficulty())
                        .build())
                .collect(Collectors.toList());

        List<MilestoneResponse> milestones = roadmapMilestoneRepository
                .findByRoadmapIdOrderByOrderIndexAsc(roadmapId).stream()
                .map(m -> MilestoneResponse.builder()
                        .id(m.getMilestoneId())
                        .name(m.getTitle())
                        .description(m.getDescription())
                        .level(m.getLevel())
                        .build())
                .collect(Collectors.toList());

        return RoadmapResponse.builder()
                .id(r.getRoadmapId())
                .title(r.getTitle())
                .description(r.getDescription())
                .language(r.getLanguageCode())
                .items(items)
                .milestones(milestones)
                .createdAt(r.getCreatedAt())
                .build();
    }

    @Transactional
    @Override
    public RoadmapResponse create(CreateRoadmapRequest request) {
        Roadmap roadmap = Roadmap.builder()
                .roadmapId(UUID.randomUUID())
                .title(request.getTitle())
                .description(request.getDescription())
                .languageCode(request.getLanguageCode())
                .totalItems(0)
                .isDeleted(false)
                .createdAt(OffsetDateTime.now())
                .build();

        roadmapRepository.save(roadmap);
        log.info("Created roadmap: {}", roadmap.getRoadmapId());
        return mapToResponse(roadmap);
    }

    @Transactional
    @Override
    public RoadmapResponse update(UUID id, CreateRoadmapRequest request) {
        Roadmap roadmap = roadmapRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_NOT_FOUND));

        roadmap.setTitle(request.getTitle());
        roadmap.setDescription(request.getDescription());
        roadmap.setLanguageCode(request.getLanguageCode());
        roadmap.setUpdatedAt(OffsetDateTime.now());
        roadmapRepository.save(roadmap);

        log.info("Updated roadmap: {}", id);
        return mapToResponse(roadmap);
    }

    @Transactional
    @Override
    public void delete(UUID id) {
        Roadmap roadmap = roadmapRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_NOT_FOUND));

        roadmap.setDeleted(true);
        roadmap.setDeletedAt(OffsetDateTime.now());
        roadmapRepository.save(roadmap);

        log.info("Deleted roadmap: {}", id);
    }

    @Transactional
    @Override
    public void startItem(UUID userId, UUID itemId) {
        RoadmapItem item = roadmapItemRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_ITEM_NOT_FOUND));

        UserRoadmap ur = userRoadmapRepository
                .findById(new UserRoadmapId(userId, item.getRoadmap().getRoadmapId()))
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_NOT_ASSIGNED));

        ur.setStatus("in-progress");
        userRoadmapRepository.save(ur);
    }

    @Transactional
    @Override
    public void completeItem(UUID userId, UUID itemId) {
        RoadmapItem item = roadmapItemRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_ITEM_NOT_FOUND));

        UserRoadmap ur = userRoadmapRepository
                .findById(new UserRoadmapId(userId, item.getRoadmap().getRoadmapId()))
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_NOT_ASSIGNED));

        ur.setCompletedItems(ur.getCompletedItems() + 1);
        userRoadmapRepository.save(ur);
    }

    @Override
    public RoadmapItem getRoadmapItemDetail(UUID itemId) {
        return roadmapItemRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_ITEM_NOT_FOUND));
    }

    @Transactional
    @Override
    public RoadmapResponse generateFromAI(String token, GenerateRoadmapRequest req) {
        try {
            StringBuilder prompt = new StringBuilder("Generate roadmap for language " + req.getLanguageCode()
                    + ". Target proficiency: " + req.getTargetProficiency()
                    + ". Focus areas: " + String.join(", ", req.getFocusAreas())
                    + ". Study time per day: " + req.getStudyTimePerDay()
                    + ". Target date: " + req.getTargetDate() + ". " + req.getAdditionalPrompt());

            if (req.isCustom()) {
                User user = userRepository.findById(UUID.fromString(req.getUserId()))
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

                String goalsStr = userGoalRepository.findByUserIdAndIsDeletedFalse(user.getUserId()).stream()
                        .map(goal -> goal.getGoalType().name())
                        .collect(Collectors.joining(", "));

                String interestsStr = userInterestRepository.findByIdUserIdAndIsDeletedFalse(user.getUserId()).stream()
                        .map(ui -> ui.getInterest().getInterestName())
                        .collect(Collectors.joining(", "));

                prompt.append(" User age range: ").append(user.getAgeRange())
                        .append(". Learning pace: ").append(user.getLearningPace())
                        .append(". Proficiency: ").append(user.getProficiency())
                        .append(". Goals: ").append(goalsStr.isEmpty() ? "None" : goalsStr)
                        .append(". Interests: ").append(interestsStr.isEmpty() ? "None" : interestsStr);
            }

            var future = grpcClientService.callCreateOrUpdateRoadmapDetailedAsync(
                    token,
                    req.getUserId(),
                    "", // create mode
                    req.getLanguageCode(),
                    prompt.toString(),
                    req.isCustom()
            );

            var protoResp = future.get();

            if (protoResp == null || protoResp.getError() != null && !protoResp.getError().isEmpty()) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }

            UUID roadmapId = protoResp.getRoadmapId().isEmpty() ? UUID.randomUUID() : UUID.fromString(protoResp.getRoadmapId());

            Roadmap roadmap = new Roadmap();
            roadmap.setRoadmapId(roadmapId);
            roadmap.setTitle(protoResp.getTitle());
            roadmap.setDescription(protoResp.getDescription());
            roadmap.setLanguageCode(protoResp.getLanguage());
            roadmap.setTotalItems(protoResp.getItemsList() == null ? 0 : protoResp.getItemsList().size());
            roadmapRepository.save(roadmap);

            // cleanup existing
            roadmapItemRepository.deleteByRoadmapIdAndIsDeletedFalse(roadmapId);
            roadmapMilestoneRepository.deleteByRoadmapIdAndIsDeletedFalse(roadmapId);
            roadmapGuidanceRepository.deleteByRoadmapIdAndIsDeletedFalse(roadmapId);
            roadmapResourceRepository.deleteByRoadmapIdAndIsDeletedFalse(roadmapId);

            // save items
            for (var itemProto : protoResp.getItemsList()) {
                UUID itemId = itemProto.getItemId().isEmpty() ? UUID.randomUUID() : UUID.fromString(itemProto.getItemId());
                RoadmapItem item = new RoadmapItem();
                item.setItemId(itemId);
                item.setRoadmap(roadmap);
                item.setTitle(itemProto.getTitle());
                item.setDescription(itemProto.getDescription());
                item.setType(itemProto.getType());
                item.setLevel(itemProto.getLevel());
                item.setEstimatedTime(itemProto.getEstimatedTime());
                item.setOrderIndex(itemProto.getOrderIndex());
                item.setCategory(itemProto.getCategory());
                item.setDifficulty(itemProto.getDifficulty());
                item.setExpReward(itemProto.getExpReward());
                if (!itemProto.getContentId().isEmpty()) {
                    item.setContentId(UUID.fromString(itemProto.getContentId()));
                }
                roadmapItemRepository.save(item);
            }

            // save resources (if any)
            if (protoResp.getResourcesList() != null) {
                for (var resProto : protoResp.getResourcesList()) {
                    try {
                        UUID resId = resProto.getResourceId().isEmpty() ? UUID.randomUUID() : UUID.fromString(resProto.getResourceId());
                        UUID itemId = resProto.getItemId().isEmpty() ? null : UUID.fromString(resProto.getItemId());
                        RoadmapResource res = new RoadmapResource();
                        res.setResourceId(resId);
                        res.setItemId(itemId);
                        res.setType(resProto.getType());
                        res.setTitle(resProto.getTitle());
                        res.setDescription(resProto.getDescription());
                        res.setUrl(resProto.getUrl());
                        if (!resProto.getContentId().isEmpty()) {
                            res.setContentId(UUID.fromString(resProto.getContentId()));
                        }
                        res.setDuration(resProto.getDuration());
                        roadmapResourceRepository.save(res);
                    } catch (Exception ex) {
                        // log and continue
                        System.err.println("Failed to save resource proto: " + ex.getMessage());
                    }
                }
            }

            // save guidances
            if (protoResp.getGuidancesList() != null) {
                for (var gProto : protoResp.getGuidancesList()) {
                    try {
                        UUID gId = gProto.getGuidanceId().isEmpty() ? UUID.randomUUID() : UUID.fromString(gProto.getGuidanceId());
                        UUID itemId = gProto.getItemId().isEmpty() ? null : UUID.fromString(gProto.getItemId());
                        RoadmapGuidance guidance = new RoadmapGuidance();
                        guidance.setGuidanceId(gId);
                        guidance.setItemId(itemId);
                        guidance.setStage(String.valueOf(gProto.getStage()));
                        guidance.setTitle(gProto.getTitle());
                        guidance.setDescription(gProto.getDescription());
                        guidance.setTips(List.of(gProto.getTipsList().toArray(new String[0])));
                        guidance.setEstimatedTime(gProto.getEstimatedTime());
                        guidance.setOrderIndex(gProto.getOrderIndex());
                        roadmapGuidanceRepository.save(guidance);
                    } catch (Exception ex) {
                        System.err.println("Failed to save guidance proto: " + ex.getMessage());
                    }
                }
            }

            // save milestones
            if (protoResp.getMilestonesList() != null) {
                for (var mProto : protoResp.getMilestonesList()) {
                    try {
                        UUID mId = mProto.getMilestoneId().isEmpty() ? UUID.randomUUID() : UUID.fromString(mProto.getMilestoneId());
                        RoadmapMilestone m = new RoadmapMilestone();
                        m.setMilestoneId(mId);
                        m.setRoadmap(roadmap);
                        m.setTitle(mProto.getTitle());
                        m.setDescription(mProto.getDescription());
                        m.setLevel(mProto.getLevel());
                        m.setRequirements(List.of(mProto.getRequirementsList().toArray(new String[0])));
                        m.setRewards(List.of(mProto.getRewardsList().toArray(new String[0])));
                        m.setOrderIndex(mProto.getOrderIndex());
                        roadmapMilestoneRepository.save(m);
                    } catch (Exception ex) {
                        System.err.println("Failed to save milestone proto: " + ex.getMessage());
                    }
                }
            }

            // link user-roadmap
            if (req.getUserId() != null && !req.getUserId().isEmpty()) {
                UserRoadmap ur = new UserRoadmap();
                ur.setUserRoadmapId(new UserRoadmapId(UUID.fromString(req.getUserId()), roadmapId));
                ur.setCurrentLevel(0);
                ur.setTargetLevel(10);
                ur.setTargetProficiency(req.getTargetProficiency());
                ur.setEstimatedCompletionTime(req.getStudyTimePerDay() > 0 ? (roadmap.getTotalItems() * 60 / req.getStudyTimePerDay()) : 0);
                ur.setCompletedItems(0);
                ur.setStatus("active");
                userRoadmapRepository.save(ur);
            }

            return mapToResponse(roadmap);

        } catch (InterruptedException | ExecutionException ex) {
            Thread.currentThread().interrupt();
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
        }
    }


    private RoadmapUserResponse mapToUserResponse(UserRoadmap ur) {
        Roadmap r = ur.getRoadmap();
        List<RoadmapItem> itemsEnt = roadmapItemRepository
                .findByRoadmapIdOrderByOrderIndexAsc(r.getRoadmapId());

        List<RoadmapItemUserResponse> items = itemsEnt.stream()
                .map(i -> RoadmapItemUserResponse.builder()
                        .id(i.getItemId())
                        .name(i.getTitle())
                        .description(i.getDescription())
                        .completed(i.getOrderIndex() <= ur.getCompletedItems())
                        .build())
                .collect(Collectors.toList());

        int totalItems = r.getTotalItems() != null ? r.getTotalItems() : itemsEnt.size();
        int completedItems = ur.getCompletedItems();
        int progress = totalItems > 0 ? (completedItems * 100 / totalItems) : 0;

        int estimatedCompletionTime = ur.getEstimatedCompletionTime();
        if (estimatedCompletionTime == 0 && totalItems > 0) {
            estimatedCompletionTime = (totalItems - completedItems);
        }

        return RoadmapUserResponse.builder()
                .roadmapId(r.getRoadmapId())
                .userId(ur.getUserRoadmapId().getUserId())
                .title(r.getTitle())
                .description(r.getDescription())
                .language(r.getLanguageCode())
                .progressPercentage(progress)
                .totalItems(totalItems)
                .completedItems(completedItems)
                .estimatedCompletionTime(estimatedCompletionTime)
                .items(items)
                .createdAt(ur.getCreatedAt())
                .build();
    }

    private RoadmapResponse mapToResponse(Roadmap r) {
        return RoadmapResponse.builder()
                .id(r.getRoadmapId())
                .title(r.getTitle())
                .description(r.getDescription())
                .language(r.getLanguageCode())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }

    private void reorderRoadmapItems(UUID roadmapId) {
        List<RoadmapItem> items = roadmapItemRepository
                .findByRoadmapIdOrderByOrderIndexAsc(roadmapId);

        for (int i = 0; i < items.size(); i++) {
            items.get(i).setOrderIndex(i);
            roadmapItemRepository.save(items.get(i));
        }
    }

    private double calculateRoadmapRating(UUID roadmapId) {
        // Implementation to calculate average rating
        return 4.5; // Placeholder
    }
}