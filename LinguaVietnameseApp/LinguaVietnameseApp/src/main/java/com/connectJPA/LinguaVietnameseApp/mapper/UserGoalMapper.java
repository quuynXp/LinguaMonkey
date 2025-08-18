package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.UserGoalRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserGoalResponse;
import com.connectJPA.LinguaVietnameseApp.entity.UserGoal;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface UserGoalMapper {
    UserGoal toEntity(UserGoalRequest request);
    UserGoalResponse toResponse(UserGoal entity);
    void updateEntityFromRequest(UserGoalRequest request, @MappingTarget UserGoal entity);
}