package com.connectJPA.LinguaVietnameseApp.configuration;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.FileSystemResource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.Base64;

@Configuration
public class GoogleDriveConfig {

    private static final Logger log = LoggerFactory.getLogger(GoogleDriveConfig.class);

    @Value("${google.drive.serviceAccountKey}")
    private String serviceAccountKeyPath; 
    
    // Thêm biến Base64 cho Google Drive
    @Value("${GDRIVE_KEY_BASE64:}")
    private String gdriveKeyBase64;

    @Bean
    public Drive googleDriveService() throws IOException, GeneralSecurityException {
        GoogleCredentials credentials = loadCredentials();
        
        return new Drive.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(credentials)
        )
        .setApplicationName("LinguaVietnameseApp")
        .build();
    }
    
    private GoogleCredentials loadCredentials() throws IOException {
        // Priority 1: Base64
        if (gdriveKeyBase64 != null && !gdriveKeyBase64.isBlank()) {
            try {
                // Loại bỏ khoảng trắng và xuống dòng (cần thiết cho Base64 lớn)
                byte[] decodedBytes = Base64.getDecoder().decode(gdriveKeyBase64.trim().replaceAll("\\s", ""));
                log.info("Loaded Google Drive credentials from BASE64 string.");
                return GoogleCredentials.fromStream(new ByteArrayInputStream(decodedBytes))
                        .createScoped(Collections.singleton(DriveScopes.DRIVE_FILE));
            } catch (Exception e) {
                log.error("Failed to decode GDRIVE_KEY_BASE64 and create credentials stream.", e);
                throw new IOException("Failed to initialize GoogleCredentials from GDRIVE_KEY_BASE64: " + e.getMessage(), e);
            }
        }
        
        // Priority 2: File Path (chỉ dành cho local dev/volumes)
        if (serviceAccountKeyPath != null && !serviceAccountKeyPath.isBlank()) {
            Resource serviceAccountKey = new FileSystemResource(serviceAccountKeyPath);
            try (InputStream is = serviceAccountKey.getInputStream()) {
                log.warn("Using Google Drive credentials from FileSystemResource ({}). Use Base64 for production.", serviceAccountKeyPath);
                return GoogleCredentials.fromStream(is)
                        .createScoped(Collections.singleton(DriveScopes.DRIVE_FILE));
            } catch (IOException e) {
                log.error("Failed to load Google Drive credentials file at: {}", serviceAccountKeyPath, e);
                throw e;
            }
        }

        throw new IOException("No Google Drive credentials provided. Set serviceAccountKeyPath or GDRIVE_KEY_BASE64.");
    }
}