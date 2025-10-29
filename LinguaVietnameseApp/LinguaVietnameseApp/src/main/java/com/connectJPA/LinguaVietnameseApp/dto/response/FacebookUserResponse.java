package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

public record FacebookUserResponse(
        String id,
        String name,
        String email,
        @JsonProperty("first_name") String firstName,
        @JsonProperty("last_name") String lastName
) {}
