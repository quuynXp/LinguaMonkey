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

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;
import org.springframework.core.io.FileSystemResource;

@Configuration
public class GoogleDriveConfig {

    @Value("${google.drive.serviceAccountKey}")
    private String serviceAccountKeyPath; 

    @Bean
    public Drive googleDriveService() throws IOException, GeneralSecurityException {
        Resource serviceAccountKey = new FileSystemResource(serviceAccountKeyPath);

        GoogleCredentials credentials = GoogleCredentials.fromStream(serviceAccountKey.getInputStream())
                .createScoped(Collections.singleton(DriveScopes.DRIVE_FILE));

        return new Drive.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(credentials)
        )
        .setApplicationName("LinguaVietnameseApp")
        .build();
    }
}