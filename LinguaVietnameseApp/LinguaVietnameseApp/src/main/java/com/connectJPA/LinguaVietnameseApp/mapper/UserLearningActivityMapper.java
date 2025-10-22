package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.UserLearningActivityRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserLearningActivityResponse;
import com.connectJPA.LinguaVietnameseApp.entity.UserLearningActivity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface UserLearningActivityMapper {

    UserLearningActivity toEntity(UserLearningActivityRequest request);
    UserLearningActivityResponse toResponse(UserLearningActivity entity);
    void updateEntityFromRequest(UserLearningActivityRequest request, @MappingTarget UserLearningActivity entity);
}