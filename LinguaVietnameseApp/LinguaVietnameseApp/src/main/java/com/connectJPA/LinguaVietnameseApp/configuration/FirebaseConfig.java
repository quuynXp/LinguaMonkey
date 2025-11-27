package com.connectJPA.LinguaVietnameseApp.configuration;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;
import java.util.List;

@Configuration
public class FirebaseConfig {

    // Không cần chỉ định default value #{null} vì chúng ta kiểm tra null bên dưới
    @Value("${google.credentials-file-url:}")
    private String credentialsPath;

    @Value("${FIREBASE_CREDENTIALS_BASE64:}")
    private String credentialsBase64;

    @Bean
    public FirebaseMessaging firebaseMessaging() throws IOException {
        List<FirebaseApp> apps = FirebaseApp.getApps();
        if (!apps.isEmpty()) {
            return FirebaseMessaging.getInstance();
        }

        GoogleCredentials credentials;

        // ƯU TIÊN 1: Đọc từ Base64 Environment Variable (Production/Render)
        if (credentialsBase64 != null && !credentialsBase64.isBlank()) {
            try {
                byte[] decodedBytes = Base64.getDecoder().decode(credentialsBase64);
                try (InputStream inputStream = new ByteArrayInputStream(decodedBytes)) {
                    credentials = GoogleCredentials.fromStream(inputStream);
                }
            } catch (IllegalArgumentException e) {
                throw new IOException("Failed to decode FIREBASE_CREDENTIALS_BASE64. Check if the string is correctly encoded.", e);
            }
        // ƯU TIÊN 2: Đọc từ File Path (Local/Dev)
        } else if (credentialsPath != null && !credentialsPath.isBlank()) {
            String finalPath = credentialsPath;
            // Dòng 57 gây lỗi: Đảm bảo Spring tìm kiếm file
            if (finalPath.startsWith("/") && !finalPath.startsWith("file:")) {
                finalPath = "file:" + finalPath;
            }
            
            ResourceLoader resourceLoader = new DefaultResourceLoader();
            Resource resource = resourceLoader.getResource(finalPath);
            
            if (!resource.exists()) {
                throw new IOException("Firebase credentials file not found at: " + finalPath);
            }

            try (InputStream serviceAccount = resource.getInputStream()) {
                credentials = GoogleCredentials.fromStream(serviceAccount);
            }
        } else {
            throw new IOException("No Firebase credentials provided. Set FIREBASE_CREDENTIALS_BASE64 environment variable.");
        }

        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(credentials)
                .build();

        FirebaseApp.initializeApp(options);
        return FirebaseMessaging.getInstance();
    }
}