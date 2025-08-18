package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseDiscountRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseDiscountResponse;
import com.connectJPA.LinguaVietnameseApp.entity.CourseDiscount;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CourseDiscountMapper {
    CourseDiscount toEntity(CourseDiscountRequest request);
    CourseDiscountResponse toResponse(CourseDiscount discount);
    void updateEntityFromRequest(CourseDiscountRequest request, @MappingTarget CourseDiscount discount);
}