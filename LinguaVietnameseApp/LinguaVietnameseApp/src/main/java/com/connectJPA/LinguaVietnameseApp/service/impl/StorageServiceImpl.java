package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.entity.UserMedia;
import com.connectJPA.LinguaVietnameseApp.enums.MediaType;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserMediaRepository;
import com.connectJPA.LinguaVietnameseApp.service.StorageService;
import com.google.api.client.http.InputStreamContent;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.Permission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageServiceImpl implements StorageService {

    private final Drive driveService;
    private final UserMediaRepository mediaRepo;

    @Value("${google.drive.folderId}")
    private String folderId;

    // Limit to 100MB
    private static final long MAX_FILE_SIZE = 100 * 1024 * 1024;
    
    // UPDATED: Using Direct Link format (lh3) for images to work in mobile apps
    private static final String VIEW_URL_TEMPLATE = "https://lh3.googleusercontent.com/d/%s";
    private static final String STREAM_URL_TEMPLATE = "https://drive.google.com/uc?export=download&id=%s";

    @Transactional
    @Override
    public String uploadTemp(MultipartFile file) {
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException("File too large. Max size is 100MB.");
        }
        try {
            return uploadStream(file.getInputStream(), file.getOriginalFilename(), file.getContentType());
        } catch (IOException e) {
            log.error("Google Drive upload failed", e);
            throw new RuntimeException("Failed to upload file to Google Drive", e);
        }
    }

    public String uploadBytes(byte[] data, String fileName, String contentType) {
        return uploadStream(new ByteArrayInputStream(data), fileName, contentType);
    }

    @Override
    public String uploadStream(InputStream inputStream, String fileName, String contentType) {
        try {
            File fileMetadata = new File();
            fileMetadata.setName(fileName);
            fileMetadata.setParents(Collections.singletonList(folderId));

            InputStreamContent mediaContent = new InputStreamContent(contentType, inputStream);

            // Upload file
            File uploadedFile = driveService.files().create(fileMetadata, mediaContent)
                    .setFields("id, webViewLink")
                    .execute();

            String fileId = uploadedFile.getId();

            // Set public permission for immediate access
            try {
                Permission permission = new Permission()
                        .setType("anyone")
                        .setRole("reader");
                driveService.permissions().create(fileId, permission).execute();
            } catch (Exception e) {
                log.warn("Could not set public permission for file {}. Frontend might not view it.", fileId);
            }

            log.info("Uploaded {} to Drive (OAuth2). ID: {}", fileName, fileId);
            
            return fileId; 
        } catch (IOException e) {
            log.error("Google Drive stream upload failed", e);
            throw new RuntimeException("Failed to upload stream to Google Drive: " + e.getMessage(), e);
        }
    }

    @Transactional
    @Override
    public UserMedia commit(String tempPath, String newPath, UUID userId, MediaType mediaType) {
        try {
            String fileId = tempPath;
            
            // Robustly extract fileId from various URL formats
            
            // Case 1: Standard View URL: /file/d/ID/view
            if (tempPath.contains("/file/d/")) {
                int startIndex = tempPath.indexOf("/file/d/") + 8; // Start after /file/d/
                
                int endId = -1;
                int endView = tempPath.indexOf("/view", startIndex);
                int endParam = tempPath.indexOf("?", startIndex);

                // Prioritize the delimiter that appears first after the ID
                if (endView != -1 && (endParam == -1 || endView < endParam)) {
                    endId = endView;
                } else if (endParam != -1) {
                    endId = endParam;
                }
                
                if (endId == -1) endId = tempPath.length();
                
                fileId = tempPath.substring(startIndex, endId); 
            } 
            // Case 2: Direct Link URL: googleusercontent.com/d/ID
            else if (tempPath.contains("googleusercontent.com/d/")) {
                int startIndex = tempPath.indexOf("/d/") + 3;
                int endId = tempPath.indexOf("?", startIndex);
                if (endId == -1) endId = tempPath.length();
                fileId = tempPath.substring(startIndex, endId);
            }
            // Case 3: Old Download URL: id=ID
            else if (tempPath.contains("id=")) {
                int startId = tempPath.indexOf("id=") + 3;
                int endId = tempPath.indexOf("&", startId);
                if (endId == -1) endId = tempPath.length();
                fileId = tempPath.substring(startId, endId);
            }

            // Now fileId should be clean, use it to fetch metadata
            File driveFile = driveService.files().get(fileId).setFields("name").execute();
            String fileName = driveFile.getName();

            UserMedia media = UserMedia.builder()
                    .filePath(fileId) // Store the clean Drive ID as filePath
                    .fileName(fileName)
                    .userId(userId)
                    .mediaType(mediaType)
                    .createdAt(OffsetDateTime.now())
                    .build();

            UserMedia savedMedia = mediaRepo.save(media);
            
            // Generate the final URL using the clean ID
            savedMedia.setFileUrl(getFileUrl(fileId)); 
            
            return savedMedia;
        } catch (IOException e) {
            log.error("Commit Drive file failed", e);
            throw new RuntimeException("Commit Drive file failed: " + e.getMessage(), e);
        }
    }

    @Override
    public void deleteFile(String objectPath) {
        try {
            driveService.files().delete(objectPath).execute();
            log.info("Deleted file from Drive: {}", objectPath);
        } catch (IOException e) {
            log.error("Google Drive delete failed for File ID: {}", objectPath, e);
            throw new RuntimeException("Delete file failed: " + e.getMessage(), e);
        }
    }

    @Override
    public String getFileUrl(String fileId) {
        return String.format(STREAM_URL_TEMPLATE, fileId);
    }

    @Override
    public byte[] getFile(String objectPath) {
        throw new UnsupportedOperationException("Direct file download not supported for Drive streaming setup");
    }
}