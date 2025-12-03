package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data // Tự động tạo Getters, Setters, toString, equals, hashCode
@NoArgsConstructor // Tạo constructor rỗng (cần cho Jackson/JSON)
@AllArgsConstructor // Tạo constructor với tất cả các trường
public class CallPreferencesRequest {
    private List<String> interests;
    private String gender;
    private String nativeLanguage;
    private List<String> learningLanguages;
    private String ageRange;
    private String proficiency; // New Field
    private String learningPace; // New Field
    private String callDuration;

}