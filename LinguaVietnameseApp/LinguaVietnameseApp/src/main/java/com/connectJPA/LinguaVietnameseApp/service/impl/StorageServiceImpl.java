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

    private static final String DOWNLOAD_URL_TEMPLATE = "https://drive.google.com/uc?export=download&id=%s";

    @Transactional
    @Override
    public String uploadTemp(MultipartFile file) {
        try {
            return uploadBytes(file.getBytes(), file.getOriginalFilename(), file.getContentType());
        } catch (IOException e) {
            log.error("Google Drive upload failed", e);
            throw new RuntimeException("Failed to upload file to Google Drive", e);
        }
    }

    public String uploadBytes(byte[] data, String fileName, String contentType) {
        try {
            File fileMetadata = new File();
            fileMetadata.setName(fileName);
            fileMetadata.setParents(Collections.singletonList(folderId));

            InputStreamContent mediaContent = new InputStreamContent(
                    contentType,
                    new ByteArrayInputStream(data)
            );

            File uploadedFile = driveService.files().create(fileMetadata, mediaContent)
                    .setFields("id")
                    .execute();

            Permission permission = new Permission()
                    .setType("anyone")
                    .setRole("reader");

            driveService.permissions().create(uploadedFile.getId(), permission).execute();

            log.info("Uploaded {} to Drive. ID: {}", fileName, uploadedFile.getId());
            return uploadedFile.getId();
        } catch (IOException e) {
            log.error("Google Drive byte upload failed", e);
            throw new RuntimeException("Failed to upload bytes to Google Drive", e);
        }
    }

    @Override
    public String uploadStream(InputStream inputStream, String objectName, String contentType) {
        throw new UnsupportedOperationException("Upload stream not implemented for Drive");
    }

    @Transactional
    @Override
    public UserMedia commit(String tempPath, String newPath, UUID userId, MediaType mediaType) {
        try {
            File driveFile = driveService.files().get(tempPath).setFields("name").execute();
            String fileName = driveFile.getName();

            UserMedia media = UserMedia.builder()
                    .filePath(tempPath)
                    .fileName(fileName)
                    .userId(userId)
                    .mediaType(mediaType)
                    .createdAt(OffsetDateTime.now())
                    .build();

            UserMedia savedMedia = mediaRepo.save(media);
            savedMedia.setFileUrl(getFileUrl(tempPath));

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
        } catch (IOException e) {
            log.error("Google Drive delete failed for File ID: {}", objectPath, e);
            throw new RuntimeException("Delete file failed: " + e.getMessage(), e);
        }
    }

    @Override
    public String getFileUrl(String objectName) {
        return String.format(DOWNLOAD_URL_TEMPLATE, objectName);
    }

    @Override
    public byte[] getFile(String objectPath) {
        throw new UnsupportedOperationException("Direct file download not supported for Drive streaming setup");
    }
}