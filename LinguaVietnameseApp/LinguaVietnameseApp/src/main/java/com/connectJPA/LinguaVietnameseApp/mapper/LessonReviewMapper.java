package com.connectJPA.LinguaVietnameseApp.mapper;


import com.connectJPA.LinguaVietnameseApp.dto.request.LessonReviewRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonReviewResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LessonReview;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface LessonReviewMapper {
    LessonReview toEntity(LessonReviewRequest request);
    LessonReviewResponse toResponse(LessonReview entity);
    void updateEntityFromRequest(LessonReviewRequest request, @MappingTarget LessonReview entity);
}
