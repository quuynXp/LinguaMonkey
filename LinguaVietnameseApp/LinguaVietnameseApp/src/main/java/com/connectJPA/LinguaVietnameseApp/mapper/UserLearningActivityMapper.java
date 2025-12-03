package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.UserLearningActivityRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.StudySessionResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserLearningActivityResponse;
import com.connectJPA.LinguaVietnameseApp.entity.UserLearningActivity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy; // Thêm import này nếu cần

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE) // Đảm bảo MapStruct hoạt động
public interface UserLearningActivityMapper {

    UserLearningActivity toEntity(UserLearningActivityRequest request);

    // 1. Ánh xạ cho CRUD API (trả về UserLearningActivityResponse)
    @Mapping(target = "activityId", source = "activityId")
    @Mapping(target = "userId", source = "userId")
    // Các trường khác tự động mapping theo tên, hoặc bạn cần thêm @Mapping nếu tên khác
    UserLearningActivityResponse toUserLearningActivityResponse(UserLearningActivity activity);


    // 2. Ánh xạ cho màn hình Progress/History (trả về StudySessionResponse)
    @Mapping(target = "id", source = "activityId")
    @Mapping(target = "title", source = "details") 
    @Mapping(target = "type", source = "activityType")
    @Mapping(target = "date", source = "createdAt")
    @Mapping(target = "duration", source = "durationInSeconds")
    @Mapping(target = "experience", ignore = true) 
    @Mapping(target = "score", source = "score")
    @Mapping(target = "maxScore", source = "maxScore")
    StudySessionResponse toStudySessionResponse(UserLearningActivity activity); // Đổi tên thành toStudySessionResponse
    
    void updateEntityFromRequest(UserLearningActivityRequest request, @MappingTarget UserLearningActivity entity);
}