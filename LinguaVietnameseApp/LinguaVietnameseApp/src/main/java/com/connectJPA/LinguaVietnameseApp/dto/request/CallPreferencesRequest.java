package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty; // <--- IMPORT CÁI NÀY
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CallPreferencesRequest {
    
    // Đảm bảo map đúng key "userId" từ JSON
    @JsonProperty("userId") 
    private UUID userId;

    @JsonProperty("interests")
    private List<String> interests;

    @JsonProperty("gender")
    private String gender;

    @JsonProperty("nativeLanguage")
    private String nativeLanguage;

    @JsonProperty("learningLanguages")
    private List<String> learningLanguages;

    @JsonProperty("ageRange")
    private String ageRange;

    @JsonProperty("proficiency")
    private String proficiency;

    @JsonProperty("learningPace")
    private String learningPace;

    @JsonProperty("callDuration")
    private String callDuration;
}