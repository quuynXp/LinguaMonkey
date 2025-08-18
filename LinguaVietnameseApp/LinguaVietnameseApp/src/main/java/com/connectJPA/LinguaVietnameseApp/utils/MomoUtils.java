package com.connectJPA.LinguaVietnameseApp.utils;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Map;

public class MomoUtils {
    public static String generateSignature(Map<String, String> params, String secretKey) {
        // Implement MoMo signature generation logic
        return "mock-signature"; // Replace with actual MoMo SDK logic
    }

    public static String toJson(Map<String, String> params) {
        try {
            return new ObjectMapper().writeValueAsString(params);
        } catch (Exception e) {
            throw new RuntimeException("Error converting to JSON", e);
        }
    }
}