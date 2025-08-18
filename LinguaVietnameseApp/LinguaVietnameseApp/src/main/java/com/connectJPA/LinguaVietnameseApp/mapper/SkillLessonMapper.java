//package com.connectJPA.LinguaVietnameseApp.mapper;
//
//import com.connectJPA.LinguaVietnameseApp.dto.request.SkillLessonRequest;
//import com.connectJPA.LinguaVietnameseApp.dto.response.SkillLessonResponse;
//import com.connectJPA.LinguaVietnameseApp.entity.SkillLesson;
//import org.mapstruct.Mapper;
//import org.mapstruct.MappingTarget;
//import org.mapstruct.factory.Mappers;
//
//@Mapper
//public interface SkillLessonMapper {
//    SkillLessonMapper INSTANCE = Mappers.getMapper(SkillLessonMapper.class);
//
//    SkillLesson toEntity(SkillLessonRequest request);
//    SkillLessonResponse toResponse(SkillLesson entity);
//    void updateEntityFromRequest(SkillLessonRequest request, @MappingTarget SkillLesson entity);
//}