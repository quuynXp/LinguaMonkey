package com.connectJPA.LinguaVietnameseApp.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;

import lombok.extern.slf4j.Slf4j;

import java.security.MessageDigest;
import java.util.Map;

@Service
@Slf4j
public class VirusScanService {

    private final WebClient webClient;
    private final String API_KEY = "YOUR_VIRUSTOTAL_API_KEY"; // Lấy free tại virustotal.com

    public VirusScanService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.baseUrl("https://www.virustotal.com/api/v3").build();
    }

    // Cách 1: Check Hash (Siêu nhẹ, siêu nhanh)
    // Chỉ check xem file này đã từng bị báo virus chưa, không upload file lên VT
    public boolean isSafeByHash(MultipartFile file) {
        try {
            // Tính SHA-256 hash của file
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(file.getBytes());
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) hexString.append(String.format("%02x", b));
            String fileHash = hexString.toString();

            // Gọi API kiểm tra Hash
            Map response = webClient.get()
                    .uri("/files/" + fileHash)
                    .header("x-apikey", API_KEY)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(); // Blocking for simplicity in simple controller

            if (response == null || !response.containsKey("data")) return true; // File chưa từng thấy -> coi như sạch (để nhẹ)

            Map attributes = (Map) ((Map) response.get("data")).get("attributes");
            Map lastAnalysis = (Map) attributes.get("last_analysis_stats");
            
            int malicious = (Integer) lastAnalysis.get("malicious");
            return malicious == 0;

        } catch (Exception e) {
            // 404 Not Found nghĩa là VirusTotal chưa biết file này => Coi như sạch
            if (e.getMessage().contains("404")) return true;
            log.error("Virus scan error", e);
            return true; // Fail-open: Lỗi mạng thì cho qua để không chặn user
        }
    }
}
