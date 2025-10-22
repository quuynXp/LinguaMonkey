package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseReviewRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.LanguageRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseReviewResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LanguageResponse;
import com.connectJPA.LinguaVietnameseApp.entity.CourseReview;
import com.connectJPA.LinguaVietnameseApp.entity.Language;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface LanguageMapper {

    Language toEntity(LanguageRequest request);
    LanguageResponse toResponse(Language language);
    void updateEntityFromRequest(LanguageRequest request, @MappingTarget Language language);
}
