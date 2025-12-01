package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseVersionDiscountRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionDiscountResponse;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionDiscount;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface CourseVersionDiscountMapper {

    CourseVersionDiscount toEntity(CourseVersionDiscountRequest request);
    CourseVersionDiscountResponse toResponse(CourseVersionDiscount discount);
    void updateEntityFromRequest(CourseVersionDiscountRequest request, @MappingTarget CourseVersionDiscount discount);
}