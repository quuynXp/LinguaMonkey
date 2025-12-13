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

    private static final long MAX_FILE_SIZE = 100 * 1024 * 1024;
    
    private static final String IMAGE_URL_TEMPLATE = "https://lh3.googleusercontent.com/d/%s";
    
    private static final String BINARY_URL_TEMPLATE = "https://drive.google.com/uc?export=download&id=%s";

    private String generateUrl(String fileId, String mimeType) {
        if (mimeType != null && mimeType.startsWith("image/")) {
            return String.format(IMAGE_URL_TEMPLATE, fileId);
        }
        return String.format(BINARY_URL_TEMPLATE, fileId);
    }
    
    private String generateUrl(String fileId, MediaType mediaType) {
        if (mediaType == MediaType.IMAGE) {
            return String.format(IMAGE_URL_TEMPLATE, fileId);
        }
        return String.format(BINARY_URL_TEMPLATE, fileId);
    }

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

            File uploadedFile = driveService.files().create(fileMetadata, mediaContent)
                    .setFields("id")
                    .execute();

            String fileId = uploadedFile.getId();

            try {
                Permission permission = new Permission().setType("anyone").setRole("reader");
                driveService.permissions().create(fileId, permission).execute();
            } catch (Exception e) {
                log.warn("Could not set public permission for file {}", fileId);
            }

            log.info("Uploaded {} to Drive. ID: {}", fileName, fileId);
            
            return generateUrl(fileId, contentType);
            
        } catch (IOException e) {
            log.error("Google Drive stream upload failed", e);
            throw new RuntimeException("Failed to upload stream to Google Drive", e);
        }
    }

    @Transactional
    @Override
    public UserMedia commit(String tempPath, String newPath, UUID userId, MediaType mediaType) {
        try {
            String fileId = extractFileId(tempPath); // Tách hàm extract ra cho gọn

            File driveFile = driveService.files().get(fileId).setFields("name").execute();
            String fileName = driveFile.getName();

            UserMedia media = UserMedia.builder()
                    .filePath(fileId) // Chỉ lưu ID sạch vào DB
                    .fileName(fileName)
                    .userId(userId)
                    .mediaType(mediaType)
                    .createdAt(OffsetDateTime.now())
                    .build();

            UserMedia savedMedia = mediaRepo.save(media);
            
            savedMedia.setFileUrl(generateUrl(fileId, mediaType)); 
            
            return savedMedia;
        } catch (IOException e) {
            log.error("Commit Drive file failed", e);
            throw new RuntimeException("Commit Drive file failed", e);
        }
    }

    // Hàm tách ID chuẩn xác
    private String extractFileId(String url) {
        String fileId = url;
        if (url.contains("/file/d/")) {
            int start = url.indexOf("/file/d/") + 8;
            int end = url.indexOf("/", start);
            if (end == -1) end = url.indexOf("?", start);
            if (end == -1) end = url.length();
            fileId = url.substring(start, end);
        } else if (url.contains("/d/")) { // Cho link lh3
            int start = url.indexOf("/d/") + 3;
            int end = url.indexOf("?", start); // lh3 thường không có params nhưng cứ check
            if (end == -1) end = url.length();
            fileId = url.substring(start, end);
        } else if (url.contains("id=")) {
            int start = url.indexOf("id=") + 3;
            int end = url.indexOf("&", start);
            if (end == -1) end = url.length();
            fileId = url.substring(start, end);
        }
        return fileId;
    }

    @Override
    public void deleteFile(String objectPath) {
        try {
            driveService.files().delete(objectPath).execute();
            log.info("Deleted file from Drive: {}", objectPath);
        } catch (IOException e) {
            log.error("Delete failed for File ID: {}", objectPath, e);
            throw new RuntimeException("Delete file failed", e);
        }
    }

    @Override
    public String getFileUrl(String fileId) {
        return String.format(BINARY_URL_TEMPLATE, fileId);
    }
    
    public String getFileUrl(String fileId, MediaType type) {
        return generateUrl(fileId, type);
    }

    @Override
    public byte[] getFile(String objectPath) {
        throw new UnsupportedOperationException("Not supported");
    }
}