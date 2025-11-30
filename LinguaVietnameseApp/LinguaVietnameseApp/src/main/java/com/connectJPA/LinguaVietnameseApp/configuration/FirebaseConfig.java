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

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;
import java.util.Collections;
import java.util.List;

@Configuration
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);
    private static final String FIREBASE_MESSAGING_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

    @Value("${google.credentials-file-url:}")
    private String credentialsPath;

    @Value("${FIREBASE_CREDENTIALS_BASE64:}")
    private String credentialsBase64;

    @Bean
    public FirebaseMessaging firebaseMessaging() throws IOException {
        List<FirebaseApp> apps = FirebaseApp.getApps();
        if (!apps.isEmpty()) {
            return FirebaseMessaging.getInstance(apps.get(0));
        }

        GoogleCredentials credentials = loadCredentials();

        // FIX: Explicitly set the scope to ensure token refresh capabilities
        if (credentials.createScopedRequired()) {
            credentials = credentials.createScoped(Collections.singletonList(FIREBASE_MESSAGING_SCOPE));
        }

        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(credentials)
                .build();

        FirebaseApp app = FirebaseApp.initializeApp(options);
        log.info("Firebase App initialized successfully.");
        return FirebaseMessaging.getInstance(app);
    }

    private GoogleCredentials loadCredentials() throws IOException {
        // Priority 1: Base64
        if (credentialsBase64 != null && !credentialsBase64.isBlank()) {
            try {
                byte[] decodedBytes = Base64.getDecoder().decode(credentialsBase64);
                log.info("Loaded Firebase credentials from BASE64 string.");
                return GoogleCredentials.fromStream(new ByteArrayInputStream(decodedBytes));
            } catch (Exception e) {
                log.error("Failed to decode FIREBASE_CREDENTIALS_BASE64 and create credentials stream.", e);
                // Ném ra IOException để FirebaseMessaging bean không được tạo, giúp lỗi rõ ràng hơn
                throw new IOException("Failed to initialize GoogleCredentials from FIREBASE_CREDENTIALS_BASE64: " + e.getMessage(), e);
            }
        }

        // Priority 2: File Path
        if (credentialsPath != null && !credentialsPath.isBlank()) {
            String cleanPath = credentialsPath.replace("file:", "");
            try (InputStream serviceAccount = new FileInputStream(cleanPath)) {
                log.info("Loaded Firebase credentials from file: {}", cleanPath);
                return GoogleCredentials.fromStream(serviceAccount);
            } catch (IOException e) {
                log.error("Failed to load Firebase credentials file at: {}", cleanPath, e);
                throw e;
            }
        }

        throw new IOException("No Firebase credentials provided. Set GOOGLE_CREDENTIALS_FILE_URL or FIREBASE_CREDENTIALS_BASE64.");
    }
}