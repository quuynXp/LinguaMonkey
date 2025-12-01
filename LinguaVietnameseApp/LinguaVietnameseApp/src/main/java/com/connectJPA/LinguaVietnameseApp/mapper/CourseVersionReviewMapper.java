package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseVersionReviewRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionReviewResponse;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionReview;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CourseVersionReviewMapper {

    CourseVersionReview toEntity(CourseVersionReviewRequest request);
    CourseVersionReviewResponse toResponse(CourseVersionReview review);
    void updateEntityFromRequest(CourseVersionReviewRequest request, @MappingTarget CourseVersionReview review);
}