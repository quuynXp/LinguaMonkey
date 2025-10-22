package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseReviewRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseReviewResponse;
import com.connectJPA.LinguaVietnameseApp.entity.CourseReview;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CourseReviewMapper {

    CourseReview toEntity(CourseReviewRequest request);
    CourseReviewResponse toResponse(CourseReview review);
    void updateEntityFromRequest(CourseReviewRequest request, @MappingTarget CourseReview review);
}