package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateRoadmapRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.GenerateRoadmapRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserRoadmapId;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.repository.*;
import com.connectJPA.LinguaVietnameseApp.service.RoadmapService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
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

    @Override
    public List<RoadmapResponse> getAllRoadmaps(String language) {
        return roadmapRepository.findByLanguageCodeAndIsDeletedFalse(language).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    @Override
    public void assignRoadmapToUser(UUID userId, UUID roadmapId) {
        if (userId == null) throw new AppException(ErrorCode.USER_NOT_FOUND);
        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_NOT_FOUND));
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        UserRoadmapId urId = new UserRoadmapId(userId, roadmapId);
        UserRoadmap ur = userRoadmapRepository.findById(urId).orElse(null);

        if (ur == null) {
            ur = new UserRoadmap();
            ur.setUserRoadmapId(urId);
            ur.setCurrentLevel(0);
            ur.setTargetLevel(10); // default, change if you want
            ur.setTargetProficiency(null);
            int studyTimePerDay = 0;
            try {
                studyTimePerDay = (int) (user.getClass().getMethod("getStudyTimePerDay").invoke(user) == null ? 0 : user.getClass().getMethod("getStudyTimePerDay").invoke(user));
            } catch (Exception ignored) {}
            int estimatedDays = (studyTimePerDay > 0 && roadmap.getTotalItems() != null)
                    ? (roadmap.getTotalItems() * 60 / studyTimePerDay)
                    : 0;
            ur.setEstimatedCompletionTime(estimatedDays);
            ur.setCompletedItems(0);
            ur.setStatus("active");
        } else {
            ur.setStatus("active");
        }
        userRoadmapRepository.save(ur);
    }


    @Override
    public RoadmapResponse getRoadmapWithDetails(UUID roadmapId) {
        Roadmap r = roadmapRepository.findById(roadmapId).orElseThrow(() -> new AppException(ErrorCode.ROADMAP_NOT_FOUND));
        List<RoadmapItemResponse> items = roadmapItemRepository.findByRoadmapIdOrderByOrderIndexAsc(roadmapId).stream()
                .map(i -> RoadmapItemResponse.builder().id(i.getItemId()).name(i.getTitle()).description(i.getDescription()).build())
                .collect(Collectors.toList());
        List<MilestoneResponse> milestones = roadmapMilestoneRepository.findByRoadmapIdOrderByOrderIndexAsc(roadmapId).stream()
                .map(m -> MilestoneResponse.builder().id(m.getMilestoneId()).name(m.getTitle()).description(m.getDescription()).build())
                .collect(Collectors.toList());
        List<ResourceResponse> resources = roadmapResourceRepository.findByRoadmapId(roadmapId).stream()
                .map(res -> ResourceResponse.builder().type(res.getType()).url(res.getUrl()).description(res.getDescription()).build())
                .collect(Collectors.toList());
        return RoadmapResponse.builder()
                .id(r.getRoadmapId())
                .title(r.getTitle())
                .description(r.getDescription())
                .language(r.getLanguageCode())
                .items(items)
                .milestones(milestones)
                .resources(resources)
                .build();
    }

    @Override
    public List<RoadmapUserResponse> getUserRoadmaps(UUID userId, String language) {
        List<UserRoadmap> urs = userRoadmapRepository.findByUserRoadmapIdUserIdAndLanguage(userId, language);
        return urs.stream()
                .map(ur -> mapToUserResponse(ur))
                .collect(Collectors.toList());
    }

    @Override
    public RoadmapUserResponse getRoadmapWithUserProgress(UUID roadmapId, UUID userId) {
        UserRoadmap ur = userRoadmapRepository.findByUserRoadmapIdRoadmapIdAndUserRoadmapIdUserId(roadmapId, userId).orElseThrow(() -> new AppException(ErrorCode.ROADMAP_NOT_FOUND));
        return mapToUserResponse(ur);
    }

    private RoadmapUserResponse mapToUserResponse(UserRoadmap ur) {
        Roadmap r = roadmapRepository.findById(ur.getUserRoadmapId().getRoadmapId())
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_NOT_FOUND));

        List<RoadmapItem> itemsEnt = roadmapItemRepository.findByRoadmapIdOrderByOrderIndexAsc(
                ur.getUserRoadmapId().getRoadmapId()
        );

        List<RoadmapItemUserResponse> items = itemsEnt.stream()
                .map(i -> RoadmapItemUserResponse.builder()
                        .id(i.getItemId())
                        .name(i.getTitle())
                        .description(i.getDescription())
                        .completed(i.getOrderIndex() <= ur.getCompletedItems())
                        .build())
                .collect(Collectors.toList());

        List<RoadmapMilestone> milestonesEnt = roadmapMilestoneRepository
                .findByRoadmapIdOrderByOrderIndexAsc(ur.getUserRoadmapId().getRoadmapId());

        List<MilestoneUserResponse> milestones = milestonesEnt.stream()
                .map(m -> MilestoneUserResponse.builder()
                        .id(m.getMilestoneId())
                        .name(m.getTitle())
                        .description(m.getDescription())
                        .achieved(m.getLevel() <= ur.getCurrentLevel())
                        .build())
                .collect(Collectors.toList());

        int totalItems = r.getTotalItems() != null ? r.getTotalItems() : itemsEnt.size();
        int completedItems = ur.getCompletedItems();
        int progress = totalItems > 0 ? (completedItems * 100 / totalItems) : 0;

        int estimatedCompletionTime = ur.getEstimatedCompletionTime();
        if (estimatedCompletionTime == 0 && totalItems > 0) {
            int avgDaysPerItem = 1; // fallback nếu chưa có logic chi tiết
            estimatedCompletionTime = (totalItems - completedItems) * avgDaysPerItem;
        }

        return RoadmapUserResponse.builder()
                .roadmapId(ur.getUserRoadmapId().getRoadmapId())
                .userId(ur.getUserRoadmapId().getUserId())
                .title(r.getTitle())
                .description(r.getDescription())
                .language(r.getLanguageCode())
                .progressPercentage(progress)
                .totalItems(totalItems)
                .completedItems(completedItems)
                .estimatedCompletionTime(estimatedCompletionTime)
                .items(items)
                .milestones(milestones)
                .build();
    }


    private RoadmapResponse mapToResponse(Roadmap r) {
        return RoadmapResponse.builder()
                .id(r.getRoadmapId())
                .title(r.getTitle())
                .description(r.getDescription())
                .language(r.getLanguageCode())
                .build();
    }

    @Transactional
    @Override
    public RoadmapResponse create(CreateRoadmapRequest request) {
        Roadmap roadmap = new Roadmap();
        roadmap.setTitle(request.getTitle());
        roadmap.setDescription(request.getDescription());
        roadmap.setLanguageCode(request.getLanguageCode());
        roadmap.setTotalItems(0); // update later if items added
        roadmapRepository.save(roadmap);
        return mapToResponse(roadmap);
    }

    @Transactional
    @Override
    public RoadmapResponse update(UUID id, CreateRoadmapRequest request) {
        Roadmap roadmap = roadmapRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.ROADMAP_NOT_FOUND));
        roadmap.setTitle(request.getTitle());
        roadmap.setDescription(request.getDescription());
        roadmap.setLanguageCode(request.getLanguageCode());
        roadmap.setUpdatedAt(OffsetDateTime.now());
        roadmapRepository.save(roadmap);
        return mapToResponse(roadmap);
    }

    @Transactional
    @Override
    public void delete(UUID id) {
        Roadmap roadmap = roadmapRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.ROADMAP_NOT_FOUND));
        roadmap.setDeleted(true);
        roadmap.setDeletedAt(OffsetDateTime.now());
        roadmapRepository.save(roadmap);
    }

    @Transactional
    @Override
    public RoadmapResponse generateFromAI(String token, GenerateRoadmapRequest req) {
        try {
            StringBuilder prompt = new StringBuilder("Generate roadmap for language " + req.getLanguageCode() + ". Target proficiency: " + req.getTargetProficiency() + ". Focus areas: " + String.join(", ", req.getFocusAreas()) + ". Study time per day: " + req.getStudyTimePerDay() + ". Target date: " + req.getTargetDate() + ". " + req.getAdditionalPrompt());

            if (req.isCustom()) {
                User user = userRepository.findById(UUID.fromString(req.getUserId()))
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

                // goals → convert enum thành String
                String goalsStr = userGoalRepository.findByUserIdAndIsDeletedFalse(user.getUserId()).stream()
                        .map(goal -> goal.getGoalType().name()) // Enum -> String
                        .collect(Collectors.joining(", "));

                // interests → lấy trực tiếp từ quan hệ ManyToOne Interest
                String interestsStr = userInterestRepository.findByIdUserIdAndIsDeletedFalse(user.getUserId()).stream()
                        .map(ui -> ui.getInterest().getInterestName())
                        .collect(Collectors.joining(", "));

                // build prompt
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

            UUID roadmapId = protoResp.getRoadmapId().isEmpty() ? UUID.randomUUID() : UUID.fromString(protoResp.getRoadmapId());

            Roadmap roadmap = new Roadmap();
            roadmap.setRoadmapId(roadmapId);
            roadmap.setTitle(protoResp.getTitle());
            roadmap.setDescription(protoResp.getDescription());
            roadmap.setLanguageCode(protoResp.getLanguage());
            roadmap.setTotalItems(protoResp.getItemsList().size());
            roadmapRepository.save(roadmap);

            roadmapItemRepository.deleteByRoadmapIdAndIsDeletedFalse(roadmapId);
            roadmapMilestoneRepository.deleteByRoadmapIdAndIsDeletedFalse(roadmapId);
            roadmapGuidanceRepository.deleteByRoadmapIdAndIsDeletedFalse(roadmapId);
            roadmapResourceRepository.deleteByRoadmapIdAndIsDeletedFalse(roadmapId);

            for (var itemProto : protoResp.getItemsList()) {
                UUID itemId = itemProto.getItemId().isEmpty() ? UUID.randomUUID() : UUID.fromString(itemProto.getItemId());
                RoadmapItem item = new RoadmapItem();
                item.setItemId(itemId);
                item.setRoadmapId(roadmapId);
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

                for (var resProto : protoResp.getResourcesList()) {
                    if (resProto.getItemId().equals(itemProto.getItemId())) {
                        UUID resId = resProto.getResourceId().isEmpty() ? UUID.randomUUID() : UUID.fromString(resProto.getResourceId());
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
                    }
                }

                for (var gProto : protoResp.getGuidancesList()) {
                    if (gProto.getItemId().equals(itemProto.getItemId())) {
                        UUID gId = gProto.getGuidanceId().isEmpty() ? UUID.randomUUID() : UUID.fromString(gProto.getGuidanceId());
                        RoadmapGuidance guidance = new RoadmapGuidance();
                        guidance.setGuidanceId(gId);
                        guidance.setItemId(itemId);
                        guidance.setStage(gProto.getStage());
                        guidance.setTitle(gProto.getTitle());
                        guidance.setDescription(gProto.getDescription());
                        guidance.setTips(gProto.getTipsList().toArray(new String[0]));
                        guidance.setEstimatedTime(gProto.getEstimatedTime());
                        guidance.setOrderIndex(gProto.getOrderIndex());
                        roadmapGuidanceRepository.save(guidance);
                    }
                }
            }

            for (var mProto : protoResp.getMilestonesList()) {
                UUID mId = mProto.getMilestoneId().isEmpty() ? UUID.randomUUID() : UUID.fromString(mProto.getMilestoneId());
                RoadmapMilestone m = new RoadmapMilestone();
                m.setMilestoneId(mId);
                m.setRoadmapId(roadmapId);
                m.setTitle(mProto.getTitle());
                m.setDescription(mProto.getDescription());
                m.setLevel(mProto.getLevel());
                m.setRequirements(mProto.getRequirementsList().toArray(new String[0]));
                m.setRewards(mProto.getRewardsList().toArray(new String[0]));
                m.setOrderIndex(mProto.getOrderIndex());
                roadmapMilestoneRepository.save(m);
            }

            if (!req.getUserId().isEmpty()) {
                UserRoadmap ur = new UserRoadmap();
                ur.setUserRoadmapId(new UserRoadmapId(UUID.fromString(req.getUserId()), roadmapId));
                ur.setCurrentLevel(0);
                ur.setTargetLevel(10); // default or from req
                ur.setTargetProficiency(req.getTargetProficiency());
                ur.setEstimatedCompletionTime(req.getStudyTimePerDay() > 0 ? (roadmap.getTotalItems() * 60 / req.getStudyTimePerDay()) : 0); // days estimate
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

    @Override
    public RoadmapItem getRoadmapItemDetail(UUID itemId) {
        RoadmapItem item = roadmapItemRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_ITEM_NOT_FOUND));

        List<ResourceResponse> resources = roadmapResourceRepository.findByItemId(itemId).stream()
                .map(res -> ResourceResponse.builder()
                        .type(res.getType())
                        .url(res.getUrl())
                        .description(res.getDescription())
                        .build())
                .collect(Collectors.toList());

        return RoadmapItem.builder()
                .roadmapId(item.getItemId())
                .title(item.getTitle())
                .description(item.getDescription())
                .type(item.getType())
                .level(item.getLevel())
                .estimatedTime(item.getEstimatedTime())
                .difficulty(item.getDifficulty())
                .expReward(item.getExpReward())
                .build();
    }

    @Transactional
    @Override
    public void startItem(UUID userId, UUID itemId) {
        RoadmapItem item = roadmapItemRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_ITEM_NOT_FOUND));

        UserRoadmap ur = userRoadmapRepository.findById(new UserRoadmapId(userId, item.getRoadmapId()))
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_NOT_ASSIGNED));

        ur.setStatus("in-progress");
        userRoadmapRepository.save(ur);
    }

    @Transactional
    @Override
    public void completeItem(UUID userId, UUID itemId) {
        RoadmapItem item = roadmapItemRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_ITEM_NOT_FOUND));

        UserRoadmap ur = userRoadmapRepository.findById(new UserRoadmapId(userId, item.getRoadmapId()))
                .orElseThrow(() -> new AppException(ErrorCode.ROADMAP_NOT_ASSIGNED));

        ur.setCompletedItems(ur.getCompletedItems() + 1);
        userRoadmapRepository.save(ur);
    }

}