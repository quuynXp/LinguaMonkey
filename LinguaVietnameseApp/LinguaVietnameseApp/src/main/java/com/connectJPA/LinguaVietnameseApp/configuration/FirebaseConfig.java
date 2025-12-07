package com.connectJPA.LinguaVietnameseApp.configuration;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@Configuration
public class FirebaseConfig {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${firebase.config.path:service-account-key.json}")
    private String configPath;

    @Bean
    public FirebaseMessaging firebaseMessaging() throws IOException {
        FirebaseApp firebaseApp = null;
        List<FirebaseApp> firebaseApps = FirebaseApp.getApps();

        if (firebaseApps != null && !firebaseApps.isEmpty()) {
            for (FirebaseApp app : firebaseApps) {
                if (app.getName().equals(FirebaseApp.DEFAULT_APP_NAME)) {
                    firebaseApp = app;
                    break;
                }
            }
        }

        if (firebaseApp == null) {
            GoogleCredentials credentials = loadCredentials();
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(credentials)
                    .build();
            firebaseApp = FirebaseApp.initializeApp(options);
        }

        return FirebaseMessaging.getInstance(firebaseApp);
    }

    private GoogleCredentials loadCredentials() throws IOException {
        InputStream serviceAccount = null;
        String finalPathUsed = null;
        String defaultFileName = "service-account-key.json";
        String renderPath = "/etc/secrets/" + defaultFileName;

        logger.info("Firebase Config Path is set to: {}", configPath);

        // 1. Ưu tiên: File System (Đường dẫn cấu hình từ biến môi trường/application.yml)
        try {
            serviceAccount = new FileInputStream(configPath);
            finalPathUsed = configPath + " (File System)";
            logger.info("Loaded Firebase credentials from File System: {}", finalPathUsed);
        } catch (FileNotFoundException e1) {
            logger.warn("Could not find file at configured path: {}. Trying Render secrets path...", configPath);
            
            // 2. Fallback: Đường dẫn Render Secrets
            try {
                serviceAccount = new FileInputStream(renderPath);
                finalPathUsed = renderPath + " (Render Secrets)";
                logger.info("Loaded Firebase credentials from Render Secrets: {}", finalPathUsed);
            } catch (FileNotFoundException e2) {
                logger.warn("Could not find file at Render secrets path: {}. Trying Classpath...", renderPath);
                
                // 3. Fallback cuối: Classpath (Local Dev)
                try {
                    ClassPathResource resource = new ClassPathResource(defaultFileName);
                    if (resource.exists()) {
                        serviceAccount = resource.getInputStream();
                        finalPathUsed = "classpath:" + defaultFileName;
                        logger.info("Loaded Firebase credentials from Classpath: {}", finalPathUsed);
                    }
                    
                    if (serviceAccount == null) {
                        // Thử tìm theo tên đầy đủ nếu cấu hình là đường dẫn tương đối trong resource
                        ClassPathResource configResource = new ClassPathResource(configPath);
                        if (configResource.exists()) {
                            serviceAccount = configResource.getInputStream();
                            finalPathUsed = "classpath:" + configPath;
                            logger.info("Loaded Firebase credentials from Classpath: {}", finalPathUsed);
                        }
                    }
                } catch (Exception ex) {
                    logger.error("Error loading from classpath", ex);
                }
            }
        }

        if (serviceAccount == null) {
            logger.error("CRITICAL: Could not find Firebase credentials in Config, Render Secrets, or Classpath.");
            throw new IOException("Could not find or read credentials file. Checked: " + configPath + ", " + renderPath + ", and classpath.");
        }

        return GoogleCredentials.fromStream(serviceAccount);
    }
}