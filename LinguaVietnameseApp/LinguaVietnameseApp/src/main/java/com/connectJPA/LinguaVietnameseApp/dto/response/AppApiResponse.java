package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AppApiResponse<T>{
    @Builder.Default
    int code;
    String message;
    T result;
}
