package com.connectJPA.LinguaVietnameseApp.configuration;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@Configuration
@Slf4j
public class FirebaseConfig {

    @Value("${google.credentials-file-url}")
    private String credentialsPath;

    @Bean
    public FirebaseMessaging firebaseMessaging() throws IOException {
        List<FirebaseApp> apps = FirebaseApp.getApps();
        if (!apps.isEmpty()) {
            return FirebaseMessaging.getInstance();
        }

        // Xử lý đường dẫn: Nếu là file tuyệt đối trong Docker (/app/...) mà không có prefix
        String finalPath = credentialsPath;
        if (finalPath.startsWith("/") && !finalPath.startsWith("file:")) {
            finalPath = "file:" + finalPath;
        }

        log.info("Initializing Firebase using credentials from: {}", finalPath);

        ResourceLoader resourceLoader = new DefaultResourceLoader();
        Resource resource = resourceLoader.getResource(finalPath);

        if (!resource.exists()) {
            // Fallback logging để debug nếu vẫn lỗi
            log.error("Firebase credentials file NOT FOUND at: {}", finalPath);
            throw new IOException("Firebase credentials file not found at: " + finalPath);
        }

        try (InputStream serviceAccount = resource.getInputStream()) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            FirebaseApp.initializeApp(options);
            log.info("FirebaseApp initialized successfully.");
        } catch (IOException e) {
            log.error("Error reading Firebase credentials: {}", e.getMessage());
            throw e;
        }

        return FirebaseMessaging.getInstance();
    }
}