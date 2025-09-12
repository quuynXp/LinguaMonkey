package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateFlashcardRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.EventRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.EventResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.FlashcardResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Event;
import com.connectJPA.LinguaVietnameseApp.entity.Flashcard;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.Arrays;
import java.util.List;

@Mapper(componentModel = "spring")
public interface FlashcardMapper {
    Flashcard toEntity(CreateFlashcardRequest request);

    FlashcardResponse toResponse(Flashcard flashcard);

    void updateEntityFromRequest(CreateFlashcardRequest request, @MappingTarget Flashcard flashcard);

    // helper
    default String joinTags(List<String> tags) {
        return tags != null ? String.join(",", tags) : null;
    }

    default List<String> splitTags(String tags) {
        return tags != null ? Arrays.asList(tags.split(",")) : null;
    }
}

