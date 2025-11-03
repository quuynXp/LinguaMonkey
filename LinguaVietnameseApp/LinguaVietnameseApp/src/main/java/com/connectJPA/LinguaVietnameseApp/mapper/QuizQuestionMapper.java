package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.QuizQuestionDto;
import com.connectJPA.LinguaVietnameseApp.dto.response.QuizResponse;
import learning.QuizGenerationResponse;
import learning.QuizQuestionProto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface QuizQuestionMapper {

    @Mapping(source = "questionText", target = "questionText")
    @Mapping(source = "correctAnswerIndex", target = "correctAnswerIndex")
    @Mapping(source = "skillType", target = "skillType")
    QuizQuestionDto toDTO(QuizQuestionProto proto);

    List<QuizQuestionDto> toDTOList(List<QuizQuestionProto> protos);

    @Mapping(source = "quizId", target = "quizId")
    @Mapping(source = "questionsList", target = "questions")
    QuizResponse toResponse(QuizGenerationResponse protoResponse);
}
