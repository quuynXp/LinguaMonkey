package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO (Data Transfer Object) này đại diện cho payload JSON
 * khi người dùng tìm kiếm một cuộc gọi.
 * Các trường trong này khớp với những gì client gửi lên.
 */
@Data // Tự động tạo Getters, Setters, toString, equals, hashCode
@NoArgsConstructor // Tạo constructor rỗng (cần cho Jackson/JSON)
@AllArgsConstructor // Tạo constructor với tất cả các trường
public class CallPreferencesRequest {
    private List<String> interests;
    private String gender;
    private String nativeLanguage;
    private String learningLanguage;
    private String ageRange;

    private String callDuration;

}