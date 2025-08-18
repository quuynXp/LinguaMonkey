package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.CertificateRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CertificateResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LessonCategory;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CertificateMapper {
    @Mapping(target = "lessonCategoryName", constant = "CERTIFICATE")
    LessonCategory toEntity(CertificateRequest request);

    CertificateResponse toResponse(LessonCategory lessonCategory);

    void updateEntityFromRequest(CertificateRequest request, @MappingTarget LessonCategory lessonCategory);
}